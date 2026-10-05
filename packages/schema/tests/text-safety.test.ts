import { describe, it, expect } from "vitest";
import { validateSafeText, safeTextSchema } from "../src/common/text-safety.js";
import { SafeUrlSchema, validateSafeUrl } from "../src/common/urls.js";
import { AssetIdSchema } from "../src/common/asset.js";

describe("Text Safety & HTML/Script Rejection", () => {
  const defaultOpts = { minLength: 1, maxLength: 200, allowMultiline: true };

  describe("HTML & Tag-like patterns", () => {
    it("rejects opening HTML tags", () => {
      expect(validateSafeText("<script>alert('hack')</script>", defaultOpts).valid).toBe(false);
      expect(validateSafeText("<div>hello</div>", defaultOpts).valid).toBe(false);
      expect(validateSafeText("Click here: <a href='x'>link</a>", defaultOpts).valid).toBe(false);
      expect(validateSafeText("<img src=x onerror=alert(1)>", defaultOpts).valid).toBe(false);
    });

    it("rejects closing tags and special declarations", () => {
      expect(validateSafeText("</div> closing", defaultOpts).valid).toBe(false);
      expect(validateSafeText("<!DOCTYPE html>", defaultOpts).valid).toBe(false);
      expect(validateSafeText("<!-- comment -->", defaultOpts).valid).toBe(false);
    });

    it("allows harmless angle brackets that are NOT tag-like (e.g. math / comparisons)", () => {
      // '<' not followed by a letter, '/' or '!'
      expect(validateSafeText("3 < 5 is true", defaultOpts).valid).toBe(true);
      expect(validateSafeText("Price is < 1000 NGN", defaultOpts).valid).toBe(true);
      expect(validateSafeText("Item 1 < Item 2", defaultOpts).valid).toBe(true);
      expect(validateSafeText("<Item> tag is bad", defaultOpts).valid).toBe(false);
      expect(validateSafeText("Item 1 < 2", defaultOpts).valid).toBe(true);
      expect(validateSafeText("Rating > 4.5 and < 5.0", defaultOpts).valid).toBe(true);
    });
  });

  describe("Control characters and Bidirectional Overrides", () => {
    it("rejects null bytes and low control characters", () => {
      expect(validateSafeText("Hello\u0000World", defaultOpts).valid).toBe(false);
      expect(validateSafeText("Dangerous\u0008Char", defaultOpts).valid).toBe(false);
      expect(validateSafeText("Control\u001FChar", defaultOpts).valid).toBe(false);
      expect(validateSafeText("Delete\u007FChar", defaultOpts).valid).toBe(false);
    });

    it("rejects bidirectional override characters (Trojan Source attacks)", () => {
      // U+202E (RLO)
      expect(validateSafeText("Normal text \u202E reversed text", defaultOpts).valid).toBe(false);
      // U+202A (LRE)
      expect(validateSafeText("Embed \u202A text", defaultOpts).valid).toBe(false);
      // U+2066 (LRI)
      expect(validateSafeText("Isolate \u2066 text", defaultOpts).valid).toBe(false);
    });

    it("allows standard Unicode, Nigerian language diacritics, and emojis", () => {
      // Yorùbá, Igbo, Hausa
      expect(validateSafeText("Ẹ káàbọ̀ sí ReplyIQ!", defaultOpts).valid).toBe(true);
      expect(validateSafeText("Kedụ ka ị mere? Ọ dị mma.", defaultOpts).valid).toBe(true);
      expect(validateSafeText("Barka da zuwa! Sannu da aiki.", defaultOpts).valid).toBe(true);
      // Emojis
      expect(validateSafeText("🇳🇬 Best cakes in Lagos! 🍰✨ Order now 🚀", defaultOpts).valid).toBe(
        true,
      );
    });

    it("rejects text that is too short for minLength", () => {
      const minOpts = { minLength: 5, maxLength: 20 };
      const res = validateSafeText("abc", minOpts);
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("must be at least 5 characters");
      }
    });

    it("rejects newlines when allowMultiline is false", () => {
      const singleLineOpts = { minLength: 1, maxLength: 100, allowMultiline: false };
      expect(validateSafeText("Line 1\nLine 2", singleLineOpts).valid).toBe(false);
      expect(validateSafeText("Line 1\rLine 2", singleLineOpts).valid).toBe(false);
      expect(validateSafeText("Single line heading", singleLineOpts).valid).toBe(true);
    });
  });

  describe("Free text does not reject pseudo-protocols as plain text", () => {
    it("allows words like javascript or data in normal plain text if no tag pattern", () => {
      expect(
        validateSafeText("We teach JavaScript and Python programming.", defaultOpts).valid,
      ).toBe(true);
      expect(
        validateSafeText("We provide data analysis for small businesses.", defaultOpts).valid,
      ).toBe(true);
    });

    it("proves free text like 'Data: unlimited' and 'javascript: the good parts' passes in text fields but is rejected in URL fields", () => {
      const sample1 = "Data: unlimited";
      const sample2 = "javascript: the good parts";

      // Both strings pass cleanly in text fields
      expect(validateSafeText(sample1, defaultOpts).valid).toBe(true);
      expect(validateSafeText(sample2, defaultOpts).valid).toBe(true);

      // Both strings are rejected in URL fields
      expect(validateSafeUrl(sample1).valid).toBe(false);
      expect(validateSafeUrl(sample2).valid).toBe(false);
      expect(() => SafeUrlSchema.parse(sample1)).toThrow();
      expect(() => SafeUrlSchema.parse(sample2)).toThrow();
    });
  });

  describe("Zod safeTextSchema helper", () => {
    const schema = safeTextSchema({ minLength: 3, maxLength: 50, allowMultiline: false });

    it("parses valid text and trims whitespace", () => {
      expect(schema.parse("  Valid Business Name  ")).toBe("Valid Business Name");
    });

    it("throws on tag-like text", () => {
      expect(() => schema.parse("<script>bad</script>")).toThrow();
    });
  });
});

