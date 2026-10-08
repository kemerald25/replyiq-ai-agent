import { describe, it, expect, vi, beforeEach } from "vitest";
import worker, { Env } from "../src/index.js";
import { salonSample } from "@replyiq/templates";
import * as templates from "@replyiq/templates";

// Mock R2 Object
function createMockR2Object(content: string | Uint8Array, contentType: string = "text/html; charset=utf-8") {
  return {
    async text() {
      return typeof content === "string" ? content : new TextDecoder().decode(content);
    },
    async arrayBuffer() {
      if (typeof content === "string") {
        return new TextEncoder().encode(content).buffer;
      }
      return content.buffer;
    },
    httpMetadata: { contentType },
  };
}

// In-Memory Mock D1
class MockD1 {
  public projects: Map<string, any> = new Map();
  public previewTokens: Map<string, any> = new Map();

  prepare(sql: string) {
    let boundArgs: any[] = [];
    return {
      bind(...args: any[]) {
        boundArgs = args;
        return this;
      },
      first: async <T = any>(): Promise<T | null> => {
        if (sql.includes("FROM projects WHERE slug = ?")) {
          const slug = boundArgs[0];
          for (const proj of this.projects.values()) {
            if (proj.slug === slug && proj.deleted_at === null) {
              return {
                id: proj.id,
                slug: proj.slug,
                status: proj.status,
                published_version: proj.published_version,
                suspended_reason: proj.suspended_reason,
              } as T;
            }
          }
          return null;
        }

        if (sql.includes("FROM preview_tokens pt")) {
          const tokenHash = boundArgs[0];
          const token = this.previewTokens.get(tokenHash);
          if (!token) return null;
          const proj = this.projects.get(token.project_id);
          if (!proj) return null;
          return {
            project_id: proj.id,
            slug: proj.slug,
            version_number: token.version_number,
            expires_at: token.expires_at,
            document_json: token.document_json !== undefined ? token.document_json : JSON.stringify(salonSample),
          } as T;
        }

        return null;
      },
      all: async <T = any>(): Promise<{ results: T[] }> => {
        if (sql.includes("FROM projects WHERE status = 'live'")) {
          const list: any[] = [];
          for (const proj of this.projects.values()) {
            if (proj.status === "live" && proj.deleted_at === null) {
              list.push({
                slug: proj.slug,
                name: proj.name || proj.slug,
                template: proj.template || "site",
              });
            }
          }
          return { results: list as T[] };
        }
        return { results: [] };
      },
    };
  }
}

// In-Memory Mock R2 Bucket
class MockR2Bucket {
  public objects: Map<string, { data: string | Uint8Array; contentType: string }> = new Map();

  async get(key: string) {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return createMockR2Object(obj.data, obj.contentType);
  }

  async put(key: string, data: any, options?: any) {
    this.objects.set(key, {
      data,
      contentType: options?.httpMetadata?.contentType || "application/octet-stream",
    });
  }
}

