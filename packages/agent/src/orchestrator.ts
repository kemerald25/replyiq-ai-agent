import {
  OwnerRepository,
  ProjectRepository,
  VersionRepository,
  PublishService,
  VersionService,
  PreviewService,
  Project,
} from "@replyiq/core";
import { parseOwnerKey, SiteDocument } from "@replyiq/schema";
import {
  IncomingMessage,
  AgentResponse,
  StructuredReply,
} from "./contracts/transport.js";
import { ModelProvider } from "./contracts/provider.js";
import { IOwnerStateStore } from "./state/store.js";
import { OwnerState } from "./state/types.js";
import { parseCommand } from "./commands/router.js";
import { ToolExecutor } from "./tools/executor.js";
import { AGENT_TOOLS } from "./tools/definitions.js";
import { buildTurnMessages } from "./prompts/builder.js";
import { BudgetTracker } from "./budget/tracker.js";
import { PlanPolicy, AllowAllPlanPolicy } from "./budget/policy.js";
import { hashOwnerId, IAgentLogger, JsonAgentLogger } from "./logging/logger.js";

export interface AgentOrchestratorConfig {
  ownerRepo: OwnerRepository;
  projectRepo: ProjectRepository;
  versionRepo: VersionRepository;
  publishService: PublishService;
  versionService: VersionService;
  previewService: PreviewService;
  stateStore: IOwnerStateStore;
  defaultProvider: ModelProvider;
  fallbackProvider?: ModelProvider;
  budgetTracker?: BudgetTracker;
  policy?: PlanPolicy;
  baseDomain?: string;
  previewBaseUrl?: string; // Optional override e.g. "http://preview.localhost:8787" or "https://preview.replyiq.cv"
  environment?: "development" | "production" | "staging";
  ownerHashSecret?: string;
  turnTimeoutMs?: number;
  logger?: IAgentLogger;
}

export class AgentOrchestrator {
  private ownerRepo: OwnerRepository;
  private projectRepo: ProjectRepository;
  private versionRepo: VersionRepository;
  private publishService: PublishService;
  private versionService: VersionService;
  private previewService: PreviewService;
  private stateStore: IOwnerStateStore;
  private defaultProvider: ModelProvider;
  private fallbackProvider?: ModelProvider;
  private budgetTracker: BudgetTracker;
  private policy: PlanPolicy;
  private baseDomain: string;
  private previewBaseUrl?: string;
  private environment: "development" | "production" | "staging";
  private ownerHashSecret?: string;
  private turnTimeoutMs: number;
  private logger: IAgentLogger;
  private toolExecutor = new ToolExecutor();

  // In-flight processing promises for deduplication while a message is executing
  private inFlight = new Map<string, Promise<AgentResponse>>();

  constructor(config: AgentOrchestratorConfig) {
    this.ownerRepo = config.ownerRepo;
    this.projectRepo = config.projectRepo;
    this.versionRepo = config.versionRepo;
    this.publishService = config.publishService;
    this.versionService = config.versionService;
    this.previewService = config.previewService;
    this.stateStore = config.stateStore;
    this.defaultProvider = config.defaultProvider;
    this.fallbackProvider = config.fallbackProvider;
    this.budgetTracker = config.budgetTracker || new BudgetTracker();
    this.policy = config.policy || new AllowAllPlanPolicy();
    this.baseDomain = config.baseDomain || "localhost";
    this.previewBaseUrl = config.previewBaseUrl;
    this.environment = config.environment || (this.baseDomain === "localhost" ? "development" : "production");
    this.ownerHashSecret = config.ownerHashSecret;
    this.turnTimeoutMs = config.turnTimeoutMs ?? 45_000;
    this.logger = config.logger || new JsonAgentLogger(false);
  }

  buildSiteUrl(slug: string): string {
    const isStaging = this.environment === "staging" || this.baseDomain.endsWith(".workers.dev");
    if (isStaging) {
      return `https://${this.baseDomain}/site/${slug}`;
    }
    const isDev = this.environment === "development" || this.baseDomain === "localhost";
    if (isDev) {
      return `http://${slug}.localhost:8787`;
    }
    return `https://${slug}.${this.baseDomain}`;
  }

