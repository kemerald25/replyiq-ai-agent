export interface SecurityHeadersOptions {
  baseDomain: string;
  isPrivate?: boolean;
  noIndex?: boolean;
  cacheTtlSeconds?: number;
  contentType?: string;
}

/**
 * Builds standard security headers strictly adhering to ReplyIQ rules:
 * 1. Derives host strictly from request URL / base domain, never forwarded headers.
 * 2. Restricts CSP img-src to the dedicated cdn host plus data: only.
 * 3. HSTS with max-age=31536000 WITHOUT includeSubDomains.
 * 4. Zero client JavaScript: script-src 'none'.
 * 5. Frame protection: frame-ancestors 'none'.
 */
export function buildSecurityHeaders(options: SecurityHeadersOptions): Record<string, string> {
  const cdnHost = `cdn.${options.baseDomain}`;

  const csp = [
    "default-src 'none'",
    `img-src https://${cdnHost} data:`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "Strict-Transport-Security": "max-age=31536000",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  if (options.contentType) {
    headers["Content-Type"] = options.contentType;
  }

  if (options.noIndex) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }

  if (options.isPrivate) {
    headers["Cache-Control"] = "private, no-store, max-age=0";
  } else if (typeof options.cacheTtlSeconds === "number") {
    if (options.cacheTtlSeconds === 0) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    } else {
      headers["Cache-Control"] = `public, max-age=${options.cacheTtlSeconds}, s-maxage=${options.cacheTtlSeconds}, stale-while-revalidate=30`;
    }
  }

  return headers;
}
