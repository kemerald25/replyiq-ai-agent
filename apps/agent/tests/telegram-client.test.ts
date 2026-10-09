import { describe, it, expect, vi } from "vitest";
import { TelegramClient } from "../src/telegram/client.js";

describe("TelegramClient Unit Tests", () => {
  it("initializes with bot token and custom or default baseUrl", () => {
    const client = new TelegramClient({
      botToken: "123:ABC",
      apiBaseUrl: "https://custom-telegram.org/",
    });
    expect(client).toBeDefined();
  });

  it("sends message with all options", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const res = await client.sendMessage(12345, "Hello", {
      parse_mode: "HTML",
      disable_notification: true,
      reply_markup: { inline_keyboard: [[{ text: "Btn", callback_data: "data" }]] },
      link_preview_options: { is_disabled: true },
    });

    expect(res.ok).toBe(true);
    expect(res.messageId).toBe(42);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123:ABC/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: 12345,
          text: "Hello",
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "Btn", callback_data: "data" }]] },
          link_preview_options: { is_disabled: true },
          disable_notification: true,
        }),
      })
    );
  });

  it("sends typing chat action", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const ok = await client.sendChatAction(12345, "typing");
    expect(ok).toBe(true);
  });

  it("answers callback query with alert", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const ok = await client.answerCallbackQuery("cb_123", "Done!", true);
    expect(ok).toBe(true);
  });

  it("edits message reply markup", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const ok = await client.editMessageReplyMarkup(12345, 99);
    expect(ok).toBe(true);
  });

  it("gets file info and downloads file content", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { file_id: "f_1", file_unique_id: "u_1", file_path: "photos/file_1.jpg" },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const fileInfo = await client.getFile("f_1");
    expect(fileInfo.ok).toBe(true);
    expect(fileInfo.result?.file_path).toBe("photos/file_1.jpg");

    const bytes = await client.downloadFile("photos/file_1.jpg");
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("throws when downloadFile fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Not found", { status: 404, statusText: "Not Found" }));

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    await expect(client.downloadFile("missing.jpg")).rejects.toThrow(/Failed to download Telegram file/);
  });

  it("manages webhook configuration and commands", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const setRes = await client.setWebhook("https://replyiq.cv/webhook", "my-secret", ["message"], true);
    expect(setRes.ok).toBe(true);

    const info = await client.getWebhookInfo();
    expect(info).toBeDefined();

    const delRes = await client.deleteWebhook(true);
    expect(delRes.ok).toBe(true);

    const cmdRes = await client.setMyCommands([
      { command: "start", description: "Start agent" },
      { command: "menu", description: "Open menu" },
    ]);
    expect(cmdRes.ok).toBe(true);
  });

  it("handles 429 rate limit retry with retry_after header", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            parameters: { retry_after: 0.01 },
          }),
          { status: 429 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 100 },
          }),
          { status: 200 }
        )
      );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const res = await client.sendMessage(12345, "Hello retry");
    expect(res.ok).toBe(true);
    expect(res.messageId).toBe(100);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles non-JSON error responses gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("Bad Gateway", { status: 502, statusText: "Bad Gateway" })
    );

    const client = new TelegramClient({
      botToken: "123:ABC",
      fetchFn: mockFetch,
    });

    const res = await client.sendMessage(12345, "Hello error");
    expect(res.ok).toBe(false);
    expect(res.description).toContain("HTTP 502 Bad Gateway");
  });
});
