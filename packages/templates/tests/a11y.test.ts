import { describe, it, expect } from "vitest";
import { renderSite } from "../src/render.js";
import { salonSample, minimalSample } from "../src/samples/index.js";
import { SiteDocument } from "@replyiq/schema";

const mockResolver = () => ({
  url: "https://cdn.replyiq.cv/test.webp",
  width: 600,
  height: 400,
});

describe("Accessibility & Landmarks Standards", () => {
  it("ensures exactly one <h1> element exists per page", () => {
    // 1. Document with Hero section
    const resWithHero = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(resWithHero.ok).toBe(true);
    if (resWithHero.ok) {
      const h1Matches = resWithHero.html.match(/<h1\b[^>]*>/g);
      expect(h1Matches).not.toBeNull();
      expect(h1Matches?.length).toBe(1);
    }

    // 2. Document WITHOUT Hero section (e.g. only about section)
    const docWithoutHero: SiteDocument = {
      ...minimalSample,
      sections: [
        {
          id: "about-1",
          type: "about",
          title: "About Us",
          content: "We make fresh bread.",
        },
      ],
    };
    const resWithoutHero = renderSite(docWithoutHero, {
      mode: "live",
      canonicalUrl: "https://chidi-bakery.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(resWithoutHero.ok).toBe(true);
    if (resWithoutHero.ok) {
      const h1Matches = resWithoutHero.html.match(/<h1\b[^>]*>/g);
      expect(h1Matches).not.toBeNull();
      expect(h1Matches?.length).toBe(1);
    }
  });

  it("contains semantic landmarks: header, nav, main, section, footer", () => {
    const res = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html).toContain("<header");
      expect(res.html).toContain("<nav");
      expect(res.html).toContain('<main id="main-content">');
      expect(res.html).toContain("<section");
      expect(res.html).toContain("<footer");
    }
  });

  it("includes an accessible skip link targeting #main-content", () => {
    const res = renderSite(minimalSample, {
      mode: "live",
      canonicalUrl: "https://chidi-bakery.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html).toContain(
        '<a href="#main-content" class="skip-link">Skip to main content</a>',
      );
    }
  });

  it("renders a valid lang attribute on <html>", () => {
    const res = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html).toContain('<html lang="en">');
    }
  });

  it("ensures all <img> tags contain an alt attribute", () => {
    const res = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const imgTags = res.html.match(/<img\b[^>]*>/g) || [];
      for (const img of imgTags) {
        expect(img).toContain("alt=");
      }
    }
  });

  it("includes visible focus styles and prefers-reduced-motion in inlined CSS", () => {
    const res = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: false,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.html).toContain(":focus-visible");
      expect(res.html).toContain("@media (prefers-reduced-motion: reduce)");
    }
  });
});
