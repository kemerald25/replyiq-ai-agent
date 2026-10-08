/**
 * ReplyIQ Gateway Bridge Signer
 *
 * Computes deterministic HMAC-SHA256 signatures over:
 * METHOD:PATH:TIMESTAMP:BODY
 * Pure and portable across Node.js runtime using Web Cryptography API.
 */

export interface SignRequestOptions {
  secret: string;
  method: string;
  path: string;
  timestamp: number;
  body: string;
}

export async function signBridgeRequest(options: SignRequestOptions): Promise<string> {
  const { secret, method, path, timestamp, body } = options;
  const canonicalPayload = `${method.toUpperCase()}:${path}:${timestamp}:${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(canonicalPayload)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
