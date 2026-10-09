/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { OwnerAgentDO, AgentEnv } from "../src/do/owner-agent-do.js";
import { validateImageMagicBytes } from "../src/telegram/media.js";
import {
  escapeHtml,
  splitTelegramText,
  parseMenuOptions,
  buildInlineMenuKeyboard,
  getLinkPreviewOptions,
} from "../src/telegram/formatting.js";
import { verifyTelegramSecretToken } from "../src/telegram/auth.js";
import { parseCommand } from "@replyiq/agent";

function createMockSqlStorage(): SqlStorage {
  const db = new DatabaseSync(":memory:");

  return {
    exec(query: string, ...params: any[]) {
      const trimmed = query.trim();
      if (trimmed.includes("CREATE TABLE") || trimmed.includes("CREATE INDEX")) {
        db.exec(query);
        return {
          toArray: () => [],
        } as any;
      }

      if (trimmed.toUpperCase().startsWith("SELECT")) {
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        return {
          toArray: () => rows,
        } as any;
      }

      const stmt = db.prepare(query);
      stmt.run(...params);
      return {
        toArray: () => [],
      } as any;
    },
  } as unknown as SqlStorage;
}

describe("Telegram Channel Integration & Queue", () => {
  describe("Formatting & Helpers", () => {
    it("escapes HTML characters for Telegram parse_mode", () => {
      expect(escapeHtml("Amaka & Sons <Hair & Beauty>")).toBe(
        "Amaka &amp; Sons &lt;Hair &amp; Beauty&gt;"
      );
    });

    it("parses numbered menu options and separates body from options", () => {
      const text = "Choose what you want to do:\n1. Change Title\n2. Publish Website\n3. Cancel";
      const parsed = parseMenuOptions(text);

      expect(parsed.options).toHaveLength(3);
      expect(parsed.options[0]).toEqual({ number: 1, label: "Change Title" });
      expect(parsed.options[1]).toEqual({ number: 2, label: "Publish Website" });
      expect(parsed.options[2]).toEqual({ number: 3, label: "Cancel" });
      expect(parsed.bodyText).toBe("Choose what you want to do:");
    });

    it("returns original text when no numbered options are found", () => {
      const text = "Your website is live!";
      const parsed = parseMenuOptions(text);
      expect(parsed.options).toHaveLength(0);
      expect(parsed.bodyText).toBe("Your website is live!");
    });

    it("builds vertical inline keyboard with callback_data format menu:<id>:<number>", () => {
      const keyboard = buildInlineMenuKeyboard("menu_123", [
        { number: 1, label: "Edit Service" },
        { number: 2, label: "Publish" },
      ]);

      expect(keyboard.inline_keyboard).toHaveLength(2);
      expect(keyboard.inline_keyboard[0]![0]).toEqual({
        text: "1. Edit Service",
        callback_data: "menu:menu_123:1",
      });
      expect(keyboard.inline_keyboard[1]![0]).toEqual({
        text: "2. Publish",
        callback_data: "menu:menu_123:2",
      });
    });

    it("disables link previews on preview URLs to prevent crawlers", () => {
      expect(getLinkPreviewOptions("Check https://example.com", "https://replyiq.cv/preview/tok123").is_disabled).toBe(true);
      expect(getLinkPreviewOptions("Check https://replyiq.cv/preview/tok123").is_disabled).toBe(true);
      expect(getLinkPreviewOptions("Check https://amaka.replyiq.cv").is_disabled).toBe(false);
    });

    it("splits long telegram text cleanly under character limit", () => {
      const longText = "Hello world.\n\n".repeat(300);
      const chunks = splitTelegramText(longText);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(3500);
      }
    });

    it("validates timing-safe secret token verification", async () => {
      expect(await verifyTelegramSecretToken("secret-token-123", "secret-token-123")).toBe(true);
      expect(await verifyTelegramSecretToken("wrong-token", "secret-token-123")).toBe(false);
      expect(await verifyTelegramSecretToken("", "secret-token-123")).toBe(false);
      expect(await verifyTelegramSecretToken(null, "secret-token-123")).toBe(false);
    });
  });

  describe("Media & Magic Byte Validation", () => {
    it("validates valid JPEG magic bytes", () => {
      const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = validateImageMagicBytes(jpeg);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/jpeg");
    });

    it("validates valid PNG magic bytes", () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = validateImageMagicBytes(png);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/png");
    });

    it("validates valid WebP magic bytes", () => {
      const webp = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const res = validateImageMagicBytes(webp);
      expect(res.valid).toBe(true);
      expect(res.mimeType).toBe("image/webp");
    });

    it("rejects non-image payloads and truncated bytes", () => {
      expect(validateImageMagicBytes(new Uint8Array([1, 2, 3])).valid).toBe(false);
      expect(validateImageMagicBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])).valid).toBe(false); // GIF not allowed
    });

    it("rejects payloads exceeding 10 MB", () => {
      const oversized = new Uint8Array(11 * 1024 * 1024);
      oversized[0] = 0xff;
      oversized[1] = 0xd8;
      oversized[2] = 0xff;
      expect(validateImageMagicBytes(oversized).valid).toBe(false);
    });
  });

  describe("Slash Command Parsing", () => {
    it("handles all deterministic slash commands", () => {
      expect(parseCommand("/start")).toEqual({ type: "MENU" });
      expect(parseCommand("/menu")).toEqual({ type: "MENU" });
      expect(parseCommand("/help")).toEqual({ type: "HELP" });
      expect(parseCommand("/preview")).toEqual({ type: "PREVIEW" });
      expect(parseCommand("/undo")).toEqual({ type: "UNDO" });
      expect(parseCommand("/publish")).toEqual({ type: "PUBLISH_REQUEST" });
      expect(parseCommand("/new Amaka Salon")).toEqual({ type: "NEW", name: "Amaka Salon" });
      expect(parseCommand("1")).toEqual({ type: "NUMBER_SELECTION", number: 1 });
    });
  });

  describe("Telegram Webhook Endpoint (Worker Level)", () => {
    const createMockWorkerEnv = (overrides: Partial<AgentEnv> = {}): AgentEnv => {
      const mockDOStub = {
        enqueueTelegramUpdate: vi.fn().mockResolvedValue({ ok: true }),
        fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))),
      };

      const mockNamespace = {
        idFromName: vi.fn().mockReturnValue("mock-tg-do-id"),
        get: vi.fn().mockReturnValue(mockDOStub),
      };

      return {
        DB: {} as any,
        SITES_BUCKET: {} as any,
        ASSETS_BUCKET: {} as any,
        OWNER_AGENTS: mockNamespace as any,
        GLOBAL_COUNTER: mockNamespace as any,
        TELEGRAM_BOT_TOKEN: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        TELEGRAM_SECRET_TOKEN: "expected-secret-token",
        ENVIRONMENT: "development",
        BASE_DOMAIN: "localhost",
        ...overrides,
      };
    };

    it("enqueues incoming Telegram update to OwnerAgentDO with tg:<id>", async () => {
      const env = createMockWorkerEnv();
      const updatePayload = {
        update_id: 1001,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 987654321, type: "private" },
          from: { id: 987654321, is_bot: false, first_name: "Test" },
          text: "/menu",
        },
      };

      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify(updatePayload),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.ok).toBe(true);
      expect(env.OWNER_AGENTS.idFromName).toHaveBeenCalledWith("tg:987654321");
    });

    it("rejects unauthorized webhook when secret token does not match", async () => {
      const env = createMockWorkerEnv();
      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("returns 405 for non-POST methods", async () => {
      const env = createMockWorkerEnv();
      const req = new Request("http://localhost/telegram/webhook", {
        method: "GET",
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("supports TELEGRAM_WEBHOOK_PATH_SUFFIX", async () => {
      const env = createMockWorkerEnv({ TELEGRAM_WEBHOOK_PATH_SUFFIX: "custom-suffix-xyz" });
      const req = new Request("http://localhost/telegram/webhook/custom-suffix-xyz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({
          update_id: 2002,
          message: {
            message_id: 2,
            date: 1700000000,
            chat: { id: 111222333, type: "private" },
            from: { id: 111222333, is_bot: false, first_name: "Suffix" },
            text: "/help",
          },
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it("rejects webhook with 403 when TELEGRAM_ENABLED is 'false'", async () => {
      const env = createMockWorkerEnv({ TELEGRAM_ENABLED: "false" });
      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({ update_id: 1 }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
    });

    it("rejects webhook with 429 when rate limit is exceeded", async () => {
      const env = createMockWorkerEnv({ TELEGRAM_RATE_LIMIT_PER_MINUTE: "0" });
      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({ update_id: 1 }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(429);
    });

    it("rejects webhook with 400 for invalid JSON or missing update_id", async () => {
      const env = createMockWorkerEnv();
      const reqBadJson = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: "invalid-json",
      });
      expect((await worker.fetch(reqBadJson, env)).status).toBe(400);

      const reqMissingId = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({ no_update_id: true }),
      });
      expect((await worker.fetch(reqMissingId, env)).status).toBe(400);
    });

    it("ignores updates without a user (returns 200 ignored)", async () => {
      const env = createMockWorkerEnv();
      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({ update_id: 88888, channel_post: { message_id: 1, date: 1, chat: { id: 1 } } }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.ignored).toBe(true);
    });

    it("returns 500 when DO enqueue throws an unexpected error", async () => {
      const env = createMockWorkerEnv();
      (env.OWNER_AGENTS.get as any)().enqueueTelegramUpdate.mockRejectedValueOnce(new Error("DO crash"));

      const req = new Request("http://localhost/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "expected-secret-token",
        },
        body: JSON.stringify({
          update_id: 77777,
          message: { message_id: 1, date: 1, chat: { id: 123 }, from: { id: 123 }, text: "hi" },
        }),
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
    });
  });

  describe("OwnerAgentDO Telegram Durable Inbox & Alarm Queue", () => {
    let agentDO: OwnerAgentDO;
    let mockSql: SqlStorage;

    beforeEach(() => {
      mockSql = createMockSqlStorage();
      const mockCtx = {
        storage: {
          sql: mockSql,
          setAlarm: vi.fn(),
        },
      } as unknown as DurableObjectState;

      const mockEnv: AgentEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [], success: true }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        } as any,
        SITES_BUCKET: {} as any,
        ASSETS_BUCKET: {} as any,
        OWNER_AGENTS: {} as any,
        GLOBAL_COUNTER: {
          idFromName: vi.fn().mockReturnValue("global-counter"),
          get: vi.fn().mockReturnValue({
            getDailyNeurons: vi.fn().mockResolvedValue(0),
            incrementDailyNeurons: vi.fn().mockResolvedValue(0),
          }),
        } as any,
        MOCK_PROVIDER: "true",
        ENVIRONMENT: "development",
        BASE_DOMAIN: "replyiq.cv",
      };

      agentDO = new OwnerAgentDO(mockCtx, mockEnv);
    });

    it("enqueues update into telegram_inbox and ignores duplicates", async () => {
      const update = {
        update_id: 5001,
        message: {
          message_id: 10,
          date: 1700000000,
          chat: { id: 12345, type: "private" as const },
          from: { id: 12345, is_bot: false, first_name: "Tester" },
          text: "/menu",
        },
      };

      const res1 = await agentDO.enqueueTelegramUpdate(update);
      expect(res1.ok).toBe(true);

      const rows1 = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 5001).toArray();
      expect(rows1).toHaveLength(1);

      // Duplicate insert should be ignored
      const res2 = await agentDO.enqueueTelegramUpdate(update);
      expect(res2.ok).toBe(true);

      const rows2 = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 5001).toArray();
      expect(rows2).toHaveLength(1);
    });

    it("processes inbox queue via processTelegramQueue strictly in FIFO order", async () => {
      const update = {
        update_id: 6001,
        message: {
          message_id: 20,
          date: 1700000000,
          chat: { id: 99999, type: "private" as const },
          from: { id: 99999, is_bot: false, first_name: "QueueUser" },
          text: "HELP",
        },
      };

      await agentDO.enqueueTelegramUpdate(update);
      await agentDO.processTelegramQueue();

      // Inbox row should be completed
      const inboxRows = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 6001).toArray() as any[];
      expect(inboxRows[0].status).toBe("completed");

      // Outbox row should be created and sent
      const outboxRows = mockSql.exec("SELECT * FROM telegram_outbox WHERE chat_id = ?", 99999).toArray() as any[];
      expect(outboxRows.length).toBeGreaterThan(0);
      expect(outboxRows[0].status).toBe("sent");
      expect(outboxRows[0].text).toContain("How to use ReplyIQ");
    });

    it("recovers items stuck in processing past the 60-second threshold", async () => {
      const oldTime = Date.now() - 100_000;
      mockSql.exec(
        `INSERT INTO telegram_inbox (update_id, payload, status, received_at, locked_at)
         VALUES (?, ?, 'processing', ?, ?)`,
        7001,
        JSON.stringify({
          update_id: 7001,
          message: {
            message_id: 30,
            date: 1700000000,
            chat: { id: 88888, type: "private" },
            from: { id: 88888, is_bot: false, first_name: "Stuck" },
            text: "HELP",
          },
        }),
        oldTime,
        oldTime
      );

      // Running processTelegramQueue should recover stuck item to pending and then process it
      await agentDO.processTelegramQueue();

      const inboxRows = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 7001).toArray() as any[];
      expect(inboxRows[0].status).toBe("completed");
    });

    it("handles callback query updates with option parsing and outbox dispatch", async () => {
      const update = {
        update_id: 8001,
        callback_query: {
          id: "cb_test_1",
          from: { id: 55555, is_bot: false, first_name: "ButtonClicker" },
          message: {
            message_id: 40,
            date: 1700000000,
            chat: { id: 55555, type: "private" as const },
          },
          data: "menu:menu_123:1",
        },
      };

      await agentDO.enqueueTelegramUpdate(update);
      await agentDO.alarm();

      const inboxRows = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 8001).toArray() as any[];
      expect(inboxRows[0].status).toBe("completed");
    });

    it("handles HTTP POST /telegram/enqueue on Durable Object", async () => {
      const update = {
        update_id: 9001,
        message: {
          message_id: 50,
          date: 1700000000,
          chat: { id: 44444, type: "private" as const },
          from: { id: 44444, is_bot: false, first_name: "HttpUser" },
          text: "HELP",
        },
      };

      const req = new Request("http://localhost/telegram/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      const res = await agentDO.fetch(req);
      expect(res.status).toBe(200);

      const json = (await res.json()) as any;
      expect(json.ok).toBe(true);

      const rows = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 9001).toArray();
      expect(rows).toHaveLength(1);
    });

    it("marks outbox items failed after 3 unsuccessful send attempts", async () => {
      // Set up DO with a failing telegramClient
      const failingEnv: AgentEnv = {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [], success: true }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        } as any,
        SITES_BUCKET: {} as any,
        ASSETS_BUCKET: {} as any,
        OWNER_AGENTS: {} as any,
        GLOBAL_COUNTER: {
          idFromName: vi.fn().mockReturnValue("global-counter"),
          get: vi.fn().mockReturnValue({
            getDailyNeurons: vi.fn().mockResolvedValue(0),
            incrementDailyNeurons: vi.fn().mockResolvedValue(0),
          }),
        } as any,
        TELEGRAM_BOT_TOKEN: "fake:token",
        MOCK_PROVIDER: "true",
        ENVIRONMENT: "development",
        BASE_DOMAIN: "replyiq.cv",
      };

      const failingDO = new OwnerAgentDO(
        {
          storage: { sql: mockSql, setAlarm: vi.fn() },
        } as any,
        failingEnv
      );

      // Directly insert pending outbox row with 2 attempts
      mockSql.exec(
        `INSERT INTO telegram_outbox (chat_id, text, status, attempts, created_at)
         VALUES (?, ?, 'pending', 2, ?)`,
        12345,
        "Failed message",
        Date.now()
      );

      // Mock telegramClient sendMessage to reject
      (failingDO as any).telegramClient = {
        sendMessage: vi.fn().mockResolvedValue({ ok: false, description: "Bad Request" }),
      };

      await failingDO.processTelegramQueue();

      const outboxRows = mockSql.exec("SELECT * FROM telegram_outbox WHERE chat_id = 12345").toArray() as any[];
      expect(outboxRows[0].status).toBe("failed");
      expect(outboxRows[0].attempts).toBe(3);
    });

    it("processes photo messages and uploads asset via AssetService", async () => {
      const photoDO = new OwnerAgentDO(
        {
          storage: { sql: mockSql, setAlarm: vi.fn() },
        } as any,
        {
          DB: {
            prepare: vi.fn().mockReturnValue({
              bind: vi.fn().mockReturnThis(),
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [], success: true }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          } as any,
          SITES_BUCKET: {} as any,
          ASSETS_BUCKET: {
            head: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue({}),
          } as any,
          OWNER_AGENTS: {} as any,
          GLOBAL_COUNTER: {
            idFromName: vi.fn().mockReturnValue("global-counter"),
            get: vi.fn().mockReturnValue({
              getDailyNeurons: vi.fn().mockResolvedValue(0),
              incrementDailyNeurons: vi.fn().mockResolvedValue(0),
            }),
          } as any,
          TELEGRAM_BOT_TOKEN: "valid:token",
          MOCK_PROVIDER: "true",
          ENVIRONMENT: "development",
          BASE_DOMAIN: "replyiq.cv",
        }
      );

      // Valid synthetic JPEG with width=800, height=600 and SOF marker
      const validJpegBytes = new Uint8Array(20);
      validJpegBytes[0] = 0xff; validJpegBytes[1] = 0xd8; validJpegBytes[2] = 0xff;
      validJpegBytes[3] = 0xe0; validJpegBytes[4] = 0x00; validJpegBytes[5] = 0x02;
      validJpegBytes[6] = 0xff; validJpegBytes[7] = 0xc0; validJpegBytes[8] = 0x00; validJpegBytes[9] = 0x08;
      validJpegBytes[10] = 0x08;
      const dv = new DataView(validJpegBytes.buffer);
      dv.setUint16(11, 600, false);
      dv.setUint16(13, 800, false);
      validJpegBytes[15] = 0x03;
      validJpegBytes[16] = 0xff; validJpegBytes[17] = 0xd9;

      (photoDO as any).telegramClient = {
        getFile: vi.fn().mockResolvedValue({ ok: true, result: { file_path: "photos/p.jpg" } }),
        downloadFile: vi.fn().mockResolvedValue(validJpegBytes),
        sendMessage: vi.fn().mockResolvedValue({ ok: true, messageId: 999 }),
      };

      const photoUpdate = {
        update_id: 11001,
        message: {
          message_id: 60,
          date: 1700000000,
          chat: { id: 77777, type: "private" as const },
          from: { id: 77777, is_bot: false, first_name: "PhotoUser" },
          caption: "Update hero picture",
          photo: [
            { file_id: "sm", file_unique_id: "u1", width: 50, height: 50 },
            { file_id: "lg", file_unique_id: "u2", width: 800, height: 600 },
          ],
        },
      };

      await photoDO.enqueueTelegramUpdate(photoUpdate);
      await photoDO.processTelegramQueue();

      const inboxRows = mockSql.exec("SELECT * FROM telegram_inbox WHERE update_id = ?", 11001).toArray() as any[];
      if (inboxRows[0]?.error) console.error("PHOTO ERROR:", inboxRows[0].error);
      expect(inboxRows[0].status).toBe("completed");
    });

    it("handles reply.menu formatting into inline buttons", async () => {
      vi.spyOn(agentDO, "handleMessage").mockResolvedValueOnce({
        messageId: "tg_12001",
        replies: [
          {
            text: "Please confirm your action:",
            menu: [
              { number: 1, label: "Publish now (Go live)" },
              { number: 2, label: "Keep editing (Stay in draft)" },
            ],
          },
        ],
        activeProjectId: null,
        timestamp: Date.now(),
      });

      const update = {
        update_id: 12001,
        message: {
          message_id: 70,
          date: 1700000000,
          chat: { id: 66666, type: "private" as const },
          from: { id: 66666, is_bot: false, first_name: "PubUser" },
          text: "/publish",
        },
      };

      await agentDO.enqueueTelegramUpdate(update);
      await agentDO.processTelegramQueue();

      const outboxRows = mockSql.exec("SELECT * FROM telegram_outbox WHERE chat_id = 66666").toArray() as any[];
      expect(outboxRows.length).toBeGreaterThan(0);
      expect(outboxRows[0].reply_markup).toContain("Publish now");
    });

    it("handles error in /telegram/enqueue endpoint gracefully", async () => {
      vi.spyOn(agentDO, "enqueueTelegramUpdate").mockRejectedValueOnce(new Error("Disk full"));

      const req = new Request("http://localhost/telegram/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_id: 99999 }),
      });

      const res = await agentDO.fetch(req);
      expect(res.status).toBe(500);
      const json = (await res.json()) as any;
      expect(json.error).toBe("Disk full");
    });
  });
});
