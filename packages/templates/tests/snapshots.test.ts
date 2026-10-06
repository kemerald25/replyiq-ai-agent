import { describe, it, expect } from "vitest";
import { renderSite } from "../src/render.js";
import { allSampleDocuments } from "../src/samples/index.js";
import { AssetResolver } from "../src/engine/asset.js";

const mockResolver: AssetResolver = (id: string) => ({
  url: `https://cdn.replyiq.cv/assets/${id}.webp`,
  width: 800,
  height: 600,
  srcset: `https://cdn.replyiq.cv/assets/${id}-400.webp 400w, https://cdn.replyiq.cv/assets/${id}-800.webp 800w`,
});

describe("Sample Document Snapshot Tests", () => {
  for (const [key, doc] of Object.entries(allSampleDocuments)) {
    it(`matches deterministic snapshot for ${key} sample`, () => {
      const result = renderSite(doc, {
        mode: "live",
        canonicalUrl: `https://${doc.subdomain}.replyiq.cv`,
        assetResolver: mockResolver,
        showBranding: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.html).toMatchSnapshot();
      }
    });
  }
});
