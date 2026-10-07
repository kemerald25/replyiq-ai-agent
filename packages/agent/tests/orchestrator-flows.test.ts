import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentOrchestrator,
  InMemoryOwnerStateStore,
  MockProvider,
  ModelProvider,
  ModelGenerationResult,
  ModelGenerationOptions,
  BudgetTracker,
} from "../src/index.js";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPublishEventRepository,
  InMemoryPreviewRepository,
  InMemoryAssetRepository,
  InMemoryStorageService,
  PublishService,
  VersionService,
  PreviewService,
} from "@replyiq/core";
import { allSampleDocuments } from "@replyiq/templates";

class FailingProvider implements ModelProvider {
  readonly providerName = "failing-provider";
  async generate(_options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    throw new Error("Simulated provider outage");
  }
}

class SuccessfulFallbackProvider implements ModelProvider {
  readonly providerName = "gemini-fallback";
  async generate(_options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    return {
      text: "Fallback handled your request successfully.",
      usage: { inputTokens: 50, outputTokens: 20, estimatedNeurons: 0 },
      modelName: "gemini-fallback",
    };
  }
}

describe("Orchestrator Fallback, Budget, and Edge Flows", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishService: PublishService;
  let versionService: VersionService;
  let previewService: PreviewService;
  let stateStore: InMemoryOwnerStateStore;

  const OWNER_PHONE = "+2348012345678";
  const OWNER_ID = "owner_2348012345678";

  beforeEach(async () => {
    ownerRepo = new InMemoryOwnerRepository();
    projectRepo = new InMemoryProjectRepository();
    versionRepo = new InMemoryVersionRepository(projectRepo);
    const publishEventRepo = new InMemoryPublishEventRepository();
    const previewRepo = new InMemoryPreviewRepository();
    const assetRepo = new InMemoryAssetRepository();
    const storage = new InMemoryStorageService();

    publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storage,
      "localhost"
    );
    versionService = new VersionService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      previewRepo
    );
    previewService = new PreviewService(
      projectRepo,
      versionRepo,
      previewRepo,
      "localhost"
    );
    stateStore = new InMemoryOwnerStateStore();

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: OWNER_PHONE,
      displayName: "Test Owner",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: "proj_flow",
        ownerId: OWNER_ID,
        slug: "test-flow",
        name: "Test Flow",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      allSampleDocuments.salon,
      "user",
      "Initial"
    );
  });

  it("transparently invokes fallback provider when default provider fails", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new FailingProvider(),
      fallbackProvider: new SuccessfulFallbackProvider(),
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_fallback_1",
      text: "Hello I want to edit my site",
    });

    expect(res.replies[0]?.text).toContain("Fallback handled your request");
    expect(res.modelUsed).toBe("gemini-fallback");

    const state = await stateStore.getState(OWNER_ID);
    expect(state.usage.fallbackCallCount).toBe(1);
  });

  it("returns graceful failure message when both default and fallback fail", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new FailingProvider(),
      fallbackProvider: new FailingProvider(),
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_fallback_fail",
      text: "Make price 1000",
    });

    expect(res.replies[0]?.text).toContain("temporarily unable to process your request");
  });

  it("stops and replies gracefully when global neuron cap (8000) is reached", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
      budgetTracker: new BudgetTracker({ globalDailyNeuronCap: 8000 }),
    });

    // Artificially set global neuron usage to 8500
    const state = await stateStore.getState(OWNER_ID);
    await orchestrator.getBudgetTracker().recordModelUsage(state.usage, 8500, false);

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_global_cap",
      text: "Change title to luxury spa",
    });

    expect(res.replies[0]?.text).toContain("temporarily reached its daily capacity limit");
  });

  it("handles CANCEL command to reset pending confirmation", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    // First trigger publish request
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_req",
      text: "PUBLISH",
    });

    let state = await stateStore.getState(OWNER_ID);
    expect(state.pendingConfirmation).not.toBeNull();

    // Now cancel
    const cancelRes = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_cancel",
      text: "CANCEL",
    });

    expect(cancelRes.commandExecuted).toBe("CANCEL");
    expect(cancelRes.replies[0]?.text).toContain("Cancelled");

    state = await stateStore.getState(OWNER_ID);
    expect(state.pendingConfirmation).toBeNull();
    expect(state.conversationState).toBe("IDLE");
  });

  it("handles option 2 (Keep editing / stay in draft) during publish confirmation", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_opt2",
      text: "PUBLISH",
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_choose_2",
      text: "2",
    });

    expect(res.commandExecuted).toBe("PUBLISH_CANCEL");
    expect(res.replies[0]?.text).toContain("Publishing cancelled. Your site remains in draft mode");

    const state = await stateStore.getState(OWNER_ID);
    expect(state.pendingConfirmation).toBeNull();
  });

  it("notifies user when publish confirmation has expired", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_exp",
      text: "PUBLISH",
    });

    // Manually expire confirmation
    const state = await stateStore.getState(OWNER_ID);
    if (state.pendingConfirmation) {
      state.pendingConfirmation.expiresAt = Date.now() - 1000;
      await stateStore.saveState(OWNER_ID, state);
    }

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_choose_1_expired",
      text: "1",
    });

    expect(res.commandExecuted).toBe("EXPIRED_CONFIRMATION");
    expect(res.replies[0]?.text).toContain("confirmation has expired");
  });

  it("replies with helpful message when invalid number is sent with no pending confirmation", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_num_random",
      text: "5",
    });

    expect(res.commandExecuted).toBe("INVALID_NUMBER");
    expect(res.replies[0]?.text).toContain("Option 5 is not valid right now");
  });

  it("handles switching project via number selection when project_selection is pending", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    const state = await stateStore.getState(OWNER_ID);
    state.pendingConfirmation = {
      type: "project_selection",
      projects: [
        { id: "proj_flow", name: "Test Flow", slug: "test-flow" },
        { id: "proj_second", name: "Second Site", slug: "second-site" },
      ],
      expiresAt: Date.now() + 60000,
    };
    state.conversationState = "AWAITING_PROJECT_SELECTION";
    await stateStore.saveState(OWNER_ID, state);

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_select_site_2",
      text: "2",
    });

    expect(res.commandExecuted).toBe("SWITCH_PROJECT");
    expect(res.replies[0]?.text).toContain('Switched active website to "Second Site"');
    expect(res.activeProjectId).toBe("proj_second");
  });

  it("rejects project creation when policy disallows it", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
      policy: {
        async canCreateProject() {
          return false;
        },
        async canPublish() {
          return true;
        },
      },
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_new_limit",
      text: "NEW Boutique",
    });

    expect(res.commandExecuted).toBe("NEW");
    expect(res.replies[0]?.text).toContain("maximum number of websites allowed");
  });

  it("handles publish rejection when policy disallows publishing", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
      policy: {
        async canCreateProject() {
          return true;
        },
        async canPublish() {
          return false;
        },
      },
    });

    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_init",
      text: "PUBLISH",
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_confirm_rejected",
      text: "1",
    });

    expect(res.commandExecuted).toBe("PUBLISH_REJECTED");
    expect(res.replies[0]?.text).toContain("Publishing is restricted on your current plan");
  });

  it("returns error when PUBLISH is requested without an active project", async () => {
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    // Delete or clear projects
    const emptyOwnerPhone = "+2348099999999";
    await ownerRepo.create({
      id: "owner_empty",
      phoneNumber: emptyOwnerPhone,
      displayName: "Empty Owner",
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: emptyOwnerPhone,
      messageId: "msg_no_proj",
      text: "PUBLISH",
    });

    expect(res.commandExecuted).toBe("PUBLISH_REQUEST");
    expect(res.replies[0]?.text).toContain("No active website found to publish");
  });

  it("InMemoryOwnerStateStore handles date rollover and processed messages", async () => {
    const store = new InMemoryOwnerStateStore();
    const st = await store.getState("test_owner_rollover");
    st.usage.dateKey = "2020-01-01";
    st.usage.messageCount = 50;
    st.usage.modelCallCount = 20;
    await store.saveState("test_owner_rollover", st);

    const reloaded = await store.getState("test_owner_rollover");
    expect(reloaded.usage.messageCount).toBe(0);
    expect(await store.isMessageProcessed("test_owner_rollover", "msg_x")).toBe(false);
  });

  it("trims conversation history to maximum of 20 messages", async () => {
    const st = await stateStore.getState(OWNER_ID);
    st.conversationHistory = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as any,
      content: `Message ${i + 1}`,
    }));
    await stateStore.saveState(OWNER_ID, st);

    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
    });

    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_trim_history",
      text: "Change hero heading to Trimmed",
    });

    const updatedSt = await stateStore.getState(OWNER_ID);
    expect(updatedSt.conversationHistory.length).toBeLessThanOrEqual(20);
  });
});
