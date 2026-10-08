import { parseOwnerKey } from "@replyiq/schema";
import { IncomingMessage } from "@replyiq/agent";
import {
  D1OwnerRepository,
  D1AssetRepository,
  R2StorageService,
  AssetService,
} from "@replyiq/core";
import { OwnerAgentDO, AgentEnv } from "./do/owner-agent-do.js";
import { GlobalCounterDO } from "./do/global-counter-do.js";
import { verifyGatewaySignature } from "./auth.js";
import { globalRateLimiter } from "./rate-limiter.js";

export { OwnerAgentDO, GlobalCounterDO };

const MAX_BODY_SIZE_MESSAGE = 100 * 1024; // 100 KB
const MAX_BODY_SIZE_ASSETS = 10 * 1024 * 1024; // 10 MB payload limit
const MAX_PROCESSED_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB processed cap
const MAX_BODY_SIZE_HEARTBEAT = 10 * 1024; // 10 KB

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<{ body: string; sizeError: boolean }> {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return { body: "", sizeError: true };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { body: "", sizeError: true };
  }

  return { body: text, sizeError: false };
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default {
  async fetch(request: Request, env: AgentEnv): Promise<Response> {
    const url = new URL(request.url);

    // Unauthenticated health checks
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "replyiq-agent",
          environment: env.ENVIRONMENT || "development",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Authenticated /v1/health check
    if (url.pathname === "/v1/health") {
      try {
        const counterStub = env.GLOBAL_COUNTER.get(env.GLOBAL_COUNTER.idFromName("global_daily_counter"));
        const heartbeat = await counterStub.getHeartbeat();
        return new Response(
          JSON.stringify({
            status: "ok",
            service: "replyiq-agent",
            environment: env.ENVIRONMENT || "development",
            gateway: heartbeat || { transportState: "unknown", lastSeen: null },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err: unknown) {
        return new Response(
          JSON.stringify({
            status: "error",
            error: (err as Error)?.message || "Health check failed",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Global /v1 Endpoints (HMAC Authenticated)
    if (url.pathname.startsWith("/v1/")) {
      const signature = request.headers.get("X-ReplyIQ-Signature") || "";
      const rawTimestamp = request.headers.get("X-ReplyIQ-Timestamp") || "";
      const timestamp = parseInt(rawTimestamp, 10);

      if (url.pathname === "/v1/message") {
        if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

        // Rate limit: 120 req/min
        if (!globalRateLimiter.allow("v1:message", 120, 60_000)) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Read body with limit
        const { body, sizeError } = await readBodyWithLimit(request, MAX_BODY_SIZE_MESSAGE);
        if (sizeError) {
          return new Response(JSON.stringify({ error: "Payload Too Large: max 100 KB" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify HMAC Signature
        const auth = await verifyGatewaySignature({
          method: "POST",
          path: "/v1/message",
          timestamp,
          body,
          signature,
          primarySecret: env.GATEWAY_SECRET_PRIMARY,
          secondarySecret: env.GATEWAY_SECRET_SECONDARY,
        });

        if (!auth.valid) {
          return new Response(JSON.stringify({ error: `Unauthorized: ${auth.reason}` }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let payload: Partial<IncomingMessage>;
        try {
          payload = JSON.parse(body) as Partial<IncomingMessage>;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rawKey = payload.ownerKey || payload.ownerPhone;
        if (!rawKey || !payload.text) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: 'ownerKey' and 'text'" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const parsedKey = parseOwnerKey(rawKey);
        if (!parsedKey.valid) {
          return new Response(
            JSON.stringify({ error: `Invalid owner identity: ${parsedKey.error}` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const validatedKey = parsedKey.identity.key;

        const incoming: IncomingMessage = {
          messageId: payload.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ownerKey: validatedKey,
          ownerPhone: parsedKey.identity.type === "phone" ? parsedKey.identity.e164 : undefined,
          text: payload.text,
          mediaReferences: payload.mediaReferences,
          channel: payload.channel || "whatsapp",
          timestamp: payload.timestamp || Date.now(),
        };

        try {
          const doId = env.OWNER_AGENTS.idFromName(validatedKey);
          const stub = env.OWNER_AGENTS.get(doId);
          const response = await stub.handleMessage(incoming);

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          const error = err as Error;
          return new Response(
            JSON.stringify({ error: "Agent processing failure", details: error?.message || String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      if (url.pathname === "/v1/assets") {
        if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

        // Rate limit: 30 req/min
        if (!globalRateLimiter.allow("v1:assets", 30, 60_000)) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Read body with limit
        const { body, sizeError } = await readBodyWithLimit(request, MAX_BODY_SIZE_ASSETS);
        if (sizeError) {
          return new Response(JSON.stringify({ error: "Payload Too Large: max 10 MB" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify HMAC Signature
        const auth = await verifyGatewaySignature({
          method: "POST",
          path: "/v1/assets",
          timestamp,
          body,
          signature,
          primarySecret: env.GATEWAY_SECRET_PRIMARY,
          secondarySecret: env.GATEWAY_SECRET_SECONDARY,
        });

        if (!auth.valid) {
          return new Response(JSON.stringify({ error: `Unauthorized: ${auth.reason}` }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let assetPayload: { ownerKey: string; data: string; filename?: string };
        try {
          assetPayload = JSON.parse(body);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const parsedKey = parseOwnerKey(assetPayload.ownerKey);
        if (!parsedKey.valid) {
          return new Response(
            JSON.stringify({ error: `Invalid owner identity: ${parsedKey.error}` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const validatedKey = parsedKey.identity.key;

        let assetBytes: Uint8Array;
        try {
          assetBytes = base64ToUint8Array(assetPayload.data);
        } catch {
          return new Response(JSON.stringify({ error: "Malformed base64 asset data" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (assetBytes.byteLength > MAX_PROCESSED_ASSET_BYTES) {
          return new Response(JSON.stringify({ error: "Asset exceeds 5 MB size cap" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // Resolve owner
          const ownerRepo = new D1OwnerRepository(env.DB);
          let owner = await ownerRepo.getByIdentityKey(validatedKey);
          if (!owner) {
            owner = await ownerRepo.getByPhoneNumber(validatedKey);
          }
          if (!owner) {
            const isPhone = parsedKey.identity.type === "phone";
            const ownerId = `owner_${validatedKey.replace(/[^a-zA-Z0-9]/g, "")}`;
            owner = await ownerRepo.create({
              id: ownerId,
              identityKey: validatedKey,
              phoneNumber: isPhone ? validatedKey : null,
              displayName: isPhone
                ? `Business Owner (${validatedKey.slice(-4)})`
                : `WhatsApp User (${validatedKey.slice(-6)})`,
            });
          }

          const assetRepo = new D1AssetRepository(env.DB);
          const storage = new R2StorageService(env.SITES_BUCKET, env.ASSETS_BUCKET);
          const assetService = new AssetService(assetRepo, storage);

          const asset = await assetService.uploadAsset(owner.id, assetBytes);

          return new Response(
            JSON.stringify({
              assetId: asset.id,
              hash: asset.hash,
              width: asset.width,
              height: asset.height,
              sizeBytes: asset.sizeBytes,
              mimeType: asset.mimeType,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: unknown) {
          const error = err as Error;
          return new Response(
            JSON.stringify({ error: "Asset upload failed", details: error?.message || String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      if (url.pathname === "/v1/heartbeat") {
        if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

        // Rate limit: 60 req/min
        if (!globalRateLimiter.allow("v1:heartbeat", 60, 60_000)) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { body, sizeError } = await readBodyWithLimit(request, MAX_BODY_SIZE_HEARTBEAT);
        if (sizeError) {
          return new Response(JSON.stringify({ error: "Payload Too Large: max 10 KB" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          });
        }

        const auth = await verifyGatewaySignature({
          method: "POST",
          path: "/v1/heartbeat",
          timestamp,
          body,
          signature,
          primarySecret: env.GATEWAY_SECRET_PRIMARY,
          secondarySecret: env.GATEWAY_SECRET_SECONDARY,
        });

        if (!auth.valid) {
          return new Response(JSON.stringify({ error: `Unauthorized: ${auth.reason}` }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let hbData: { gatewayVersion: string; transportState: string; lastSeen?: number };
        try {
          hbData = JSON.parse(body);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const counterStub = env.GLOBAL_COUNTER.get(env.GLOBAL_COUNTER.idFromName("global_daily_counter"));
          await counterStub.recordHeartbeat({
            gatewayVersion: hbData.gatewayVersion || "unknown",
            transportState: hbData.transportState || "unknown",
            lastSeen: hbData.lastSeen || Date.now(),
          });

          return new Response(JSON.stringify({ status: "ok", recordedAt: Date.now() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: "Heartbeat recording failed", details: (err as Error)?.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Development HTTP test endpoint: POST /dev/message
    if (url.pathname === "/dev/message") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      // Fail closed: disabled when not in development environment
      if (env.ENVIRONMENT !== "development") {
        return new Response("Not Found", { status: 404 });
      }

      // Secret authentication check
      const authHeader = request.headers.get("X-ReplyIQ-Secret");
      const expectedSecret = env.DEV_SECRET || "replyiq-dev-secret-local";
      if (!authHeader || authHeader !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or missing X-ReplyIQ-Secret header" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      let payload: Partial<IncomingMessage>;
      try {
        payload = (await request.json()) as Partial<IncomingMessage>;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const rawKey = payload.ownerKey || payload.ownerPhone;
      if (!rawKey || !payload.text) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: 'ownerKey' (or 'ownerPhone') and 'text'" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const parsedKey = parseOwnerKey(rawKey);
      if (!parsedKey.valid) {
        return new Response(
          JSON.stringify({ error: `Invalid owner identity: ${parsedKey.error}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const validatedKey = parsedKey.identity.key;

      const incoming: IncomingMessage = {
        messageId: payload.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ownerKey: validatedKey,
        ownerPhone: parsedKey.identity.type === "phone" ? parsedKey.identity.e164 : undefined,
        text: payload.text,
        channel: payload.channel || "whatsapp",
        timestamp: payload.timestamp || Date.now(),
      };

      try {
        const id = env.OWNER_AGENTS.idFromName(validatedKey);
        const stub = env.OWNER_AGENTS.get(id);
        const response = await stub.handleMessage(incoming);

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: unknown) {
        const error = err as Error;
        return new Response(
          JSON.stringify({
            error: "Agent processing failure",
            details: error?.message || String(err),
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
