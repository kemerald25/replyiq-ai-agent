import { describe, it, expect } from "vitest";
import { renderSite } from "../src/render.js";
import { salonSample, minimalSample } from "../src/samples/index.js";
import { AssetResolver } from "../src/engine/asset.js";

const mockResolver: AssetResolver = (id: string) => ({
  url: `https://cdn.replyiq.cv/${id}.webp`,
  width: 800,
  height: 600,
  srcset: `https://cdn.replyiq.cv/${id}-400.webp 400w, https://cdn.replyiq.cv/${id}-800.webp 800w`,
});

describe("renderSite Engine", () => {
  it("renders a valid document successfully with { ok: true, html }", () => {
    const result = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain('<html lang="en">');
      expect(result.html).toContain("<title>Amaka Luxe Hair &amp; Beauty Salon</title>");
      expect(result.html).toContain("Amaka Luxe Hair &amp; Beauty Salon");
    }
  });

  it("returns { ok: false, errors } when given an invalid document", () => {
    const invalidDoc = {
      schemaVersion: 1,
      subdomain: "bad_subdomain!",
      // Missing title, sections, etc.
    };

    const result = renderSite(invalidDoc, {
      mode: "live",
      canonicalUrl: "https://bad.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("is strictly deterministic: identical inputs yield byte-for-byte identical output", () => {
    const render1 = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });

    const render2 = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });

    expect(render1.ok).toBe(true);
    expect(render2.ok).toBe(true);
    if (render1.ok && render2.ok) {
      expect(render1.html).toBe(render2.html);
    }
  });

  describe("Preview vs Live Mode", () => {
    it("preview mode adds noindex robots tag and preview ribbon", () => {
      const res = renderSite(salonSample, {
        mode: "preview",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).toContain('<meta name="robots" content="noindex, nofollow">');
        expect(res.html).toContain('class="preview-ribbon"');
        expect(res.html).toContain("Preview Mode");
      }
    });

    it("live mode adds index robots tag, canonical URL, and Open Graph/Twitter tags", () => {
      const res = renderSite(salonSample, {
        mode: "live",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).toContain('<meta name="robots" content="index, follow">');
        expect(res.html).toContain('<link rel="canonical" href="https://amaka-luxe.replyiq.cv">');
        expect(res.html).toContain('<meta property="og:title"');
        expect(res.html).toContain(
          '<meta property="og:url" content="https://amaka-luxe.replyiq.cv">',
        );
        expect(res.html).toContain('<meta name="twitter:card" content="summary">');
        expect(res.html).not.toContain('class="preview-ribbon"');
      }
    });
  });

  describe("Branding Link", () => {
    it("includes 'Built with ReplyIQ' when showBranding is true", () => {
      const res = renderSite(salonSample, {
        mode: "live",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).toContain("Built with <strong>ReplyIQ</strong>");
        expect(res.html).toContain('href="https://replyiq.cv"');
      }
    });

    it("omits 'Built with ReplyIQ' when showBranding is false", () => {
      const res = renderSite(salonSample, {
        mode: "live",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).not.toContain("Built with <strong>ReplyIQ</strong>");
      }
    });
  });

  describe("Floating WhatsApp Button & Navigation", () => {
    it("renders floating WhatsApp button with aria-label and encoded WhatsApp link", () => {
      const res = renderSite(minimalSample, {
        mode: "live",
        canonicalUrl: "https://chidi-bakery.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).toContain('class="floating-whatsapp"');
        expect(res.html).toContain('aria-label="Chat with Chidi Bakery Lagos on WhatsApp"');
        expect(res.html).toContain("https://wa.me/2348031234567?text=Hello%20Chidi%20Bakery");
      }
    });

    it("builds navigation from the document's actual sections", () => {
      const res = renderSite(salonSample, {
        mode: "live",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: false,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).toContain('href="#about-1"');
        expect(res.html).toContain('href="#services-1"');
        expect(res.html).toContain('href="#testimonials-1"');
        expect(res.html).toContain('href="#contact-1"');
      }
    });
  });

  describe("Zero JavaScript Guarantee", () => {
    it("ensures no script tags exist anywhere in rendered HTML", () => {
      const res = renderSite(salonSample, {
        mode: "live",
        canonicalUrl: "https://amaka-luxe.replyiq.cv",
        assetResolver: mockResolver,
        showBranding: true,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.html).not.toContain("<script");
        expect(res.html).not.toContain("javascript:");
        expect(res.html).not.toContain("onload=");
      }
    });
  });
});
