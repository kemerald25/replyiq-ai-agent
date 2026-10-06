# ReplyIQ Sites Worker — Deployment Runbook & Operational Architecture

This runbook documents the deployment, operations, and safety procedures for the Cloudflare Worker serving customer websites on subdomains of the base domain (e.g., `*.replyiq.cv`).

---

## 1. Cloudflare Resource Provisioning ($0 Free Tier)

ReplyIQ is engineered to run completely within Cloudflare's free-tier quotas:

### 1.1 Create D1 Database
```bash
npx wrangler d1 create replyiq-db
```
Record the resulting `database_id` and ensure `apps/sites/wrangler.jsonc` matches.

### 1.2 Apply Database Migrations
Apply the initial schema to the remote database:
```bash
npx wrangler d1 migrations apply replyiq-db --remote
```

### 1.3 Create R2 Buckets
```bash
# Bucket for pre-rendered static HTML documents
npx wrangler r2 bucket create replyiq-sites

# Bucket for user-uploaded media assets
npx wrangler r2 bucket create replyiq-assets
```

---

## 2. Staging Environment & `workers.dev` Verification

Cloudflare `workers.dev` hostnames do not support wildcard DNS resolution (e.g. `*.my-worker.workers.dev` routes to Cloudflare, not your worker script).

To enable full end-to-end testing on staging without requiring a live domain:
1. `apps/sites` includes a **Staging-Only Override** (`STAGING_OVERRIDE_ENABLED="true"`).
2. On staging, sites can be requested via path prefix or query parameter:
   - Path prefix: `https://<worker>.workers.dev/site/<slug>`
   - Query parameter: `https://<worker>.workers.dev/?site=<slug>`
3. **CRITICAL PRODUCTION RULE**: In production, `STAGING_OVERRIDE_ENABLED` must be `"false"` or omitted.

---

## 3. Production Rollout Strategy: Safe Incremental Cutover

Never attach a wildcard DNS record (`*.replyiq.cv`) on day one. Follow this strict phased rollout:

### Phase 1: Deploy with a Single Hostname (`demo.replyiq.cv`)
1. In Cloudflare Dashboard (or `wrangler.jsonc`), add a single Custom Domain route:
   ```json
   { "pattern": "demo.replyiq.cv/*", "custom_domain": true }
   ```
2. Verify end-to-end traffic:
   - Site serving (`https://demo.replyiq.cv`)
   - Pre-rendered HTML delivery from R2
   - CDN assets (`https://cdn.replyiq.cv/assets/<hash>`)
   - Previews (`https://preview.replyiq.cv/<token>`)
   - Security headers: strict CSP (`img-src https://cdn.replyiq.cv data:`), HSTS without `includeSubDomains`, no client scripts.

### Phase 2: Origin Safety & Bypass Checklist
Before enabling the wildcard route, verify that the platform apex and administrative origins are protected against wildcard hijacking:
- **Apex Host**: `replyiq.cv` — Must pass through to landing page / marketing origin.
- **Web App Host**: `app.replyiq.cv` — Must pass through to WhatsApp gateway / dashboard origin.
- **Bypass Configuration**: Ensure `BYPASS_HOSTS="replyiq.cv,www.replyiq.cv,app.replyiq.cv"` is configured.
- In Cloudflare DNS, ensure specific records exist for `replyiq.cv`, `www`, and `app`. Specific DNS records take precedence over wildcard DNS.

### Phase 3: Enable Wildcard Subdomains
Once Phase 1 and 2 pass:
1. Add wildcard DNS record: `* CNAME replyiq.cv` (proxied through Cloudflare).
2. Add Worker Route: `*.replyiq.cv/*`.

---

## 4. Caching, Staleness Window, and Emergency Takedowns

### 4.1 Edge Caching Architecture
- **Published Sites**: Cached at the edge with `Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=30`.
- **Assets**: Content-addressed by SHA-256 hash in R2; cached with `Cache-Control: public, max-age=31536000, immutable`.
- **Error Pages (404 / 403)**: Cached for at most 10 seconds (`max-age=10`).
- **Previews**: Never cached (`Cache-Control: private, no-store, max-age=0` with `X-Robots-Tag: noindex, nofollow`).

