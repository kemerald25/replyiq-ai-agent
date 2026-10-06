/**
 * Zero-dependency, XSS-safe HTML template engine.
 *
 * All interpolated values in `html` template strings are automatically HTML-escaped
 * unless wrapped in an internal `SafeHtml` instance (via `raw()`).
 *
 * NOTE: `raw()` is intentionally NOT exported from the package's public API.
 */

export class SafeHtml {
  constructor(public readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

/**
 * Internal-only helper to mark a string as trusted HTML.
 * Used exclusively for internal CSS, SVGs, and pre-rendered safe components.
 */
export function raw(content: string): SafeHtml {
  return new SafeHtml(content);
}

/**
 * Escapes HTML special characters: &, <, >, ", '
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

/**
 * Safely sanitizes and escapes attribute values (such as IDs used as anchor targets).
 * Ensures only alphanumeric, dashes, and underscores remain, or escapes if string.
 */
export function escapeAttr(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return escapeHtml(String(value));
}

/**
 * Independent URL protocol verification for the renderer.
 * Strictly permits only https:// and wa.me/ links (or internal fragment anchors like #section-id).
 * Rejects javascript:, data:, vbscript:, http:, etc., returning "#" on failure.
 */
export function safeHref(url: unknown): string {
  if (typeof url !== "string") {
    return "#";
  }
  const trimmed = url.trim();

  // Allow internal anchor links (#main-content, #hero-1)
  if (/^#[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Reject dangerous protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("http://")
  ) {
    return "#";
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("wa.me/")) {
    return escapeHtml(trimmed);
  }

  return "#";
}

/**
 * Tagged template literal for producing SafeHtml.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let result = "";

  for (let i = 0; i < strings.length; i++) {
    result += strings[i];

    if (i < values.length) {
      const val = values[i];

      if (val === null || val === undefined || val === false) {
        continue;
      }

      if (val instanceof SafeHtml) {
        result += val.value;
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (item === null || item === undefined || item === false) {
            continue;
          }
          if (item instanceof SafeHtml) {
            result += item.value;
          } else {
            result += escapeHtml(item);
          }
        }
      } else {
        result += escapeHtml(val);
      }
    }
  }

  return new SafeHtml(result);
}
