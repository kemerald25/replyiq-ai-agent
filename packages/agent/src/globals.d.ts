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

declare function fetch(
  input: string | URL | any,
  init?: any
): Promise<any>;

declare interface Response {
  readonly ok: boolean;
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<any>;
}

declare namespace AbortSignal {
  function timeout(ms: number): any;
}

declare function setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): any;
declare function clearTimeout(id: any): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): any;
declare function clearInterval(id: any): void;

declare namespace process {
  const env: Record<string, string | undefined>;
  const argv: string[];
  function exit(code?: number): never;
}
