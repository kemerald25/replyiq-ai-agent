# @replyiq/agent

Pure, transport-agnostic agent core and Cloudflare Durable Object worker for ReplyIQ.

## Architecture

In accordance with `AGENTS.md`:
1. **AI edits content JSON only, never template code**: The model interacts with the website document purely via strongly typed operations (`@replyiq/schema`).
2. **Publish Confirmation Gating**: The model can only propose publishing. A publish is bound to a specific version number, expires in 10 minutes, is cancelled by any other message, and executes strictly when the user sends confirmation option `1`.
3. **Sequential Locking & Idempotency**: Each site owner is handled sequentially using SQLite locks and in-memory promise chains. Duplicate messages returning while an operation is in flight wait for and return the initial execution result without running twice.
4. **Transport Agnostic**: The agent engine operates on `IncomingMessage` and returns `AgentResponse` without any direct WhatsApp or HTTP coupling.

---

## Providers & Model Fallback Chain

- **Default Model**: `@cf/meta/llama-3.1-8b-instruct-fp8` (Cloudflare Workers AI)
- **Fallback Option 1**: `gemini-2.5-flash` via `GeminiProvider` (Google Gemini REST API, separate free quota)
- **Fallback Option 2**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Cloudflare Workers AI 70B)
- **Testing & Local Dev**: `MockProvider` (deterministic rule-based mock engine covering all 8 evaluation categories)

### Fallback Execution Chain
```
Default Model (Llama 3.1 8B)
        │
        ├─► Success ──► Apply operations & respond
        ▼
   (Fails or throws)
        │
Fallback Model (Gemini 2.5 Flash / 70B)
        │
        ├─► Success ──► Apply operations & respond
        ▼
   (Fails or throws)
        │
Graceful System Message ("I'm temporarily unable to process your request...")
```

---

## Workers AI Neuron Pricing & Daily Budgeting

Cloudflare Workers AI allocates **10,000 neurons per day** on the Free Tier.

### Accurate Per-Token Neuron Costs:
- **`@cf/meta/llama-3.1-8b-instruct-fp8`**:
  - Input: **4,119 neurons / 1M tokens** (~0.004119 neurons / token)
  - Output: **34,868 neurons / 1M tokens** (~0.034868 neurons / token)
- **`@cf/meta/llama-3.3-70b-instruct-fp8-fast`**:
  - Input: **25,000 neurons / 1M tokens** (~0.025 neurons / token)
  - Output: **180,000 neurons / 1M tokens** (~0.180 neurons / token)
- **`gemini-2.5-flash`**:
  - **0 Cloudflare neurons** (billed against Google Gemini API quota)

### Platform & Owner Limits:
- **Global Daily Cap**: **8,000 neurons/day** (80% safety cap of the 10,000 free tier limit). When reached, the agent halts model calls and responds gracefully with daily capacity notifications until 00:00 UTC rollover.
- **Per-Owner Daily Allowance**:
  - Max messages: **120 messages/owner/day**
  - Max model calls: **40 model calls/owner/day**
  - Max fallback calls: **5 fallback calls/owner/day** (prevents a single owner from exhausting the fallback budget)

---

## Interactive CLI Chat (`npm run chat`)

ReplyIQ provides an interactive developer CLI to simulate WhatsApp conversations:

```bash
# Run with local mock provider (zero cost, offline)
npm run chat -- --provider mock

# Run with Cloudflare Workers AI
npm run chat -- --provider workers-ai --account-id <CLOUDFLARE_ACCOUNT_ID> --api-token <CLOUDFLARE_API_TOKEN>

# Run with Google Gemini
npm run chat -- --provider gemini --gemini-key <GEMINI_API_KEY>
```

> **Warning**: When connecting to real providers (`workers-ai` or `gemini`), model calls consume actual daily quota and Cloudflare neuron allowances.

---

## Evaluation Suite (`npm run eval`)

Runs the 40-case golden evaluation dataset across 8 distinct categories:
- Price changes
- Service management
- Theme and color changes
- Contact updates
- About section rewriting
- Nigerian Pidgin phrasing
- Ambiguous requests (asking clarification)
- Prompt injection & jailbreak defenses

Thresholds enforced:
- Overall pass rate: **>= 85%** (achieved: **100%**)
- Safety & injection pass rate: **100%** (achieved: **100%**)
