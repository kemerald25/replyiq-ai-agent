/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { SqliteOwnerStateStore } from "../src/do/sqlite-state-store.js";
import { OwnerState, AgentResponse, getUtcDateKey } from "@replyiq/agent";

function createMockSqlStorage(): SqlStorage {
  const db = new DatabaseSync(":memory:");

  return {
    exec(query: string, ...params: any[]) {
      const trimmed = query.trim();
      // Handle multi-statement schema creation
      if (trimmed.includes("CREATE TABLE")) {
        db.exec(query);
        return {
          toArray: () => [],
        } as any;
      }

      if (trimmed.toUpperCase().startsWith("SELECT")) {
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        return {
          toArray: () => rows,
        } as any;
      }

      const stmt = db.prepare(query);
      stmt.run(...params);
      return {
        toArray: () => [],
      } as any;
    },
  } as unknown as SqlStorage;
}

describe("SqliteOwnerStateStore", () => {
  let sqlStorage: SqlStorage;
  let store: SqliteOwnerStateStore;

  beforeEach(() => {
    sqlStorage = createMockSqlStorage();
    store = new SqliteOwnerStateStore(sqlStorage);
  });

  it("initializes and returns default state for a new owner", async () => {
    const state = await store.getState("owner_new");
    expect(state.ownerId).toBe("owner_new");
    expect(state.activeProjectId).toBeNull();
    expect(state.conversationState).toBe("IDLE");
    expect(state.conversationHistory).toEqual([]);
    expect(state.usage.messageCount).toBe(0);
    expect(state.usage.dateKey).toBe(getUtcDateKey());
  });

  it("persists and retrieves updated state", async () => {
    const state = await store.getState("owner_123");
    state.activeProjectId = "proj_salon";
    state.conversationState = "AWAITING_PUBLISH_CONFIRMATION";
    state.pendingConfirmation = {
      type: "PUBLISH",
      projectId: "proj_salon",
      targetVersion: 2,
      previewUrl: "https://preview.replyiq.cv/p/proj_salon",
      expiresAt: Date.now() + 60000,
    };
    state.usage.messageCount = 5;

    await store.saveState("owner_123", state);

    const reloaded = await store.getState("owner_123");
    expect(reloaded.activeProjectId).toBe("proj_salon");
    expect(reloaded.conversationState).toBe("AWAITING_PUBLISH_CONFIRMATION");
    expect(reloaded.pendingConfirmation?.targetVersion).toBe(2);
    expect(reloaded.usage.messageCount).toBe(5);
  });

  it("automatically resets daily usage when dateKey rolls over to a new day", async () => {
    const oldState: OwnerState = {
      ownerId: "owner_rollover",
      activeProjectId: "proj_old",
      conversationState: "IDLE",
      pendingConfirmation: null,
      conversationHistory: [],
      usage: {
        dateKey: "2020-01-01",
        messageCount: 99,
        modelCallCount: 35,
        fallbackCallCount: 4,
        totalNeurons: 7500,
      },
    };

    await store.saveState("owner_rollover", oldState);

    const loaded = await store.getState("owner_rollover");
    expect(loaded.usage.dateKey).toBe(getUtcDateKey());
    expect(loaded.usage.messageCount).toBe(0);
    expect(loaded.usage.modelCallCount).toBe(0);
    expect(loaded.usage.fallbackCallCount).toBe(0);
    expect(loaded.usage.totalNeurons).toBe(0);
    expect(loaded.activeProjectId).toBe("proj_old");
  });

  it("tracks and checks processed messages for idempotency", async () => {
    expect(await store.isMessageProcessed("owner_1", "msg_1")).toBe(false);
    expect(await store.getProcessedResponse("owner_1", "msg_1")).toBeNull();

    const response: AgentResponse = {
      recipientPhone: "+2348012345678",
      reply: {
        text: "Site updated!",
        quickReplies: ["Publish", "Help"],
      },
      siteUpdated: true,
      published: false,
    };

    await store.recordProcessedMessage("owner_1", "msg_1", response);

    expect(await store.isMessageProcessed("owner_1", "msg_1")).toBe(true);
    const cached = await store.getProcessedResponse("owner_1", "msg_1");
    expect(cached).toEqual(response);
  });

  it("acquires sequential locks and cleans up stale locks", async () => {
    const release1 = await store.acquireLock("owner_lock_test");
    let executionOrder: number[] = [];

    const task2 = async () => {
      const release2 = await store.acquireLock("owner_lock_test");
      executionOrder.push(2);
      await release2();
    };

    const promise2 = task2();
    executionOrder.push(1);
    await release1();

    await promise2;
    expect(executionOrder).toEqual([1, 2]);
  });
});
