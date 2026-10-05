import { describe, it, expect } from "vitest";
import { SiteDocumentSchema } from "../src/document.js";
import { ServicesSectionSchema } from "../src/sections/registry.js";
import { validMinimalDoc } from "./document.test.js";

describe("Strict Document & Field Limits", () => {
  it("rejects metadata title exceeding 70 characters", () => {
    const doc = {
      ...validMinimalDoc,
      metadata: {
        ...validMinimalDoc.metadata,
        title: "A".repeat(71),
      },
    };
    expect(SiteDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("accepts metadata title within 70 characters", () => {
    const doc = {
      ...validMinimalDoc,
      metadata: {
        ...validMinimalDoc.metadata,
        title: "A".repeat(70),
      },
    };
    expect(SiteDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects metadata description exceeding 160 characters", () => {
    const doc = {
      ...validMinimalDoc,
      metadata: {
        ...validMinimalDoc.metadata,
        description: "B".repeat(161),
      },
    };
    expect(SiteDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects document exceeding 20 sections", () => {
    const sections = Array.from({ length: 21 }, (_, i) => ({
      id: `hero-${i}`,
      type: "hero" as const,
      heading: `Hero Section ${i}`,
    }));

    const doc = {
      ...validMinimalDoc,
      sections,
    };

    const res = SiteDocumentSchema.safeParse(doc);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(
        res.error.issues.some((iss) =>
          iss.message.includes("Site cannot contain more than 20 sections"),
        ),
      ).toBe(true);
    }
  });

  it("accepts document with exactly 20 sections", () => {
    const sections = Array.from({ length: 20 }, (_, i) => ({
      id: `hero-${i}`,
      type: "hero" as const,
      heading: `Hero Section ${i}`,
    }));

    const doc = {
      ...validMinimalDoc,
      sections,
    };

    expect(SiteDocumentSchema.safeParse(doc).success).toBe(true);
  });

  describe("Services section limits & pricing rules", () => {
    it("accepts valid service item with integer price in naira, default NGN, and label", () => {
      const section = {
        id: "serv-1",
        type: "services" as const,
        title: "Web Services",
        items: [
          {
            id: "serv-item-1",
            name: "Landing Page",
            price: 75000,
            currency: "NGN",
            priceLabel: "from",
          },
        ],
      };
      const res = ServicesSectionSchema.safeParse(section);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.items[0]?.price).toBe(75000);
        expect(res.data.items[0]?.currency).toBe("NGN");
        expect(res.data.items[0]?.priceLabel).toBe("from");
      }
    });

    it("rejects non-integer price (float) in naira", () => {
      const section = {
        id: "serv-1",
        type: "services",
        title: "Web Services",
        items: [
          {
            id: "serv-item-1",
            name: "Landing Page",
            price: 75000.5,
          },
        ],
      };
      const res = ServicesSectionSchema.safeParse(section);
      expect(res.success).toBe(false);
    });

    it("rejects negative price", () => {
      const section = {
        id: "serv-1",
        type: "services",
        title: "Web Services",
        items: [
          {
            id: "serv-item-1",
            name: "Landing Page",
            price: -100,
          },
        ],
      };
      expect(ServicesSectionSchema.safeParse(section).success).toBe(false);
    });

    it("rejects services section with 0 items", () => {
      const section = {
        id: "serv-1",
        type: "services",
        title: "Web Services",
        items: [],
      };
      expect(ServicesSectionSchema.safeParse(section).success).toBe(false);
    });

    it("rejects services section exceeding 12 items", () => {
      const items = Array.from({ length: 13 }, (_, i) => ({
        id: `s-item-${i}`,
        name: `Service ${i}`,
      }));
      const section = {
        id: "serv-1",
        type: "services",
        title: "Web Services",
        items,
      };
      expect(ServicesSectionSchema.safeParse(section).success).toBe(false);
    });
  });

  describe("Other section item limits", () => {
    it("rejects gallery with more than 12 images", () => {
      const images = Array.from({ length: 13 }, (_, i) => ({
        assetId: `asset_img_${i}`,
        alt: `Alt ${i}`,
      }));
      const doc = {
        ...validMinimalDoc,
        sections: [
          {
            id: "gal-1",
            type: "gallery",
            title: "Our Gallery",
            images,
          },
        ],
      };
      expect(SiteDocumentSchema.safeParse(doc).success).toBe(false);
    });

    it("rejects testimonials with more than 8 items", () => {
      const items = Array.from({ length: 9 }, (_, i) => ({
        id: `t-${i}`,
        quote: "Great service!",
        author: `Client ${i}`,
      }));
      const doc = {
        ...validMinimalDoc,
        sections: [
          {
            id: "test-1",
            type: "testimonials",
            title: "Testimonials",
            items,
          },
        ],
      };
      expect(SiteDocumentSchema.safeParse(doc).success).toBe(false);
    });

    it("rejects FAQ with more than 10 items", () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        id: `f-${i}`,
        question: `Question ${i}?`,
        answer: `Answer ${i}`,
      }));
      const doc = {
        ...validMinimalDoc,
        sections: [
          {
            id: "faq-1",
            type: "faq",
            title: "FAQ",
            items,
          },
        ],
      };
      expect(SiteDocumentSchema.safeParse(doc).success).toBe(false);
    });
  });
});
