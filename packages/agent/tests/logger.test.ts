import { describe, it, expect, vi } from "vitest";
import {
  hashOwnerId,
  JsonAgentLogger,
  LogEntry,
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

describe("Structured Logging & PII Protection", () => {
  it("generates deterministic truncated hashes without exposing raw phone numbers", () => {
    const phone = "+2348012345678";
    const hash1 = hashOwnerId(phone);
    const hash2 = hashOwnerId(phone);

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith("owner_h_")).toBe(true);
    expect(hash1).not.toContain("2348012345678");
    expect(hash1).not.toContain("+");
  });

  it("handles empty or missing owner phone gracefully", () => {
    expect(hashOwnerId("")).toBe("owner_unknown");
  });

  it("logs structured JSON without raw phone number or raw user message text", async () => {
    const loggedEntries: LogEntry[] = [];
    const customLogger = {
      log: (entry: LogEntry) => {
        loggedEntries.push(entry);
      },
    };

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

    const PHONE = "+2348012345678";
    const SECRET_TEXT = "My very private business plan and phone 08012345678";

    await ownerRepo.create({
      id: "owner_2348012345678",
      phoneNumber: PHONE,
      displayName: "Secret Business",
    });

    await projectRepo.createWithInitialVersion(
      {
        id: "proj_log_test",
        ownerId: "owner_2348012345678",
        slug: "secret-salon",
        name: "Secret Salon",
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
      defaultProvider: new MockProvider(),
      logger: customLogger,
    });

    await orchestrator.handleMessage({
      ownerPhone: PHONE,
      messageId: "msg_logged_1",
      text: SECRET_TEXT,
    });

    expect(loggedEntries.length).toBeGreaterThan(0);

    for (const entry of loggedEntries) {
      // 1. Owner ID is hashed
      expect(entry.ownerHash.startsWith("owner_h_")).toBe(true);
      expect(entry.ownerHash).not.toContain(PHONE);

      // 2. Serialized entry contains NO raw phone number
      const serialized = JSON.stringify(entry);
      expect(serialized).not.toContain(PHONE);
      expect(serialized).not.toContain("08012345678");

      // 3. Serialized entry contains NO raw user message text
      expect(serialized).not.toContain(SECRET_TEXT);
      expect(serialized).not.toContain("very private business plan");

      // 4. Contains length metadata instead
      if (entry.event === "message_received") {
        expect(entry.textLength).toBe(SECRET_TEXT.length);
      }
    }
  });
});
