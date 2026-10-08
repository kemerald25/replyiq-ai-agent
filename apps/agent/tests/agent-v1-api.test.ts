import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";
import { AgentEnv } from "../src/do/owner-agent-do.js";

async function createHmacSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: number,
  body: string
): Promise<string> {
  const canonicalPayload = `${method.toUpperCase()}:${path}:${timestamp}:${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonicalPayload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("Agent /v1 Secure API Endpoints", () => {
  const PRIMARY_SECRET = "test-primary-secret-32-chars-ok!!";
  const SECONDARY_SECRET = "test-secondary-secret-32-chars-2";

  const createMockEnv = (overrides: Partial<AgentEnv> = {}): AgentEnv => {
    const mockAgentStub = {
      handleMessage: vi.fn().mockImplementation((incoming) =>
        Promise.resolve({
          messageId: incoming.messageId,
          replies: [{ text: "Hello from DO actor" }],
          activeProjectId: "proj_1",
          timestamp: Date.now(),
        })
      ),
      fetch: vi.fn(),
    };

    let heartbeatState: any = null;
    const mockCounterStub = {
      recordHeartbeat: vi.fn().mockImplementation((data) => {
        heartbeatState = data;
        return Promise.resolve();
      }),
      getHeartbeat: vi.fn().mockImplementation(() => Promise.resolve(heartbeatState)),
    };

    const mockOwnerNamespace = {
      idFromName: vi.fn().mockImplementation((name: string) => `do_id_for_${name}`),
      get: vi.fn().mockReturnValue(mockAgentStub),
    };

    const mockCounterNamespace = {
      idFromName: vi.fn().mockReturnValue("counter_do_id"),
      get: vi.fn().mockReturnValue(mockCounterStub),
    };

    return {
      DB: {} as any,
      SITES_BUCKET: {} as any,
      ASSETS_BUCKET: {} as any,
      OWNER_AGENTS: mockOwnerNamespace as any,
      GLOBAL_COUNTER: mockCounterNamespace as any,
      GATEWAY_SECRET_PRIMARY: PRIMARY_SECRET,
      GATEWAY_SECRET_SECONDARY: SECONDARY_SECRET,
      ENVIRONMENT: "production",
      ...overrides,
    };
  };

  describe("POST /v1/message", () => {
    it("successfully verifies and dispatches an incoming message with E.164 phone identity", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({
        ownerKey: "+2348012345678",
        messageId: "msg_v1_1",
        text: "MENU",
      });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.messageId).toBe("msg_v1_1");
      expect(env.OWNER_AGENTS.idFromName).toHaveBeenCalledWith("+2348012345678");
    });

    it("successfully verifies and dispatches an incoming message with WhatsApp LID identity", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({
        ownerKey: "lid:98765432101234",
        messageId: "msg_v1_lid",
        text: "NEW LID Business",
      });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.messageId).toBe("msg_v1_lid");
      expect(env.OWNER_AGENTS.idFromName).toHaveBeenCalledWith("lid:98765432101234");
    });

    it("verifies signatures signed with secondary secret during key rotation", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({
        ownerKey: "+2348012345678",
        messageId: "msg_v1_rot",
        text: "HELP",
      });
      const sig = await createHmacSignature(SECONDARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it("rejects invalid signature with 401", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "MENU" });
      const badSig = "0000000000000000000000000000000000000000000000000000000000000000";

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": badSig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toContain("Unauthorized");
    });

    it("rejects timestamps older than 5 minutes (replay attack defense)", async () => {
      const env = createMockEnv();
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 mins ago
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "MENU" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", oldTimestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": oldTimestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toContain("freshness window");
    });

    it("rejects payload exceeding 100 KB with 413 Payload Too Large", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const hugeText = "A".repeat(110 * 1024); // 110 KB
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: hugeText });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(413);
      const json = await res.json() as any;
      expect(json.error).toContain("Payload Too Large");
    });

    it("rejects invalid JSON body with 400 on /v1/message", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = "not-json";
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe("Invalid JSON body");
    });

    it("rejects missing fields on /v1/message with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678" }); // missing text
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toContain("Missing required fields");
    });

    it("rejects invalid owner identity on /v1/message with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "not-a-valid-owner", text: "MENU" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toContain("Invalid owner identity");
    });

    it("returns 500 when DO throws an error on /v1/message", async () => {
      const mockAgentStub = {
        handleMessage: vi.fn().mockRejectedValue(new Error("DO internal crash")),
        fetch: vi.fn(),
      };
      const env = createMockEnv({
        OWNER_AGENTS: {
          idFromName: vi.fn().mockReturnValue("do_id"),
          get: vi.fn().mockReturnValue(mockAgentStub),
        } as any,
      });

      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "MENU" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      const json = await res.json() as any;
      expect(json.error).toBe("Agent processing failure");
    });
  });

  describe("POST /v1/heartbeat and GET /v1/health", () => {
    it("records gateway heartbeat and exposes it on /v1/health", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const hbBody = JSON.stringify({
        gatewayVersion: "1.0.0",
        transportState: "connected",
        lastSeen: timestamp,
      });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/heartbeat", timestamp, hbBody);

      const postReq = new Request("https://agent.replyiq.cv/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body: hbBody,
      });

      const postRes = await worker.fetch(postReq, env);
      expect(postRes.status).toBe(200);

      // Verify health inspects heartbeat
      const healthReq = new Request("https://agent.replyiq.cv/v1/health");
      const healthRes = await worker.fetch(healthReq, env);
      expect(healthRes.status).toBe(200);
      const healthJson = await healthRes.json() as any;
      expect(healthJson.gateway.transportState).toBe("connected");
      expect(healthJson.gateway.gatewayVersion).toBe("1.0.0");
    });

    it("rejects non-POST method on /v1/heartbeat with 405", async () => {
      const env = createMockEnv();
      const req = new Request("https://agent.replyiq.cv/v1/heartbeat", { method: "GET" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("rejects invalid JSON on /v1/heartbeat with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = "not-json";
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/heartbeat", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("rejects unauthorized signature on /v1/heartbeat with 401", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ gatewayVersion: "1.0.0", transportState: "connected" });

      const req = new Request("https://agent.replyiq.cv/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": "0".repeat(64),
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("returns 500 when counter DO throws error on /v1/heartbeat", async () => {
      const mockCounterStub = {
        recordHeartbeat: vi.fn().mockRejectedValue(new Error("D1 locked")),
        getHeartbeat: vi.fn(),
      };
      const env = createMockEnv({
        GLOBAL_COUNTER: {
          idFromName: vi.fn().mockReturnValue("counter_do_id"),
          get: vi.fn().mockReturnValue(mockCounterStub),
        } as any,
      });

      const timestamp = Date.now();
      const body = JSON.stringify({ gatewayVersion: "1.0.0", transportState: "connected" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/heartbeat", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      const json = await res.json() as any;
      expect(json.error).toBe("Heartbeat recording failed");
    });
  });

  describe("HMAC Verification Edge Cases & Rate Limiting", () => {
    it("rejects when no gateway secrets are configured on agent", async () => {
      const env = createMockEnv({
        GATEWAY_SECRET_PRIMARY: undefined,
        GATEWAY_SECRET_SECONDARY: undefined,
      });
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "HI" });

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": "a".repeat(64),
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toContain("No gateway secrets configured");
    });

    it("rejects missing or malformed timestamp header with 401", async () => {
      const env = createMockEnv();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "HI" });

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": "not-a-number",
          "X-ReplyIQ-Signature": "a".repeat(64),
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toContain("Invalid or missing timestamp");
    });

    it("rejects malformed signature string format with 401", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "HI" });

      const req = new Request("https://agent.replyiq.cv/v1/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": "not-valid-hex-length",
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
      const json = await res.json() as any;
      expect(json.error).toContain("Malformed HMAC-SHA256");
    });

    it("rejects non-POST method on /v1/message with 405", async () => {
      const env = createMockEnv();
      const req = new Request("https://agent.replyiq.cv/v1/message", { method: "GET" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("enforces memory rate limiter and prunes expired entries", async () => {
      const { MemoryRateLimiter } = await import("../src/rate-limiter.js");
      const limiter = new MemoryRateLimiter();
      expect(limiter.allow("test:1", 2, 50)).toBe(true);
      expect(limiter.allow("test:1", 2, 50)).toBe(true);
      expect(limiter.allow("test:1", 2, 50)).toBe(false);

      // Fast forward past window
      await new Promise((r) => setTimeout(r, 60));
      limiter.prune();
      expect(limiter.allow("test:1", 2, 50)).toBe(true);
    });
  });

  describe("POST /v1/assets", () => {
    it("rejects non-POST method on /v1/assets with 405", async () => {
      const env = createMockEnv();
      const req = new Request("https://agent.replyiq.cv/v1/assets", { method: "GET" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("rejects invalid JSON body with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = "invalid-json";
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe("Invalid JSON body");
    });

    it("rejects invalid owner identity with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "bad-owner", data: "dGVzdA==" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toContain("Invalid owner identity");
    });

    it("rejects malformed base64 asset data with 400", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", data: "!!!not-base64!!!" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe("Malformed base64 asset data");
    });

    it("rejects asset exceeding 5 MB processed limit with 413", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      // 5.5 MB of base64
      const largeData = Buffer.alloc(5.5 * 1024 * 1024).toString("base64");
      const body = JSON.stringify({ ownerKey: "+2348012345678", data: largeData });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(413);
      const json = await res.json() as any;
      expect(json.error).toContain("5 MB size cap");
    });

    it("returns 500 when asset storage/DB throws an error on /v1/assets", async () => {
      const env = createMockEnv({ DB: { prepare: () => { throw new Error("DB failure"); } } as any });
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", data: "dGVzdA==" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      const json = await res.json() as any;
      expect(json.error).toBe("Asset upload failed");
    });

    it("rejects unauthorized signature on /v1/assets with 401", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", data: "dGVzdA==" });

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": "0".repeat(64),
        },
        body,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("rejects payload exceeding 10 MB on /v1/assets with 413", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const hugeBody = "X".repeat(11 * 1024 * 1024); // 11 MB
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, hugeBody);

      const req = new Request("https://agent.replyiq.cv/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body: hugeBody,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(413);
      const json = await res.json() as any;
      expect(json.error).toContain("max 10 MB");
    });

    it("enforces rate limits on /v1 endpoints with 429", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", text: "HI" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/message", timestamp, body);

      const makeReq = () =>
        new Request("https://agent.replyiq.cv/v1/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ReplyIQ-Timestamp": timestamp.toString(),
            "X-ReplyIQ-Signature": sig,
          },
          body,
        });

      // Exhaust limit of 120
      let lastRes: Response | null = null;
      for (let i = 0; i < 125; i++) {
        lastRes = await worker.fetch(makeReq(), env);
        if (lastRes.status === 429) break;
      }

      expect(lastRes?.status).toBe(429);
      const json = await lastRes?.json() as any;
      expect(json.error).toBe("Rate limit exceeded");
    });

    it("rejects payload exceeding 10 KB on /v1/heartbeat with 413", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const largeHeartbeat = JSON.stringify({
        gatewayVersion: "1.0.0",
        transportState: "connected",
        bloat: "A".repeat(12 * 1024),
      });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/heartbeat", timestamp, largeHeartbeat);

      const req = new Request("https://agent.replyiq.cv/v1/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": sig,
        },
        body: largeHeartbeat,
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(413);
      const json = await res.json() as any;
      expect(json.error).toContain("max 10 KB");
    });

    it("enforces rate limits on /v1/heartbeat with 429", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const hbBody = JSON.stringify({ gatewayVersion: "1.0.0", transportState: "connected" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/heartbeat", timestamp, hbBody);

      const makeReq = () =>
        new Request("https://agent.replyiq.cv/v1/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ReplyIQ-Timestamp": timestamp.toString(),
            "X-ReplyIQ-Signature": sig,
          },
          body: hbBody,
        });

      let lastRes: Response | null = null;
      for (let i = 0; i < 65; i++) {
        lastRes = await worker.fetch(makeReq(), env);
        if (lastRes.status === 429) break;
      }

      expect(lastRes?.status).toBe(429);
      const json = await lastRes?.json() as any;
      expect(json.error).toBe("Rate limit exceeded");
    });

    it("enforces rate limits on /v1/assets with 429", async () => {
      const env = createMockEnv();
      const timestamp = Date.now();
      const body = JSON.stringify({ ownerKey: "+2348012345678", data: "dGVzdA==" });
      const sig = await createHmacSignature(PRIMARY_SECRET, "POST", "/v1/assets", timestamp, body);

      const makeReq = () =>
        new Request("https://agent.replyiq.cv/v1/assets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ReplyIQ-Timestamp": timestamp.toString(),
            "X-ReplyIQ-Signature": sig,
          },
          body,
        });

      let lastRes: Response | null = null;
      for (let i = 0; i < 35; i++) {
        lastRes = await worker.fetch(makeReq(), env);
        if (lastRes.status === 429) break;
      }

      expect(lastRes?.status).toBe(429);
      const json = await lastRes?.json() as any;
      expect(json.error).toBe("Rate limit exceeded");
    });
  });
});
