import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as http from "node:http";
import { AgentBridgeClient } from "../src/bridge/client.js";
import { signBridgeRequest } from "../src/bridge/signer.js";

describe("AgentBridgeClient (HTTP Bridge against local node:http fake Worker)", () => {
  let server: http.Server;
  let serverUrl: string;
  let receivedRequests: Array<{ method: string; url: string; headers: http.IncomingHttpHeaders; body: string }> = [];
  const secret = "test-bridge-secret-key-32-chars";

  let nextHandler: ((req: http.IncomingMessage, res: http.ServerResponse, body: string) => void) | null = null;

  beforeEach(async () => {
    receivedRequests = [];
    nextHandler = null;

    server = http.createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", async () => {
        receivedRequests.push({
          method: req.method || "",
          url: req.url || "",
          headers: req.headers,
          body: data,
        });

        if (nextHandler) {
          nextHandler(req, res, data);
          return;
        }

        // Default mock responses
        if (req.url === "/v1/message") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              messageId: "msg_res_1",
              replies: [{ text: "Hello from mock agent!" }],
              timestamp: Date.now(),
            })
          );
        } else if (req.url === "/v1/assets") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              assetId: "asset_test_123",
              hash: "fakehash123",
              width: 800,
              height: 600,
              mimeType: "image/webp",
            })
          );
        } else if (req.url === "/v1/heartbeat") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } else {
          res.writeHead(404);
          res.end("Not Found");
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("sends signed POST /v1/message with valid timestamp and signature", async () => {
    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });

    const res = await client.sendMessage({
      ownerKey: "+2348012345678",
      messageId: "msg_in_1",
      text: "MENU",
    });

    expect(res.messageId).toBe("msg_res_1");
    expect(res.replies[0]?.text).toBe("Hello from mock agent!");

    expect(receivedRequests.length).toBe(1);
    const req = receivedRequests[0]!;
    expect(req.url).toBe("/v1/message");
    expect(req.headers["x-replyiq-signature"]).toBeDefined();
    expect(req.headers["x-replyiq-timestamp"]).toBeDefined();

    // Verify signature matches expected
    const timestamp = parseInt(req.headers["x-replyiq-timestamp"] as string, 10);
    const expectedSig = await signBridgeRequest({
      secret,
      method: "POST",
      path: "/v1/message",
      timestamp,
      body: req.body,
    });
    expect(req.headers["x-replyiq-signature"]).toBe(expectedSig);
  });

  it("uploads asset to POST /v1/assets", async () => {
    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });

    const res = await client.uploadAsset("+2348012345678", "fakebase64data");
    expect(res.assetId).toBe("asset_test_123");
    expect(res.mimeType).toBe("image/webp");

    expect(receivedRequests.length).toBe(1);
    expect(receivedRequests[0]?.url).toBe("/v1/assets");
  });

  it("sends heartbeat to POST /v1/heartbeat", async () => {
    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
      gatewayVersion: "1.2.3",
    });

    const ok = await client.sendHeartbeat("connected");
    expect(ok).toBe(true);

    expect(receivedRequests.length).toBe(1);
    const body = JSON.parse(receivedRequests[0]!.body);
    expect(body.gatewayVersion).toBe("1.2.3");
    expect(body.transportState).toBe("connected");
  });

  it("retries on transient 500 error and recovers", async () => {
    let callCount = 0;
    nextHandler = (_req, res) => {
      callCount++;
      if (callCount === 1) {
        res.writeHead(500);
        res.end("Internal Server Error");
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ messageId: "msg_retry_ok", replies: [{ text: "Recovered" }], timestamp: Date.now() }));
      }
    };

    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });

    const res = await client.sendMessage({
      ownerKey: "+2348012345678",
      messageId: "msg_fail_first",
      text: "HELLO",
    });

    expect(res.messageId).toBe("msg_retry_ok");
    expect(callCount).toBe(2);
  });

  it("throws BridgeClientError when asset upload fails with non-200 status", async () => {
    nextHandler = (_req, res) => {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Malformed base64" }));
    };

    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });

    await expect(client.uploadAsset("+2348012345678", "bad-data")).rejects.toThrow(
      "Asset upload failed (400)"
    );
  });

  it("returns false from sendHeartbeat when server errors", async () => {
    nextHandler = (_req, res) => {
      res.writeHead(500);
      res.end("Internal Server Error");
    };

    const client = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });

    const ok = await client.sendHeartbeat("connected");
    expect(ok).toBe(false);
  });
});
