#!/usr/bin/env node
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  AgentOrchestrator,
  InMemoryOwnerStateStore,
  MockProvider,
  WorkersAIProvider,
  GeminiProvider,
  ModelProvider,
  FREE_TIER_LIMITS,
} from "@replyiq/agent";
import {
  InMemoryOwnerRepository,
  InMemoryProjectRepository,
  InMemoryVersionRepository,
  InMemoryPublishEventRepository,
  InMemoryPreviewRepository,
  InMemoryAssetRepository,
  InMemoryStorageService,
  PublishService,
  VersionService,
  PreviewService,
} from "@replyiq/core";
import { allSampleDocuments } from "@replyiq/templates";

// Parse CLI flags: --provider <mock|workers-ai|gemini> --phone <e164>
const args = process.argv.slice(2);
let providerType = "mock";
let ownerPhone = "+2348012345678";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--provider" && args[i + 1]) {
    providerType = args[i + 1]!.toLowerCase();
    i++;
  } else if (args[i] === "--phone" && args[i + 1]) {
    ownerPhone = args[i + 1]!;
    i++;
  }
}

async function main() {
  console.log("\n=======================================================");
  console.log("       ReplyIQ Agent Interactive CLI Tester            ");
  console.log("=======================================================");

  let provider: ModelProvider;

  if (providerType === "workers-ai") {
    const accountId = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.error("\n❌ Error: Workers AI REST provider requires credentials in environment:");
      console.error("   export CF_ACCOUNT_ID=\"your-cloudflare-account-id\"");
      console.error("   export CF_API_TOKEN=\"your-workers-ai-api-token\"");
      process.exit(1);
    }

    console.log(`\n⚠️  WARNING: Running with real Cloudflare Workers AI provider.`);
    console.log(`   Real calls consume your daily free neuron allowance (${FREE_TIER_LIMITS.DAILY_FREE_NEURONS} neurons/day).`);
    console.log(`   Default model: @cf/meta/llama-3.1-8b-instruct-fp8`);

    provider = new WorkersAIProvider({
      accountId,
      apiToken,
      model: "@cf/meta/llama-3.1-8b-instruct-fp8",
    });
  } else if (providerType === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("\n❌ Error: Gemini provider requires GEMINI_API_KEY in environment:");
      console.error("   export GEMINI_API_KEY=\"your-gemini-api-key\"");
      process.exit(1);
    }

    console.log(`\n⚠️  Running with Google Gemini REST provider (model: gemini-2.5-flash).`);
    console.log(`   Calls consume your Google AI Studio free tier quota.`);

    provider = new GeminiProvider({
      apiKey,
      model: "gemini-2.5-flash",
    });
  } else {
    console.log(`\n🤖 Running with MockProvider (local deterministic rules, zero cost).`);
    console.log(`   Use '--provider workers-ai' or '--provider gemini' to test live LLMs.`);
    provider = new MockProvider();
  }

  // Setup memory test repository and seed sample site
  const ownerRepo = new InMemoryOwnerRepository();
  const projectRepo = new InMemoryProjectRepository();
  const versionRepo = new InMemoryVersionRepository(projectRepo);
  const publishEventRepo = new InMemoryPublishEventRepository();
  const previewRepo = new InMemoryPreviewRepository();
  const assetRepo = new InMemoryAssetRepository();
  const storage = new InMemoryStorageService();
  const stateStore = new InMemoryOwnerStateStore();

  const publishService = new PublishService(
    projectRepo,
    versionRepo,
    publishEventRepo,
    assetRepo,
    storage,
    "localhost"
  );
  const versionService = new VersionService(
    projectRepo,
    versionRepo,
    publishEventRepo,
    previewRepo
  );
  const previewService = new PreviewService(
    projectRepo,
    versionRepo,
    previewRepo,
    "localhost"
  );

  const ownerId = `owner_${ownerPhone.replace(/\+/g, "")}`;
  await ownerRepo.create({
    id: ownerId,
    phoneNumber: ownerPhone,
    displayName: "Amaka Hair Studio",
  });

  await assetRepo.create({
    id: "asset_salon_hero",
    ownerId,
    hash: "hash_seed_1",
    r2Key: "assets/asset_salon_hero.jpg",
    sizeBytes: 1024,
    mimeType: "image/jpeg",
    width: 800,
    height: 600,
  });

  await projectRepo.createWithInitialVersion(
    {
      id: "proj_amaka_luxe",
      ownerId,
      slug: "amaka-luxe",
      name: "Amaka Luxe Salon",
      template: "portfolio",
      status: "draft",
      currentVersion: 1,
      publishedVersion: null,
      suspendedReason: null,
      deletedAt: null,
    },
    allSampleDocuments.salon,
    "user",
    "Initial site creation"
  );

  const orchestrator = new AgentOrchestrator({
    ownerRepo,
    projectRepo,
    versionRepo,
    publishService,
    versionService,
    previewService,
    stateStore,
    defaultProvider: provider,
    baseDomain: "localhost",
    previewBaseUrl: "http://localhost:8787/preview",
  });

  console.log(`\nOwner phone: ${ownerPhone}`);
  console.log(`Active site: Amaka Luxe Salon (amaka-luxe.localhost) [Version 1, Draft]`);
  console.log(`Commands   : MENU, HELP, UNDO, PUBLISH, NEW <name>, STOP, or chat naturally`);
  console.log(`Type 'exit' to quit.\n`);

  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const userText = await rl.question("\nOwner 💬 > ");
      const trimmed = userText.trim();

      if (!trimmed) continue;
      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("Goodbye!");
        break;
      }

      const messageId = `msg_cli_${Date.now()}`;
      const response = await orchestrator.handleMessage({
        messageId,
        ownerPhone,
        text: trimmed,
        channel: "cli",
        timestamp: Date.now(),
      });

      console.log("\nAgent 🤖 >");
      for (const reply of response.replies) {
        console.log(reply.text);

        if (reply.menu) {
          console.log("\nOptions:");
          for (const item of reply.menu) {
            console.log(`  [${item.number}] ${item.label}`);
          }
        }

        if (reply.link) {
          console.log(`\n🔗 ${reply.link.label}: ${reply.link.url}`);
        }
      }

      if (response.neuronsUsed !== undefined && response.neuronsUsed > 0) {
        console.log(`\n[Neuron Usage: ${response.neuronsUsed.toFixed(4)} neurons | Tokens: ${response.tokensUsed} | Model: ${response.modelUsed}]`);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Fatal chat CLI error:", err);
  process.exit(1);
});
