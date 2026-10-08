import { z } from "zod";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
  MAX_SECTIONS_PER_DOCUMENT,
} from "./config.js";
import { safeTextSchema } from "./common/text-safety.js";
import { PhoneNumberSchema } from "./common/phone.js";
import { SubdomainSlugSchema } from "./common/slug.js";
import { ThemeSchema } from "./theme/index.js";
import { SectionSchema } from "./sections/registry.js";

/**
 * Site metadata schema.
 * Text fields are strictly plain text (rejects HTML/scripts/controls).
 */
export const SiteMetadataSchema = z.object({
  title: safeTextSchema({ minLength: 1, maxLength: 70, allowMultiline: false }),
  description: safeTextSchema({ minLength: 1, maxLength: 160, allowMultiline: false }),
  language: z
    .string()
    .trim()
    .regex(
      /^[a-z]{2}(-[A-Z]{2})?$/,
      "Language must be standard ISO code (e.g. 'en', 'yo', 'ig', 'ha')",
    )
    .default(DEFAULT_LANGUAGE),
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, "Locale must be in language-REGION format (e.g. 'en-NG')")
    .default(DEFAULT_LOCALE),
});
export type SiteMetadata = z.infer<typeof SiteMetadataSchema>;

/**
 * Global site contact settings (primary WhatsApp contact for visitor interaction).
 */
export const SiteContactSchema = z.object({
  whatsappNumber: z.literal("").or(PhoneNumberSchema).default(""),
  defaultMessage: safeTextSchema({ minLength: 1, maxLength: 200, allowMultiline: true }).optional(),
});
export type SiteContact = z.infer<typeof SiteContactSchema>;

export const REGISTERED_TEMPLATES = ["portfolio"] as const;
export type TemplateId = (typeof REGISTERED_TEMPLATES)[number];
export const TemplateIdSchema = z.enum(REGISTERED_TEMPLATES).default("portfolio");

/**
 * Complete canonical SiteDocument schema (Version 1).
 */
export const SiteDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    subdomain: SubdomainSlugSchema,
    template: TemplateIdSchema,
    metadata: SiteMetadataSchema,
    theme: ThemeSchema,
    contact: SiteContactSchema,
    sections: z
      .array(SectionSchema)
      .max(
        MAX_SECTIONS_PER_DOCUMENT,
        `Site cannot contain more than ${MAX_SECTIONS_PER_DOCUMENT} sections`,
      ),
  })
  .superRefine((doc, ctx) => {
    // Enforce unique section IDs across the document
    const seenIds = new Set<string>();
    doc.sections.forEach((section, index) => {
      if (seenIds.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections", index, "id"],
          message: `Duplicate section ID "${section.id}". Every section must have a unique ID`,
        });
      }
      seenIds.add(section.id);
    });
  });

export type SiteDocument = z.infer<typeof SiteDocumentSchema>;

/**
 * Validates a document, returning a strongly-typed result or detailed error message.
 */
export function validateSiteDocument(
  raw: unknown,
): { valid: true; document: SiteDocument } | { valid: false; errors: string[] } {
  const result = SiteDocumentSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((i) => {
      const pathStr = i.path.length > 0 ? `[${i.path.join(".")}] ` : "";
      return `${pathStr}${i.message}`;
    });
    return { valid: false, errors };
  }
  return { valid: true, document: result.data };
}
