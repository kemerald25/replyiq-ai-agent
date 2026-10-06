/**
 * Edge caching utility utilizing the Cloudflare Cache API (caches.default).
 *
 * Rules:
 * - Edge TTL is kept short (~60s) to limit staleness across global edge PoPs.
 * - Cache purge is best-effort local datacenter invalidation.
 * - 404/403 responses are cached for at most 10 seconds.
 * - Safe fallback if caches.default is not available (e.g. unit tests / local Node).
 */

export async function getEdgeCachedResponse(cacheKey: Request | string): Promise<Response | null> {
  try {
    if (typeof caches !== "undefined" && (caches as unknown as { default?: Cache }).default) {
      const cache = (caches as unknown as { default: Cache }).default;
      const match = await cache.match(cacheKey);
      return match || null;
    }
  } catch {
    // Cache lookup failed or not supported in environment
  }
  return null;
}

export async function putEdgeCachedResponse(
  cacheKey: Request | string,
  response: Response,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<void> {
  try {
    if (typeof caches !== "undefined" && (caches as unknown as { default?: Cache }).default) {
      const cache = (caches as unknown as { default: Cache }).default;
      // Cache.put requires a clone if response body is to be read elsewhere
      const clonedResponse = response.clone();
      const putPromise = cache.put(cacheKey, clonedResponse);
      if (waitUntil) {
        waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }
  } catch {
    // Cache put failed or not supported in environment
  }
}

export async function purgeEdgeCachedResponse(cacheKey: Request | string): Promise<boolean> {
  try {
    if (typeof caches !== "undefined" && (caches as unknown as { default?: Cache }).default) {
      const cache = (caches as unknown as { default: Cache }).default;
      return await cache.delete(cacheKey);
    }
  } catch {
    // Cache delete failed or not supported in environment
  }
  return false;
}
