import {
  SendMessageOptions,
  InlineKeyboardMarkup,
  TelegramFileResponse,
} from "./types.js";

export interface TelegramClientConfig {
  botToken: string;
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export class TelegramClient {
  private readonly botToken: string;
  private readonly baseUrl: string;
  private readonly fileBaseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: TelegramClientConfig) {
    this.botToken = config.botToken;
    const base = (config.apiBaseUrl || "https://api.telegram.org").replace(/\/+$/, "");
    this.baseUrl = `${base}/bot${this.botToken}`;
    this.fileBaseUrl = `${base}/file/bot${this.botToken}`;
    this.fetchFn = config.fetchFn || fetch;
  }

  private async callApi<T = unknown>(
    method: string,
    payload: Record<string, unknown> = {},
    retryOnRateLimit = true
  ): Promise<{ ok: boolean; result?: T; description?: string; parameters?: { retry_after?: number } }> {
    const url = `${this.baseUrl}/${method}`;
    const res = await this.fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 429 && retryOnRateLimit) {
      try {
        const errJson = (await res.json()) as { parameters?: { retry_after?: number } };
        const retryAfterSec = errJson.parameters?.retry_after || 1;
        await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
        return this.callApi<T>(method, payload, false);
      } catch {
        // Fall through to parse regular response
      }
    }

    try {
      const data = (await res.json()) as {
        ok: boolean;
        result?: T;
        description?: string;
        parameters?: { retry_after?: number };
      };
      return data;
    } catch {
      return { ok: res.ok, description: `HTTP ${res.status} ${res.statusText}` };
    }
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: SendMessageOptions
  ): Promise<{ ok: boolean; messageId?: number; description?: string }> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || "HTML",
    };

    if (options?.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }

    if (options?.link_preview_options) {
      payload.link_preview_options = options.link_preview_options;
    }

    if (options?.disable_notification) {
      payload.disable_notification = options.disable_notification;
    }

    const res = await this.callApi<{ message_id: number }>("sendMessage", payload);
    return {
      ok: res.ok,
      messageId: res.result?.message_id,
      description: res.description,
    };
  }

  async sendChatAction(chatId: number | string, action: "typing" = "typing"): Promise<boolean> {
    const res = await this.callApi<{ ok: boolean }>("sendChatAction", {
      chat_id: chatId,
      action,
    });
    return res.ok;
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {
      callback_query_id: callbackQueryId,
    };
    if (text) {
      payload.text = text;
      payload.show_alert = showAlert;
    }
    const res = await this.callApi<{ ok: boolean }>("answerCallbackQuery", payload);
    return res.ok;
  }

  async editMessageReplyMarkup(
    chatId: number | string,
    messageId: number,
    replyMarkup?: InlineKeyboardMarkup
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup || { inline_keyboard: [] },
    };
    const res = await this.callApi<{ ok: boolean }>("editMessageReplyMarkup", payload);
    return res.ok;
  }

  async getFile(fileId: string): Promise<TelegramFileResponse> {
    const res = await this.callApi<{
      file_id: string;
      file_unique_id: string;
      file_size?: number;
      file_path?: string;
    }>("getFile", { file_id: fileId });

    return {
      ok: res.ok,
      result: res.result,
      description: res.description,
    };
  }

  async downloadFile(filePath: string): Promise<Uint8Array> {
    const url = `${this.fileBaseUrl}/${filePath}`;
    const res = await this.fetchFn(url);
    if (!res.ok) {
      throw new Error(`Failed to download Telegram file: HTTP ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async setWebhook(
    url: string,
    secretToken?: string,
    allowedUpdates: string[] = ["message", "callback_query"],
    dropPendingUpdates = false
  ): Promise<{ ok: boolean; description?: string }> {
    const payload: Record<string, unknown> = {
      url,
      allowed_updates: allowedUpdates,
      drop_pending_updates: dropPendingUpdates,
    };
    if (secretToken) {
      payload.secret_token = secretToken;
    }
    return this.callApi<{ ok: boolean }>("setWebhook", payload);
  }

  async getWebhookInfo(): Promise<Record<string, unknown>> {
    const res = await this.callApi<Record<string, unknown>>("getWebhookInfo");
    return res.result || {};
  }

  async deleteWebhook(dropPendingUpdates = false): Promise<{ ok: boolean; description?: string }> {
    return this.callApi<{ ok: boolean }>("deleteWebhook", {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  async setMyCommands(
    commands: Array<{ command: string; description: string }>
  ): Promise<{ ok: boolean; description?: string }> {
    return this.callApi<{ ok: boolean }>("setMyCommands", { commands });
  }
}
