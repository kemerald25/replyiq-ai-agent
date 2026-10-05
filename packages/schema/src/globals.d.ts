/**
 * Ambient type declarations for standard server/worker runtime globals.
 * Present in Node.js LTS and Cloudflare Workers runtime.
 * DOM lib is excluded from tsconfig to prevent accidental usage of window/document.
 */

declare function structuredClone<T>(value: T): T;

interface URL {
  readonly origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  href: string;
  toString(): string;
}

declare const URL: {
  new (url: string | URL, base?: string | URL): URL;
};
