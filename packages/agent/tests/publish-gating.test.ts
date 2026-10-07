import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentOrchestrator,
  InMemoryOwnerStateStore,
  MockProvider,
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

describe("Publish Gating & Confirmation Flow", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishService: PublishService;
  let versionService: VersionService;
  let previewService: PreviewService;
  let stateStore: InMemoryOwnerStateStore;
  let mockProvider: MockProvider;
  let orchestrator: AgentOrchestrator;

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
    mockProvider = new MockProvider();

    orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: mockProvider,
    });

    await ownerRepo.create({ id: OWNER_ID, phoneNumber: OWNER_PHONE, displayName: "Test Owner" });
    await assetRepo.create({
      id: "asset_salon_hero",
      ownerId: OWNER_ID,
      hash: "hash_hero_1",
      r2Key: "assets/asset_salon_hero.jpg",
      sizeBytes: 1024,
      mimeType: "image/jpeg",
      width: 800,
      height: 600,
    });
    await projectRepo.createWithInitialVersion(
      {
        id: "proj_1",
        ownerId: OWNER_ID,
        slug: "test-salon",
        name: "Test Salon",
        template: "portfolio",
        status: "draft",
        currentVersion: 1,
        publishedVersion: null,
        suspendedReason: null,
        deletedAt: null,
      },
      allSampleDocuments.salon,
      "user",
      "Initial version"
    );
  });

  it("typing 'publish' triggers confirmation menu and does not publish yet", async () => {
    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_1",
      text: "publish",
    });

    expect(res.commandExecuted).toBe("PUBLISH_REQUEST");
    expect(res.replies[0]?.text).toContain("Ready to publish");
    expect(res.replies[0]?.menu).toBeDefined();
    expect(res.replies[0]?.menu?.[0]?.label).toBe("Publish now (Go live)");

    // Project is still draft
    const proj = await projectRepo.getById("proj_1");
    expect(proj?.status).toBe("draft");
    expect(proj?.publishedVersion).toBeNull();
  });

  it("selecting '1' executes publish and transitions site to live", async () => {
    // 1. Trigger confirmation
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_init",
      text: "publish",
    });

    // 2. Reply '1'
    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_confirm",
      text: "1",
    });

    expect(res.commandExecuted).toBe("PUBLISH_EXECUTE");
    expect(res.replies[0]?.text).toContain("Congratulations! \"Test Salon\" is now LIVE");
    expect(res.replies[0]?.link?.url).toContain("test-salon.localhost");

    // Project is now live
    const proj = await projectRepo.getById("proj_1");
    expect(proj?.status).toBe("live");
    expect(proj?.publishedVersion).toBe(1);
  });

  it("selecting '2' cancels publishing and leaves site in draft", async () => {
    // 1. Trigger confirmation
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_init2",
      text: "publish",
    });

    // 2. Reply '2'
    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_cancel",
      text: "2",
    });

    expect(res.commandExecuted).toBe("PUBLISH_CANCEL");
    expect(res.replies[0]?.text).toContain("Publishing cancelled. Your site remains in draft");

    const proj = await projectRepo.getById("proj_1");
    expect(proj?.status).toBe("draft");
  });

  it("any conversational message cancels a pending publish confirmation", async () => {
    // 1. Trigger confirmation
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_init3",
      text: "publish",
    });

    const stateBefore = await stateStore.getState(OWNER_ID);
    expect(stateBefore.pendingConfirmation).not.toBeNull();

    // 2. User sends another edit instead of answering 1 or 2
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_continue_edit",
      text: "Change haircut price to 15k",
    });

    const stateAfter = await stateStore.getState(OWNER_ID);
    expect(stateAfter.pendingConfirmation).toBeNull(); // Cancelled
  });

  it("rejects publishing when confirmation expires", async () => {
    await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_init4",
      text: "publish",
    });

    // Artificially expire the confirmation
    const state = await stateStore.getState(OWNER_ID);
    if (state.pendingConfirmation) {
      state.pendingConfirmation.expiresAt = Date.now() - 1000;
      await stateStore.saveState(OWNER_ID, state);
    }

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_pub_expired",
      text: "1",
    });

    expect(res.commandExecuted).toBe("EXPIRED_CONFIRMATION");
    expect(res.replies[0]?.text).toContain("Publish confirmation has expired");

    const proj = await projectRepo.getById("proj_1");
    expect(proj?.status).toBe("draft");
  });
});
