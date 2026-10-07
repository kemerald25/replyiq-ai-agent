import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentOrchestrator,
  InMemoryOwnerStateStore,
  ModelProvider,
  ModelGenerationOptions,
  ModelGenerationResult,
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

class MockFailingAndRecoveringProvider implements ModelProvider {
  readonly providerName = "mock-recovering";
  public callCount = 0;
  public succeedOnCallNumber: number;

  constructor(succeedOnCallNumber: number) {
    this.succeedOnCallNumber = succeedOnCallNumber;
  }

  async generate(_options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    this.callCount += 1;

    if (this.callCount < this.succeedOnCallNumber) {
      // Return invalid operation (e.g. invalid color hex)
      return {
        text: "I am trying to update the color.",
        toolCalls: [
          {
            id: `call_${this.callCount}`,
            name: "edit_site",
            arguments: {
              summary: "Invalid palette preset",
              operations: [
                {
                  op: "update_theme",
                  theme: {
                    palette: "invalid-palette-xyz" as any,
                  },
                },
              ],
            },
          },
        ],
        usage: { inputTokens: 100, outputTokens: 50, estimatedNeurons: 1 },
        modelName: "test-model",
      };
    }

    // Success on subsequent retry
    return {
      text: "I fixed the palette preset to lagos-emerald.",
      toolCalls: [
        {
          id: `call_${this.callCount}`,
          name: "edit_site",
          arguments: {
            summary: "Updated palette preset to lagos-emerald",
            operations: [
              {
                op: "update_theme",
                theme: {
                  palette: "lagos-emerald",
                },
              },
            ],
          },
        },
      ],
      usage: { inputTokens: 120, outputTokens: 60, estimatedNeurons: 1 },
      modelName: "test-model",
    };
  }
}

describe("Model Validation Retry Loop", () => {
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

  it("recovers on retry 2 when model corrects invalid operation", async () => {
    const provider = new MockFailingAndRecoveringProvider(2); // Fails on call 1, succeeds on call 2
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: provider,
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_retry_1",
      text: "Make my button color green",
    });

    expect(provider.callCount).toBe(2);
    expect(res.replies[0]?.text).toContain("Updated palette preset to lagos-emerald");
    expect(res.replies[0]?.previewUrl).toBeDefined();

    // Verify version 2 was created
    const proj = await projectRepo.getById("proj_1");
    expect(proj?.currentVersion).toBe(2);
  });

  it("aborts after 2 failed retries, applies zero changes, and returns friendly message", async () => {
    const provider = new MockFailingAndRecoveringProvider(999); // Always fails
    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: provider,
    });

    const res = await orchestrator.handleMessage({
      ownerPhone: OWNER_PHONE,
      messageId: "msg_retry_fail",
      text: "Make my color invalid",
    });

    expect(provider.callCount).toBe(3); // Initial call + 2 retries
    expect(res.replies[0]?.text).toContain("No changes were made to your site");

    // Verify no new version was committed
    const proj = await projectRepo.getById("proj_1");
    expect(proj?.currentVersion).toBe(1);
  });
});
