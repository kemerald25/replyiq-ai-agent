import * as readline from "node:readline";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";
import { AgentBridgeClient } from "../src/bridge/client.js";
import { GatewayService } from "../src/gateway.js";

async function runSimulator() {
  console.log("==================================================");
  console.log("       ReplyIQ WhatsApp Local Chat Simulator      ");
  console.log("==================================================");
  console.log("Interactive test harness using FakeMessagingTransport.\n");

  const secret = process.env.GATEWAY_SECRET || "replyiq-dev-gateway-secret-test";
  const agentBaseUrl = process.env.AGENT_BASE_URL || "http://127.0.0.1:8788";

  const fakeTransport = new FakeMessagingTransport();
  const bridgeClient = new AgentBridgeClient({
    baseUrl: agentBaseUrl,
    secret,
  });

  const gateway = new GatewayService({
    transport: fakeTransport,
    bridgeClient,
    healthPort: 8790, // Use alternate port for simulator
    skipPacerDelaysForTests: true,
  });

  await gateway.start();
  console.log("Simulator gateway ready. Talking to agent at:", agentBaseUrl);

  let currentChat = "+2348012345678";
  console.log(`Current sender: ${currentChat}`);
  console.log("Type your message below. (Commands: 'NEW <biz>', 'MENU', 'HELP', or text)\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`${currentChat} > `, async (line) => {
      const text = line.trim();
      if (!text) {
        prompt();
        return;
      }

      if (text.startsWith("/switch ")) {
        currentChat = text.replace("/switch ", "").trim();
        console.log(`Switched sender to: ${currentChat}`);
        prompt();
        return;
      }

      if (text === "/quit" || text === "exit") {
        await gateway.stop();
        rl.close();
        process.exit(0);
      }

      fakeTransport.clear();

      const messageId = `sim_${Date.now()}`;
      await fakeTransport.simulateInboundMessage({
        messageId,
        from: currentChat,
        timestamp: Date.now(),
        text,
        hasMedia: false,
      });

      // Display replies received on transport
      if (fakeTransport.sentMessages.length === 0) {
        console.log("\n[Agent sent no reply]\n");
      } else {
        for (const sent of fakeTransport.sentMessages) {
          if (sent.replies) {
            for (const r of sent.replies) {
              console.log(`\n🤖 Agent Reply:\n${r.text}`);
              if (r.menu) {
                console.log("\nMenu:");
                r.menu.forEach((m) => console.log(`  [${m.number}] ${m.label}`));
              }
              if (r.previewUrl) {
                console.log(`\nPreview: ${r.previewUrl}`);
              }
            }
          }
          if (sent.text) {
            console.log(`\n🤖 System: ${sent.text}`);
          }
        }
        console.log("");
      }

      prompt();
    });
  };

  prompt();
}

runSimulator().catch((err) => {
  console.error("Simulator error:", err);
  process.exit(1);
});
