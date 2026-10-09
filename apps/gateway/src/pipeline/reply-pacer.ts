import { StructuredReply, splitParagraphs, MIN_CHUNK_CHARS, MAX_CHUNK_CHARS } from "@replyiq/agent";
import { MessagingTransport } from "../transport/interface.js";

export const MAX_TURN_DELAY_MS = 8000; // 8 seconds maximum total delay per turn
export { splitParagraphs, MIN_CHUNK_CHARS, MAX_CHUNK_CHARS };

/**
 * Normalizes and expands StructuredReplies, splitting long paragraphs.
 */
export function expandReplies(replies: StructuredReply[]): StructuredReply[] {
  if (!replies || replies.length === 0) return [];

  const expanded: StructuredReply[] = [];
  for (const reply of replies) {
    const textChunks = splitParagraphs(reply.text);
    if (textChunks.length === 1) {
      expanded.push(reply);
    } else {
      for (let i = 0; i < textChunks.length; i++) {
        const isLast = i === textChunks.length - 1;
        expanded.push({
          text: textChunks[i]!,
          menu: isLast ? reply.menu : undefined,
          link: isLast ? reply.link : undefined,
          previewUrl: isLast ? reply.previewUrl : undefined,
        });
      }
    }
  }
  return expanded;
}

/**
 * Sends replies through transport with humanized typing indicators and delays,
 * strictly capped at 8 seconds total per turn.
 */
export async function sendPacedReplies(
  transport: MessagingTransport,
  target: string,
  replies: StructuredReply[],
  options?: {
    maxTotalDelayMs?: number;
    skipDelaysForTests?: boolean;
  }
): Promise<void> {
  // If agent returns no replies, send nothing
  if (!replies || replies.length === 0) {
    return;
  }

  const maxTotalDelay = options?.maxTotalDelayMs ?? MAX_TURN_DELAY_MS;
  const skipDelays = options?.skipDelaysForTests ?? false;
  const expanded = expandReplies(replies);

  let accumulatedDelay = 0;

  for (let i = 0; i < expanded.length; i++) {
    const reply = expanded[i]!;

    // Calculate typing delay for this chunk (proportional to text length, ~20ms per char)
    const idealDelay = Math.min(Math.max(reply.text.length * 15, 600), 2500);
    const delay = Math.min(idealDelay, Math.max(0, maxTotalDelay - accumulatedDelay));

    if (!skipDelays && delay > 0) {
      await transport.sendTyping(target);
      await new Promise((resolve) => setTimeout(resolve, delay));
      accumulatedDelay += delay;
    }

    // Deliver reply chunk
    await transport.sendReplies(target, [reply]);

    // Space multi-part replies with a brief pause if budget allows
    if (!skipDelays && i < expanded.length - 1 && accumulatedDelay + 500 <= maxTotalDelay) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      accumulatedDelay += 500;
    }
  }
}
