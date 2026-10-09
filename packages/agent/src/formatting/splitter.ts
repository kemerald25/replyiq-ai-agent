export const MIN_CHUNK_CHARS = 1200;
export const MAX_CHUNK_CHARS = 1500;

/**
 * Splits text into chunks at paragraph or sentence boundaries.
 * Useful for message transports (WhatsApp, Telegram) that have message length constraints.
 *
 * @param text The input text string to chunk.
 * @param minChars Minimum chunk length to look for clean line/sentence boundaries (default 1200).
 * @param maxChars Maximum chunk length before splitting (default 1500).
 */
export function splitParagraphs(
  text: string,
  minChars = MIN_CHUNK_CHARS,
  maxChars = MAX_CHUNK_CHARS
): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    const candidate = remaining.slice(0, maxChars);

    // Look for paragraph boundary \n\n between minChars and maxChars
    let splitIdx = candidate.lastIndexOf("\n\n");
    if (splitIdx < minChars) {
      // Look for newline \n
      splitIdx = candidate.lastIndexOf("\n");
    }
    if (splitIdx < minChars) {
      // Look for sentence boundary
      splitIdx = candidate.lastIndexOf(". ");
      if (splitIdx >= 0) splitIdx += 1; // Include the period
    }
    if (splitIdx < minChars) {
      // Look for space
      splitIdx = candidate.lastIndexOf(" ");
    }
    if (splitIdx < minChars) {
      // Hard split at maxChars
      splitIdx = maxChars;
    }

    const chunk = remaining.slice(0, splitIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(splitIdx).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
