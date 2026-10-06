import { renderSite } from "@replyiq/templates";
import { SiteDocument } from "@replyiq/schema";
import { parseHost } from "./host.js";
import { buildSecurityHeaders } from "./headers.js";
import {
  renderNotFoundPage,
  renderSuspendedPage,
  renderLocalDevLandingPage,
} from "./pages.js";
import {
  getEdgeCachedResponse,
  putEdgeCachedResponse,
} from "./cache.js";

export interface Env {
  DB: D1Database;
  SITES_BUCKET: R2Bucket;
  ASSETS_BUCKET: R2Bucket;
  BASE_DOMAIN?: string;
  BYPASS_HOSTS?: string;
  STAGING_OVERRIDE_ENABLED?: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: ExecutionContext
  ): Promise<Response> {
    const baseDomain = (env.BASE_DOMAIN || "localhost").toLowerCase().replace(/\.+$/, "");
    const bypassHosts = env.BYPASS_HOSTS
      ? env.BYPASS_HOSTS.split(",").map((h) => h.trim())
      : [];
    const stagingOverrideEnabled = env.STAGING_OVERRIDE_ENABLED === "true";

    const parsedUrl = new URL(request.url);
    const hostRoute = parseHost(request.url, {
      baseDomain,
      bypassHosts,
      stagingOverrideEnabled,
    });

    // 1. Passthrough for bypass hosts (apex, www, app portal, marketing origin)
    if (hostRoute.type === "bypass") {
      if (baseDomain === "localhost") {
        return new Response(renderLocalDevLandingPage(baseDomain), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        });
      }
      return fetch(request);
    }

    // 2. Invalid IP access
    if (hostRoute.type === "invalid_ip") {
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 0,
        contentType: "text/plain; charset=utf-8",
      });
      return new Response("Invalid Host: Direct IP access forbidden", {
        status: 400,
        headers,
      });
    }

    // 3. Nested subdomains are not supported
    if (hostRoute.type === "nested_subdomain") {
      const html = renderNotFoundPage(baseDomain);
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8",
      });
      return new Response(request.method === "HEAD" ? null : html, {
        status: 404,
        headers,
      });
    }

    // 4. Reserved slugs
    if (hostRoute.type === "reserved_slug") {
      const html = renderNotFoundPage(baseDomain, hostRoute.slug);
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8",
      });
      return new Response(request.method === "HEAD" ? null : html, {
        status: 404,
        headers,
      });
    }

    // Method restriction: Static sites and assets only support GET & HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      const headers = buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 0,
        contentType: "text/plain; charset=utf-8",
      });
      headers["Allow"] = "GET, HEAD";
      return new Response("Method Not Allowed", {
        status: 405,
        headers,
      });
    }

    // 5. CDN Asset Route (cdn.<baseDomain>/assets/<key>)
    if (hostRoute.type === "cdn") {
      const pathname = parsedUrl.pathname;
      if (!pathname.startsWith("/assets/")) {
        return new Response("Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8",
          }),
        });
      }

      const rawKey = pathname.slice("/assets/".length);
      const assetKey = decodeURIComponent(rawKey);

      if (!assetKey) {
        return new Response("Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8",
          }),
        });
      }

      const assetObj = await env.ASSETS_BUCKET.get(assetKey);
      if (!assetObj) {
        return new Response("Asset Not Found", {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/plain; charset=utf-8",
          }),
        });
      }

      const contentType = assetObj.httpMetadata?.contentType || "application/octet-stream";
      const headers = buildSecurityHeaders({
        baseDomain,
        cacheTtlSeconds: 31536000, // 1 year immutable
        contentType,
      });
      headers["Cache-Control"] = "public, max-age=31536000, immutable";

      const body = request.method === "HEAD" ? null : await assetObj.arrayBuffer();
      return new Response(body, {
        status: 200,
        headers,
      });
    }

    // 6. Preview Route (preview.<baseDomain>/<token>)
    if (hostRoute.type === "preview") {
      const token = parsedUrl.pathname.replace(/^\/+/, "").split("/")[0] || "";
      if (!token || token.length < 16) {
        const html = renderNotFoundPage(baseDomain);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            isPrivate: true,
            noIndex: true,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      const tokenHash = await sha256Hex(token);
      const row = await env.DB.prepare(
        `SELECT p.id as project_id, p.slug, pt.version_number, pt.expires_at, dv.document_json
         FROM preview_tokens pt
         JOIN projects p ON pt.project_id = p.id
         JOIN document_versions dv ON pt.project_id = dv.project_id AND pt.version_number = dv.version_number
         WHERE pt.token_hash = ?`
      )
        .bind(tokenHash)
        .first<{
          project_id: string;
          slug: string;
          version_number: number;
          expires_at: number;
          document_json: string;
        }>();

      if (!row || row.expires_at <= Date.now()) {
        const html = renderNotFoundPage(baseDomain);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            isPrivate: true,
            noIndex: true,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      let doc: SiteDocument;
      try {
        doc = JSON.parse(row.document_json) as SiteDocument;
      } catch {
        return new Response("Corrupted preview document", { status: 500 });
      }

      const cdnBase = `https://cdn.${baseDomain}`;
      const assetResolver = (id: string) => ({
        url: `${cdnBase}/assets/${id}`,
        width: 800,
        height: 600,
      });

      const renderResult = renderSite(doc, {
        mode: "preview",
        canonicalUrl: `https://${row.slug}.${baseDomain}`,
        assetResolver,
        showBranding: true,
      });

      if (!renderResult.ok) {
        return new Response("Preview rendering failed", { status: 500 });
      }

      const headers = buildSecurityHeaders({
        baseDomain,
        isPrivate: true,
        noIndex: true,
        contentType: "text/html; charset=utf-8",
      });

      return new Response(request.method === "HEAD" ? null : renderResult.html, {
        status: 200,
        headers,
      });
    }

    // 7. Site Route (<slug>.<baseDomain>)
    if (hostRoute.type === "site") {
      const pathname = parsedUrl.pathname;
      // In ReplyIQ, sites are fast single-page websites. Subpaths other than root (or staging /site/:slug) return 404
      const isStagingPath = stagingOverrideEnabled && pathname.startsWith(`/site/${hostRoute.slug}`);
      if (pathname !== "/" && !isStagingPath) {
        const html = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      // 7a. Edge Cache Check
      const cached = await getEdgeCachedResponse(request);
      if (cached) {
        return cached;
      }

      // 7b. Database Lookup
      const project = await env.DB.prepare(
        "SELECT id, slug, status, published_version, suspended_reason FROM projects WHERE slug = ? AND deleted_at IS NULL"
      )
        .bind(hostRoute.slug)
        .first<{
          id: string;
          slug: string;
          status: string;
          published_version: number | null;
          suspended_reason: string | null;
        }>();

      // If project does not exist or is still a draft / not published
      if (!project || project.status === "draft" || project.published_version === null) {
        const html = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      // If project is suspended: Return 403 Forbidden with unavailable page and noindex
      if (project.status === "suspended") {
        const html = renderSuspendedPage(baseDomain, project.suspended_reason);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 403,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      // Project is live: fetch static pre-rendered HTML from R2 (Zero rendering CPU time on serving path!)
      const r2Key = `sites/${project.id}/${project.published_version}.html`;
      const htmlObj = await env.SITES_BUCKET.get(r2Key);

      if (!htmlObj) {
        const html = renderNotFoundPage(baseDomain, hostRoute.slug);
        return new Response(request.method === "HEAD" ? null : html, {
          status: 404,
          headers: buildSecurityHeaders({
            baseDomain,
            noIndex: true,
            cacheTtlSeconds: 10,
            contentType: "text/html; charset=utf-8",
          }),
        });
      }

      const htmlContent = await htmlObj.text();
      const headers = buildSecurityHeaders({
        baseDomain,
        cacheTtlSeconds: 60,
        contentType: "text/html; charset=utf-8",
      });

      const response = new Response(request.method === "HEAD" ? null : htmlContent, {
        status: 200,
        headers,
      });

      // Populate Cloudflare edge cache asynchronously
      await putEdgeCachedResponse(
        request,
        response,
        ctx?.waitUntil?.bind(ctx)
      );

      return response;
    }

    // Default 404 for unknown routes
    const html = renderNotFoundPage(baseDomain);
    return new Response(request.method === "HEAD" ? null : html, {
      status: 404,
      headers: buildSecurityHeaders({
        baseDomain,
        noIndex: true,
        cacheTtlSeconds: 10,
        contentType: "text/html; charset=utf-8",
      }),
    });
  },
};
