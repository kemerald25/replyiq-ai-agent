/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { OwnerAgentDO, AgentEnv, DurableObjectGlobalUsageStore } from "../src/do/owner-agent-do.js";

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
      ENVIRONMENT: "development",
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

  it("processes concurrent messages for the same owner in sequential arrival order via messageQueue", async () => {
    const p1 = agentDO.handleMessage({
      messageId: "msg_seq_1",
      ownerPhone: "+2348012345678",
      text: "HELP",
      timestamp: Date.now(),
    });

    const p2 = agentDO.handleMessage({
      messageId: "msg_seq_2",
      ownerPhone: "+2348012345678",
      text: "MENU",
      timestamp: Date.now(),
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.messageId).toBe("msg_seq_1");
    expect(res2.messageId).toBe("msg_seq_2");
    expect(res1.commandExecuted).toBe("HELP");
    expect(res2.commandExecuted).toBe("MENU");
  });

  it("refuses to initialize with MOCK_PROVIDER in production environment", () => {
    const mockSql = createMockSqlStorage();
    const mockCtx = { storage: { sql: mockSql } } as unknown as DurableObjectState;
    const prodEnv: AgentEnv = {
      ...mockEnv,
      ENVIRONMENT: "production",
      MOCK_PROVIDER: "true",
    };

    expect(() => new OwnerAgentDO(mockCtx, prodEnv)).toThrowError(
      /Security violation: MOCK_PROVIDER is strictly prohibited outside development environment/
    );
  });

  it("refuses to initialize in production without model credentials", () => {
    const mockSql = createMockSqlStorage();
    const mockCtx = { storage: { sql: mockSql } } as unknown as DurableObjectState;
    const prodEnv: AgentEnv = {
      ...mockEnv,
      ENVIRONMENT: "production",
      MOCK_PROVIDER: undefined,
    };

    expect(() => new OwnerAgentDO(mockCtx, prodEnv)).toThrowError(
      /Missing model credentials/
    );
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

  it("handles HTTP 500 error catch path when handleMessage throws", async () => {
    vi.spyOn(agentDO, "handleMessage").mockRejectedValueOnce(new Error("Simulated DO failure"));

    const req = new Request("http://localhost/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "msg_http_fail",
        ownerPhone: "+2348012345678",
        text: "MENU",
      }),
    });

    const res = await agentDO.fetch(req);
    expect(res.status).toBe(500);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Simulated DO failure");
  });

  it("rejects non-POST HTTP methods with 405", async () => {
    const req = new Request("http://localhost/message", {
      method: "GET",
    });

    const res = await agentDO.fetch(req);
    expect(res.status).toBe(405);
  });

  it("recovers from crash and processes subsequent messages when a turn throws", async () => {
    const origHandle = (agentDO as any).orchestrator.handleMessage.bind((agentDO as any).orchestrator);
    let calledCount = 0;

    vi.spyOn((agentDO as any).orchestrator, "handleMessage").mockImplementation(async (incoming: any) => {
      calledCount++;
      if (incoming.messageId === "msg_crash") {
        throw new Error("Simulated crash in turn processing");
      }
      return origHandle(incoming);
    });

    // Send msg_crash followed immediately by msg_after_crash
    const crashPromise = agentDO.handleMessage({
      messageId: "msg_crash",
      ownerPhone: "+2348012345678",
      text: "FAIL",
      timestamp: Date.now(),
    });

    const recoverPromise = agentDO.handleMessage({
      messageId: "msg_after_crash",
      ownerPhone: "+2348012345678",
      text: "HELP",
      timestamp: Date.now(),
    });

    await expect(crashPromise).rejects.toThrow("Simulated crash in turn processing");
    const recoveredRes = await recoverPromise;
    expect(recoveredRes.messageId).toBe("msg_after_crash");
    expect(recoveredRes.commandExecuted).toBe("HELP");
    expect(calledCount).toBe(2);
  });

  it("initializes providers with Workers AI binding, credentials, Gemini, and 70b fallback", () => {
    const mockSql = createMockSqlStorage();
    const mockCtx = { storage: { sql: mockSql } } as unknown as DurableObjectState;

    // Workers AI binding
    const aiEnv: AgentEnv = {
      ...mockEnv,
      MOCK_PROVIDER: undefined,
      AI: {} as any,
      GEMINI_API_KEY: "fake-gemini-key",
    };
    const do1 = new OwnerAgentDO(mockCtx, aiEnv);
    expect(do1).toBeDefined();

    // CF Account credentials and 70b fallback with AI binding
    const fallbackAiEnv: AgentEnv = {
      ...mockEnv,
      MOCK_PROVIDER: undefined,
      CF_ACCOUNT_ID: "cf-acc-123",
      CF_API_TOKEN: "cf-token-123",
      AI: {} as any,
      FALLBACK_MODEL: "70b",
    };
    const do2 = new OwnerAgentDO(mockCtx, fallbackAiEnv);
    expect(do2).toBeDefined();

    // CF Account credentials and 70b fallback without AI binding
    const fallbackCredsEnv: AgentEnv = {
      ...mockEnv,
      MOCK_PROVIDER: undefined,
      CF_ACCOUNT_ID: "cf-acc-123",
      CF_API_TOKEN: "cf-token-123",
      FALLBACK_MODEL: "70b",
      MAX_MESSAGES_PER_OWNER: "100",
      MAX_MODEL_CALLS_PER_OWNER: "50",
      MAX_FALLBACK_CALLS_PER_OWNER: "10",
      GLOBAL_DAILY_NEURON_CAP: "5000",
    };
    const do3 = new OwnerAgentDO(mockCtx, fallbackCredsEnv);
    expect(do3).toBeDefined();

    // Dev environment with no credentials defaults to MockProvider
    const devFallbackEnv: AgentEnv = {
      ...mockEnv,
      MOCK_PROVIDER: undefined,
      ENVIRONMENT: "development",
    };
    const do4 = new OwnerAgentDO(mockCtx, devFallbackEnv);
    expect(do4).toBeDefined();
  });

  it("updates and queries DurableObjectGlobalUsageStore", async () => {
    const mockGlobalStub = {
      getDailyNeurons: vi.fn().mockResolvedValue(150),
      incrementDailyNeurons: vi.fn().mockResolvedValue(200),
    };

    const mockGlobalNs = {
      idFromName: vi.fn().mockReturnValue("global-id"),
      get: vi.fn().mockReturnValue(mockGlobalStub),
    };

    const store = new DurableObjectGlobalUsageStore(mockGlobalNs as any);
    const current = await store.getDailyNeurons("2026-10-06");
    expect(current).toBe(150);
    const updated = await store.incrementDailyNeurons("2026-10-06", 50);
    expect(updated).toBe(200);
  });
});

