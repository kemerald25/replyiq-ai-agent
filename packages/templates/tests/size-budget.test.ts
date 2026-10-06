import { describe, it, expect } from "vitest";
import { renderSite } from "../src/render.js";
import {
  salonSample,
  studentSample,
  tailorSample,
  minimalSample,
  stressSample,
} from "../src/samples/index.js";

const mockResolver = () => ({
  url: "https://cdn.replyiq.cv/img.webp",
  width: 600,
  height: 400,
});

function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

describe("Size Budget Constraints", () => {
  const TYPICAL_BUDGET_BYTES = 40 * 1024; // 40 KB
  const MAX_CONTENT_BUDGET_BYTES = 100 * 1024; // 100 KB

  it("typical document (minimalSample) is well under 40 KB budget", () => {
    const res = renderSite(minimalSample, {
      mode: "live",
      canonicalUrl: "https://chidi-bakery.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bytes = getByteLength(res.html);
      expect(bytes).toBeLessThan(TYPICAL_BUDGET_BYTES);
    }
  });

  it("typical document (salonSample) is under 40 KB budget", () => {
    const res = renderSite(salonSample, {
      mode: "live",
      canonicalUrl: "https://amaka-luxe.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bytes = getByteLength(res.html);
      expect(bytes).toBeLessThan(TYPICAL_BUDGET_BYTES);
    }
  });

  it("typical document (studentSample) is under 40 KB budget", () => {
    const res = renderSite(studentSample, {
      mode: "live",
      canonicalUrl: "https://tunde-design.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bytes = getByteLength(res.html);
      expect(bytes).toBeLessThan(TYPICAL_BUDGET_BYTES);
    }
  });

  it("typical document (tailorSample) is under 40 KB budget", () => {
    const res = renderSite(tailorSample, {
      mode: "live",
      canonicalUrl: "https://kola-bespoke.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bytes = getByteLength(res.html);
      expect(bytes).toBeLessThan(TYPICAL_BUDGET_BYTES);
    }
  });

  it("maximum-content stress document (20 sections, max items) is strictly under 100 KB budget", () => {
    const res = renderSite(stressSample, {
      mode: "live",
      canonicalUrl: "https://apex.replyiq.cv",
      assetResolver: mockResolver,
      showBranding: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const bytes = getByteLength(res.html);
      expect(bytes).toBeLessThan(MAX_CONTENT_BUDGET_BYTES);
    }
  });
});
