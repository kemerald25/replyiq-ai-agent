# ReplyIQ WhatsApp Gateway & Secure Bridge (`apps/gateway`)

The ReplyIQ WhatsApp Gateway connects WhatsApp conversation events with the Cloudflare Worker agent actor system over an authenticated, HMAC-signed HTTP bridge.

---

## Architecture Overview

```
WhatsApp Mobile Client
        │
        ▼ (WebSockets / Puppeteer)
┌─────────────────────────────────────────────────────────────┐
│ apps/gateway (Node.js runtime on always-on host)             │
│                                                             │
│  1. InboundFilter                                           │
│     • 3-min Freshness Window (drop stale backlog)           │
│     • Offline Apology Rate Limiter                          │
│     • Chat Rate Limiter (1 notice/window)                   │
│                                                             │
│  2. IdentityResolver                                        │
│     • E.164 normalization for phone numbers                 │
│     • "lid:<id>" for WhatsApp LID accounts                  │
│                                                             │
│  3. MediaProcessor (Sharp)                                  │
│     • 5 MB cap, EXIF metadata stripped                      │
│     • Max edge 1600px, WebP 80% compression                 │
│                                                             │
│  4. ProcessedMessageStore                                   │
│     • Persistent disk deduplication (.data/processed-*.json)│
│                                                             │
│  5. ReplyPacer                                              │
│     • Split paragraphs between 1,200 - 1,500 chars          │
│     • Cap artificial turn delay at ~8 seconds               │
│     • Refresh typing indicators                             │
│                                                             │
│  6. HealthServer (127.0.0.1:8789)                           │
│     • Liveness & readiness reporting                        │
│                                                             │
│  7. AgentBridgeClient                                       │
│     • Dual-secret HMAC-SHA256 signature                     │
│     • Heartbeat loop                                        │
└───────────────────────────────┬─────────────────────────────┘
                                │ HMAC-SHA256 Signed HTTP POST
                                │ /v1/message, /v1/assets, /v1/heartbeat
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/agent (Cloudflare Workers + Durable Objects)           │
│  • Verify signature in constant time (crypto.subtle.verify) │
│  • Enforce 5-minute replay window & body size limits        │
│  • Per-owner Durable Object actor                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Windows Host Configuration: Always-On Power Settings

Because the gateway runs on a dedicated Windows computer, Windows must be configured so it never enters sleep or hibernation:

### Step 1: Disable System Sleep & Hibernation
Run PowerShell as Administrator:
```powershell
# Disable sleep and standby on AC power
powercfg /change standby-timeout-ac 0

# Disable hibernation on AC power
powercfg /change hibernate-timeout-ac 0

# Disable disk spindown on AC power
powercfg /change disk-timeout-ac 0

