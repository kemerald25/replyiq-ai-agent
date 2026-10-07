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

describe("Idempotency & Sequential Concurrency", () => {
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

  it("returns cached response on duplicate messageId without reapplying edits", async () => {
    // First invocation creates version 2
    const res1 = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_dup_1",
      text: "Change haircut price to 15k",
    });

    const projAfterFirst = await projectRepo.getById("proj_1");
    expect(projAfterFirst?.currentVersion).toBe(2);

    // Duplicate messageId
    const res2 = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_dup_1",
      text: "Change haircut price to 15k",
    });

    expect(res2.messageId).toBe("msg_dup_1");
    expect(res2.replies).toEqual(res1.replies);

    // Document version remains 2 (was not incremented again)
    const projAfterSecond = await projectRepo.getById("proj_1");
    expect(projAfterSecond?.currentVersion).toBe(2);
  });

  it("handles duplicate message arriving while the first is in-flight by waiting for original", async () => {
    // Fire two identical requests simultaneously
    const [resA, resB] = await Promise.all([
      orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_simultaneous_1",
        text: "Change haircut price to 15k",
      }),
      orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_simultaneous_1",
        text: "Change haircut price to 15k",
      }),
    ]);

    expect(resA.messageId).toBe("msg_simultaneous_1");
    expect(resB.messageId).toBe("msg_simultaneous_1");
    expect(resA.replies).toEqual(resB.replies);

    const proj = await projectRepo.getById("proj_1");
    expect(proj?.currentVersion).toBe(2);
  });

  it("processes rapid different messages strictly sequentially without interleaving edits", async () => {
    // Fire two different edit requests concurrently
    const [res1, res2] = await Promise.all([
      orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_seq_1",
        text: "Change haircut price to 15k",
      }),
      orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_seq_2",
        text: "Change color to green",
      }),
    ]);

    expect(res1.messageId).toBe("msg_seq_1");
    expect(res2.messageId).toBe("msg_seq_2");

    // Both edits completed sequentially, resulting in version 3
    const proj = await projectRepo.getById("proj_1");
    expect(proj?.currentVersion).toBe(3);
  });
});
