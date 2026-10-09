export type CommandType =
  | { type: "MENU" }
  | { type: "HELP" }
  | { type: "STOP" }
  | { type: "UNDO" }
  | { type: "CANCEL" }
  | { type: "NEW"; name?: string }
  | { type: "PREVIEW" }
  | { type: "NUMBER_SELECTION"; number: number }
  | { type: "PUBLISH_REQUEST" } // Intent to publish; triggers confirmation menu, does not publish!
  | null;

/**
 * Deterministically parses incoming text into commands before any model call.
 * Returns null if the text is a regular natural-language conversational edit request.
 */
export function parseCommand(text: string): CommandType {
  const trimmed = text.trim();
  const lower = (trimmed.startsWith("/") ? trimmed.slice(1).trim() : trimmed).toLowerCase();

  // 1. Number selection: single digit or small number
  if (/^\d{1,2}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return { type: "NUMBER_SELECTION", number: num };
  }

  // 2. Exact command keywords
  if (lower === "menu" || lower === "start") return { type: "MENU" };
  if (lower === "help" || lower === "?") return { type: "HELP" };
  if (lower === "stop" || lower === "unsubscribe") return { type: "STOP" };
  if (lower === "undo" || lower === "revert") return { type: "UNDO" };
  if (lower === "cancel") return { type: "CANCEL" };
  if (
    lower === "preview" ||
    lower === "preview link" ||
    lower === "show preview" ||
    lower === "send preview" ||
    lower === "preview site"
  ) {
    return { type: "PREVIEW" };
  }

  // 3. New project creation
  if (lower.startsWith("new ") || lower === "new") {
    const rawTrimmed = trimmed.startsWith("/") ? trimmed.slice(1).trim() : trimmed;
    const name = rawTrimmed.slice(3).trim();
    return { type: "NEW", name: name || undefined };
  }

  // 4. Intent to publish (strictly triggers confirmation, does not publish)
  if (
    lower === "publish" ||
    lower === "go live" ||
    lower === "publish site" ||
    lower === "publish my site" ||
    lower === "make it live"
  ) {
    return { type: "PUBLISH_REQUEST" };
  }

  return null;
}
