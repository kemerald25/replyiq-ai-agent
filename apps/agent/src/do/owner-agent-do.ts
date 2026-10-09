import { DurableObject } from "cloudflare:workers";
import {
  AgentOrchestrator,
  IncomingMessage,
  AgentResponse,
  MediaReference,
  BudgetTracker,
  IGlobalUsageStore,
  ModelProvider,
  WorkersAIProvider,
  GeminiProvider,
  MockProvider,
} from "@replyiq/agent";
import {
  D1OwnerRepository,
  D1ProjectRepository,
  D1VersionRepository,
  D1PublishEventRepository,
  D1AssetRepository,
  D1PreviewRepository,
  R2StorageService,
  PublishService,
  VersionService,
  PreviewService,
  AssetService,
} from "@replyiq/core";
import { SqliteOwnerStateStore } from "./sqlite-state-store.js";
import { GlobalCounterDO } from "./global-counter-do.js";
import { TelegramClient } from "../telegram/client.js";
import { TelegramUpdate, InlineKeyboardMarkup } from "../telegram/types.js";
import { validateImageMagicBytes } from "../telegram/media.js";
import {
  escapeHtml,
  splitTelegramText,
  parseMenuOptions,
  buildInlineMenuKeyboard,
  getLinkPreviewOptions,
} from "../telegram/formatting.js";

export interface AgentEnv {
  DB: D1Database;
  SITES_BUCKET: R2Bucket;
  ASSETS_BUCKET: R2Bucket;
  OWNER_AGENTS: DurableObjectNamespace<OwnerAgentDO>;
  GLOBAL_COUNTER: DurableObjectNamespace<GlobalCounterDO>;
  BASE_DOMAIN?: string;
  ENVIRONMENT?: string;
  DEV_SECRET?: string;
  PREVIEW_BASE_URL?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  GEMINI_API_KEY?: string;
  FALLBACK_MODEL?: string;
  MOCK_PROVIDER?: string;
  MAX_MESSAGES_PER_OWNER?: string;
  MAX_MODEL_CALLS_PER_OWNER?: string;
  MAX_FALLBACK_CALLS_PER_OWNER?: string;
  GLOBAL_DAILY_NEURON_CAP?: string;
  OWNER_HASH_SECRET?: string;
  GATEWAY_SECRET_PRIMARY?: string;
  GATEWAY_SECRET_SECONDARY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_SECRET_TOKEN?: string;
  TELEGRAM_WEBHOOK_PATH_SUFFIX?: string;
  TELEGRAM_ENABLED?: string;
  TELEGRAM_RATE_LIMIT_PER_MINUTE?: string;
  TELEGRAM_API_BASE_URL?: string;
}

export class DurableObjectGlobalUsageStore implements IGlobalUsageStore {
  constructor(private namespace: DurableObjectNamespace<GlobalCounterDO>) {}

  private getStub() {
    const id = this.namespace.idFromName("global_daily_counter");
    return this.namespace.get(id);
  }

  async getDailyNeurons(dateKey: string): Promise<number> {
    const stub = this.getStub();
    return await stub.getDailyNeurons(dateKey);
  }

  async incrementDailyNeurons(dateKey: string, neurons: number): Promise<number> {
    const stub = this.getStub();
    return await stub.incrementDailyNeurons(dateKey, neurons);
  }
}

export class OwnerAgentDO extends DurableObject<AgentEnv> {
  private orchestrator: AgentOrchestrator;
  private messageQueue: Promise<unknown> = Promise.resolve();
  private assetService: AssetService;
  private telegramClient?: TelegramClient;

