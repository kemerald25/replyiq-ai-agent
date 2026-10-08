import { describe, it, expect, afterEach } from "vitest";
import { HealthServer } from "../src/server/health-server.js";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";

describe("Gateway HealthServer (127.0.0.1:8789)", () => {
  let server: HealthServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it("serves 200 OK on /health when transport is connected", async () => {
    const transport = new FakeMessagingTransport();
    await transport.start();

    server = new HealthServer({
      host: "127.0.0.1",
      port: 0, // Ephemeral port for test safety
      transport,
      gatewayVersion: "1.0.0",
      getLastHeartbeat: () => 1700000000000,
    });
    await server.start();

    const port = server.getPort();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.status).toBe("ok");
    expect(json.gatewayVersion).toBe("1.0.0");
    expect(json.transportState).toBe("connected");
    expect(json.lastHeartbeat).toBe(1700000000000);
    expect(typeof json.uptimeSeconds).toBe("number");
  });

  it("serves 503 Service Unavailable when transport is disconnected", async () => {
    const transport = new FakeMessagingTransport();
    transport.setState("disconnected");

    server = new HealthServer({
      host: "127.0.0.1",
      port: 0,
      transport,
    });
    await server.start();

    const port = server.getPort();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(503);

    const json = (await res.json()) as any;
    expect(json.status).toBe("degraded");
    expect(json.transportState).toBe("disconnected");
  });

  it("serves 404 for unknown endpoints", async () => {
    const transport = new FakeMessagingTransport();
    server = new HealthServer({
      host: "127.0.0.1",
      port: 0,
      transport,
    });
    await server.start();

    const port = server.getPort();
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });
});
