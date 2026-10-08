import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import sharp from "sharp";
import { GatewayService } from "../src/gateway.js";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";
import { AgentBridgeClient } from "../src/bridge/client.js";
import { ProcessedMessageStore } from "../src/pipeline/message-store.js";
import { InboundFilter } from "../src/pipeline/inbound-filter.js";

describe("GatewayService End-to-End Pipeline Integration", () => {
  let server: http.Server;
  let serverUrl: string;
  let tmpDir: string;
  let storePath: string;
  let gateway: GatewayService;
  let transport: FakeMessagingTransport;
  let receivedAgentMessages: any[] = [];
  let receivedHeartbeats: any[] = [];
  let receivedAssets: any[] = [];

  const secret = "test-gateway-secret-32-chars-long";

  beforeEach(async () => {
    receivedAgentMessages = [];
    receivedHeartbeats = [];
    receivedAssets = [];

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-integ-test-"));
    storePath = path.join(tmpDir, "processed.json");

    // Local fake Cloudflare Worker server
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        if (req.url === "/v1/message") {
          const parsed = JSON.parse(body);
          receivedAgentMessages.push(parsed);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              messageId: parsed.messageId,
              replies: [
                {
                  text: `Agent processed message: ${parsed.text}`,
                  menu: [{ number: 1, label: "View Website" }],
                  previewUrl: "https://preview.replyiq.cv/abc123token",
                },
              ],
              activeProjectId: "proj_1",
              timestamp: Date.now(),
            })
          );
        } else if (req.url === "/v1/assets") {
          const parsed = JSON.parse(body);
          receivedAssets.push(parsed);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              assetId: "asset_test_new",
              hash: "sha256hash",
              width: 1600,
              height: 1200,
              mimeType: "image/webp",
            })
          );
        } else if (req.url === "/v1/heartbeat") {
          receivedHeartbeats.push(JSON.parse(body));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${addr.port}`;

    transport = new FakeMessagingTransport();
    const bridgeClient = new AgentBridgeClient({
      baseUrl: serverUrl,
      secret,
    });
    const messageStore = new ProcessedMessageStore(storePath);
    const inboundFilter = new InboundFilter();

    gateway = new GatewayService({
      transport,
      bridgeClient,
      messageStore,
      inboundFilter,
      healthPort: 0,
      heartbeatIntervalMs: 100_000,
      skipPacerDelaysForTests: true,
    });

    await gateway.start();
  });

  afterEach(async () => {
    if (gateway) {
      await gateway.stop();
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it("processes inbound text message and delivers formatted replies", async () => {
    const fromPhone = "08031234567@c.us";
    const messageId = "msg_user_1";

    await transport.simulateInboundMessage({
      messageId,
      from: fromPhone,
      timestamp: Date.now(),
      text: "NEW Bakery Shop",
      hasMedia: false,
    });

    // 1. Agent received normalized E.164 phone identity
    expect(receivedAgentMessages.length).toBe(1);
    expect(receivedAgentMessages[0].ownerKey).toBe("+2348031234567");
    expect(receivedAgentMessages[0].text).toBe("NEW Bakery Shop");

    // 2. Transport received reply for user
    expect(transport.sentMessages.length).toBe(1);
    const sent = transport.sentMessages[0]!;
    expect(sent.target).toBe(fromPhone);
    expect(sent.replies?.[0]?.text).toContain("Agent processed message: NEW Bakery Shop");
    expect(sent.replies?.[0]?.menu).toBeDefined();

    // 3. Message store recorded messageId
    expect(gateway.messageStore.has(messageId)).toBe(true);

    // 4. Duplicate message arrives: immediately ignored without agent call
    await transport.simulateInboundMessage({
      messageId,
      from: fromPhone,
      timestamp: Date.now(),
      text: "NEW Bakery Shop",
      hasMedia: false,
    });
    expect(receivedAgentMessages.length).toBe(1); // No new agent call
  });

  it("handles WhatsApp LID user seamlessly and without rejection", async () => {
    const fromLid = "123456789012345@lid";
    const messageId = "msg_lid_1";

    await transport.simulateInboundMessage({
      messageId,
      from: fromLid,
      timestamp: Date.now(),
      text: "MENU",
      hasMedia: false,
    });

    expect(receivedAgentMessages.length).toBe(1);
    expect(receivedAgentMessages[0].ownerKey).toBe("lid:123456789012345");
    expect(transport.sentMessages.length).toBe(1);
  });

  it("processes image attachment through sharp and uploads asset", async () => {
    // Generate synthetic 1800x1200 PNG
    const pngBuffer = await sharp({
      create: {
        width: 1800,
        height: 1200,
        channels: 3,
        background: { r: 50, g: 100, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const fromPhone = "+2348011223344";
    const messageId = "msg_with_photo";

    await transport.simulateInboundMessage({
      messageId,
      from: fromPhone,
      timestamp: Date.now(),
      text: "Here is my logo",
      hasMedia: true,
      downloadMedia: async () => ({
        data: pngBuffer,
        mimetype: "image/png",
        filename: "logo.png",
      }),
    });

    // Asset was uploaded to bridge
    expect(receivedAssets.length).toBe(1);
    expect(receivedAssets[0].ownerKey).toBe("+2348011223344");
    expect(receivedAssets[0].data.length).toBeGreaterThan(0);

    // Agent received media reference
    expect(receivedAgentMessages.length).toBe(1);
    expect(receivedAgentMessages[0].mediaReferences).toBeDefined();
    expect(receivedAgentMessages[0].mediaReferences[0].url).toBe("asset://asset_test_new");
    expect(receivedAgentMessages[0].mediaReferences[0].mimeType).toBe("image/webp");
  });

  it("handles corrupted media by notifying user gracefully", async () => {
    const fromPhone = "+2348011223344";
    await transport.simulateInboundMessage({
      messageId: "msg_bad_photo",
      from: fromPhone,
      timestamp: Date.now(),
      text: "Corrupted picture",
      hasMedia: true,
      downloadMedia: async () => ({
        data: Buffer.from("not an image at all"),
        mimetype: "image/jpeg",
      }),
    });

    expect(transport.sentMessages.length).toBe(1);
    expect(transport.sentMessages[0]?.text).toContain("Sorry, could not process that image");
  });

  it("handles bridge network failure by sending temporary outage apology", async () => {
    // Close server to cause bridge network failure
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const fromPhone = "+2348011223344";
    await transport.simulateInboundMessage({
      messageId: "msg_outage",
      from: fromPhone,
      timestamp: Date.now(),
      text: "Hello?",
      hasMedia: false,
    });

    expect(transport.sentMessages.length).toBe(1);
    expect(transport.sentMessages[0]?.text).toContain("temporarily busy or reconnecting");
  });

  it("drops messages older than 3-minute freshness window", async () => {
    const fromPhone = "+2348011223344";
    const fourMinsAgo = Date.now() - (4 * 60 * 1000);

    await transport.simulateInboundMessage({
      messageId: "msg_stale_1",
      from: fromPhone,
      timestamp: fourMinsAgo,
      text: "Old message",
      hasMedia: false,
    });

    // Stale message is dropped without agent dispatch
    expect(receivedAgentMessages.length).toBe(0);
  });

  it("throttles excessive messages in same chat window with rate limit notice", async () => {
    const fromPhone = "+2348055667788";

    // Simulate burst of 12 messages (limit is 10 per window)
    for (let i = 0; i < 12; i++) {
      await transport.simulateInboundMessage({
        messageId: `msg_burst_${i}`,
        from: fromPhone,
        timestamp: Date.now(),
        text: `Message ${i}`,
        hasMedia: false,
      });
    }

    // Only up to limit reached agent
    expect(receivedAgentMessages.length).toBeLessThanOrEqual(10);
    // User received a rate limit warning
    const notices = transport.sentMessages.filter((m) =>
      Boolean(m.text?.includes("sending messages too fast"))
    );
    expect(notices.length).toBe(1);
  });

  it("gracefully catches transport failure when sending outage apology", async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    transport.sendText = async () => {
      throw new Error("Simulated WhatsApp disconnected");
    };

    await transport.simulateInboundMessage({
      messageId: "msg_outage_fail",
      from: "+2348011223344",
      timestamp: Date.now(),
      text: "Hello?",
      hasMedia: false,
    });
  });

  it("executes periodic heartbeat loop and updates health server", async () => {
    const customGateway = new GatewayService({
      transport,
      bridgeClient: new AgentBridgeClient({ baseUrl: serverUrl, secret }),
      messageStore: new ProcessedMessageStore(path.join(tmpDir, "custom-proc.json")),
      inboundFilter: new InboundFilter(),
      heartbeatIntervalMs: 20,
    });

    await customGateway.start();
    await new Promise((r) => setTimeout(r, 60));
    await customGateway.stop();
  });
});
