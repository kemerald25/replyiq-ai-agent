/**
 * Ambient type declarations for standard server/worker runtime globals.
 * Present in Node.js LTS and Cloudflare Workers runtime.
 * DOM lib is excluded from tsconfig to prevent accidental usage of window/document.
 */

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