  buildPreviewUrl(token: string): string {
    if (this.previewBaseUrl) {
      return `${this.previewBaseUrl.replace(/\/+$/, "")}/${token}`;
    }
    const isStaging = this.environment === "staging" || this.baseDomain.endsWith(".workers.dev");
    if (isStaging) {
      return `https://${this.baseDomain}/preview/${token}`;
    }
    const isDev = this.environment === "development" || this.baseDomain === "localhost";
    if (isDev) {
      return `http://preview.localhost:8787/${token}`;
    }
    return `https://preview.${this.baseDomain}/${token}`;
  }

  async handleMessage(incoming: IncomingMessage): Promise<AgentResponse> {
    const rawKey = incoming.ownerKey || incoming.ownerPhone || "";
    const parsedKey = parseOwnerKey(rawKey);
    const ownerKey = parsedKey.valid ? parsedKey.identity.key : rawKey;
    const messageId = incoming.messageId;
    const dedupKey = `${ownerKey}:${messageId}`;

    // 1. Fast in-flight deduplication check
    const inFlightPromise = this.inFlight.get(dedupKey);
    if (inFlightPromise) {
      return inFlightPromise;
    }

    // 2. Acquire sequential lock synchronously to preserve strict FIFO arrival order
    const releaseLock = await this.stateStore.acquireLock(ownerKey);

    const executionPromise = (async () => {
      try {
        const ownerHash = await hashOwnerId(ownerKey, this.ownerHashSecret);

        this.logger.log({
          level: "info",
          event: "message_received",
          ownerHash,
          messageId,
          textLength: incoming.text.length,
          timestamp: Date.now(),
        });

        // 3. Idempotency: check if message was already completed
        const existing = await this.stateStore.getProcessedResponse(ownerKey, messageId);
        if (existing) {
          this.logger.log({
            level: "info",
            event: "idempotency_hit",
            ownerHash,
            messageId,
            timestamp: Date.now(),
          });
          return existing;
        }

        // Turn timeout race
        let timer: ReturnType<typeof setTimeout> | undefined;
        const turnTimeoutPromise = new Promise<AgentResponse>((_, reject) => {
          timer = setTimeout(() => {
            const err = new Error(`Agent turn timed out after ${this.turnTimeoutMs}ms`);
            (err as Error & { isTurnTimeout?: boolean }).isTurnTimeout = true;
            reject(err);
          }, this.turnTimeoutMs);
        });

        let response: AgentResponse;
        try {
          response = await Promise.race([
            this.processMessageInternal(ownerKey, incoming),
            turnTimeoutPromise,
          ]);
        } catch (turnErr: unknown) {
          const timeoutErr = turnErr as Error & { isTurnTimeout?: boolean };
          if (timeoutErr.isTurnTimeout) {
            this.logger.log({
              level: "error",
              event: "turn_timeout",
              ownerHash,
              messageId,
              error: timeoutErr.message,
              timestamp: Date.now(),
            });
            response = {
              messageId: incoming.messageId,
              replies: [
                {
                  text: "Your request took too long to complete. Please try again in a moment, or type 'MENU' for quick actions.",
                },
              ],
              activeProjectId: null,
              timestamp: Date.now(),
            };
          } else {
            throw turnErr;
          }
        } finally {
          clearTimeout(timer);
        }

        await this.stateStore.recordProcessedMessage(ownerKey, messageId, response);

        this.logger.log({
          level: "info",
          event: "message_completed",
          ownerHash,
          messageId,
          activeProjectId: response.activeProjectId,
          command: response.commandExecuted,
          modelUsed: response.modelUsed,
          neuronsUsed: response.neuronsUsed,
          timestamp: Date.now(),
        });

        return response;
      } finally {
        this.inFlight.delete(dedupKey);
        await releaseLock();
      }
    })();

    this.inFlight.set(dedupKey, executionPromise);
    return executionPromise;
  }

