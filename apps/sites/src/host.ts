import { RESERVED_SLUGS } from "@replyiq/schema";

export type HostRoute =
  | { type: "bypass" }
  | { type: "invalid_ip" }
  | { type: "nested_subdomain" }
  | { type: "cdn" }
  | { type: "preview" }
  | { type: "site"; slug: string }
  | { type: "reserved_slug"; slug: string }
  | { type: "unknown" };

export interface ParseHostOptions {
  baseDomain: string;
  bypassHosts?: string[];
  allowLoopbackIp?: boolean;
  stagingOverrideEnabled?: boolean;
}

/**
 * Checks if a hostname is an IPv4 or IPv6 address.
 */
function isIpAddress(hostname: string): boolean {
  // IPv4: digits and dots
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return true;
  }
  // IPv6: contains colons
  if (hostname.includes(":")) {
    return true;
  }
  return false;
}

/**
 * Strictly parses the incoming request URL host to determine routing.
 *
 * Security & Accuracy Rules:
 * 1. Derives hostname strictly from the request URL (never from X-Forwarded-Host).
 * 2. Normalizes to lowercase and trims trailing dots.
 * 3. Rejects IP addresses with invalid_ip (loopback allowed ONLY if allowLoopbackIp is explicitly true).
 * 4. Identifies bypass hosts (apex, www, marketing) for untouched passthrough.
 * 5. Identifies dedicated cdn and preview hosts.
 * 6. Rejects nested subdomains (e.g. a.b.replyiq.cv).
 * 7. Matches exactly one label under the configured base domain.
 */
export function parseHost(requestUrl: string, options: ParseHostOptions): HostRoute {
  let hostname = "";
  let searchParams: URLSearchParams | null = null;
  let pathname = "";

  try {
    const parsedUrl = new URL(requestUrl);
    hostname = parsedUrl.hostname.toLowerCase().replace(/\.+$/, "");
    searchParams = parsedUrl.searchParams;
    pathname = parsedUrl.pathname;
  } catch {
    return { type: "unknown" };
  }

  const baseDomain = options.baseDomain.toLowerCase().replace(/\.+$/, "");

  // 1. Rejection of IP addresses (loopback allowed ONLY when explicit flag is enabled)
  if (isIpAddress(hostname)) {
    const rawIp = hostname.replace(/^\[|\]$/g, "");
    if (options.allowLoopbackIp && (rawIp === "127.0.0.1" || rawIp === "::1")) {
      hostname = "localhost";
    } else {
      return { type: "invalid_ip" };
    }
  }
  const bypassSet = new Set(
    (options.bypassHosts || []).map((h) => h.toLowerCase().replace(/\.+$/, ""))
  );

  // Always bypass apex and www
  bypassSet.add(baseDomain);
  bypassSet.add(`www.${baseDomain}`);

  // 2. Bypass hosts (pass through untouched)
  if (bypassSet.has(hostname) || hostname.endsWith(".workers.dev")) {
    // If staging override enabled: allow path and query routing
    if (options.stagingOverrideEnabled) {
      // 1. Preview route (/preview/:token, /p/:token, or ?preview=:token)
      if (
        pathname.startsWith("/preview/") ||
        pathname.startsWith("/p/") ||
        searchParams?.has("preview") ||
        searchParams?.has("token")
      ) {
        return { type: "preview" };
      }

      // 2. Asset route (/assets/:key)
      if (pathname.startsWith("/assets/")) {
        return { type: "cdn" };
      }

      // 3. Site route (/site/:slug or ?site=:slug)
      const querySite = searchParams?.get("site");
      if (querySite) {
        const slug = querySite.toLowerCase();
        if (RESERVED_SLUGS.has(slug)) return { type: "reserved_slug", slug };
        return { type: "site", slug };
      }

      const pathMatch = pathname.match(/^\/site\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) {
        const slug = pathMatch[1].toLowerCase();
        if (RESERVED_SLUGS.has(slug)) return { type: "reserved_slug", slug };
        return { type: "site", slug };
      }
    }

    return { type: "bypass" };
  }

  // 3. Dedicated CDN host
  if (hostname === `cdn.${baseDomain}`) {
    return { type: "cdn" };
  }

  // 4. Dedicated Preview host
  if (hostname === `preview.${baseDomain}`) {
    return { type: "preview" };
  }

  // 5. Check if hostname ends with baseDomain
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) {
    return { type: "unknown" };
  }

  const prefix = hostname.slice(0, -suffix.length);

  // 6. Nested subdomains rejected
  if (prefix.includes(".")) {
    return { type: "nested_subdomain" };
  }

  // 7. Exactly one label under base domain
  const slug = prefix;
  if (!slug) {
    return { type: "bypass" };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { type: "reserved_slug", slug };
  }

  return { type: "site", slug };
}
