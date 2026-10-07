import { describe, it, expect, vi } from "vitest";
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

class SlowProvider implements ModelProvider {
  readonly providerName = "slow-provider";
  public callsInProgress = 0;
  public maxConcurrent = 0;
  public executionLog: string[] = [];

  constructor(private delayMs: number) {}

  async generate(options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    this.callsInProgress++;
    this.maxConcurrent = Math.max(this.maxConcurrent, this.callsInProgress);

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.executionLog.push(`start:${callId}`);

    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    this.executionLog.push(`end:${callId}`);
    this.callsInProgress--;

    return {
      text: "Slow response finished",
      usage: { inputTokens: 50, outputTokens: 20, estimatedNeurons: 1 },
      modelName: "slow-test-model",
    };
  }
}

describe("Sequential Locking & Slow Provider Lock Defense", () => {
  it("proves that a second message cannot steal the lock while a slow call is in-flight", async () => {
    const ownerRepo = new InMemoryOwnerRepository();
    const projectRepo = new InMemoryProjectRepository();
    const versionRepo = new InMemoryVersionRepository(projectRepo);
    const publishEventRepo = new InMemoryPublishEventRepository();
    const previewRepo = new InMemoryPreviewRepository();
    const assetRepo = new InMemoryAssetRepository();
    const storage = new InMemoryStorageService();

    const publishService = new PublishService(
      projectRepo,
      versionRepo,
      publishEventRepo,
      assetRepo,
      storage,
      "localhost"
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
      "localhost"
    );
    const stateStore = new InMemoryOwnerStateStore();

    const slowProvider = new SlowProvider(100);

    const PHONE = "+2348012345678";
    const OWNER_ID = "owner_2348012345678";

    await ownerRepo.create({
      id: OWNER_ID,
      phoneNumber: PHONE,
      displayName: "Slow Lock Test",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: "proj_slow",
        ownerId: OWNER_ID,
        slug: "slow-test",
        name: "Slow Test",
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

    const orchestrator = new AgentOrchestrator({
      ownerRepo,
      projectRepo,
      versionRepo,
      publishService,
      versionService,
      previewService,
      stateStore,
      defaultProvider: slowProvider,
      turnTimeoutMs: 5000,
    });

    // Launch Message 1 (takes 100ms)
    const p1 = orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_slow_1",
      text: "First command",
    });

    // Immediately launch Message 2 for the same owner while Message 1 is running
    const p2 = orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_slow_2",
      text: "Second command",
    });

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.messageId).toBe("msg_slow_1");
    expect(res2.messageId).toBe("msg_slow_2");

    // The slow provider was called twice, but strictly ONE AT A TIME (never concurrently)
    expect(slowProvider.maxConcurrent).toBe(1);
    expect(slowProvider.executionLog).toHaveLength(4);
    // Sequence must be: start(1), end(1), start(2), end(2)
    expect(slowProvider.executionLog[0]?.startsWith("start:")).toBe(true);
    expect(slowProvider.executionLog[1]?.startsWith("end:")).toBe(true);
    expect(slowProvider.executionLog[2]?.startsWith("start:")).toBe(true);
    expect(slowProvider.executionLog[3]?.startsWith("end:")).toBe(true);
  });
});
