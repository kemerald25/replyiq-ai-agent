import { describe, it, expect, vi, beforeEach } from "vitest";
import worker, { Env } from "../src/index.js";
import { salonSample } from "@replyiq/templates";

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
    const self = this;
    let boundArgs: any[] = [];
    return {
      bind(...args: any[]) {
        boundArgs = args;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        if (sql.includes("FROM projects WHERE slug = ?")) {
          const slug = boundArgs[0];
          for (const proj of self.projects.values()) {
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
          const token = self.previewTokens.get(tokenHash);
          if (!token) return null;
          const proj = self.projects.get(token.project_id);
          if (!proj) return null;
          return {
            project_id: proj.id,
            slug: proj.slug,
            version_number: token.version_number,
            expires_at: token.expires_at,
            document_json: JSON.stringify(salonSample),
          } as T;
        }

        return null;
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
  });

  describe("Preview Route", () => {
    it("serves preview for valid unexpired token with private no-store headers", async () => {
      const token = "a1b2c3d4e5f678901234567890abcdef";
      // Hash of token
      const tokenHash = "96c09b9f93933c063cf26faef7655883ef2807f4a25032a105c30b20ef225674"; // computeSha256Hex
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
      });

      const req = new Request("https://demo.workers.dev/?site=amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Staging Amaka Luxe");
    });

    it("selects site via path prefix when staging override is enabled", async () => {
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
      });

      const req = new Request("https://demo.workers.dev/site/amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("Staging Amaka Luxe Path");
    });

    it("does not enable staging overrides when flag is disabled", async () => {
      env.STAGING_OVERRIDE_ENABLED = "false";
      const fetchSpy = vi.fn().mockResolvedValue(new Response("Apex Passthrough", { status: 200 }));
      vi.stubGlobal("fetch", fetchSpy);

      const req = new Request("https://demo.workers.dev/?site=amaka-luxe");
      const res = await worker.fetch(req, env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Apex Passthrough");

      vi.unstubAllGlobals();
    });
  });
});
