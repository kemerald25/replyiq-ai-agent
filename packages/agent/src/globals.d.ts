declare namespace console {
  function log(...args: unknown[]): void;
  function warn(...args: unknown[]): void;
  function error(...args: unknown[]): void;
  function info(...args: unknown[]): void;
}

declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;
declare function clearTimeout(id: any): void;

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

declare const crypto: {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: {
    digest(algorithm: string, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer>;
    importKey(
      format: "raw" | "pkcs8" | "spki" | "jwk",
      keyData: ArrayBuffer | ArrayBufferView,
      algorithm: string | Record<string, unknown>,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<any>;
    sign(
      algorithm: string | Record<string, unknown>,
      key: any,
      data: ArrayBuffer | ArrayBufferView
    ): Promise<ArrayBuffer>;
  };
};

declare interface Response {
  readonly status: number;
  readonly ok: boolean;
  json(): Promise<any>;
  text(): Promise<string>;
}

declare const Response: {
  new (body?: any, init?: any): Response;
};

declare function fetch(input: any, init?: any): Promise<Response>;

declare const AbortSignal: {
  timeout(ms: number): any;
};

declare namespace process {
  const env: Record<string, string | undefined>;
  const argv: string[];
  function exit(code?: number): never;
}
