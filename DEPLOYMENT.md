# ReplyIQ Staging & Production Deployment Guide

This guide describes how to deploy the ReplyIQ platform across Cloudflare Workers and connect the local/VPS WhatsApp Gateway.

---

## 1. Architecture & DNS Routing on `workers.dev`

### The Wildcard Subdomain Problem on `workers.dev`
In production (`replyiq.cv`), user websites are served on subdomains:
- Live: `https://<slug>.replyiq.cv`
- Preview: `https://preview.replyiq.cv/<token>`
- CDN: `https://cdn.replyiq.cv/assets/<key>`

However, **Cloudflare's default `workers.dev` domain does NOT support wildcard subdomains** (`*.<worker>.<account>.workers.dev` does not resolve in DNS). 

### The Solution: Path & Query Routing on Staging
When `ENVIRONMENT="staging"`, ReplyIQ automatically switches to path-based and query-based routing on the apex worker domain:
- **Live Websites**: `https://<sites-worker>.workers.dev/site/<slug>` (or `?site=<slug>`)
- **Previews**: `https://<sites-worker>.workers.dev/preview/<token>` (or `/p/<token>`)
- **Assets**: `https://<sites-worker>.workers.dev/assets/<key>`

This allows team members and testers to click links directly on their mobile phones in WhatsApp and view previews and live sites without requiring custom DNS or local hosts file modifications.

---

## 2. Cloudflare Resource Provisioning

Before deploying the workers, create the shared Cloudflare D1 database and R2 buckets.

