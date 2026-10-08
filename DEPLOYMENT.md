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
Apply the initial schema (`0001_initial.sql`) and owner identity migration (`0002_owner_identity.sql`) to the remote D1 database:
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

`apps/agent` hosts the Durable Objects (`OwnerAgentDO`, `GlobalCounterDO`), the AI orchestrator, and the secure HMAC Gateway bridge endpoint (`/v1/message`).

### Step 4.1: Set Staging Secrets
Run `wrangler secret put` inside `apps/agent`:

```bash
cd apps/agent

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

## 5. Configuring and Running the WhatsApp Gateway (`apps/gateway`)

The WhatsApp Gateway runs on a server/VPS or local machine with Node.js and Chromium.

### Step 5.1: Create Gateway `.env` File
Create `apps/gateway/.env`:
```env
# Agent Worker Bridge Endpoint
AGENT_BRIDGE_URL=https://replyiq-agent.<your-account>.workers.dev/v1/message

# Must match the GATEWAY_HMAC_SECRET stored in Cloudflare secrets
GATEWAY_HMAC_SECRET=your-secure-random-hmac-secret-at-least-32-chars

# Base Domain and Environment
BASE_DOMAIN=replyiq-sites.<your-account>.workers.dev
ENVIRONMENT=staging

# Optional: Overrides
# PREVIEW_BASE_URL=https://replyiq-sites.<your-account>.workers.dev/preview
# HEARTBEAT_INTERVAL_MS=30000
```

### Step 5.2: Start the Gateway
```bash
cd apps/gateway
npm run build
npm run start
```

1. A terminal QR code will appear.
2. Open WhatsApp on your mobile phone -> **Linked Devices** -> **Link a Device**.
3. Scan the QR code.
4. The gateway will log `WhatsApp authentication successful` and `WhatsApp Web client is ready and connected`.

---

## 6. Testing & Verifying from a Mobile Phone

1. Send `NEW Amaka Hair Studio` from your phone to the WhatsApp gateway number.
2. The bot responds with the confirmation and a preview link:
   ```
   https://replyiq-sites.<your-account>.workers.dev/preview/pt_xxxxxxxxxxxx
   ```
3. Tap the link on your mobile phone. The site opens and displays the preview with the preview banner.
4. Send `PUBLISH` in WhatsApp.
5. The bot deploys the site and returns the live link:
   ```
   https://replyiq-sites.<your-account>.workers.dev/site/amaka-hair-studio
   ```
6. Tap the link on your phone. The live site loads in under 500ms directly from Cloudflare R2!

---

## 7. Rate Limiter Operational Architecture

The in-memory rate limiter in `apps/agent/src/rate-limiter.ts` operates on an **isolate-instance basis**:
- **Per-Isolate Scope**: Each Cloudflare Worker isolate maintains its own sliding-window counter in memory.
- **DDoS Mitigation**: This provides instant, sub-millisecond, zero-cost protection against runaway loops or script abuse.
- **Quotas vs Protection**: Because Worker isolates are ephemeral and scale across multiple edge nodes, in-memory rate limiting does not enforce strict global billing quotas. Global limits are enforced via Cloudflare Durable Objects (`GlobalCounterDO`) and D1 database transactions.
