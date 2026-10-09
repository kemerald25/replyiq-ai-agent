/**
 * Telegram webhook secret token verification using standard Web Crypto HMAC digests.
 *
 * This implementation avoids the Workers-only `timingSafeEqual` extension and works
 * identically in Cloudflare Workers and standard Node.js test environments.
 */

export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const keyData = enc.encode("replyiq-constant-time-key-salt");
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigA = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(a)));
  const sigB = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(b)));

  if (sigA.length !== sigB.length) return false;
  let diff = 0;
  for (let i = 0; i < sigA.length; i++) {
    diff |= sigA[i]! ^ sigB[i]!;
  }
  return diff === 0;
}

/**
 * Validates the X-Telegram-Bot-Api-Secret-Token against the expected configured secret.
 */
export async function verifyTelegramSecretToken(
  headerToken: string | null | undefined,
  expectedToken: string | null | undefined
): Promise<boolean> {
  if (!headerToken || !expectedToken) {
    return false;
  }
  return timingSafeEqualString(headerToken.trim(), expectedToken.trim());
}