  private async processMessageInternal(
    ownerKey: string,
    incoming: IncomingMessage
  ): Promise<AgentResponse> {
    const text = incoming.text.trim();
    const timestamp = Date.now();

    // Ensure owner exists or create owner
    let owner = await this.ownerRepo.getByIdentityKey(ownerKey);
    if (!owner) {
      owner = await this.ownerRepo.getByPhoneNumber(ownerKey);
    }
    if (!owner) {
      const parsed = parseOwnerKey(ownerKey);
      const isPhone = parsed.valid && parsed.identity.type === "phone";
      const cleanId = ownerKey.replace(/[^a-zA-Z0-9]/g, "");
      const ownerId = `owner_${cleanId}`;
      owner = await this.ownerRepo.create({
        id: ownerId,
        identityKey: ownerKey,
        phoneNumber: isPhone ? ownerKey : null,
        displayName: isPhone
          ? `Business Owner (${ownerKey.slice(-4)})`
          : `WhatsApp User (${ownerKey.slice(-6)})`,
      });
    }

    const state = await this.stateStore.getState(owner.id);

    // Rate limiting & budget check for message
    const messageBudget = await this.budgetTracker.checkCanProcessMessage(state.usage);
    if (!messageBudget.allowed) {
      return {
        messageId: incoming.messageId,
        replies: [{ text: messageBudget.message }],
        activeProjectId: state.activeProjectId,
        timestamp,
      };
    }
    state.usage.messageCount += 1;

    // Check deterministic commands (0 neuron cost)
    const command = parseCommand(text);

    if (command) {
      const cmdResponse = await this.handleDeterministicCommand(owner.id, state, command, incoming);
      await this.stateStore.saveState(owner.id, state);
      return cmdResponse;
    }

    // Natural Language / Model Path:
    // If a publish confirmation was pending, any non-command message cancels it
    if (state.pendingConfirmation?.type === "publish") {
      state.pendingConfirmation = null;
      state.conversationState = "IDLE";
    }

    // Ensure active project
    const activeProject = await this.resolveActiveProject(owner.id, state);
    if (!activeProject) {
      const projects = await this.projectRepo.listByOwner(owner.id);
      if (projects.length === 0) {
        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: "Welcome to ReplyIQ! You don't have an active website yet. Type 'NEW <your business name>' to create your first site.",
            },
          ],
          activeProjectId: null,
          timestamp,
        };
      } else {
        // Multiple projects: prompt for selection
        state.pendingConfirmation = {
          type: "project_selection",
          projects: projects.map((p: Project) => ({ id: p.id, slug: p.slug, name: p.name })),
          expiresAt: Date.now() + 15 * 60 * 1000,
        };
        state.conversationState = "AWAITING_PROJECT_SELECTION";
        const menu = projects.map((p: Project, idx: number) => ({
          number: idx + 1,
          label: `${p.name} (${p.slug})`,
        }));
        await this.stateStore.saveState(owner.id, state);
        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: "Which website would you like to edit? Select a number:",
              menu,
            },
          ],
          activeProjectId: null,
          timestamp,
        };
      }
    }

    // Fetch latest document
    const currentVersionRecord = await this.versionRepo.get(activeProject.id, activeProject.currentVersion);
    if (!currentVersionRecord) {
      return {
        messageId: incoming.messageId,
        replies: [{ text: "Error: No document version found for your project." }],
        activeProjectId: activeProject.id,
        timestamp,
      };
    }

    let currentDoc = currentVersionRecord.document;
    let currentVersionNumber = currentVersionRecord.versionNumber;

    // Check model call budget
    const modelBudget = await this.budgetTracker.checkCanCallModel(state.usage, false);
    if (!modelBudget.allowed) {
      return {
        messageId: incoming.messageId,
        replies: [{ text: modelBudget.message }],
        activeProjectId: activeProject.id,
        timestamp,
      };
    }

    // Prepare Turn Messages
    const messages = buildTurnMessages(currentDoc, state.conversationHistory, text);

    // Model invocation with retry loop (max 2 retries on validation failure)
    let totalNeuronsUsed = 0;
    let totalTokensUsed = 0;
    let modelNameUsed = "";
    let retryCount = 0;
    const maxRetries = 2;
    let finalReplies: StructuredReply[] = [];

    while (retryCount <= maxRetries) {
      let generationResult;
      let usedFallback = false;

      try {
        generationResult = await this.defaultProvider.generate({
          messages,
          tools: AGENT_TOOLS,
        });
      } catch (defaultErr: unknown) {
        // Try fallback provider if configured
        if (this.fallbackProvider) {
          const fallbackBudget = await this.budgetTracker.checkCanCallModel(state.usage, true);
          if (fallbackBudget.allowed) {
            try {
              generationResult = await this.fallbackProvider.generate({
                messages,
                tools: AGENT_TOOLS,
              });
              usedFallback = true;
            } catch (fallbackErr: unknown) {
              const fallbackObj = fallbackErr as { isRateLimit?: boolean; isQuotaExceeded?: boolean };
              const isRateOrQuota = fallbackObj.isRateLimit || fallbackObj.isQuotaExceeded;
              return {
                messageId: incoming.messageId,
                replies: [
                  {
                    text: isRateOrQuota
                      ? "The AI service is currently experiencing high demand (quota or rate limit reached). Please wait a moment and try again, or type 'MENU' to manage your site without AI."
                      : "I'm temporarily unable to process your request due to network connection issues. Please try again in a moment, or type 'MENU' for quick actions.",
                  },
                ],
                activeProjectId: activeProject.id,
                timestamp,
              };
            }
          } else {
            return {
              messageId: incoming.messageId,
              replies: [
                {
                  text: "I'm temporarily unable to process your request as fallback limits have been reached. Please try again later or type 'MENU' for quick actions.",
                },
              ],
              activeProjectId: activeProject.id,
              timestamp,
            };
          }
        } else {
          const defaultErrObj = defaultErr as { isRateLimit?: boolean; isQuotaExceeded?: boolean };
          const isRateOrQuota = defaultErrObj?.isRateLimit || defaultErrObj?.isQuotaExceeded;
          return {
            messageId: incoming.messageId,
            replies: [
              {
                text: isRateOrQuota
                  ? "The AI service is currently experiencing high demand (quota or rate limit reached). Please wait a moment and try again, or type 'MENU' to manage your site without AI."
                  : "I'm temporarily unable to process your request right now. Please try again in a few moments, or type 'MENU' to manage your site.",
              },
            ],
            activeProjectId: activeProject.id,
            timestamp,
          };
        }
      }

      totalNeuronsUsed += generationResult.usage.estimatedNeurons;
      totalTokensUsed += generationResult.usage.inputTokens + generationResult.usage.outputTokens;
      modelNameUsed = generationResult.modelName || (usedFallback ? (this.fallbackProvider?.providerName ?? "fallback") : this.defaultProvider.providerName);

      await this.budgetTracker.recordModelUsage(
        state.usage,
        generationResult.usage.estimatedNeurons,
        usedFallback
      );

      // 1. Tool execution
      if (generationResult.toolCalls && generationResult.toolCalls.length > 0) {
        const primaryTool = generationResult.toolCalls[0]!;
        const toolResult = this.toolExecutor.execute(
          primaryTool,
          currentDoc,
          currentVersionNumber
        );

        if (toolResult.type === "validation_failure") {
          if (retryCount < maxRetries) {
            retryCount += 1;
            // Feed error back to model for retry
            messages.push({
              role: "assistant",
              content: generationResult.text || "",
              toolCalls: generationResult.toolCalls,
            });
            messages.push({
              role: "tool",
              content: `Validation failed: ${toolResult.message}. Please fix the operation parameters and try again.`,
              toolCallId: primaryTool.id,
            });
            continue;
          } else {
            // Exceeded retries: friendly failure, apply nothing (atomic rollback)
            finalReplies = [
              {
                text: "I couldn't apply that change because the requested values didn't pass site validation. No changes were made to your site.",
              },
            ];
            break;
          }
        }

        if (toolResult.type === "edit_site") {
          // Success: save new version
          const newVersionRecord = await this.versionService.createVersion({
            projectId: activeProject.id,
            ownerId: owner.id,
            expectedVersion: currentVersionNumber,
            document: toolResult.updatedDoc,
            authorType: "agent",
            changeSummary: toolResult.summary,
          });

          currentVersionNumber = newVersionRecord.versionNumber;
          currentDoc = newVersionRecord.document;

          // Generate preview link
          const previewToken = await this.previewService.createPreviewToken(
            activeProject.id,
            owner.id,
            newVersionRecord.versionNumber,
            3600 // 1 hour
          );
          const previewUrl = this.buildPreviewUrl(previewToken.token);

          finalReplies = [
            {
              text: `✅ ${toolResult.summary}\n\nReview your live preview:`,
              link: {
                url: previewUrl,
                label: "Preview Changes",
              },
              previewUrl,
            },
          ];
          break;
        }

        if (toolResult.type === "ask_clarification") {
          const menu = toolResult.options?.map((opt, idx) => ({
            number: idx + 1,
            label: opt,
          }));
          finalReplies = [
            {
              text: toolResult.question,
              menu,
            },
          ];
          break;
        }

        if (toolResult.type === "propose_publish") {
          const previewToken = await this.previewService.createPreviewToken(
            activeProject.id,
            owner.id,
            currentVersionNumber,
            1800
          );
          const previewUrl = this.buildPreviewUrl(previewToken.token);

          state.pendingConfirmation = {
            type: "publish",
            projectId: activeProject.id,
            versionNumber: currentVersionNumber,
            previewUrl,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
          };
          state.conversationState = "AWAITING_PUBLISH_CONFIRMATION";

          finalReplies = [
            {
              text: `Ready to publish "${activeProject.name}" live?\n\nPreview your site: ${previewUrl}`,
              menu: [
                { number: 1, label: "Publish now (Go live)" },
                { number: 2, label: "Keep editing (Stay in draft)" },
              ],
              previewUrl,
            },
          ];
          break;
        }
      } else {
        // Conversational text without tool calls
        finalReplies = [
          {
            text: generationResult.text || "I'm here to help customize your website.",
          },
        ];
        break;
      }
    }

    // Update conversation history
    state.conversationHistory.push({ role: "user", content: text });
    if (finalReplies.length > 0 && finalReplies[0]?.text) {
      state.conversationHistory.push({ role: "assistant", content: finalReplies[0].text });
    }
    // Cap history
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    await this.stateStore.saveState(owner.id, state);

    return {
      messageId: incoming.messageId,
      replies: finalReplies,
      activeProjectId: activeProject.id,
      tokensUsed: totalTokensUsed,
      neuronsUsed: totalNeuronsUsed,
      modelUsed: modelNameUsed,
      timestamp,
    };
  }

  private async handleDeterministicCommand(
    ownerId: string,
    state: OwnerState,
    command: NonNullable<ReturnType<typeof parseCommand>>,
    incoming: IncomingMessage
  ): Promise<AgentResponse> {
    const timestamp = Date.now();

    switch (command.type) {
      case "MENU": {
        const projects = await this.projectRepo.listByOwner(ownerId);
        const activeProject = state.activeProjectId
          ? await this.projectRepo.getById(state.activeProjectId, ownerId)
          : projects[0];

        if (activeProject && !state.activeProjectId) {
          state.activeProjectId = activeProject.id;
        }

        let previewUrl: string | undefined;
        if (activeProject && activeProject.currentVersion) {
          const token = await this.previewService.createPreviewToken(
            activeProject.id,
            ownerId,
            activeProject.currentVersion,
            3600
          );
          previewUrl = this.buildPreviewUrl(token.token);
        }

        const projectListText = projects
          .map((p: Project) => `• ${p.name} (${p.slug}) - [${p.status.toUpperCase()}]`)
          .join("\n");

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `📋 ReplyIQ Menu\n\nActive Website: ${activeProject ? activeProject.name : "None"}\nStatus: ${activeProject ? activeProject.status : "N/A"}\n\nYour Websites:\n${projectListText || "No websites yet."}\n\nCommands:\n• Type 'UNDO' to revert last edit\n• Type 'PUBLISH' to go live\n• Type 'NEW <name>' to create a site\n• Chat naturally to make changes!`,
              previewUrl,
            },
          ],
          activeProjectId: state.activeProjectId,
          commandExecuted: "MENU",
          timestamp,
        };
      }

      case "HELP": {
        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `💡 How to use ReplyIQ:\n\n1. Tell me what to change in simple English or Pidgin:\n   • "Change haircut price to 15k"\n   • "Change color to green"\n   • "Update my WhatsApp number to 080..."\n   • "Add a new service: Braiding for ₦10,000"\n\n2. Shortcuts:\n   • MENU: View your websites and links\n   • UNDO: Revert your last change\n   • PUBLISH: Put your site online\n   • STOP: Pause notifications`,
            },
          ],
          activeProjectId: state.activeProjectId,
          commandExecuted: "HELP",
          timestamp,
        };
      }

      case "STOP": {
        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: "Updates paused. Type 'MENU' anytime to resume managing your websites.",
            },
          ],
          activeProjectId: state.activeProjectId,
          commandExecuted: "STOP",
          timestamp,
        };
      }

      case "CANCEL": {
        state.pendingConfirmation = null;
        state.conversationState = "IDLE";
        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: "Cancelled. How else can I help with your website?",
            },
          ],
          activeProjectId: state.activeProjectId,
          commandExecuted: "CANCEL",
          timestamp,
        };
      }

      case "NEW": {
        const existingProjects = await this.projectRepo.listByOwner(ownerId);
        const canCreate = await this.policy.canCreateProject(ownerId, existingProjects.length);
        if (!canCreate) {
          return {
            messageId: incoming.messageId,
            replies: [
              {
                text: "You have reached the maximum number of websites allowed on your current plan.",
              },
            ],
            activeProjectId: state.activeProjectId,
            commandExecuted: "NEW",
            timestamp,
          };
        }

        const siteName = command.name || `My Website ${Date.now().toString().slice(-4)}`;
        const rawSlug = siteName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const slug = (rawSlug.length >= 3 ? rawSlug : `site-${rawSlug}`).slice(0, 30);

        const owner = await this.ownerRepo.getById(ownerId);

        const initialDoc: SiteDocument = {
          schemaVersion: 1,
          subdomain: slug,
          template: "portfolio",
          metadata: {
            title: siteName,
            description: "Built with ReplyIQ",
            language: "en",
            locale: "en-NG",
          },
          theme: {
            palette: "sunset-amber",
            font: "plus-jakarta-sans",
            mode: "light",
          },
          contact: {
            whatsappNumber: owner?.phoneNumber || "",
          },
          sections: [
            {
              id: "hero-1",
              type: "hero",
              heading: `Welcome to ${siteName}`,
              subheading: "Chat with us directly on WhatsApp",
            },
            {
              id: "services-1",
              type: "services",
              title: "Our Services",
              items: [
                {
                  id: "serv-haircut",
                  name: "Standard Haircut",
                  description: "Professional wash, cut and styling",
                  price: 10000,
                  currency: "NGN",
                  priceLabel: "from",
                },
              ],
            },
          ],
        };

        const projectId = `proj_${Date.now()}`;
        const created = await this.projectRepo.createWithInitialVersion(
          {
            id: projectId,
            ownerId,
            slug,
            name: siteName,
            template: "portfolio",
            status: "draft",
            currentVersion: 1,
            publishedVersion: null,
            suspendedReason: null,
            deletedAt: null,
          },
          initialDoc,
          "user",
          "Initial site creation"
        );

        state.activeProjectId = created.project.id;
        state.conversationState = "IDLE";
        state.pendingConfirmation = null;

        const token = await this.previewService.createPreviewToken(created.project.id, ownerId, 1, 3600);
        const previewUrl = this.buildPreviewUrl(token.token);

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `🎉 Created new site "${siteName}" (${slug})!\n\nPreview your new site:`,
              link: {
                url: previewUrl,
                label: "View Preview",
              },
              previewUrl,
            },
          ],
          activeProjectId: created.project.id,
          commandExecuted: "NEW",
          timestamp,
        };
      }

      case "PREVIEW": {
        const project = await this.resolveActiveProject(ownerId, state);
        if (!project) {
          return {
            messageId: incoming.messageId,
            replies: [{ text: "No active project found. Type 'NEW <site name>' to create one." }],
            activeProjectId: null,
            commandExecuted: "PREVIEW",
            timestamp,
          };
        }

        const token = await this.previewService.createPreviewToken(
          project.id,
          ownerId,
          project.currentVersion,
          3600
        );
        const previewUrl = this.buildPreviewUrl(token.token);

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `Here is the current preview link for "${project.name}":\n\n${previewUrl}`,
              link: {
                url: previewUrl,
                label: "View Preview",
              },
              previewUrl,
            },
          ],
          activeProjectId: project.id,
          commandExecuted: "PREVIEW",
          timestamp,
        };
      }

      case "UNDO": {
        const project = await this.resolveActiveProject(ownerId, state);
        if (!project) {
          return {
            messageId: incoming.messageId,
            replies: [{ text: "No active project found to undo." }],
            activeProjectId: null,
            commandExecuted: "UNDO",
            timestamp,
          };
        }

        if (project.currentVersion <= 1) {
          return {
            messageId: incoming.messageId,
            replies: [{ text: "Cannot undo: this website is at its initial version." }],
            activeProjectId: state.activeProjectId,
            commandExecuted: "UNDO",
            timestamp,
          };
        }

        const targetVersion = project.currentVersion - 1;
        const restored = await this.versionService.restore(
          project.id,
          ownerId,
          targetVersion
        );

        const token = await this.previewService.createPreviewToken(
          project.id,
          ownerId,
          restored.versionNumber,
          3600
        );
        const previewUrl = this.buildPreviewUrl(token.token);

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `↩️ Undone! I've restored your previous version for "${project.name}".\n\nPreview:`,
              link: {
                url: previewUrl,
                label: "View Reverted Site",
              },
              previewUrl,
            },
          ],
          activeProjectId: project.id,
          commandExecuted: "UNDO",
          timestamp,
        };
      }

      case "PUBLISH_REQUEST": {
        const project = await this.resolveActiveProject(ownerId, state);

        if (!project) {
          return {
            messageId: incoming.messageId,
            replies: [{ text: "No active website found to publish. Type 'MENU' to select a site." }],
            activeProjectId: null,
            commandExecuted: "PUBLISH_REQUEST",
            timestamp,
          };
        }

        const token = await this.previewService.createPreviewToken(
          project.id,
          ownerId,
          project.currentVersion,
          1800
        );
        const previewUrl = this.buildPreviewUrl(token.token);

        state.pendingConfirmation = {
          type: "publish",
          projectId: project.id,
          versionNumber: project.currentVersion,
          previewUrl,
          expiresAt: Date.now() + 10 * 60 * 1000,
        };
        state.conversationState = "AWAITING_PUBLISH_CONFIRMATION";

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `Ready to publish "${project.name}" live?\n\nPreview your changes before publishing:\n${previewUrl}`,
              menu: [
                { number: 1, label: "Publish now (Go live)" },
                { number: 2, label: "Keep editing (Stay in draft)" },
              ],
              previewUrl,
            },
          ],
          activeProjectId: project.id,
          commandExecuted: "PUBLISH_REQUEST",
          timestamp,
        };
      }

      case "NUMBER_SELECTION": {
        // Handle pending publish confirmation
        if (state.pendingConfirmation?.type === "publish") {
          const conf = state.pendingConfirmation;

          // Check expiration
          if (Date.now() > conf.expiresAt) {
            state.pendingConfirmation = null;
            state.conversationState = "IDLE";
            return {
              messageId: incoming.messageId,
              replies: [
                {
                  text: "Publish confirmation has expired. Type 'PUBLISH' when you are ready to review and go live.",
                },
              ],
              activeProjectId: state.activeProjectId,
              commandExecuted: "EXPIRED_CONFIRMATION",
              timestamp,
            };
          }

          if (command.number === 1) {
            const canPublish = await this.policy.canPublish(ownerId, conf.projectId);
            if (!canPublish) {
              state.pendingConfirmation = null;
              state.conversationState = "IDLE";
              return {
                messageId: incoming.messageId,
                replies: [
                  {
                    text: "Publishing is restricted on your current plan.",
                  },
                ],
                activeProjectId: conf.projectId,
                commandExecuted: "PUBLISH_REJECTED",
                timestamp,
              };
            }

            // EXECUTE PUBLISH
            await this.publishService.publish(
              conf.projectId,
              ownerId,
              conf.versionNumber
            );

            state.pendingConfirmation = null;
            state.conversationState = "IDLE";

            const project = await this.projectRepo.getById(conf.projectId, ownerId);
            const liveUrl = this.buildSiteUrl(project?.slug || "site");

            return {
              messageId: incoming.messageId,
              replies: [
                {
                  text: `🎉 Congratulations! "${project?.name || "Your website"}" is now LIVE at:\n${liveUrl}\n\nVisitors can view your services and message you directly on WhatsApp!`,
                  link: {
                    url: liveUrl,
                    label: "Visit Live Website",
                  },
                },
              ],
              activeProjectId: conf.projectId,
              commandExecuted: "PUBLISH_EXECUTE",
              timestamp,
            };
          } else if (command.number === 2) {
            state.pendingConfirmation = null;
            state.conversationState = "IDLE";
            return {
              messageId: incoming.messageId,
              replies: [
                {
                  text: "Publishing cancelled. Your site remains in draft mode. What else would you like to edit?",
                },
              ],
              activeProjectId: conf.projectId,
              commandExecuted: "PUBLISH_CANCEL",
              timestamp,
            };
          }
        }

        // Handle pending project selection
        if (state.pendingConfirmation?.type === "project_selection") {
          const conf = state.pendingConfirmation;
          const selected = conf.projects[command.number - 1];
          if (selected) {
            state.activeProjectId = selected.id;
            state.pendingConfirmation = null;
            state.conversationState = "IDLE";
            return {
              messageId: incoming.messageId,
              replies: [
                {
                  text: `Switched active website to "${selected.name}" (${selected.slug}). What would you like to update?`,
                },
              ],
              activeProjectId: selected.id,
              commandExecuted: "SWITCH_PROJECT",
              timestamp,
            };
          }
        }

        return {
          messageId: incoming.messageId,
          replies: [
            {
              text: `Option ${command.number} is not valid right now. Type 'MENU' to see available options.`,
            },
          ],
          activeProjectId: state.activeProjectId,
          commandExecuted: "INVALID_NUMBER",
          timestamp,
        };
      }
    }
  }

  private async resolveActiveProject(ownerId: string, state: OwnerState) {
    if (state.activeProjectId) {
      const proj = await this.projectRepo.getById(state.activeProjectId, ownerId);
      if (proj && !proj.deletedAt) {
        return proj;
      }
    }
    const projects = await this.projectRepo.listByOwner(ownerId);
    if (projects.length === 1 && projects[0]) {
      state.activeProjectId = projects[0].id;
      return projects[0];
    }
    return null;
  }

  getBudgetTracker(): BudgetTracker {
    return this.budgetTracker;
  }
}
