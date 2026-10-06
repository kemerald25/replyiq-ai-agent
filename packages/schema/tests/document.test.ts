import { describe, it, expect } from "vitest";
import { SiteDocumentSchema, validateSiteDocument, SiteDocument } from "../src/document.js";
import { CURRENT_SCHEMA_VERSION, DEFAULT_LANGUAGE, DEFAULT_LOCALE } from "../src/config.js";

export const validMinimalDoc: SiteDocument = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  subdomain: "chidi-bakery",
  template: "portfolio",
  metadata: {
    title: "Chidi Bakery Lagos",
    description: "Artisanal sourdough and pastries freshly baked in Yaba, Lagos.",
    language: DEFAULT_LANGUAGE,
    locale: DEFAULT_LOCALE,
  },
  theme: {
    palette: "lagos-emerald",
    font: "system-sans",
    mode: "light",
  },
  contact: {
    whatsappNumber: "+2348031234567",
    defaultMessage: "Hello! I would like to place an order.",
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      heading: "Fresh Bread Daily",
      subheading: "Handcrafted baked goods delivered across Lagos.",
    },
  ],
};

describe("SiteDocumentSchema", () => {
  it("validates a minimal valid SiteDocument", () => {
    const result = validateSiteDocument(validMinimalDoc);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.document.subdomain).toBe("chidi-bakery");
      expect(result.document.template).toBe("portfolio");
      expect(result.document.schemaVersion).toBe(1);
    }
  });

  it("defaults template to 'portfolio' when omitted", () => {
    const { template: _, ...docWithoutTemplate } = validMinimalDoc;
    const parsed = SiteDocumentSchema.safeParse(docWithoutTemplate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.template).toBe("portfolio");
    }
  });

  it("rejects unregistered template names", () => {
    const badTemplate = { ...validMinimalDoc, template: "unregistered_theme" };
    expect(SiteDocumentSchema.safeParse(badTemplate).success).toBe(false);
  });

  it("validates a document containing all 8 standard section types", () => {
    const fullDoc: SiteDocument = {
      ...validMinimalDoc,
      sections: [
        {
          id: "hero-1",
          type: "hero",
          heading: "Welcome to Our Studio",
          subheading: "Creative design for African brands",
          cta: {
            label: "Chat with Us",
            url: "https://wa.me/2348031234567",
          },
          image: { assetId: "asset_hero_banner", alt: "Studio Banner" },
        },
        {
          id: "about-1",
          type: "about",
          title: "About ReplyIQ Studio",
          content: "We are an independent design studio founded in Lagos in 2024.",
          image: { assetId: "asset_team_photo", alt: "Our Creative Team" },
        },
        {
          id: "services-1",
          type: "services",
          title: "Our Services",
          subtitle: "Tailored creative packages",
          items: [
            {
              id: "item-brand",
              name: "Brand Identity",
              description: "Complete visual identity package",
              price: 150000,
              currency: "NGN",
              priceLabel: "starting from",
            },
          ],
        },
        {
          id: "gallery-1",
          type: "gallery",
          title: "Recent Projects",
          images: [
            { assetId: "asset_proj_1", alt: "Project 1 Showcase" },
            { assetId: "asset_proj_2", alt: "Project 2 Showcase" },
          ],
        },
        {
          id: "testimonials-1",
          type: "testimonials",
          title: "Client Love",
          items: [
            {
              id: "test-1",
              quote: "ReplyIQ helped us launch our online presence within minutes!",
              author: "Amaka Eze",
              roleOrLocation: "Founder, Amaka Hair Lagos",
            },
          ],
        },
        {
          id: "faq-1",
          type: "faq",
          title: "Frequently Asked Questions",
          items: [
            {
              id: "faq-1",
              question: "How do I make an order?",
              answer: "Send us a message on WhatsApp and our team will assist you immediately.",
            },
          ],
        },
        {
          id: "contact-1",
          type: "contact",
          title: "Contact Us",
          description: "Reach out on WhatsApp or visit our studio.",
          whatsappNumber: "+2348031234567",
          email: "hello@replyiq.cv",
          address: "14 Commercial Avenue, Sabo Yaba, Lagos",
          socialLinks: [
            { platform: "instagram", url: "https://instagram.com/replyiq" },
            { platform: "twitter", url: "https://twitter.com/replyiq" },
          ],
        },
        {
          id: "footer-1",
          type: "footer",
          copyrightText: "© 2026 ReplyIQ Studio. All rights reserved.",
          links: [{ label: "Privacy Policy", url: "https://replyiq.cv/privacy" }],
        },
      ],
    };

    const parsed = SiteDocumentSchema.safeParse(fullDoc);
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate section IDs", () => {
    const docWithDuplicates = {
      ...validMinimalDoc,
      sections: [
        {
          id: "section-dup",
          type: "hero",
          heading: "First Hero",
        },
        {
          id: "section-dup",
          type: "about",
          title: "About Us",
          content: "Some content here.",
        },
      ],
    };

    const result = validateSiteDocument(docWithDuplicates);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('Duplicate section ID "section-dup"'))).toBe(
        true,
      );
    }
  });

  it("rejects non-object or malformed input", () => {
    expect(validateSiteDocument(null).valid).toBe(false);
    expect(validateSiteDocument("invalid-string").valid).toBe(false);
    expect(validateSiteDocument([]).valid).toBe(false);
  });

  it("rejects incorrect schemaVersion", () => {
    const wrongVersion = { ...validMinimalDoc, schemaVersion: 2 };
    expect(validateSiteDocument(wrongVersion).valid).toBe(false);
  });
});
