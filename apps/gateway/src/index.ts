import { createTransport } from "./transport/index.js";
import { AgentBridgeClient } from "./bridge/client.js";
import { GatewayService } from "./gateway.js";

async function main() {
  console.log("==================================================");
  console.log("       ReplyIQ WhatsApp Gateway Starting          ");
  console.log("==================================================");

  const secret = process.env.GATEWAY_SECRET;
  if (!secret) {
    console.error("FATAL: GATEWAY_SECRET environment variable is required.");
    process.exit(1);
  }

  const agentBaseUrl = process.env.AGENT_BASE_URL || "http://127.0.0.1:8788";
  const healthHost = process.env.HEALTH_HOST || "127.0.0.1";
  const healthPort = parseInt(process.env.HEALTH_PORT || "8789", 10);

  const transport = createTransport();
  const bridgeClient = new AgentBridgeClient({
    baseUrl: agentBaseUrl,
    secret,
    gatewayVersion: "1.0.0",
  });

  const gateway = new GatewayService({
    transport,
    bridgeClient,
    healthHost,
    healthPort,
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gateway gracefully...`);
    await gateway.stop();
    console.log("Gateway stopped cleanly.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await gateway.start();
    console.log(`Gateway running. Health server listening on http://${healthHost}:${healthPort}`);
  } catch (err) {
    console.error("Fatal error starting GatewayService:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
