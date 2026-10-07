import { DurableObject } from "cloudflare:workers";
import {
  AgentOrchestrator,
  IncomingMessage,
  AgentResponse,
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
} from "@replyiq/core";
import { SqliteOwnerStateStore } from "./sqlite-state-store.js";
import { GlobalCounterDO } from "./global-counter-do.js";

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
  AI?: any;
  GEMINI_API_KEY?: string;
  FALLBACK_MODEL?: string;
  MOCK_PROVIDER?: string;
  MAX_MESSAGES_PER_OWNER?: string;
  MAX_MODEL_CALLS_PER_OWNER?: string;
  MAX_FALLBACK_CALLS_PER_OWNER?: string;
  GLOBAL_DAILY_NEURON_CAP?: string;
}

class DurableObjectGlobalUsageStore implements IGlobalUsageStore {
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

    // 3. Domain Services
    const baseDomain = (this.env.BASE_DOMAIN || "localhost").toLowerCase();
    const previewBaseUrl = this.env.PREVIEW_BASE_URL || "http://localhost:8787/preview";

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
      defaultProvider = new MockProvider();
    } else if (this.env.AI) {
      defaultProvider = new WorkersAIProvider({ aiBinding: this.env.AI });
    } else if (this.env.CF_ACCOUNT_ID && this.env.CF_API_TOKEN) {
      defaultProvider = new WorkersAIProvider({
        accountId: this.env.CF_ACCOUNT_ID,
        apiToken: this.env.CF_API_TOKEN,
      });
    } else {
      // Default to MockProvider in local-dev if credentials are not configured
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
    });
  }

  /**
   * Primary RPC method for processing an incoming message.
   */
  async handleMessage(incoming: IncomingMessage): Promise<AgentResponse> {
    return this.orchestrator.handleMessage(incoming);
  }

  /**
   * HTTP handler allowing HTTP invocation of the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const body = (await request.json()) as IncomingMessage;
      const response = await this.handleMessage(body);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: err?.message || "Internal agent error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}
