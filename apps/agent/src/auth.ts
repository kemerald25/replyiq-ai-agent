/**
 * ReplyIQ Gateway Bridge Authentication & HMAC Verification
 *
 * Enforces:
 * - Method, path, timestamp, and body signing
 * - Constant-time HMAC-SHA256 comparison using crypto.subtle.verify
 * - 5-minute replay attack window
 * - Dual active secrets (primary + secondary) for zero-downtime key rotation
 */

export interface VerifySignatureOptions {
  method: string;
  path: string;
  timestamp: number;
  body: string;
  signature: string;
  primarySecret?: string;
  secondarySecret?: string;
  replayWindowMs?: number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.replace(/^sha256=/i, "").trim().toLowerCase();
  if (clean.length !== 64 || !/^[0-9a-f]{64}$/.test(clean)) {
    return null;
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function verifyHmacWithSecret(
  secret: string,
  canonicalPayload: string,
  sigBytes: Uint8Array
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(canonicalPayload)
    );
  } catch {
    return false;
  }
}

export async function verifyGatewaySignature(
  options: VerifySignatureOptions
): Promise<VerifyResult> {
  const {
    method,
    path,
    timestamp,
    body,
    signature,
    primarySecret,
    secondarySecret,
    replayWindowMs = 5 * 60 * 1000, // 5 minutes
  } = options;

  if (!primarySecret && !secondarySecret) {
    return { valid: false, reason: "No gateway secrets configured on agent" };
  }

  // 1. Replay attack freshness window check
  if (isNaN(timestamp)) {
    return { valid: false, reason: "Invalid or missing timestamp" };
  }
  const now = Date.now();
  if (Math.abs(now - timestamp) > replayWindowMs) {
    return { valid: false, reason: "Timestamp outside freshness window (possible replay)" };
  }

  // 2. Parse signature bytes
  const sigBytes = hexToBytes(signature);
  if (!sigBytes) {
    return { valid: false, reason: "Malformed HMAC-SHA256 signature format" };
  }

  // 3. Build canonical payload: METHOD:PATH:TIMESTAMP:BODY
  const canonicalPayload = `${method.toUpperCase()}:${path}:${timestamp}:${body}`;

  // 4. Test Primary Secret
  if (primarySecret) {
    const match = await verifyHmacWithSecret(primarySecret, canonicalPayload, sigBytes);
    if (match) {
      return { valid: true };
    }
  }

  // 5. Test Secondary Secret for zero-downtime rotation
  if (secondarySecret) {
    const match = await verifyHmacWithSecret(secondarySecret, canonicalPayload, sigBytes);
    if (match) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Invalid signature" };
}
