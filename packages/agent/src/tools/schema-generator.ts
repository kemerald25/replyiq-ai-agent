/**
 * Dynamic JSON Schema generator derived from @replyiq/schema operations.
 * Serves as the single source of truth for the model tool parameters.
 */
export function generateOperationsJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    description: "A typed edit operation to apply to the SiteDocument",
    properties: {
      op: {
        type: "string",
        enum: [
          "set_metadata",
          "update_theme",
          "update_contact",
          "add_section",
          "remove_section",
          "update_section",
          "reorder_sections",
        ],
        description: "The type of operation to perform",
      },
      metadata: {
        type: "object",
        description: "Used with op='set_metadata'. Partial metadata updates.",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          language: { type: "string" },
          locale: { type: "string" },
        },
      },
      theme: {
        type: "object",
        description: "Used with op='update_theme'. Partial theme updates.",
        properties: {
          preset: { type: "string", enum: ["lagos-gold", "abuja-slate", "calabar-mint", "eko-sunset", "heritage-terracotta"] },
          font: { type: "string", enum: ["outfit", "plus-jakarta-sans", "clash-display", "inter", "cabinet-grotesk"] },
          mode: { type: "string", enum: ["light", "dark"] },
          tokens: {
            type: "object",
            properties: {
              primary: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              secondary: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              accent: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              background: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              surface: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              text: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              mutedText: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
            },
          },
        },
      },
      contact: {
        type: "object",
        description: "Used with op='update_contact'. Partial WhatsApp contact updates.",
        properties: {
          whatsappNumber: { type: "string", description: "E.164 phone number" },
          email: { type: "string" },
          instagramHandle: { type: "string" },
          physicalAddress: { type: "string" },
        },
      },
      sectionId: {
        type: "string",
        description: "Used with op='remove_section' or op='update_section'. The ID of the targeted section.",
      },
      updates: {
        type: "object",
        description: "Used with op='update_section'. Key-value updates to the section content fields.",
      },
      section: {
        type: "object",
        description: "Used with op='add_section'. Full section object to add.",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["hero", "about", "services", "gallery", "testimonials", "faq", "contact", "footer"],
          },
        },
        required: ["type"],
      },
      index: {
        type: "integer",
        minimum: 0,
        description: "Used with op='add_section'. Optional index position to insert the section.",
      },
      sectionIds: {
        type: "array",
        items: { type: "string" },
        description: "Used with op='reorder_sections'. Full list of all existing section IDs in the desired order.",
      },
    },
    required: ["op"],
  };
}