### 4.2 Staleness Window
Cloudflare Workers `caches.default.delete(url)` invalidates the cache **only in the local edge data center (PoP)** that received the request. Remote data centers across the globe will serve the previous version until the short 60-second TTL expires. The maximum staleness window during normal publishes is **60 seconds**.

### 4.3 Emergency Purge Procedure (Takedown / Content Abuse)
If a site must be taken down immediately for copyright, terms violation, or abuse:

1. **Step 1: Database Suspension (Immediate)**
   Execute immediate administrative suspension in D1:
   ```sql
   UPDATE projects
   SET status = 'suspended',
       suspended_reason = 'Suspended for Terms of Service violation (Abuse Desk Ticket #1234)'
   WHERE slug = 'offending-slug';
   ```
   *Any request reaching an edge node that misses cache will instantly receive HTTP 403 Forbidden with the unavailable page and `noindex`.*

2. **Step 2: Delete R2 HTML Artifact**
   ```bash
   npx wrangler r2 object delete replyiq-sites/sites/<project_id>/<published_version>.html
   ```

3. **Step 3: Global Edge Cache Purge via Cloudflare API**
   To bypass the 60-second local staleness window and immediately purge every Cloudflare PoP worldwide:
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
     -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"files": ["https://offending-slug.replyiq.cv/"]}'
   ```

4. **Step 4: Verify**
   ```bash
   curl -I https://offending-slug.replyiq.cv/
   ```
   Must return `HTTP/1.1 403 Forbidden` with `X-Robots-Tag: noindex, nofollow`.

---

## 5. Free-Tier Quotas & Daily Request Risk Analysis

### 5.1 Cloudflare Free Tier Limits Review
| Resource | Free Tier Limit | ReplyIQ Usage Pattern | Risk Assessment |
| :--- | :--- | :--- | :--- |
| **Worker CPU Time** | 10 ms / request | **0 ms template rendering on serving path** (pre-rendered HTML read from R2); ~2 ms render at publish | **Zero Risk** |
| **Worker Requests** | **100,000 requests / day** | All inbound visits to any site or asset | **High Risk under viral load** |
| **KV Writes** | 1,000 writes / day | **Zero** (KV is completely bypassed in favor of D1 & R2) | **Zero Risk** |
| **D1 Reads** | 5,000,000 / day | Absorbed by 60s Edge Cache | **Low Risk** |
| **D1 Writes** | 100,000 / day | Only occurs when user edits or publishes | **Low Risk** |
| **R2 Storage** | 10 GB | Static HTML and optimized WebP/PNG images | **Low Risk** |
| **R2 Class B Reads** | 10,000,000 / month | Absorbed by Edge Cache & 1-year immutable asset cache | **Low Risk** |

### 5.2 The 100k Daily Request Risk & Operational Recommendations
Cloudflare Free Tier imposes an account-wide hard cap of **100,000 Worker requests per day**. If a customer's website goes viral on WhatsApp, is subjected to automated bot scraping, or a distributed burst occurs, exhausting this 100k daily allowance causes Cloudflare to return **HTTP 1027 (Worker exceeded rate limits)** across the entire account until 00:00 UTC.

#### Recommended Mitigations:
1. **Edge Cache Cushion**: The 60-second site cache and 1-year immutable CDN asset cache absorb the vast majority of repeat asset/page hits without triggering Worker execution when configured at Cloudflare DNS edge.
2. **Cloudflare WAF Rate Limiting Rule**:
   Configure a free WAF rate limiting rule on `*.replyiq.cv`:
   - Limit: 60 requests per 10 seconds per IP address.
   - Action: Block for 1 minute.
   - Prevents scraping bots from burning daily worker requests.
3. **Usage Monitoring & Threshold Alerts**:
   Set up a Cloudflare Notification Alert in the dashboard:
   - Metric: Worker Request Count.
   - Threshold: 75,000 requests in a 24-hour window (75% quota).
   - Target: WhatsApp / Slack webhook to the engineering on-call channel.
4. **Upgrade Trigger**:
   When ReplyIQ exits closed beta and onboarded Nigerian businesses exceed 50 active sites, upgrade the Cloudflare plan to **Workers Paid ($5 / month)**, which provides 10,000,000 requests/month ($0.30 per additional million) and eliminates the daily hard-cutoff risk.
