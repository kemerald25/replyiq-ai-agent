import { z } from "zod";
import { ThemeSchema } from "../theme/index.js";
import { SiteMetadataSchema, SiteContactSchema } from "../document.js";
import { SectionSchema, SectionIdSchema } from "../sections/registry.js";

/**
 * Operation to update site metadata (title, description, language, locale).
 */
export const SetMetadataOperationSchema = z.object({
  op: z.literal("set_metadata"),
  metadata: SiteMetadataSchema.partial(),
});
export type SetMetadataOperation = z.infer<typeof SetMetadataOperationSchema>;

/**
 * Operation to update site theme (palette preset, tokens, font, mode).
 */
export const UpdateThemeOperationSchema = z.object({
  op: z.literal("update_theme"),
  theme: ThemeSchema.partial(),
});
export type UpdateThemeOperation = z.infer<typeof UpdateThemeOperationSchema>;

/**
 * Operation to update primary WhatsApp contact information.
 */
export const UpdateContactOperationSchema = z.object({
  op: z.literal("update_contact"),
  contact: SiteContactSchema.partial(),
});
export type UpdateContactOperation = z.infer<typeof UpdateContactOperationSchema>;

/**
 * Operation to add a new section.
 * If section.id is omitted, the system generates a unique id.
 * If index is omitted, appends to the end of sections.
 */
export const AddSectionOperationSchema = z.object({
  op: z.literal("add_section"),
  section: SectionSchema.or(
    z.lazy(() =>
      SectionSchema.and(
        z.object({
          id: SectionIdSchema.optional(),
        }),
      ),
    ),
  ),
  index: z.number().int().nonnegative().optional(),
});
export type AddSectionOperation = z.infer<typeof AddSectionOperationSchema>;

/**
 * Operation to remove a section by ID.
 */
export const RemoveSectionOperationSchema = z.object({
  op: z.literal("remove_section"),
  sectionId: SectionIdSchema,
});
export type RemoveSectionOperation = z.infer<typeof RemoveSectionOperationSchema>;

/**
 * Operation to update content within an existing section.
 * Guarantees that neither `id` nor `type` can be altered.
 */
export const UpdateSectionOperationSchema = z.object({
  op: z.literal("update_section"),
  sectionId: SectionIdSchema,
  updates: z.record(z.unknown()),
});
export type UpdateSectionOperation = z.infer<typeof UpdateSectionOperationSchema>;

/**
 * Operation to reorder sections.
 * Must specify all existing section IDs in the new order.
 */
export const ReorderSectionsOperationSchema = z.object({
  op: z.literal("reorder_sections"),
  sectionIds: z.array(SectionIdSchema),
});
export type ReorderSectionsOperation = z.infer<typeof ReorderSectionsOperationSchema>;

/**
 * Discriminated union of all supported AI edit operations.
 */
export const OperationSchema = z.discriminatedUnion("op", [
  SetMetadataOperationSchema,
  UpdateThemeOperationSchema,
  UpdateContactOperationSchema,
  AddSectionOperationSchema,
  RemoveSectionOperationSchema,
  UpdateSectionOperationSchema,
  ReorderSectionsOperationSchema,
]);

export type Operation = z.infer<typeof OperationSchema>;

/**
 * Structured error details for failed operations.
 */
export interface OperationError {
  operationIndex: number;
  operationType: string;
  message: string;
}

/**
 * Result returned by applyOperations.
 */
export type ApplyOperationsResult =
  | { success: true; document: import("../document.js").SiteDocument }
  | { success: false; error: OperationError };
