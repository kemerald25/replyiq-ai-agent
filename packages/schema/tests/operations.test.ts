import { describe, it, expect } from "vitest";
import { applyOperations } from "../src/operations/apply.js";
import { Operation } from "../src/operations/types.js";
import { SiteDocument } from "../src/document.js";
import { validateSectionUpdate } from "../src/sections/registry.js";
import { validMinimalDoc } from "./document.test.js";

describe("AI Edit Operations & Atomicity", () => {
  it("enforces maximum limit of 20 operations per batch", () => {
    const ops: Operation[] = Array.from({ length: 21 }, () => ({
      op: "set_metadata",
      metadata: { title: "Updated" },
    }));

    const result = applyOperations(validMinimalDoc, ops);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Batch exceeds maximum limit of 20 operations");
    }
  });

  it("never mutates the input document", () => {
    const docCopy = structuredClone(validMinimalDoc);
    const ops: Operation[] = [
      {
        op: "set_metadata",
        metadata: { title: "New Mutated Title" },
      },
    ];

    const result = applyOperations(validMinimalDoc, ops);
    expect(result.success).toBe(true);
    // Original input object must remain completely untouched
    expect(validMinimalDoc.metadata.title).toBe(docCopy.metadata.title);
  });

  it("enforces atomic failure: a failed operation leaves document unchanged", () => {
    const ops: Operation[] = [
      // Op 0: Valid change
      {
        op: "set_metadata",
        metadata: { title: "Brand New Title" },
      },
      // Op 1: Invalid - removing non-existent section
      {
        op: "remove_section",
        sectionId: "non-existent-section-id",
      },
      // Op 2: Valid change
      {
        op: "update_contact",
        contact: { defaultMessage: "Hello" },
      },
    ];

    const result = applyOperations(validMinimalDoc, ops);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.operationIndex).toBe(1);
      expect(result.error.operationType).toBe("remove_section");
      expect(result.error.message).toContain('Section with ID "non-existent-section-id" not found');
    }
    // Verify validMinimalDoc is still completely unmodified
    expect(validMinimalDoc.metadata.title).toBe("Chidi Bakery Lagos");
  });

  describe("Operation: set_metadata", () => {
    it("updates metadata fields partially", () => {
      const ops: Operation[] = [
        {
          op: "set_metadata",
          metadata: {
            title: "Updated Title",
            description: "Updated description for bakery.",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.metadata.title).toBe("Updated Title");
        expect(res.document.metadata.description).toBe("Updated description for bakery.");
        expect(res.document.metadata.language).toBe(validMinimalDoc.metadata.language);
      }
    });
  });

  describe("Operation: update_theme", () => {
    it("updates palette and font from allowlist", () => {
      const ops: Operation[] = [
        {
          op: "update_theme",
          theme: {
            palette: "sunset-amber",
            font: "outfit",
            mode: "dark",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.theme.palette).toBe("sunset-amber");
        expect(res.document.theme.font).toBe("outfit");
        expect(res.document.theme.mode).toBe("dark");
      }
    });

    it("updates custom palette tokens", () => {
      const ops: Operation[] = [
        {
          op: "update_theme",
          theme: {
            tokens: {
              primary: "#123456",
              secondary: "#654321",
              background: "#ffffff",
              surface: "#f0f0f0",
              text: "#000000",
              muted: "#888888",
            },
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.theme.tokens?.primary).toBe("#123456");
      }
    });

    it("rejects invalid font or palette in theme update", () => {
      const ops: Operation[] = [
        {
          op: "update_theme",
          theme: {
            // @ts-expect-error Testing invalid runtime input
            font: "comic-sans",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
    });
  });

  describe("Operation: update_contact", () => {
    it("updates whatsappNumber and normalizes it", () => {
      const ops: Operation[] = [
        {
          op: "update_contact",
          contact: {
            whatsappNumber: "07012345678",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.contact.whatsappNumber).toBe("+2347012345678");
      }
    });
  });

  describe("Operation: add_section", () => {
    it("adds a section with auto-generated unique ID", () => {
      const ops: Operation[] = [
        {
          op: "add_section",
          // @ts-expect-error ID omitted to test auto-generation
          section: {
            type: "about",
            title: "About Our Bakery",
            content: "We make fresh bread every morning in Yaba.",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.sections.length).toBe(2);
        const added = res.document.sections[1];
        expect(added?.type).toBe("about");
        expect(added?.id).toBe("about-1");
      }
    });

    it("rejects add_section with invalid section data", () => {
      const ops: Operation[] = [
        {
          op: "add_section",
          section: {
            id: "bad-hero",
            type: "hero",
            // missing heading
          } as unknown as import("../src/sections/registry.js").Section,
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("Invalid section data");
      }
    });

    it("adds a section at a specific index", () => {
      const ops: Operation[] = [
        {
          op: "add_section",
          index: 0,
          section: {
            id: "custom-about",
            type: "about",
            title: "About First",
            content: "Content",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.sections[0]?.id).toBe("custom-about");
        expect(res.document.sections[1]?.id).toBe("hero-1");
      }
    });

    it("rejects insert index out of bounds", () => {
      const ops: Operation[] = [
        {
          op: "add_section",
          index: 99,
          section: {
            id: "bad-index-sec",
            type: "about",
            title: "Title",
            content: "Content",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("out of range");
      }
    });

    it("rejects duplicate section ID on add_section", () => {
      const ops: Operation[] = [
        {
          op: "add_section",
          section: {
            id: "hero-1", // Already exists
            type: "hero",
            heading: "Another Hero",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain('Section with ID "hero-1" already exists');
      }
    });

    it("rejects adding sections beyond max 20", () => {
      const docWith20: SiteDocument = {
        ...validMinimalDoc,
        sections: Array.from({ length: 20 }, (_, i) => ({
          id: `s-${i}`,
          type: "hero" as const,
          heading: `Heading ${i}`,
        })),
      };

      const ops: Operation[] = [
        {
          op: "add_section",
          section: {
            id: "s-extra",
            type: "hero",
            heading: "Extra Heading",
          },
        },
      ];

      const res = applyOperations(docWith20, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("maximum of 20 sections");
      }
    });
  });

  describe("Operation: remove_section", () => {
    it("removes a section by ID", () => {
      const ops: Operation[] = [
        {
          op: "remove_section",
          sectionId: "hero-1",
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.sections.length).toBe(0);
      }
    });

    it("fails when sectionId does not exist", () => {
      const ops: Operation[] = [
        {
          op: "remove_section",
          sectionId: "missing-id",
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain('Section with ID "missing-id" not found');
      }
    });
  });

  describe("Operation: update_section", () => {
    it("partially updates a section and validates against that section's schema", () => {
      const ops: Operation[] = [
        {
          op: "update_section",
          sectionId: "hero-1",
          updates: {
            heading: "Brand New Fresh Hero Heading",
            subheading: "Updated subheading text",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        const updated = res.document.sections[0];
        if (updated?.type === "hero") {
          expect(updated.heading).toBe("Brand New Fresh Hero Heading");
          expect(updated.subheading).toBe("Updated subheading text");
        }
      }
    });

    it("strictly forbids changing a section's id", () => {
      const ops: Operation[] = [
        {
          op: "update_section",
          sectionId: "hero-1",
          updates: {
            id: "hero-changed-id",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("update_section must never change a section's id");
      }
    });

    it("strictly forbids changing a section's type", () => {
      const ops: Operation[] = [
        {
          op: "update_section",
          sectionId: "hero-1",
          updates: {
            type: "about",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("update_section must never change a section's type");
      }
    });

    it("rejects invalid partial field content (e.g. tag-like HTML in heading)", () => {
      const ops: Operation[] = [
        {
          op: "update_section",
          sectionId: "hero-1",
          updates: {
            heading: "<script>alert(1)</script>",
          },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("HTML tags or tag-like patterns");
      }
    });

    it("fails when updating a non-existent section ID", () => {
      const ops: Operation[] = [
        {
          op: "update_section",
          sectionId: "non-existent",
          updates: { heading: "Test" },
        },
      ];

      const res = applyOperations(validMinimalDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain('Section with ID "non-existent" not found');
      }
    });

    it("rejects non-object or array updates directly in validateSectionUpdate", () => {
      const heroSec = validMinimalDoc.sections[0]!;
      const res1 = validateSectionUpdate(heroSec, null as unknown as Record<string, unknown>);
      expect(res1.valid).toBe(false);

      const res2 = validateSectionUpdate(
        {
          ...heroSec,
          type: "non_existent_type",
        } as unknown as import("../src/sections/registry.js").Section,
        { heading: "Test" },
      );
      expect(res2.valid).toBe(false);
    });
  });

  describe("Operation: reorder_sections", () => {
    const multiDoc: SiteDocument = {
      ...validMinimalDoc,
      sections: [
        { id: "sec-1", type: "hero", heading: "Heading 1" },
        { id: "sec-2", type: "about", title: "About", content: "Content" },
        {
          id: "sec-3",
          type: "gallery",
          title: "Gallery",
          images: [{ assetId: "asset_pic_1", alt: "Pic" }],
        },
      ],
    };

    it("reorders sections according to given sectionIds array", () => {
      const ops: Operation[] = [
        {
          op: "reorder_sections",
          sectionIds: ["sec-3", "sec-1", "sec-2"],
        },
      ];

      const res = applyOperations(multiDoc, ops);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.document.sections.map((s) => s.id)).toEqual(["sec-3", "sec-1", "sec-2"]);
      }
    });

    it("rejects reorder if section count does not match", () => {
      const ops: Operation[] = [
        {
          op: "reorder_sections",
          sectionIds: ["sec-1", "sec-2"], // missing sec-3
        },
      ];

      const res = applyOperations(multiDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("must include all existing section IDs");
      }
    });

    it("rejects reorder containing duplicate IDs", () => {
      const ops: Operation[] = [
        {
          op: "reorder_sections",
          sectionIds: ["sec-1", "sec-1", "sec-2"],
        },
      ];

      const res = applyOperations(multiDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain("duplicate section IDs");
      }
    });

    it("rejects reorder containing unknown IDs", () => {
      const ops: Operation[] = [
        {
          op: "reorder_sections",
          sectionIds: ["sec-1", "sec-2", "unknown-id"],
        },
      ];

      const res = applyOperations(multiDoc, ops);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.message).toContain('Unknown section ID "unknown-id"');
      }
    });
  });
});
