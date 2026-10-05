import { describe, it, expect } from "vitest";
import {
  validateSubdomainSlug,
  buildSiteUrl,
  SubdomainSlugSchema,
  RESERVED_SLUGS,
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
} from "../src/common/slug.js";
import { BASE_DOMAIN } from "../src/config.js";

describe("Subdomain Slug Validator", () => {
  describe("Valid slugs", () => {
    it("accepts alphanumeric slugs with single hyphens", () => {
      expect(validateSubdomainSlug("chidi-bakery").valid).toBe(true);
      expect(validateSubdomainSlug("tech101").valid).toBe(true);
      expect(validateSubdomainSlug("lagos-creative-studio").valid).toBe(true);
      expect(validateSubdomainSlug("a1b").valid).toBe(true);
    });

    it("normalizes uppercase characters to lowercase", () => {
      const res = validateSubdomainSlug("Chidi-Bakery");
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.slug).toBe("chidi-bakery");
      }
    });

    it("rejects non-string input", () => {
      expect(validateSubdomainSlug(12345 as unknown as string)).toEqual({
        valid: false,
        error: "Subdomain slug must be a string",
      });
    });
  });

  describe("Boundary limits", () => {
    it(`rejects slugs shorter than ${MIN_SLUG_LENGTH} characters`, () => {
      expect(validateSubdomainSlug("ab").valid).toBe(false);
      expect(validateSubdomainSlug("a").valid).toBe(false);
      expect(validateSubdomainSlug("").valid).toBe(false);
    });

    it(`rejects slugs longer than ${MAX_SLUG_LENGTH} characters`, () => {
      const longSlug = "a".repeat(MAX_SLUG_LENGTH + 1);
      expect(validateSubdomainSlug(longSlug).valid).toBe(false);
    });

    it(`accepts slugs with exactly ${MAX_SLUG_LENGTH} characters`, () => {
      const maxSlug = "a".repeat(MAX_SLUG_LENGTH);
      expect(validateSubdomainSlug(maxSlug).valid).toBe(true);
    });
  });

  describe("Hyphen rules", () => {
    it("rejects leading hyphen", () => {
      const res = validateSubdomainSlug("-myshop");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("cannot begin or end with a hyphen");
      }
    });

    it("rejects trailing hyphen", () => {
      const res = validateSubdomainSlug("myshop-");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("cannot begin or end with a hyphen");
      }
    });

    it("rejects consecutive hyphens", () => {
      const res = validateSubdomainSlug("my--shop");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toContain("consecutive hyphens");
      }
    });
  });

  describe("Invalid characters", () => {
    it("rejects spaces, underscores, dots, and symbols", () => {
      expect(validateSubdomainSlug("my shop").valid).toBe(false);
      expect(validateSubdomainSlug("my_shop").valid).toBe(false);
      expect(validateSubdomainSlug("my.shop").valid).toBe(false);
      expect(validateSubdomainSlug("shop!").valid).toBe(false);
      expect(validateSubdomainSlug("shop@lagos").valid).toBe(false);
    });
  });

  describe("Reserved subdomain names", () => {
    const reservedSamples = [
      "admin",
      "api",
      "app",
      "assets",
      "auth",
      "billing",
      "blog",
      "cdn",
      "console",
      "dashboard",
      "docs",
      "ftp",
      "help",
      "login",
      "mail",
      "ns1",
      "ns2",
      "onboard",
      "partners",
      "portal",
      "privacy",
      "replyiq",
      "root",
      "signup",
      "smtp",
      "status",
      "support",
      "terms",
      "www",
    ];

    it("rejects every reserved slug", () => {
      for (const slug of reservedSamples) {
        const res = validateSubdomainSlug(slug);
        expect(res.valid).toBe(false);
        if (!res.valid) {
          expect(res.error).toContain("reserved system name");
        }
      }
    });

    it("ensures RESERVED_SLUGS set contains all specified names", () => {
      for (const slug of reservedSamples) {
        expect(RESERVED_SLUGS.has(slug)).toBe(true);
      }
    });
  });

  describe("buildSiteUrl using BASE_DOMAIN constant", () => {
    it("generates correct full URL using BASE_DOMAIN", () => {
      const url = buildSiteUrl("chidi-bakery");
      expect(url).toBe(`https://chidi-bakery.${BASE_DOMAIN}`);
      expect(url).toBe("https://chidi-bakery.replyiq.cv");
    });

    it("throws when given an invalid subdomain slug", () => {
      expect(() => buildSiteUrl("api")).toThrow(/reserved system name/);
      expect(() => buildSiteUrl("bad--slug")).toThrow(/consecutive hyphens/);
    });
  });

  describe("SubdomainSlugSchema (Zod)", () => {
    it("parses valid slugs", () => {
      expect(SubdomainSlugSchema.parse("valid-shop")).toBe("valid-shop");
    });

    it("throws for reserved slugs", () => {
      expect(() => SubdomainSlugSchema.parse("admin")).toThrow(/reserved system name/);
    });
  });
});