  constructor(ctx: DurableObjectState, env: AgentEnv) {
    super(ctx, env);

    // 1. Storage & State Store
    const stateStore = new SqliteOwnerStateStore(this.ctx.storage.sql);

    // 2. Repositories
    const ownerRepo = new D1OwnerRepository(this.env.DB);
    const projectRepo = new D1ProjectRepository(this.env.DB);
    const versionRepo = new D1VersionRepository(this.env.DB);
    const publishEventRepo = new D1PublishEventRepository(this.env.DB);
    const assetRepo = new D1AssetRepository(this.env.DB);
    const previewRepo = new D1PreviewRepository(this.env.DB);
    const storageService = new R2StorageService(
      this.env.SITES_BUCKET,
      this.env.ASSETS_BUCKET
    );
    this.assetService = new AssetService(assetRepo, storageService);

    if (this.env.TELEGRAM_BOT_TOKEN) {
      this.telegramClient = new TelegramClient({
        botToken: this.env.TELEGRAM_BOT_TOKEN,
        apiBaseUrl: this.env.TELEGRAM_API_BASE_URL,
      });
    }

    this.initTelegramStorage();

    // 3. Domain Services
    const baseDomain = (this.env.BASE_DOMAIN || "localhost").toLowerCase();
    const previewBaseUrl = this.env.PREVIEW_BASE_URL;

    const publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storageService,
      baseDomain
    );
    const versionService = new VersionService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      previewRepo
    );
    const previewService = new PreviewService(
      projectRepo,
      versionRepo,
      previewRepo,
      baseDomain
    );

    // 4. Global Counter & Budget Tracker
    const globalUsageStore = new DurableObjectGlobalUsageStore(this.env.GLOBAL_COUNTER);
    const budgetTracker = new BudgetTracker(
      {
        maxMessagesPerOwner: this.env.MAX_MESSAGES_PER_OWNER
          ? parseInt(this.env.MAX_MESSAGES_PER_OWNER, 10)
          : undefined,
        maxModelCallsPerOwner: this.env.MAX_MODEL_CALLS_PER_OWNER
          ? parseInt(this.env.MAX_MODEL_CALLS_PER_OWNER, 10)
          : undefined,
        maxFallbackCallsPerOwner: this.env.MAX_FALLBACK_CALLS_PER_OWNER
          ? parseInt(this.env.MAX_FALLBACK_CALLS_PER_OWNER, 10)
          : undefined,
        globalDailyNeuronCap: this.env.GLOBAL_DAILY_NEURON_CAP
          ? parseFloat(this.env.GLOBAL_DAILY_NEURON_CAP)
          : undefined,
      },
      globalUsageStore
    );

    // 5. Providers Selection
    let defaultProvider: ModelProvider;
    let fallbackProvider: ModelProvider | undefined;

    if (this.env.MOCK_PROVIDER === "true") {
      if (this.env.ENVIRONMENT !== "development") {
        throw new Error(
          "Security violation: MOCK_PROVIDER is strictly prohibited outside development environment"
        );
      }
      defaultProvider = new MockProvider();
    } else if (this.env.AI) {
      defaultProvider = new WorkersAIProvider({ aiBinding: this.env.AI });
    } else if (this.env.CF_ACCOUNT_ID && this.env.CF_API_TOKEN) {
      defaultProvider = new WorkersAIProvider({
        accountId: this.env.CF_ACCOUNT_ID,
        apiToken: this.env.CF_API_TOKEN,
      });
    } else {
      if (this.env.ENVIRONMENT !== "development") {
        throw new Error(
          "Missing model credentials: Workers AI binding or account credentials required in production"
        );
      }
      defaultProvider = new MockProvider();
    }

    if (this.env.GEMINI_API_KEY) {
      fallbackProvider = new GeminiProvider({ apiKey: this.env.GEMINI_API_KEY });
    } else if (this.env.FALLBACK_MODEL === "70b") {
      if (this.env.AI) {
        fallbackProvider = new WorkersAIProvider({
          aiBinding: this.env.AI,
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        });
      } else if (this.env.CF_ACCOUNT_ID && this.env.CF_API_TOKEN) {
        fallbackProvider = new WorkersAIProvider({
          accountId: this.env.CF_ACCOUNT_ID,
          apiToken: this.env.CF_API_TOKEN,
          model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        });
      }
    }

    this.orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider,
      fallbackProvider,
      budgetTracker,
      baseDomain,
      previewBaseUrl,
      environment: (this.env.ENVIRONMENT as "development" | "production" | "staging") || "development",
      ownerHashSecret: this.env.OWNER_HASH_SECRET,
    });
  }

  /**
   * Primary RPC method for processing an incoming message.
   * Sequential promise queue ensures messages from this owner are processed
   * strictly in arrival order and never dropped.
   */
  async handleMessage(incoming: IncomingMessage): Promise<AgentResponse> {
    const task = this.messageQueue.then(
      () => this.orchestrator.handleMessage(incoming),
      () => this.orchestrator.handleMessage(incoming)
    );
    this.messageQueue = task.catch(() => {});
    return task;
  }

  /**
   * Initializes SQLite tables in Durable Object storage for Telegram updates.
   */
  private initTelegramStorage(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS telegram_inbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        update_id INTEGER UNIQUE,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        received_at INTEGER NOT NULL,
        locked_at INTEGER,
        error TEXT
      );
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS telegram_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        reply_markup TEXT,
        link_preview_options TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        sent_at INTEGER,
        error TEXT
      );
    `);
  }

  /**
   * Enqueues an incoming Telegram update into the durable inbox table and schedules an alarm.
   */
  async enqueueTelegramUpdate(update: TelegramUpdate): Promise<{ ok: boolean }> {
    const payloadJson = JSON.stringify(update);
    const receivedAt = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO telegram_inbox (update_id, payload, status, received_at) VALUES (?, ?, 'pending', ?)`,
      update.update_id,
      payloadJson,
      receivedAt
    );

    if (typeof this.ctx.storage.setAlarm === "function") {
      try {
        await this.ctx.storage.setAlarm(Date.now());
      } catch {
        // Silently handle if alarm cannot be set immediately
      }
    }

    return { ok: true };
  }

  /**
   * Cloudflare Durable Object Alarm Handler.
   * Processes the Telegram inbox queue strictly in FIFO order.
   */
  async alarm(): Promise<void> {
    await this.processTelegramQueue();
  }

  /**
   * Processes pending Telegram updates and outbox messages.
   */
  async processTelegramQueue(): Promise<void> {
    const now = Date.now();
    const timeoutThreshold = now - 60_000; // 60s stuck item timeout threshold

    // 1. Recover items stuck in processing past the timeout threshold
    this.ctx.storage.sql.exec(
      `UPDATE telegram_inbox SET status = 'pending', locked_at = NULL WHERE status = 'processing' AND locked_at < ?`,
      timeoutThreshold
    );

    // 2. Fetch and process the oldest pending update strictly in order
    const inboxCursor = this.ctx.storage.sql.exec(
      `SELECT id, update_id, payload, attempts FROM telegram_inbox WHERE status = 'pending' ORDER BY id ASC LIMIT 1`
    );
    const inboxRows = inboxCursor.toArray() as Array<{
      id: number;
      update_id: number;
      payload: string;
      attempts: number;
    }>;

    if (inboxRows.length > 0) {
      const row = inboxRows[0]!;
      this.ctx.storage.sql.exec(
        `UPDATE telegram_inbox SET status = 'processing', locked_at = ?, attempts = attempts + 1 WHERE id = ?`,
        now,
        row.id
      );

      try {
        const update = JSON.parse(row.payload) as TelegramUpdate;
        await this.handleTelegramUpdate(update);

        this.ctx.storage.sql.exec(
          `UPDATE telegram_inbox SET status = 'completed' WHERE id = ?`,
          row.id
        );
      } catch (err: unknown) {
        const errorMsg = (err as Error)?.message || String(err);
        const nextAttempts = row.attempts + 1;
        if (nextAttempts >= 3) {
          this.ctx.storage.sql.exec(
            `UPDATE telegram_inbox SET status = 'failed', error = ? WHERE id = ?`,
            errorMsg,
            row.id
          );
        } else {
          this.ctx.storage.sql.exec(
            `UPDATE telegram_inbox SET status = 'pending', locked_at = NULL, error = ? WHERE id = ?`,
            errorMsg,
            row.id
          );
        }
      }
    }

    // 3. Process pending outbox messages
    const outboxCursor = this.ctx.storage.sql.exec(
      `SELECT id, chat_id, text, reply_markup, link_preview_options, attempts FROM telegram_outbox WHERE status = 'pending' ORDER BY id ASC LIMIT 5`
    );
    const outboxRows = outboxCursor.toArray() as Array<{
      id: number;
      chat_id: number;
      text: string;
      reply_markup?: string | null;
      link_preview_options?: string | null;
      attempts: number;
    }>;

    for (const outboxRow of outboxRows) {
      if (this.telegramClient) {
        try {
          const res = await this.telegramClient.sendMessage(outboxRow.chat_id, outboxRow.text, {
            parse_mode: "HTML",
            reply_markup: outboxRow.reply_markup ? JSON.parse(outboxRow.reply_markup) : undefined,
            link_preview_options: outboxRow.link_preview_options
              ? JSON.parse(outboxRow.link_preview_options)
              : undefined,
          });

          if (res.ok) {
            this.ctx.storage.sql.exec(
              `UPDATE telegram_outbox SET status = 'sent', sent_at = ? WHERE id = ?`,
              Date.now(),
              outboxRow.id
            );
          } else {
            const nextAttempts = outboxRow.attempts + 1;
            this.ctx.storage.sql.exec(
              `UPDATE telegram_outbox SET attempts = ?, error = ?, status = ? WHERE id = ?`,
              nextAttempts,
              res.description || "Send failed",
              nextAttempts >= 3 ? "failed" : "pending",
              outboxRow.id
            );
          }
        } catch (sendErr: unknown) {
          const nextAttempts = outboxRow.attempts + 1;
          this.ctx.storage.sql.exec(
            `UPDATE telegram_outbox SET attempts = ?, error = ?, status = ? WHERE id = ?`,
            nextAttempts,
            (sendErr as Error)?.message || String(sendErr),
            nextAttempts >= 3 ? "failed" : "pending",
            outboxRow.id
          );
        }
      } else {
        // When client is not configured (e.g. testing), mark as sent
        this.ctx.storage.sql.exec(
          `UPDATE telegram_outbox SET status = 'sent', sent_at = ? WHERE id = ?`,
          Date.now(),
          outboxRow.id
        );
      }
    }

    // 4. Prune completed/failed records older than 7 days and cap table size at 1000
    const pruneAge = now - 7 * 24 * 60 * 60 * 1000;
    this.ctx.storage.sql.exec(
      `DELETE FROM telegram_inbox WHERE status IN ('completed', 'failed') AND received_at < ?`,
      pruneAge
    );
    this.ctx.storage.sql.exec(
      `DELETE FROM telegram_inbox WHERE id NOT IN (SELECT id FROM telegram_inbox ORDER BY id DESC LIMIT 1000)`
    );
    this.ctx.storage.sql.exec(
      `DELETE FROM telegram_outbox WHERE status IN ('sent', 'failed') AND created_at < ?`,
      pruneAge
    );
    this.ctx.storage.sql.exec(
      `DELETE FROM telegram_outbox WHERE id NOT IN (SELECT id FROM telegram_outbox ORDER BY id DESC LIMIT 1000)`
    );

    // 5. If more pending records exist, re-arm alarm
    const pendingInboxCount = (
      this.ctx.storage.sql.exec(`SELECT COUNT(*) as count FROM telegram_inbox WHERE status = 'pending'`).toArray()[0] as
        | { count: number }
        | undefined
    )?.count || 0;
    const pendingOutboxCount = (
      this.ctx.storage.sql.exec(`SELECT COUNT(*) as count FROM telegram_outbox WHERE status = 'pending'`).toArray()[0] as
        | { count: number }
        | undefined
    )?.count || 0;

    if (pendingInboxCount + pendingOutboxCount > 0 && typeof this.ctx.storage.setAlarm === "function") {
      try {
        await this.ctx.storage.setAlarm(Date.now() + 50);
      } catch {
        // Handled
      }
    }
  }

  /**
   * Internal processor for a single validated Telegram update.
   */
  private async handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
    let chatId: number;
    let userId: string;
    let text = "";
    let mediaReferences: MediaReference[] | undefined;

    if (update.callback_query) {
      const cq = update.callback_query;
      userId = String(cq.from.id);
      chatId = cq.message?.chat.id ?? cq.from.id;

      if (this.telegramClient) {
        await this.telegramClient.answerCallbackQuery(cq.id);
        if (cq.message) {
          await this.telegramClient.editMessageReplyMarkup(cq.message.chat.id, cq.message.message_id);
        }
      }

      const rawData = cq.data || "";
      if (rawData.startsWith("menu:")) {
        const parts = rawData.split(":");
        text = parts[2] || rawData;
      } else {
        text = rawData;
      }
    } else if (update.message) {
      const msg = update.message;
      userId = String(msg.from?.id ?? msg.chat.id);
      chatId = msg.chat.id;
      text = msg.text || msg.caption || "";

      if (msg.photo && msg.photo.length > 0 && this.telegramClient) {
        const highest = msg.photo[msg.photo.length - 1]!;
        const fileInfo = await this.telegramClient.getFile(highest.file_id);
        if (fileInfo.ok && fileInfo.result?.file_path) {
          const bytes = await this.telegramClient.downloadFile(fileInfo.result.file_path);
          const valid = validateImageMagicBytes(bytes);
          if (valid.valid) {
            const ownerRepo = new D1OwnerRepository(this.env.DB);
            let owner = await ownerRepo.getByIdentityKey(`tg:${userId}`);
            if (!owner) {
              owner = await ownerRepo.create({
                id: `owner_tg${userId}`,
                identityKey: `tg:${userId}`,
                phoneNumber: null,
                displayName: `Telegram User (${userId.slice(-4)})`,
              });
            }
            const asset = await this.assetService.uploadAsset(owner.id, bytes);
            mediaReferences = [
              {
                url: `https://assets.${this.env.BASE_DOMAIN || "localhost"}/${asset.r2Key}`,
                mimeType: asset.mimeType,
              },
            ];
            if (!text) text = "Uploaded photo";
          }
        }
      }
    } else {
      // Ignored non-message/non-callback update
      return;
    }

    const incoming: IncomingMessage = {
      messageId: `tg_${update.update_id}`,
      ownerKey: `tg:${userId}`,
      text: text.trim(),
      mediaReferences,
      channel: "telegram",
      timestamp: update.message?.date ? update.message.date * 1000 : Date.now(),
    };

    const response = await this.handleMessage(incoming);

    for (const reply of response.replies) {
      if (!reply.text) continue;

      const parsed = parseMenuOptions(reply.text);
      let bodyText = reply.text;
      let menuMarkup: InlineKeyboardMarkup | undefined;

      if (parsed.options.length > 0) {
        bodyText = parsed.bodyText || "Choose an option:";
        menuMarkup = buildInlineMenuKeyboard(
          `tg_menu_${update.update_id}`,
          parsed.options
        );
      } else if (reply.menu && reply.menu.length > 0) {
        bodyText = reply.text;
        menuMarkup = buildInlineMenuKeyboard(
          `tg_menu_${update.update_id}`,
          reply.menu.map((m) => ({ number: m.number, label: m.label }))
        );
      }

      const previewOpts = getLinkPreviewOptions(bodyText, reply.previewUrl);
      const chunks = splitTelegramText(bodyText);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const isLast = i === chunks.length - 1;
        const escaped = escapeHtml(chunk);
        const replyMarkupJson = isLast && menuMarkup ? JSON.stringify(menuMarkup) : null;
        const linkPreviewJson = JSON.stringify(previewOpts);

        this.ctx.storage.sql.exec(
          `INSERT INTO telegram_outbox (chat_id, text, reply_markup, link_preview_options, status, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?)`,
          chatId,
          escaped,
          replyMarkupJson,
          linkPreviewJson,
          Date.now()
        );
      }
    }
  }

  /**
   * HTTP handler allowing HTTP invocation of the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname === "/telegram/enqueue") {
      try {
        const update = (await request.json()) as TelegramUpdate;
        const res = await this.enqueueTelegramUpdate(update);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: unknown) {
        return new Response(
          JSON.stringify({ error: (err as Error)?.message || "Enqueue failed" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    try {
      const body = (await request.json()) as IncomingMessage;
      const response = await this.handleMessage(body);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      const error = err as Error;
      return new Response(
        JSON.stringify({
          error: error?.message || "Internal agent error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}