# Disable monitor turn-off (optional, or set to 15 mins to save display life)
powercfg /change monitor-timeout-ac 15
```

### Step 2: Prevent Network Adapter Sleep
1. Open **Device Manager** (`devmgmt.msc`).
2. Expand **Network adapters** and right-click your active Ethernet/Wi-Fi adapter -> **Properties**.
3. Under the **Power Management** tab, uncheck **"Allow the computer to turn off this device to save power"**.
4. Click **OK**.

---

## 2. Auto-Start After Reboot

To ensure the gateway automatically starts whenever the host boots or restarts after a Windows update:

### Option A: Windows Task Scheduler (Recommended)
1. Open **Task Scheduler** (`taskschd.msc`).
2. Click **Create Task** (not Basic Task):
   - **General**: Name: `ReplyIQ Gateway`, check **"Run whether user is logged on or not"**, and check **"Run with highest privileges"**.
   - **Triggers**: Click **New...** -> Begin the task: **"At startup"**. Delay task: **30 seconds** (allows network to establish).
   - **Actions**: Click **New...** -> Action: **"Start a program"**:
     - Program/script: `cmd.exe`
     - Add arguments: `/c "npm start --workspace=@replyiq/gateway >> C:\replyiq-gateway.log 2>&1"`
     - Start in: `E:\Files\GitHub 2\replyiq-ai-agent`
   - **Conditions**: Uncheck "Start the task only if the computer is on AC power".
   - **Settings**: Check "If the task fails, restart every: 1 minute", restart up to 3 times.

### Option B: Windows Startup Folder
Alternatively, create a shortcut in `shell:startup` pointing to a `.bat` script running `npm start --workspace=@replyiq/gateway`.

---

## 3. Session Directory & File Lock Safety

> [!CAUTION]
> **Keep the `.wwebjs_auth` session directory OUT of cloud-synced folders!**

Services like **Microsoft OneDrive, Dropbox, Google Drive, or iCloud Drive** lock files when uploading changes. Because Chromium and WhatsApp Web write SQLite locks and cache files continuously:
- Syncing `.wwebjs_auth` via OneDrive causes `EBUSY: resource locked or busy` errors and corrupts WhatsApp Web sessions.
- Always store `.wwebjs_auth` in a non-synced directory (default: `./.wwebjs_auth` or specify `WWEBJS_AUTH_PATH` in `.env`).

---

## 4. Outage and Power-Cut Runbook

When an unexpected power failure, internet disruption, or reboot occurs:

1. **Automatic Boot & Network Acquisition**:
   - Host machine boots up and Windows Task Scheduler launches `ReplyIQ Gateway`.
2. **Session Restoration**:
   - `WhatsAppTransport` initializes Puppeteer using the persistent `.wwebjs_auth` session. No QR re-scan is needed unless WhatsApp revoked the session.
3. **Stale Backlog Drop & Freshness Window**:
   - WhatsApp delivers messages queued during the outage.
   - `InboundFilter` inspects the timestamp of each message. Any message older than 3 minutes (180s) is dropped so the agent does not execute stale requests.
4. **Offline Apology**:
   - For senders who messaged while the gateway was offline, the gateway sends at most **one polite apology per chat**:
     > *"Sorry, I was offline, please send that again."*
   - Apologies are rate-limited to a maximum of 5 per minute globally to prevent WhatsApp anti-spam flags.
5. **Heartbeat Re-establishment**:
   - The gateway posts a heartbeat to the Agent Worker `/v1/heartbeat`.
   - Worker records `lastSeen` and transport status `"connected"`.

---

## 5. Zero-Downtime Secret Rotation Procedure

The HMAC bridge supports dual active secrets (`GATEWAY_SECRET_PRIMARY` and `GATEWAY_SECRET_SECONDARY`) on Cloudflare Workers, allowing keys to be rotated without dropped messages or service interruption:

```
[Phase 1] Worker has Primary (Secret A) and Secondary (Secret B)
[Phase 2] Gateway updates GATEWAY_SECRET to Secret B
[Phase 3] Worker promotes Secret B to Primary, clears Secondary
```

### Rotation Steps:
1. Generate a new cryptographically secure 32+ character random secret:
   ```powershell
   [Convert]::ToHexString((Get-Random -Count 32 -InputObject (0..255)))
   ```
2. **Add secondary secret to Cloudflare Worker**:
   In `apps/agent` environment variables or Wrangler secrets:
   ```bash
   npx wrangler secret put GATEWAY_SECRET_SECONDARY
   # Enter the new secret string
   ```
3. **Update Gateway secret**:
   In `apps/gateway/.env`:
   ```env
   GATEWAY_SECRET=<new_secret_string>
   ```
   Restart the gateway service (`npm start`).
   The gateway now signs with the new secret. The Worker validates against `GATEWAY_SECRET_SECONDARY` and continues processing messages normally.
4. **Promote new secret to primary**:
   In `apps/agent`:
   ```bash
   npx wrangler secret put GATEWAY_SECRET_PRIMARY
   # Enter the new secret string
   ```
   Delete or clear `GATEWAY_SECRET_SECONDARY`.

---

## 6. Local Development & Simulator

To test the gateway without scanning a WhatsApp QR code:

```bash
# Run the interactive local CLI simulator
npm run simulate --workspace=@replyiq/gateway
```
Commands supported in simulator:
- `/switch <phone or lid>`: Change active sender identity
- `NEW <business name>`: Create site
- `MENU`: View project list and preview link
- `/quit`: Exit simulator
