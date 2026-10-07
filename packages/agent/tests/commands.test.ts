import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCommand,
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

describe("Deterministic Command Router & Orchestrator Commands", () => {
  it("parses deterministic command keywords and numbers correctly", () => {
    expect(parseCommand("menu")).toEqual({ type: "MENU" });
    expect(parseCommand("HELP")).toEqual({ type: "HELP" });
    expect(parseCommand("?")).toEqual({ type: "HELP" });
    expect(parseCommand("stop")).toEqual({ type: "STOP" });
    expect(parseCommand("undo")).toEqual({ type: "UNDO" });
    expect(parseCommand("cancel")).toEqual({ type: "CANCEL" });
    expect(parseCommand("NEW My Salon")).toEqual({ type: "NEW", name: "My Salon" });
    expect(parseCommand("1")).toEqual({ type: "NUMBER_SELECTION", number: 1 });
    expect(parseCommand("2")).toEqual({ type: "NUMBER_SELECTION", number: 2 });
    expect(parseCommand("publish")).toEqual({ type: "PUBLISH_REQUEST" });
    expect(parseCommand("go live")).toEqual({ type: "PUBLISH_REQUEST" });

    // Non-commands return null (model path)
    expect(parseCommand("Change haircut price to 15k")).toBeNull();
    expect(parseCommand("Make background green")).toBeNull();
  });

  describe("Orchestrator Command Execution", () => {
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

      // Seed owner and project
      await ownerRepo.create({
        id: OWNER_ID,
        phoneNumber: OWNER_PHONE,
        displayName: "Test Owner",
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

    it("handles MENU command with 0 neuron cost and returns preview URL", async () => {
      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_menu_1",
        text: "MENU",
      });

      expect(res.commandExecuted).toBe("MENU");
      expect(res.neuronsUsed).toBeUndefined(); // 0 neurons
      expect(res.replies[0]?.text).toContain("ReplyIQ Menu");
      expect(res.replies[0]?.text).toContain("Test Salon");
      expect(res.replies[0]?.previewUrl).toBeDefined();
    });

    it("handles PREVIEW command returning preview link for active project", async () => {
      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_prev_active",
        text: "PREVIEW",
      });

      expect(res.commandExecuted).toBe("PREVIEW");
      expect(res.replies[0]?.text).toContain('Here is the current preview link for "Test Salon"');
      expect(res.replies[0]?.previewUrl).toBeDefined();
      expect(res.replies[0]?.link?.url).toBeDefined();
    });

    it("handles HELP command with 0 neuron cost", async () => {
      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_help_1",
        text: "HELP",
      });

      expect(res.commandExecuted).toBe("HELP");
      expect(res.neuronsUsed).toBeUndefined();
      expect(res.replies[0]?.text).toContain("How to use ReplyIQ");
    });

    it("handles STOP command", async () => {
      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_stop_1",
        text: "STOP",
      });

      expect(res.commandExecuted).toBe("STOP");
      expect(res.replies[0]?.text).toContain("Updates paused");
    });

    it("handles NEW command creating a new site with preview link", async () => {
      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_new_1",
        text: "NEW Lagos Bakery",
      });

      expect(res.commandExecuted).toBe("NEW");
      expect(res.replies[0]?.text).toContain('Created new site "Lagos Bakery"');
      expect(res.replies[0]?.link?.url).toBeDefined();

      const projects = await projectRepo.listByOwner(OWNER_ID);
      expect(projects.length).toBe(2);
    });

    it("handles UNDO command reverting to previous version", async () => {
      // First make a change to create version 2
      const modifiedDoc = {
        ...allSampleDocuments.salon,
        metadata: { ...allSampleDocuments.salon.metadata, title: "Modified Title" },
      };
      await versionService.createVersion({
        projectId: "proj_1",
        ownerId: OWNER_ID,
        expectedVersion: 1,
        document: modifiedDoc,
        authorType: "user",
        changeSummary: "Title change",
      });

      // Set active project in state
      const state = await stateStore.getState(OWNER_ID);
      state.activeProjectId = "proj_1";
      await stateStore.saveState(OWNER_ID, state);

      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_undo_1",
        text: "UNDO",
      });

      expect(res.commandExecuted).toBe("UNDO");
      expect(res.replies[0]?.text).toContain("Undone! I've restored your previous version");
      expect(res.replies[0]?.link?.url).toBeDefined();

      const proj = await projectRepo.getById("proj_1");
      expect(proj?.currentVersion).toBe(3); // Restoration creates version 3 with content of version 1
    });

    it("returns error when UNDO is called on version 1", async () => {
      const state = await stateStore.getState(OWNER_ID);
      state.activeProjectId = "proj_1";
      await stateStore.saveState(OWNER_ID, state);

      const res = await orchestrator.handleMessage({
        ownerPhone: OWNER_PHONE,
        messageId: "msg_undo_fail",
        text: "UNDO",
      });

      expect(res.commandExecuted).toBe("UNDO");
      expect(res.replies[0]?.text).toContain("Cannot undo: this website is at its initial version");
    });

    it("handles PREVIEW and UNDO when no active project exists", async () => {
      const emptyOwnerPhone = "+2348099999999";
      const resPrev = await orchestrator.handleMessage({
        ownerPhone: emptyOwnerPhone,
        messageId: "msg_prev_none",
        text: "PREVIEW",
      });
      expect(resPrev.replies[0]?.text).toContain("No active project found");

      const resUndo = await orchestrator.handleMessage({
        ownerPhone: emptyOwnerPhone,
        messageId: "msg_undo_none",
        text: "UNDO",
      });
      expect(resUndo.replies[0]?.text).toContain("No active project found to undo");
    });
  });
});
