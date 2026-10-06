/**
 * Ambient type declarations for standard server/worker runtime globals.
 * Present in Node.js LTS and Cloudflare Workers runtime.
 * DOM lib is excluded from tsconfig to prevent accidental usage of window/document.
 */

declare namespace console {
  function log(...args: unknown[]): void;
  function warn(...args: unknown[]): void;
  function error(...args: unknown[]): void;
  function info(...args: unknown[]): void;
}

declare const performance: {
  now(): number;
};

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare const crypto: {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: {
    digest(algorithm: string, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer>;
  };
};
