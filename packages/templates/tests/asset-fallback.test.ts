import { describe, it, expect } from "vitest";
import { renderImage } from "../src/engine/asset.js";

describe("Asset Resolver & Neutral Placeholder Fallback", () => {
  it("renders <img> tag with full attributes when asset is successfully resolved", () => {
    const resolver = () => ({
      url: "https://cdn.replyiq.cv/hero.webp",
      width: 1200,
      height: 800,
      srcset: "https://cdn.replyiq.cv/hero-600.webp 600w, https://cdn.replyiq.cv/hero.webp 1200w",
    });

    const result = renderImage({
      asset: { assetId: "asset_hero_1", alt: "Hero banner photo" },
      resolver,
      isAboveFold: true,
      className: "hero-img",
    });

    const html = result.value;
    expect(html).toContain("<img");
    expect(html).toContain('src="https://cdn.replyiq.cv/hero.webp"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="800"');
    expect(html).toContain('alt="Hero banner photo"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain(
      'srcset="https://cdn.replyiq.cv/hero-600.webp 600w, https://cdn.replyiq.cv/hero.webp 1200w"',
    );
    expect(html).toContain('class="hero-img"');
  });

  it("uses loading='lazy' for below-the-fold images", () => {
    const resolver = () => ({
      url: "https://cdn.replyiq.cv/gallery.webp",
      width: 400,
      height: 300,
    });

    const result = renderImage({
      asset: { assetId: "asset_gal_1", alt: "Gallery photo" },
      resolver,
      isAboveFold: false,
    });

    expect(result.value).toContain('loading="lazy"');
  });

  it("degrades gracefully to a neutral placeholder when resolver returns null", () => {
    const resolver = () => null; // Missing on CDN

    const result = renderImage({
      asset: { assetId: "asset_missing", alt: "Missing photo description" },
      resolver,
      className: "gallery-img",
    });

    const html = result.value;
    // Must NOT render a broken <img> tag
    expect(html).not.toContain("<img");
    // Must render an accessible placeholder
    expect(html).toContain('class="asset-placeholder gallery-img"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Missing photo description"');
    expect(html).toContain("<svg");
  });

  it("degrades to placeholder when asset itself is undefined or null", () => {
    const resolver = () => null;

    const result = renderImage({
      asset: null,
      resolver,
    });

    expect(result.value).not.toContain("<img");
    expect(result.value).toContain('class="asset-placeholder"');
  });
});
