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

describe("Numeric Reply '1' Context-Aware Behavior", () => {
  let ownerRepo: InMemoryOwnerRepository;
  let projectRepo: InMemoryProjectRepository;
  let versionRepo: InMemoryVersionRepository;
  let publishService: PublishService;
  let versionService: VersionService;
  let previewService: PreviewService;
  let stateStore: InMemoryOwnerStateStore;
  let orchestrator: AgentOrchestrator;

  const PHONE = "+2348012345678";
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
      "replyiq.cv"
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
      "replyiq.cv"
    );
    stateStore = new InMemoryOwnerStateStore();

    orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: new MockProvider(),
      baseDomain: "replyiq.cv",
    });

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: PHONE,
      displayName: "Context Test Owner",
    });

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

    // Create 2 projects for the owner
    await projectRepo.createWithInitialVersion(
      {
        id: "proj_hair",
        ownerId: OWNER_ID,
        slug: "amaka-hair",
        name: "Amaka Hair Studio",
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

    await projectRepo.createWithInitialVersion(
      {
        id: "proj_nails",
        ownerId: OWNER_ID,
        slug: "amaka-nails",
        name: "Amaka Nails & Spa",
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

  it("proves '1' is rejected when sent in idle state (no pending menu or confirmation)", async () => {
    const res = await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_idle_1",
      text: "1",
    });

    expect(res.commandExecuted).toBe("INVALID_NUMBER");
    expect(res.replies[0]?.text).toContain("Option 1 is not valid right now");

    // Proves project was NOT published
    const proj = await projectRepo.getById("proj_hair", OWNER_ID);
    expect(proj?.status).toBe("draft");
    expect(proj?.publishedVersion).toBeNull();
  });

  it("proves '1' selects Project #1 when a project menu is pending, and does NOT go live", async () => {
    // Set pending project selection menu
    const state = await stateStore.getState(OWNER_ID);
    state.pendingConfirmation = {
      type: "project_selection",
      projects: [
        { id: "proj_hair", name: "Amaka Hair Studio", slug: "amaka-hair" },
        { id: "proj_nails", name: "Amaka Nails & Spa", slug: "amaka-nails" },
      ],
      expiresAt: Date.now() + 60000,
    };
    state.conversationState = "AWAITING_PROJECT_SELECTION";
    await stateStore.saveState(OWNER_ID, state);

    const res = await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_select_proj_1",
      text: "1",
    });

    expect(res.commandExecuted).toBe("SWITCH_PROJECT");
    expect(res.replies[0]?.text).toContain('Switched active website to "Amaka Hair Studio"');
    expect(res.activeProjectId).toBe("proj_hair");

    // Verify site was NOT published
    const proj = await projectRepo.getById("proj_hair", OWNER_ID);
    expect(proj?.status).toBe("draft");
    expect(proj?.publishedVersion).toBeNull();
  });

  it("proves '1' executes publish ONLY when in pending publish confirmation state", async () => {
    // Set active project first
    const st = await stateStore.getState(OWNER_ID);
    st.activeProjectId = "proj_hair";
    await stateStore.saveState(OWNER_ID, st);

    // 1. User says publish -> enters pending publish confirmation
    const pubReqRes = await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_pub_req",
      text: "publish",
    });

    expect(pubReqRes.commandExecuted).toBe("PUBLISH_REQUEST");
    expect(pubReqRes.replies[0]?.menu).toEqual([
      { number: 1, label: "Publish now (Go live)" },
      { number: 2, label: "Keep editing (Stay in draft)" },
    ]);

    // 2. User confirms with 1 -> executes go live
    const confirmRes = await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_confirm_1",
      text: "1",
    });

    expect(confirmRes.commandExecuted).toBe("PUBLISH_EXECUTE");
    expect(confirmRes.replies[0]?.text).toContain("LIVE at");
    expect(confirmRes.replies[0]?.link?.url).toBe("https://amaka-hair.replyiq.cv");

    // Proves project is now published in database
    const proj = await projectRepo.getById("proj_hair", OWNER_ID);
    expect(proj?.status).toBe("live");
    expect(proj?.publishedVersion).toBe(1);
  });

  it("proves '1' does not publish if publish confirmation has expired", async () => {
    // Set active project first
    const st = await stateStore.getState(OWNER_ID);
    st.activeProjectId = "proj_hair";
    await stateStore.saveState(OWNER_ID, st);

    await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_pub_init",
      text: "publish",
    });

    // Manually expire confirmation
    const state = await stateStore.getState(OWNER_ID);
    if (state.pendingConfirmation) {
      state.pendingConfirmation.expiresAt = Date.now() - 5000;
      await stateStore.saveState(OWNER_ID, state);
    }

    const res = await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_confirm_expired",
      text: "1",
    });

    expect(res.commandExecuted).toBe("EXPIRED_CONFIRMATION");
    expect(res.replies[0]?.text).toContain("confirmation has expired");

    const proj = await projectRepo.getById("proj_hair", OWNER_ID);
    expect(proj?.status).toBe("draft");
  });
});