describe("Cloudflare Sites Worker", () => {
  let mockDb: MockD1;
  let mockSitesBucket: MockR2Bucket;
  let mockAssetsBucket: MockR2Bucket;
  let env: Env;

  beforeEach(() => {
    mockDb = new MockD1();
    mockSitesBucket = new MockR2Bucket();
    mockAssetsBucket = new MockR2Bucket();

    env = {
      DB: mockDb as any,
      SITES_BUCKET: mockSitesBucket as any,
      ASSETS_BUCKET: mockAssetsBucket as any,
      BASE_DOMAIN: "replyiq.cv",
      BYPASS_HOSTS: "replyiq.cv,www.replyiq.cv,app.replyiq.cv",
      STAGING_OVERRIDE_ENABLED: "false",
    };
  });

  describe("Host Routing & Passthrough", () => {
    it("passes bypass hosts through untouched", async () => {
      // Mock global fetch
      const fetchSpy = vi.fn().mockResolvedValue(new Response("Apex Origin Page", { status: 200 }));
      vi.stubGlobal("fetch", fetchSpy);

      const req = new Request("https://replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(fetchSpy).toHaveBeenCalled();
      expect(await res.text()).toBe("Apex Origin Page");

      vi.unstubAllGlobals();
    });

    it("rejects direct IP access with 400 Bad Request", async () => {
      const req = new Request("http://192.168.1.1/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Invalid Host: Direct IP access forbidden");
    });

    it("rejects 127.0.0.1 and ::1 loopback IPs with 400 Bad Request in production", async () => {
      const prodEnv: Env = {
        ...env,
        ENVIRONMENT: "production",
      };

      const reqV4 = new Request("http://127.0.0.1/");
      const resV4 = await worker.fetch(reqV4, prodEnv);
      expect(resV4.status).toBe(400);
      expect(await resV4.text()).toContain("Invalid Host: Direct IP access forbidden");

      const reqV6 = new Request("http://[::1]/");
      const resV6 = await worker.fetch(reqV6, prodEnv);
      expect(resV6.status).toBe(400);
      expect(await resV6.text()).toContain("Invalid Host: Direct IP access forbidden");
    });

    it("fails closed: rejects 127.0.0.1 when ENVIRONMENT is undefined or missing", async () => {
      const undefinedEnv: Env = {
        ...env,
        ENVIRONMENT: undefined,
      };

      const req = new Request("http://127.0.0.1/");
      const res = await worker.fetch(req, undefinedEnv);
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Invalid Host: Direct IP access forbidden");
    });

    it("never serves directory page on apex in production and ignores ?site=", async () => {
      const fetchSpy = vi.fn().mockImplementation(() => Promise.resolve(new Response("Apex Marketing", { status: 200 })));
      vi.stubGlobal("fetch", fetchSpy);

      const prodEnv: Env = {
        ...env,
        ENVIRONMENT: "production",
      };

      // 1. Apex root request
      const reqApex = new Request("https://replyiq.cv/");
      const resApex = await worker.fetch(reqApex, prodEnv);
      expect(fetchSpy).toHaveBeenCalled();
      const textApex = await resApex.text();
      expect(textApex).toBe("Apex Marketing");
      expect(textApex).not.toContain("Local Development Server");

      // 2. Apex request with ?site= attempted override
      const reqQuery = new Request("https://replyiq.cv/?site=amaka-luxe");
      const resQuery = await worker.fetch(reqQuery, prodEnv);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const textQuery = await resQuery.text();
      expect(textQuery).toBe("Apex Marketing");
      expect(textQuery).not.toContain("Local Development Server");

      vi.unstubAllGlobals();
    });

    it("serves local directory page and ?site= only when ENVIRONMENT=development", async () => {
      mockDb.projects.set("p1", {
        id: "p1",
        slug: "amaka-luxe",
        name: "Amaka Luxury Hair",
        template: "salon",
        status: "live",
        published_version: 1,
        suspended_reason: null,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p1/1.html", {
        data: "<html><body>Amaka Salon Page</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const devEnv: Env = {
        ...env,
        BASE_DOMAIN: "localhost",
        ENVIRONMENT: "development",
      };

      // 1. Loopback IP 127.0.0.1 serves directory page
      const reqV4 = new Request("http://127.0.0.1:8787/");
      const resV4 = await worker.fetch(reqV4, devEnv);
      expect(resV4.status).toBe(200);
      const htmlV4 = await resV4.text();
      expect(htmlV4).toContain("Local Development Server");
      expect(htmlV4).toContain("amaka-luxe.localhost:8787");

      // 2. Loopback IPv6 ::1 serves directory page
      const reqV6 = new Request("http://[::1]:8787/");
      const resV6 = await worker.fetch(reqV6, devEnv);
      expect(resV6.status).toBe(200);
      const htmlV6 = await resV6.text();
      expect(htmlV6).toContain("Local Development Server");

      // 3. ?site= override works in development
      const reqQuery = new Request("http://127.0.0.1:8787/?site=amaka-luxe");
      const resQuery = await worker.fetch(reqQuery, devEnv);
      expect(resQuery.status).toBe(200);
      expect(await resQuery.text()).toContain("Amaka Salon Page");
    });

    it("rejects nested subdomains with 404", async () => {
      const req = new Request("https://sub.amaka-luxe.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("rejects reserved slugs with 404", async () => {
      const req = new Request("https://admin.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      expect(await res.text()).toContain("Site Not Found");
    });
  });

  describe("HTTP Method Enforcement", () => {
    it("rejects POST requests on sites with 405 Method Not Allowed", async () => {
      const req = new Request("https://amaka-luxe.replyiq.cv/", { method: "POST" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("GET, HEAD");
    });

    it("supports HEAD requests without returning response body", async () => {
      mockDb.projects.set("p1", {
        id: "p1",
        slug: "amaka-luxe",
        status: "live",
        published_version: 1,
        suspended_reason: null,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p1/1.html", {
        data: "<html><body>Amaka Luxe</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://amaka-luxe.replyiq.cv/", { method: "HEAD" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/html");
      const text = await res.text();
      expect(text).toBe("");
    });
  });

  describe("Site Serving Pipeline", () => {
    it("returns 404 for unknown site slugs", async () => {
      const req = new Request("https://nonexistent-brand.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      expect(await res.text()).toContain("Site Not Found");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(res.headers.get("Cache-Control")).toContain("max-age=10");
    });

    it("returns 404 for draft sites that are not published yet", async () => {
      mockDb.projects.set("p_draft", {
        id: "p_draft",
        slug: "draft-business",
        status: "draft",
        published_version: null,
        suspended_reason: null,
        deleted_at: null,
      });

      const req = new Request("https://draft-business.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      expect(await res.text()).toContain("Site Not Found");
    });

    it("returns 403 Forbidden with unavailable page for suspended sites", async () => {
      mockDb.projects.set("p_sus", {
        id: "p_sus",
        slug: "bad-site",
        status: "suspended",
        published_version: 1,
        suspended_reason: "Violated terms of service regarding prohibited goods",
        deleted_at: null,
      });

      const req = new Request("https://bad-site.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
      const html = await res.text();
      expect(html).toContain("Website Unavailable");
      expect(html).toContain("Violated terms of service regarding prohibited goods");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("serves default suspension message when suspended_reason is null", async () => {
      mockDb.projects.set("p_sus_default", {
        id: "p_sus_default",
        slug: "no-reason-site",
        status: "suspended",
        published_version: 1,
        suspended_reason: null,
        deleted_at: null,
      });

      const req = new Request("https://no-reason-site.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(403);
      const html = await res.text();
      expect(html).toContain("This website has been temporarily suspended by the platform administrator.");
    });

    it("serves live published sites directly from R2 with edge cache headers", async () => {
      mockDb.projects.set("p_live", {
        id: "p_live",
        slug: "amaka-luxe",
        status: "live",
        published_version: 3,
        suspended_reason: null,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p_live/3.html", {
        data: "<!DOCTYPE html><html><body><h1>Amaka Luxe Live</h1></body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://amaka-luxe.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("<h1>Amaka Luxe Live</h1>");
      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=60, s-maxage=60, stale-while-revalidate=30"
      );
    });

    it("returns 404 for arbitrary subpaths on single-page sites", async () => {
      mockDb.projects.set("p_live", {
        id: "p_live",
        slug: "amaka-luxe",
        status: "live",
        published_version: 3,
        suspended_reason: null,
        deleted_at: null,
      });

      const req = new Request("https://amaka-luxe.replyiq.cv/unknown-page");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });

  describe("CDN Asset Serving", () => {
    it("serves assets with 1-year immutable caching and security headers", async () => {
      const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      mockAssetsBucket.objects.set("hash_123.png", {
        data: fakePng,
        contentType: "image/png",
      });

      const req = new Request("https://cdn.replyiq.cv/assets/hash_123.png");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("returns 404 for nonexistent assets", async () => {
      const req = new Request("https://cdn.replyiq.cv/assets/missing.png");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("returns 404 for paths on CDN host not starting with /assets/", async () => {
      const req = new Request("https://cdn.replyiq.cv/other-path/file.png");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("returns 404 for unknown domains not matching baseDomain or bypass hosts", async () => {
      const req = new Request("https://completely-unrelated-domain.com/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });

  describe("Preview Route", () => {
    it("serves preview for valid unexpired token with private no-store headers", async () => {
      const token = "a1b2c3d4e5f678901234567890abcdef";
      // Let's compute actual sha256Hex of token:
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const actualHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      mockDb.projects.set("p_preview", {
        id: "p_preview",
        slug: "preview-shop",
        status: "draft",
        published_version: null,
      });

      mockDb.previewTokens.set(actualHash, {
        project_id: "p_preview",
        version_number: 1,
        expires_at: Date.now() + 3600 * 1000,
      });

      const req = new Request(`https://preview.replyiq.cv/${token}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      const html = await res.text();
      expect(html).toContain("Amaka Luxe");
    });

    it("returns 404 for expired preview token", async () => {
      const token = "b1b2c3d4e5f678901234567890abcdef";
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const actualHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      mockDb.projects.set("p_preview", { id: "p_preview", slug: "preview-shop" });
      mockDb.previewTokens.set(actualHash, {
        project_id: "p_preview",
        version_number: 1,
        expires_at: Date.now() - 1000, // Expired!
      });

      const req = new Request(`https://preview.replyiq.cv/${token}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });

  describe("Security Headers & CSP Verification", () => {
    it("enforces strict CSP with img-src restricted to cdn host and data: only", async () => {
      mockDb.projects.set("p_sec", {
        id: "p_sec",
        slug: "sec-site",
        status: "live",
        published_version: 1,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p_sec/1.html", {
        data: "<html><body>Security Test</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://sec-site.replyiq.cv/");
      const res = await worker.fetch(req, env);
      const csp = res.headers.get("Content-Security-Policy");
      expect(csp).toBeDefined();
      expect(csp).toContain("img-src https://cdn.replyiq.cv data:");
      expect(csp).not.toContain("img-src *");
      expect(csp).not.toMatch(/img-src [^;]*\bhttps:[^/]/);
      expect(csp).toContain("script-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");

      // HSTS without includeSubDomains
      const hsts = res.headers.get("Strict-Transport-Security");
      expect(hsts).toBe("max-age=31536000");
      expect(hsts).not.toContain("includeSubDomains");
    });
  });

  describe("Staging Override Support", () => {
    it("selects site via query parameter when staging override is enabled", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "true";
      mockDb.projects.set("p_stage", {
        id: "p_stage",
        slug: "amaka-luxe",
        status: "live",
        published_version: 1,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p_stage/1.html", {
        data: "<html><body>Staging Amaka Luxe</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://demo.workers.dev/?site=amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Staging Amaka Luxe");
    });

    it("selects site via path prefix when staging override is enabled", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "true";
      mockDb.projects.set("p_stage", {
        id: "p_stage",
        slug: "amaka-luxe",
        status: "live",
        published_version: 1,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p_stage/1.html", {
        data: "<html><body>Staging Amaka Luxe Path</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://demo.workers.dev/site/amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Staging Amaka Luxe Path");
    });

    it("serves preview via /preview/:token path on staging workers.dev", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "true";
      mockDb.projects.set("p_stage_prev", {
        id: "p_stage_prev",
        slug: "amaka-stage",
        status: "draft",
        published_version: null,
        deleted_at: null,
      });
      const rawToken = "pt_stage_token_123456789";
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
      const tokenHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      mockDb.previewTokens.set(tokenHash, {
        project_id: "p_stage_prev",
        version_number: 1,
        expires_at: Date.now() + 3600_000,
      });

      const req = new Request(`https://demo.workers.dev/preview/${rawToken}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Preview");
    });

    it("serves preview via /p/:token and ?preview=:token on staging workers.dev", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "true";
      mockDb.projects.set("p_stage_p", {
        id: "p_stage_p",
        slug: "amaka-p",
        status: "draft",
        published_version: null,
        deleted_at: null,
      });
      const rawToken = "pt_stage_token_p987654321";
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
      const tokenHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      mockDb.previewTokens.set(tokenHash, {
        project_id: "p_stage_p",
        version_number: 1,
        expires_at: Date.now() + 3600_000,
      });

      // Test /p/:token
      const reqPath = new Request(`https://demo.workers.dev/p/${rawToken}`);
      const resPath = await worker.fetch(reqPath, env);
      expect(resPath.status).toBe(200);

      // Test ?preview=:token
      const reqQuery = new Request(`https://demo.workers.dev/?preview=${rawToken}`);
      const resQuery = await worker.fetch(reqQuery, env);
      expect(resQuery.status).toBe(200);
    });

    it("serves assets via /assets/:key on staging workers.dev", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "true";
      mockAssetsBucket.objects.set("stage-logo.png", {
        data: "binary-image-data",
        contentType: "image/png",
      });

      const req = new Request("https://demo.workers.dev/assets/stage-logo.png");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
    });

    it("enables staging overrides by default when ENVIRONMENT=staging without explicit flag", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = undefined;
      mockDb.projects.set("p_stage_def", {
        id: "p_stage_def",
        slug: "default-staging",
        status: "live",
        published_version: 1,
        deleted_at: null,
      });
      mockSitesBucket.objects.set("sites/p_stage_def/1.html", {
        data: "<html><body>Default Staging Live</body></html>",
        contentType: "text/html; charset=utf-8",
      });

      const req = new Request("https://demo.workers.dev/site/default-staging");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Default Staging Live");
    });

    it("does not enable staging overrides when flag is disabled", async () => {
      env.ENVIRONMENT = "staging";
      env.STAGING_OVERRIDE_ENABLED = "false";
      const fetchSpy = vi.fn().mockResolvedValue(new Response("Apex Passthrough", { status: 200 }));
      vi.stubGlobal("fetch", fetchSpy);

      const req = new Request("https://demo.workers.dev/?site=amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Apex Passthrough");

      vi.unstubAllGlobals();
    });

    it("returns 404 when live site HTML object is missing from R2", async () => {
      mockDb.projects.set("p_missing_html", {
        id: "p_missing_html",
        slug: "ghost-site",
        status: "live",
        published_version: 1,
        deleted_at: null,
      });
      // Do NOT set HTML in mockSitesBucket

      const req = new Request("https://ghost-site.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
      expect(res.headers.get("Content-Type")).toContain("text/html");
    });

    it("returns 404 when preview token is shorter than 16 characters", async () => {
      const req = new Request("https://preview.replyiq.cv/short-tok");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("returns 500 when preview document_json is corrupted", async () => {
      const token = "0123456789abcdef0123456789abcdef";
      vi.spyOn(globalThis.crypto.subtle, "digest").mockResolvedValueOnce(new Uint8Array(32).buffer);

      mockDb.projects.set("p_corrupt", {
        id: "p_corrupt",
        slug: "corrupt-preview",
        status: "draft",
        deleted_at: null,
      });
      mockDb.previewTokens.set("0000000000000000000000000000000000000000000000000000000000000000", {
        project_id: "p_corrupt",
        version_number: 1,
        expires_at: Date.now() + 3600000,
        document_json: "not valid json {",
      });

      const req = new Request(`https://preview.replyiq.cv/${token}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      expect(await res.text()).toContain("Corrupted preview document");
    });

    it("returns 500 when preview renderSite returns ok: false", async () => {
      const token = "0123456789abcdef0123456789abcdef";
      vi.spyOn(globalThis.crypto.subtle, "digest").mockResolvedValueOnce(new Uint8Array(32).buffer);

      mockDb.projects.set("p_fail", {
        id: "p_fail",
        slug: "fail-preview",
        status: "draft",
        deleted_at: null,
      });
      mockDb.previewTokens.set("0000000000000000000000000000000000000000000000000000000000000000", {
        project_id: "p_fail",
        version_number: 1,
        expires_at: Date.now() + 3600000,
        document_json: JSON.stringify(salonSample),
      });

      const spy = vi.spyOn(templates, "renderSite").mockReturnValueOnce({
        ok: false,
        errors: ["Simulated render syntax error"],
      } as any);

      const req = new Request(`https://preview.replyiq.cv/${token}`);
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(500);
      expect(await res.text()).toContain("Preview rendering failed");

      spy.mockRestore();
    });

    it("serves live site immediately when edge cache hits", async () => {
      vi.stubGlobal("caches", {
        default: {
          match: vi.fn().mockResolvedValue(new Response("Cached live page from edge", { status: 200 })),
          put: vi.fn(),
          delete: vi.fn(),
        },
      });

      const req = new Request("https://amaka-luxe.replyiq.cv/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Cached live page from edge");

      vi.unstubAllGlobals();
    });

    it("returns 404 when cdn asset path has no asset key", async () => {
      const req = new Request("https://cdn.replyiq.cv/assets/");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("serves dev directory landing page even if D1 query throws an error", async () => {
      const devEnv: Env = {
        ...env,
        ENVIRONMENT: "development",
        BASE_DOMAIN: "localhost",
      };
      // Cause DB.prepare to throw
      mockDb.prepare = () => {
        throw new Error("DB offline");
      };

      const req = new Request("http://localhost:8787/");
      const res = await worker.fetch(req, devEnv);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("ReplyIQ Sites Worker");
    });

    it("supports HEAD request on preview route", async () => {
      const token = "a1b2c3d4e5f678901234567890abcdef";
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const actualHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      mockDb.projects.set("p_preview", {
        id: "p_preview",
        slug: "preview-shop",
        status: "draft",
        published_version: null,
      });

      mockDb.previewTokens.set(actualHash, {
        project_id: "p_preview",
        version_number: 1,
        expires_at: Date.now() + 3600 * 1000,
      });

      const req = new Request(`https://preview.replyiq.cv/${token}`, { method: "HEAD" });
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("");
    });

    it("handles omitted BYPASS_HOSTS cleanly", async () => {
      const envWithoutBypass: Env = {
        ...env,
        BYPASS_HOSTS: undefined,
      };
      const req = new Request("https://replyiq.cv/");
      const fetchSpy = vi.fn().mockResolvedValue(new Response("Apex Passthrough", { status: 200 }));
      vi.stubGlobal("fetch", fetchSpy);
      const res = await worker.fetch(req, envWithoutBypass);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Apex Passthrough");
      vi.unstubAllGlobals();
    });

    it("renders dev landing page with project that has no explicit template", async () => {
      const devEnv: Env = {
        ...env,
        ENVIRONMENT: "development",
        BASE_DOMAIN: "localhost",
      };
      mockDb.projects.set("p_no_template", {
        id: "p_no_template",
        slug: "unspecified-tmpl",
        status: "live",
        name: "Unspecified Template",
        template: "",
        deleted_at: null,
      });

      const req = new Request("http://localhost:8787/");
      const res = await worker.fetch(req, devEnv);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("unspecified-tmpl");
      expect(html).toContain("site");
    });
  });
});

