import { describe, it, expect } from "vitest";
import { renderSite } from "../src/render.js";
import { resolveTheme } from "../src/engine/theme.js";
import { safeHref } from "../src/engine/html.js";
import { portfolioTemplate } from "../src/templates/portfolio/index.js";
import { minimalSample } from "../src/samples/index.js";
import { SiteDocument } from "@replyiq/schema";
import * as templatesExports from "../src/index.js";

const mockResolver = () => null;

describe("Renderer Security & Hostile Input Defenses", () => {
  it("does NOT export raw() from the public API", () => {
    // @ts-expect-error Verifying raw is not exported
    expect(templatesExports.raw).toBeUndefined();
  });

  describe("Hostile Text Injections (bypassing schema)", () => {
    it("HTML-escapes malicious scripts and tag patterns in headings and paragraphs", () => {
      // Craft a document object bypassing Zod directly to test renderer-level defense
      const hostileDoc: SiteDocument = {
        ...minimalSample,
        metadata: {
          ...minimalSample.metadata,
          title: "Malicious Title <script>alert('pwned')</script>",
          description: 'Hostile "><img src=x onerror=alert(1)> description',
        },
        sections: [
          {
            id: "hero-1",
            type: "hero",
            heading: "<script>alert('heading-xss')</script>",
            subheading: "<svg/onload=alert('svg-xss')>",
            cta: {
              label: "Click <b onmouseover=alert(1)>Me</b>",
              url: "https://wa.me/2348031234567",
            },
          },
        ],
      };

      // Force render without schema parsing by calling portfolio layout or mock
      const res = renderSite(hostileDoc, {
        mode: "live",
        canonicalUrl: "https://chidi-bakery.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });
      expect(res.ok).toBe(false);

      // The schema rejects hostile data via validateSiteDocument,
      // so we also test the layout and components directly with hostile data:
      const rendered = portfolioTemplate.render(hostileDoc, {
        mode: "live",
        canonicalUrl: "https://chidi-bakery.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: true,
      });

      const html = rendered.value;

      // Prove that raw unescaped script/svg/onload tags NEVER appear in the markup
      expect(html).not.toContain("<script>alert('heading-xss')</script>");
      expect(html).not.toContain("<svg/onload=alert('svg-xss')>");
      expect(html).not.toContain("<b onmouseover=alert(1)>");

      // Verify they are properly escaped
      expect(html).toContain("&lt;script&gt;alert(&#39;heading-xss&#39;)&lt;/script&gt;");
      expect(html).toContain("&lt;svg/onload=alert(&#39;svg-xss&#39;)&gt;");
    });
  });

  describe("Hostile Theme Values & CSS Injection Defense", () => {
    it("re-validates theme colors at render time and rejects CSS breakouts", () => {
      const hostileTheme = {
        palette: "lagos-emerald" as const,
        tokens: {
          // Attempting to break out of CSS :root { --color-primary: ... }
          primary: "red; } body { display: none !important; } /*",
          secondary: "expression(alert(1))",
          background: "url('https://malicious.com/tracker.png')",
          surface: "'; alert(1); '",
          text: "#000000; }",
          muted: "blue",
        },
      };

      const resolved = resolveTheme(hostileTheme);

      // Malicious values MUST be rejected and replaced with safe fallback hex colors
      expect(resolved.tokens.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolved.tokens.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolved.tokens.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolved.tokens.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolved.tokens.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(resolved.tokens.muted).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Verify cssVariables contains no breakout syntax
      expect(resolved.cssVariables).not.toContain("display: none");
      expect(resolved.cssVariables).not.toContain("expression");
      expect(resolved.cssVariables).not.toContain("url(");
    });

    it("rejects non-allowlisted fonts and falls back to system-sans", () => {
      const hostileTheme = {
        font: "MaliciousFont', Arial; } * { color: red; } /*",
      } as unknown as import("@replyiq/schema").Theme;

      const resolved = resolveTheme(hostileTheme);
      expect(resolved.font).toBe("system-sans");
      expect(resolved.fontLinkTag).toBe("");
    });
  });

  describe("Renderer-Level URL Scheme Defense (safeHref)", () => {
    it("refuses dangerous and insecure protocols independently of schema", () => {
      expect(safeHref("javascript:alert(1)")).toBe("#");
      expect(safeHref("JAVASCRIPT:alert(document.cookie)")).toBe("#");
      expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
      expect(safeHref("DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBe("#");
      expect(safeHref("vbscript:msgbox(1)")).toBe("#");
      expect(safeHref("http://insecure-site.com")).toBe("#");
      expect(safeHref("file:///etc/passwd")).toBe("#");
    });

    it("accepts valid https:// and wa.me/ links", () => {
      expect(safeHref("https://example.com")).toBe("https://example.com");
      expect(safeHref("https://wa.me/2348031234567")).toBe("https://wa.me/2348031234567");
      expect(safeHref("wa.me/2348031234567")).toBe("wa.me/2348031234567");
    });

    it("accepts valid internal fragment anchors", () => {
      expect(safeHref("#main-content")).toBe("#main-content");
      expect(safeHref("#hero-1")).toBe("#hero-1");
      expect(safeHref("#services-section")).toBe("#services-section");
    });

    it("handles non-string, empty, or unallowed href inputs safely", () => {
      expect(safeHref(null)).toBe("#");
      expect(safeHref(undefined)).toBe("#");
      expect(safeHref(123)).toBe("#");
      expect(safeHref("ftp://ftp.example.com")).toBe("#");
      expect(safeHref("")).toBe("#");
      expect(safeHref("   ")).toBe("#");
    });
  });

  describe("HTML Engine & Registry Edge Cases", () => {
    it("handles html tag interpolation edge cases (arrays, nulls, booleans, falsy)", async () => {
      const { html, raw, escapeAttr, escapeHtml } = await import("../src/engine/html.js");

      // Test null and undefined in escapeHtml and escapeAttr
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeAttr(null)).toBe("");
      expect(escapeAttr(undefined)).toBe("");

      // Test html interpolation with array containing mixed items
      const snippet = (html as any)`<div>${[
        "item1",
        null,
        false,
        undefined,
        (raw as any)("<span>safe</span>"),
        "<tag>",
      ]}</div>`;

      expect(snippet.value).toBe("<div>item1<span>safe</span>&lt;tag&gt;</div>");

      // Test html with falsy values
      const conditional = (html as any)`<span>${false}${null}${undefined}visible</span>`;
      expect(conditional.value).toBe("<span>visible</span>");
    });

    it("getTemplate falls back to portfolio template when unknown templateId passed", async () => {
      const { getTemplate } = await import("../src/templates/registry.js");
      const fallback = getTemplate("non-existent-template" as any);
      expect(fallback.id).toBe("portfolio");
    });

    it("renderSection throws error when unhandled section type is encountered", async () => {
      const { renderSection } = await import("../src/sections/registry.js");
      const badSection = { type: "unsupported-type", id: "bad-1" };
      expect(() =>
        renderSection(badSection as any, {
          mode: "live",
          canonicalUrl: "https://example.com",
          assetResolver: mockResolver,
          showBranding: false,
        }),
      ).toThrow("Unhandled section type");
    });
  });
});
