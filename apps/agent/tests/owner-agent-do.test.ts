/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { OwnerAgentDO, AgentEnv } from "../src/do/owner-agent-do.js";

function createMockSqlStorage(): SqlStorage {
  const db = new DatabaseSync(":memory:");

  return {
    exec(query: string, ...params: any[]) {
      const trimmed = query.trim();
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

describe("OwnerAgentDO Durable Object", () => {
  let agentDO: OwnerAgentDO;
  let mockEnv: AgentEnv;

  beforeEach(() => {
    const mockSql = createMockSqlStorage();
    const mockCtx = {
      storage: {
        sql: mockSql,
      },
    } as unknown as DurableObjectState;

    const mockGlobalStub = {
      getDailyNeurons: vi.fn().mockResolvedValue(0),
      incrementDailyNeurons: vi.fn().mockResolvedValue(0),
    };

    const mockD1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
        run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      }),
      batch: vi.fn().mockResolvedValue([]),
    };

    mockEnv = {
      DB: mockD1 as any,
      SITES_BUCKET: {} as any,
      ASSETS_BUCKET: {} as any,
      OWNER_AGENTS: {} as any,
      GLOBAL_COUNTER: {
        idFromName: vi.fn().mockReturnValue("global-counter-id"),
        get: vi.fn().mockReturnValue(mockGlobalStub),
      } as any,
      MOCK_PROVIDER: "true",
      BASE_DOMAIN: "replyiq.cv",
    };

    agentDO = new OwnerAgentDO(mockCtx, mockEnv);
  });

  it("handles incoming messages via RPC method", async () => {
    const response = await agentDO.handleMessage({
      messageId: "msg_rpc_1",
      ownerPhone: "+2348012345678",
      text: "HELP",
      timestamp: Date.now(),
    });

    expect(response.messageId).toBe("msg_rpc_1");
    expect(response.commandExecuted).toBe("HELP");
    expect(response.replies[0]?.text).toContain("How to use ReplyIQ");
  });

  it("handles POST requests via HTTP fetch endpoint", async () => {
    const req = new Request("http://localhost/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "msg_http_1",
        ownerPhone: "+2348012345678",
        text: "MENU",
        timestamp: Date.now(),
      }),
    });

    const res = await agentDO.fetch(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.messageId).toBe("msg_http_1");
    expect(data.commandExecuted).toBe("MENU");
  });

  it("rejects non-POST HTTP methods with 405", async () => {
    const req = new Request("http://localhost/message", {
      method: "GET",
    });

    const res = await agentDO.fetch(req);
    expect(res.status).toBe(405);
  });
});
