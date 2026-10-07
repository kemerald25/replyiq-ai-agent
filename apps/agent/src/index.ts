import { normalizePhone } from "@replyiq/schema";
import { IncomingMessage } from "@replyiq/agent";
import { OwnerAgentDO, AgentEnv } from "./do/owner-agent-do.js";
import { GlobalCounterDO } from "./do/global-counter-do.js";

export { OwnerAgentDO, GlobalCounterDO };

export default {
  async fetch(request: Request, env: AgentEnv): Promise<Response> {
    const url = new URL(request.url);

    // Health check
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

    // Development HTTP test endpoint: POST /dev/message
    if (url.pathname === "/dev/message") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      // 1. Fail closed: disabled when not in development environment
      if (env.ENVIRONMENT !== "development") {
        return new Response("Not Found", { status: 404 });
      }

      // 2. Secret authentication check
      const authHeader = request.headers.get("X-ReplyIQ-Secret");
      const expectedSecret = env.DEV_SECRET || "replyiq-dev-secret-local";
      if (!authHeader || authHeader !== expectedSecret) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or missing X-ReplyIQ-Secret header" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
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

      if (!payload.ownerPhone || !payload.text) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: 'ownerPhone' and 'text'" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 3. Normalize owner phone number to E.164
      const phoneNorm = normalizePhone(payload.ownerPhone);
      if (!phoneNorm.valid) {
        return new Response(
          JSON.stringify({ error: `Invalid owner phone number: ${phoneNorm.error}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const normalizedPhone = phoneNorm.e164;

      const incoming: IncomingMessage = {
        messageId: payload.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ownerPhone: normalizedPhone,
        text: payload.text,
        channel: payload.channel || "whatsapp",
        timestamp: payload.timestamp || Date.now(),
      };

      try {
        // 4. Route to owner's dedicated Durable Object actor by phone number
        const id = env.OWNER_AGENTS.idFromName(normalizedPhone);
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
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
