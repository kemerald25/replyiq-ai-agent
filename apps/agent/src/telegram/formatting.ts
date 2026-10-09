import { splitParagraphs } from "@replyiq/agent";
import { InlineKeyboardMarkup, InlineKeyboardButton, LinkPreviewOptions } from "./types.js";

export const TELEGRAM_MAX_CHUNK_CHARS = 3500;
export const TELEGRAM_MIN_CHUNK_CHARS = 2800;

/**
 * Escapes special HTML characters for Telegram HTML parse_mode.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Splits long message text into clean chunks under Telegram's length limit.
 */
export function splitTelegramText(text: string): string[] {
  return splitParagraphs(text, TELEGRAM_MIN_CHUNK_CHARS, TELEGRAM_MAX_CHUNK_CHARS);
}

export interface ParsedMenuOption {
  number: number;
  label: string;
}

/**
 * Extracts numbered menu options from reply text (e.g. "1. Change Title\n2. Publish")
 * and separates the intro text from the options list.
 */
export function parseMenuOptions(text: string): {
  bodyText: string;
  options: ParsedMenuOption[];
} {
  const lines = text.split("\n");
  const options: ParsedMenuOption[] = [];
  const bodyLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(.+)$/);
    if (match && match[1] && match[2]) {
      const num = parseInt(match[1], 10);
      options.push({
        number: num,
        label: match[2].trim(),
      });
    } else {
      bodyLines.push(line);
    }
  }

  // If no numbered options found, return full text
  if (options.length === 0) {
    return { bodyText: text, options: [] };
  }

  // Clean trailing empty lines
  const cleanBody = bodyLines.join("\n").trim();
  return {
    bodyText: cleanBody || text,
    options,
  };
}

/**
 * Formats options as full-width vertical inline keyboard buttons,
 * encoding menuId and option number into callback_data: `menu:<menu_id>:<num>`.
 */
export function buildInlineMenuKeyboard(
  menuId: string,
  options: ParsedMenuOption[]
): InlineKeyboardMarkup {
  const keyboard: InlineKeyboardButton[][] = options.map((opt) => [
    {
      text: `${opt.number}. ${opt.label}`,
      callback_data: `menu:${menuId}:${opt.number}`,
    },
  ]);

  return { inline_keyboard: keyboard };
}

/**
 * Determines appropriate link preview options:
 * - Disabled for private preview links to prevent unauthorized crawler/CDN previews
 * - Enabled for live published sites
 */
export function getLinkPreviewOptions(text: string, previewUrl?: string): LinkPreviewOptions {
  if (previewUrl || text.includes("/preview/")) {
    return { is_disabled: true };
  }
  return { is_disabled: false };
}
