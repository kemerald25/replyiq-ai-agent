import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";
import { AgentEnv } from "../src/do/owner-agent-do.js";

describe("ReplyIQ Agent Worker & Dev Message Endpoint", () => {
  const createMockEnv = (overrides: Partial<AgentEnv> = {}): AgentEnv => {
    const mockStub = {
      handleMessage: vi.fn().mockResolvedValue({
        messageId: "msg_test_1",
        replies: [{ text: "Hello! Active website is Amaka Luxe." }],
        activeProjectId: "proj_1",
        timestamp: Date.now(),
      }),
      fetch: vi.fn(),
    };

    const mockNamespace = {
      idFromName: vi.fn().mockReturnValue("mock-do-id"),
      get: vi.fn().mockReturnValue(mockStub),
    };

    return {
      DB: {} as any,
      SITES_BUCKET: {} as any,
      ASSETS_BUCKET: {} as any,
      OWNER_AGENTS: mockNamespace as any,
      GLOBAL_COUNTER: mockNamespace as any,
      ENVIRONMENT: "development",
      DEV_SECRET: "test-dev-secret-123",
      BASE_DOMAIN: "localhost",
      ...overrides,
    };
  };

  it("serves health check on GET /health", async () => {
    const env = createMockEnv();
    const req = new Request("http://localhost/health");
    const res = await worker.fetch(req, env);

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("replyiq-agent");
  });

  describe("POST /dev/message Security & Fail-Closed Guard", () => {
    it("fails closed with 404 in production environment", async () => {
      const env = createMockEnv({ ENVIRONMENT: "production" });
      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: JSON.stringify({
          ownerPhone: "+2348012345678",
          text: "MENU",
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("rejects unauthorized requests with 401 when X-ReplyIQ-Secret is missing or invalid", async () => {
      const env = createMockEnv();

      // Missing header
      const reqNoAuth = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerPhone: "+2348012345678", text: "MENU" }),
      });
      const resNoAuth = await worker.fetch(reqNoAuth, env);
      expect(resNoAuth.status).toBe(401);

      // Wrong secret
      const reqWrongAuth = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "wrong-secret",
        },
        body: JSON.stringify({ ownerPhone: "+2348012345678", text: "MENU" }),
      });
      const resWrongAuth = await worker.fetch(reqWrongAuth, env);
      expect(resWrongAuth.status).toBe(401);
    });

    it("rejects invalid phone numbers with 400", async () => {
      const env = createMockEnv();
      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: JSON.stringify({
          ownerPhone: "not-a-valid-phone-number",
          text: "MENU",
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Invalid owner phone number");
    });

    it("normalizes phone and routes to OwnerAgentDO in development", async () => {
      const env = createMockEnv();
      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: JSON.stringify({
          ownerPhone: "08012345678", // Local Nigerian format
          text: "MENU",
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);

      // Verify routing by normalized E.164 phone
      expect(env.OWNER_AGENTS.idFromName).toHaveBeenCalledWith("+2348012345678");

      const data = (await res.json()) as any;
      expect(data.messageId).toBe("msg_test_1");
      expect(data.replies[0]?.text).toContain("Amaka Luxe");
    });

    it("rejects invalid JSON body with 400", async () => {
      const env = createMockEnv();
      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: "invalid-json{",
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Invalid JSON body");
    });

    it("rejects missing required fields with 400", async () => {
      const env = createMockEnv();
      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: JSON.stringify({ ownerPhone: "08012345678" }), // missing text
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 500 when Durable Object throws an error", async () => {
      const env = createMockEnv();
      const mockStub = {
        handleMessage: vi.fn().mockRejectedValue(new Error("DO internal crash")),
      };
      (env.OWNER_AGENTS.get as any).mockReturnValue(mockStub);

      const req = new Request("http://localhost/dev/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Secret": "test-dev-secret-123",
        },
        body: JSON.stringify({
          ownerPhone: "08012345678",
          text: "MENU",
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Agent processing failure");
    });

    it("returns 404 for unknown endpoints", async () => {
      const env = createMockEnv();
      const req = new Request("http://localhost/nonexistent-route");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });
});