### Step 2.1: Create Cloudflare D1 Database
```bash
npx wrangler d1 create replyiq-db
```
Note the database ID printed in the console (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Update `database_id` in `apps/sites/wrangler.jsonc` and `apps/agent/wrangler.jsonc` if deploying to non-local environments.

### Step 2.2: Apply Database Migrations
Apply the initial schema (`0001_initial.sql`), owner identity migration (`0002_owner_identity.sql`), and Telegram identity migration (`0003_telegram_identity.sql`) to the remote D1 database:
```bash
npx wrangler d1 migrations apply replyiq-db --remote
```

### Step 2.3: Create Cloudflare R2 Buckets
Create the storage buckets for pre-rendered static HTML and user media assets:
```bash
npx wrangler r2 bucket create replyiq-sites
npx wrangler r2 bucket create replyiq-assets
```

---

## 3. Deploying the Sites Worker (`apps/sites`)

`apps/sites` serves the rendered static HTML from R2, validates preview tokens, and serves CDN assets.

### Step 3.1: Environment Configuration
Ensure `apps/sites/wrangler.jsonc` (or command line `--var` overrides) specifies the staging configuration:
```jsonc
{
  "name": "replyiq-sites",
  "vars": {
    "BASE_DOMAIN": "replyiq-sites.<your-account>.workers.dev",
    "ENVIRONMENT": "staging",
    "STAGING_OVERRIDE_ENABLED": "true"
  }
}
```

### Step 3.2: Deploy
From the repository root:
```bash
npm run --workspace=apps/sites build
cd apps/sites
npx wrangler deploy
```

Take note of the deployed URL: `https://replyiq-sites.<your-account>.workers.dev`.

---

## 4. Deploying the Agent Worker (`apps/agent`)

`apps/agent` hosts the Durable Objects (`OwnerAgentDO`, `GlobalCounterDO`), the AI orchestrator, the Telegram Webhook handler (`/telegram/webhook`), and the secure HMAC Gateway bridge endpoint (`/v1/message`).

### Step 4.1: Set Staging Secrets
Run `wrangler secret put` inside `apps/agent`:

```bash
cd apps/agent

# Telegram Bot Secrets (Official Bot API - ban-safe, 100% serverless)
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_SECRET_TOKEN

# Shared HMAC secret matching GATEWAY_HMAC_SECRET in apps/gateway/.env
npx wrangler secret put GATEWAY_HMAC_SECRET

# Secret salt used for SHA-256 phone number pseudonymization in logs
npx wrangler secret put OWNER_HASH_SECRET

# Cloudflare Account ID and API Token for Workers AI (if using Workers AI binding)
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_API_TOKEN
```

### Step 4.2: Staging Variables
Configure `apps/agent/wrangler.jsonc` (or pass via environment):
```jsonc
{
  "name": "replyiq-agent",
  "vars": {
    "BASE_DOMAIN": "replyiq-sites.<your-account>.workers.dev",
    "ENVIRONMENT": "staging"
  }
}
```
> [!NOTE]
> `PREVIEW_BASE_URL` is optional. If left unset, it automatically derives `https://${BASE_DOMAIN}/preview` in staging or `https://preview.${BASE_DOMAIN}` in production.

### Step 4.3: Deploy
```bash
npm run --workspace=apps/agent build
cd apps/agent
npx wrangler deploy
```

Take note of the deployed URL: `https://replyiq-agent.<your-account>.workers.dev`.

---

## 5. Registering the Telegram Bot Webhook (Primary Serverless Channel)

ReplyIQ supports Telegram as a ban-safe, zero-infrastructure, serverless messaging channel running entirely on Cloudflare edge.

### Step 5.1: Create Bot via @BotFather
1. Open Telegram and message `@BotFather`.
2. Run `/newbot` and follow the prompts to obtain your bot token (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
3. Set bot commands for autocomplete:
   ```
   start - Open ReplyIQ main menu
   menu - Show available actions and pages
   new - Create a new business website
   preview - Get preview link for your site
   publish - Request publication menu to go live
   undo - Rollback last change
   help - Get help and guidance
   ```

### Step 5.2: Register Webhook with Telegram Bot API
Use `curl` to register your Worker's `/telegram/webhook` endpoint with your secret token:

```bash
curl -F "url=https://replyiq-agent.<your-account>.workers.dev/telegram/webhook" \
     -F "secret_token=<YOUR_TELEGRAM_SECRET_TOKEN>" \
     -F "allowed_updates=[\"message\",\"callback_query\"]" \
     https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

### Step 5.3: Verify Webhook Health
Verify the webhook is active and healthy:
```bash
curl https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

Incoming updates are verified via `X-Telegram-Bot-Api-Secret-Token`, stored in owner Durable Object SQLite inbox, and processed FIFO with automatic outbox dispatch and inline interactive keyboard buttons.

---

## 6. Configuring and Running the WhatsApp Gateway (`apps/gateway`) (Optional Channel)

The WhatsApp Gateway runs on a server/VPS or local machine with Node.js and Chromium.

### Step 6.1: Create Gateway `.env` File
Create `apps/gateway/.env`:
```env
# Agent Worker Bridge Endpoint
AGENT_BRIDGE_URL=https://replyiq-agent.<your-account>.workers.dev/v1/message

# Must match the GATEWAY_HMAC_SECRET stored in Cloudflare secrets
GATEWAY_HMAC_SECRET=your-secure-random-hmac-secret-at-least-32-chars

# Base Domain and Environment
BASE_DOMAIN=replyiq-sites.<your-account>.workers.dev
ENVIRONMENT=staging
```

### Step 6.2: Start the Gateway
```bash
cd apps/gateway
npm run build
npm run start
```

1. A terminal QR code will appear.
2. Open WhatsApp on your mobile phone -> **Linked Devices** -> **Link a Device**.
3. Scan the QR code.
4. The gateway logs `WhatsApp authentication successful` and `WhatsApp Web client is ready and connected`.

---

## 7. Testing & Verifying from Mobile Devices

### 7.1 Telegram Verification (Mobile-First Experience)
1. Open Telegram on your smartphone and start a chat with your bot.
2. Send `/start` or `/new Amaka Hair Studio`.
3. The bot responds with interactive inline keyboard buttons and a preview link:
   ```
   https://replyiq-sites.<your-account>.workers.dev/preview/pt_xxxxxxxxxxxx
   ```
4. Tap the preview link. The pre-rendered static site loads with mobile styling and the preview banner.
5. Tap an inline button or send `/publish`.
6. Confirm publication when prompted. The bot deploys the site to R2 and returns the live link:
   ```
   https://replyiq-sites.<your-account>.workers.dev/site/amaka-hair-studio
   ```
7. Tap the live link. The site loads in under 500ms from Cloudflare edge.

### 7.2 WhatsApp Verification
1. Send `NEW Amaka Hair Studio` from your phone to the WhatsApp gateway number.
2. The bot responds with the confirmation and preview link.
3. Tap the link to inspect.
4. Send `PUBLISH` to go live.

---

## 8. Rate Limiter Operational Architecture

The in-memory rate limiter in `apps/agent/src/rate-limiter.ts` operates on an **isolate-instance basis**:
- **Per-Isolate Scope**: Each Cloudflare Worker isolate maintains its own sliding-window counter in memory.
- **DDoS Mitigation**: This provides instant, sub-millisecond, zero-cost protection against runaway loops or script abuse.
- **Quotas vs Protection**: Because Worker isolates are ephemeral and scale across multiple edge nodes, in-memory rate limiting does not enforce strict global billing quotas. Global limits are enforced via Cloudflare Durable Objects (`GlobalCounterDO`) and D1 database transactions.