describe("Safe URL Validation", () => {
  it("accepts valid https:// URLs", () => {
    expect(validateSafeUrl("https://example.com").valid).toBe(true);
    expect(validateSafeUrl("https://wa.me/2348031234567").valid).toBe(true);
  });

  it("accepts wa.me/ links", () => {
    expect(validateSafeUrl("wa.me/2348031234567").valid).toBe(true);
  });

  it("rejects http:// insecure links", () => {
    const res = validateSafeUrl("http://insecure-site.com");
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain("Insecure http:// links are forbidden");
    }
  });

  it("rejects dangerous pseudo-protocols (javascript:, data:)", () => {
    expect(validateSafeUrl("javascript:alert(document.cookie)").valid).toBe(false);
    expect(validateSafeUrl("data:text/html,<script>alert(1)</script>").valid).toBe(false);
    expect(validateSafeUrl("vbscript:msgbox(1)").valid).toBe(false);
  });

  it("rejects other protocols like ftp://", () => {
    const res = validateSafeUrl("ftp://files.example.com");
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain("URL must begin with https:// or wa.me/");
    }
  });

  it("handles malformed URL exceptions", () => {
    const res = validateSafeUrl("https://");
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toBe("Malformed URL");
    }
  });

  it("SafeUrlSchema rejects invalid URLs", () => {
    expect(() => SafeUrlSchema.parse("javascript:alert(1)")).toThrow();
    expect(() => SafeUrlSchema.parse("http://example.com")).toThrow();
    expect(SafeUrlSchema.parse("https://instagram.com/mybrand")).toBe(
      "https://instagram.com/mybrand",
    );
  });
});

describe("Asset ID Validation", () => {
  it("accepts valid asset IDs (asset_<identifier>)", () => {
    expect(AssetIdSchema.parse("asset_hero_img_01")).toBe("asset_hero_img_01");
    expect(AssetIdSchema.parse("asset_12345678")).toBe("asset_12345678");
  });

  it("strictly rejects arbitrary external image URLs", () => {
    expect(() => AssetIdSchema.parse("https://images.unsplash.com/photo-123")).toThrow();
    expect(() => AssetIdSchema.parse("http://example.com/logo.png")).toThrow();
    expect(() => AssetIdSchema.parse("/local/path/image.jpg")).toThrow();
  });
});
