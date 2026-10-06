# @replyiq/schema

Canonical `SiteDocument` schema, validation rules, AI edit operations, and migrations for ReplyIQ.

---

## Architecture Principles

1. **AI Edits Content JSON Only**: The AI agent never touches or generates HTML or CSS templates. It only mutates the `SiteDocument` JSON using strongly-typed atomic operations.
2. **Deterministic Validation**: Every string, URL, image asset, section, and subdomain slug is strictly validated using Zod.
3. **Immutability & Atomicity**: The `applyOperations` function never mutates the input document. If any single operation in a batch fails, the entire transaction is rolled back cleanly.
4. **Single Domain Configuration**: The base domain for user sites is defined in `src/config.ts` (`BASE_DOMAIN = "replyiq.cv"`) and is never hardcoded.
5. **Template Association**: `SiteDocument.template` selects a registered template identifier (defaults to `"portfolio"`). Rendering packages consume this field to map documents to audited static layouts.

---

## How to Add a New Section Type

Adding a new section type is a **one-file change** in `src/sections/registry.ts`:

1. Open `packages/schema/src/sections/registry.ts`.
2. Define the schema for the new section using `z.object({ ... })`. It must include:
   - `id: SectionIdSchema`
   - `type: z.literal("your_new_type")`
   - Validated fields using `safeTextSchema`, `ImageAssetSchema`, `SafeUrlSchema`, etc.
   ```ts
   export const PricingSectionSchema = z.object({
     id: SectionIdSchema,
     type: z.literal("pricing"),
     title: safeTextSchema({ minLength: 1, maxLength: 100, allowMultiline: false }),
     tiers: z.array(PricingTierSchema).min(1).max(4),
   });
   export type PricingSection = z.infer<typeof PricingSectionSchema>;
   ```
3. Add the schema to the `sectionSchemas` map in the same file:
   ```ts
   export const sectionSchemas = {
     hero: HeroSectionSchema,
     // ...
     pricing: PricingSectionSchema,
   } as const;
   ```
4. Add the schema to the `SectionSchema` discriminated union array:
   ```ts
   export const SectionSchema = z.discriminatedUnion("type", [
     HeroSectionSchema,
     // ...
     PricingSectionSchema,
   ]);
   ```

Because `SectionSchema` and `sectionSchemas` are used dynamically by `SiteDocumentSchema`, `applyOperations`, and `validateSectionUpdate`, the new section type is immediately:

- Inferred in the `Section` TypeScript union.
- Supported in `SiteDocument.sections`.
- Supported by `add_section` and `update_section` operations.

---

## How to Add a New Edit Operation

Adding a new operation requires two simple steps:

1. **Define the Operation Schema** in `src/operations/types.ts`:

   ```ts
   export const ToggleSectionVisibilityOperationSchema = z.object({
     op: z.literal("toggle_visibility"),
     sectionId: SectionIdSchema,
     hidden: z.boolean(),
   });
   export type ToggleSectionVisibilityOperation = z.infer<
     typeof ToggleSectionVisibilityOperationSchema
   >;
   ```

   Add it to the `OperationSchema` discriminated union:

   ```ts
   export const OperationSchema = z.discriminatedUnion("op", [
     // ... existing operations
     ToggleSectionVisibilityOperationSchema,
   ]);
   ```

2. **Handle the Operation** in `src/operations/apply.ts`:
   Add a case to the `switch (op.op)` statement:
   ```ts
   case "toggle_visibility": {
     const section = working.sections.find((s) => s.id === op.sectionId);
     if (!section) {
       return {
         success: false,
         error: {
           operationIndex: i,
           operationType: op.op,
           message: `Section with ID "${op.sectionId}" not found`,
         },
       };
     }
     // mutate working copy safely
     break;
   }
   ```
   The runner will automatically validate the final document against `SiteDocumentSchema` before returning.
