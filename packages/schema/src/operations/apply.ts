import { MAX_OPERATIONS_PER_BATCH, MAX_SECTIONS_PER_DOCUMENT } from "../config.js";
import { SiteDocument, SiteDocumentSchema } from "../document.js";
import { validateSectionUpdate, Section, SectionSchema } from "../sections/registry.js";
import { ApplyOperationsResult, Operation } from "./types.js";

/**
 * Generates a clean, unique ID for a section.
 */
function generateSectionId(type: string, existingIds: Set<string>): string {
  let candidate: string;
  let counter = 1;
  do {
    candidate = `${type}-${counter}`;
    counter++;
  } while (existingIds.has(candidate));
  return candidate;
}

/**
 * Pure, immutable, and atomic operation runner.
 *
 * Rules:
 * 1. Maximum of 20 operations per call.
 * 2. Never mutates the input document.
 * 3. Atomic failure: If ANY operation encounters an error, the entire batch fails
 *    and the original document is preserved.
 * 4. Never returns an invalid document: the final state is re-validated against SiteDocumentSchema.
 */
export function applyOperations(doc: SiteDocument, operations: Operation[]): ApplyOperationsResult {
  if (operations.length > MAX_OPERATIONS_PER_BATCH) {
    return {
      success: false,
      error: {
        operationIndex: -1,
        operationType: "batch",
        message: `Batch exceeds maximum limit of ${MAX_OPERATIONS_PER_BATCH} operations (received ${operations.length})`,
      },
    };
  }

  // Deep clone to ensure input immutability
  const working: SiteDocument = structuredClone(doc);

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (!op) continue;

    switch (op.op) {
      case "set_metadata": {
        const candidateMeta = { ...working.metadata, ...op.metadata };
        working.metadata = candidateMeta;
        break;
      }

      case "update_theme": {
        const candidateTheme = {
          ...working.theme,
          ...op.theme,
          tokens: op.theme.tokens
            ? { ...working.theme.tokens, ...op.theme.tokens }
            : working.theme.tokens,
        };
        working.theme = candidateTheme;
        break;
      }

      case "update_contact": {
        const candidateContact = { ...working.contact, ...op.contact };
        working.contact = candidateContact;
        break;
      }

      case "add_section": {
        if (working.sections.length >= MAX_SECTIONS_PER_DOCUMENT) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: `Cannot add section: document has reached the maximum of ${MAX_SECTIONS_PER_DOCUMENT} sections`,
            },
          };
        }

        const existingIds = new Set(working.sections.map((s) => s.id));
        const rawSection = op.section as Record<string, unknown>;

        // Assign or validate ID
        let sectionId: string;
        if (typeof rawSection["id"] === "string" && rawSection["id"].trim().length > 0) {
          sectionId = rawSection["id"].trim();
          if (existingIds.has(sectionId)) {
            return {
              success: false,
              error: {
                operationIndex: i,
                operationType: op.op,
                message: `Section with ID "${sectionId}" already exists`,
              },
            };
          }
        } else {
          sectionId = generateSectionId(String(rawSection["type"] ?? "section"), existingIds);
        }

        const sectionWithId = { ...rawSection, id: sectionId };
        const parsed = SectionSchema.safeParse(sectionWithId);
        if (!parsed.success) {
          const msg = parsed.error.issues
            .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
            .join("; ");
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: `Invalid section data: ${msg}`,
            },
          };
        }

        const validSection = parsed.data;

        if (op.index !== undefined) {
          if (op.index < 0 || op.index > working.sections.length) {
            return {
              success: false,
              error: {
                operationIndex: i,
                operationType: op.op,
                message: `Insert index ${op.index} out of range (must be 0 to ${working.sections.length})`,
              },
            };
          }
          working.sections.splice(op.index, 0, validSection);
        } else {
          working.sections.push(validSection);
        }
        break;
      }

      case "remove_section": {
        const idx = working.sections.findIndex((s) => s.id === op.sectionId);
        if (idx === -1) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: `Section with ID "${op.sectionId}" not found`,
            },
          };
        }
        working.sections.splice(idx, 1);
        break;
      }

      case "update_section": {
        const existingSection = working.sections.find((s) => s.id === op.sectionId);
        if (!existingSection) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: `Section with ID "${op.sectionId}" not found`,
            },
          };
        }

        const updateResult = validateSectionUpdate(existingSection, op.updates);
        if (!updateResult.valid) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: updateResult.error,
            },
          };
        }

        const idx = working.sections.findIndex((s) => s.id === op.sectionId);
        working.sections[idx] = updateResult.updated;
        break;
      }

      case "reorder_sections": {
        const currentIds = working.sections.map((s) => s.id);
        const incomingIds = op.sectionIds;

        if (incomingIds.length !== currentIds.length) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: `reorder_sections must include all existing section IDs (expected ${currentIds.length}, received ${incomingIds.length})`,
            },
          };
        }

        const currentSet = new Set(currentIds);
        const incomingSet = new Set(incomingIds);

        if (incomingSet.size !== incomingIds.length) {
          return {
            success: false,
            error: {
              operationIndex: i,
              operationType: op.op,
              message: "reorder_sections contains duplicate section IDs",
            },
          };
        }

        for (const id of incomingIds) {
          if (!currentSet.has(id)) {
            return {
              success: false,
              error: {
                operationIndex: i,
                operationType: op.op,
                message: `Unknown section ID "${id}" in reorder_sections`,
              },
            };
          }
        }

        const sectionMap = new Map<string, Section>(working.sections.map((s) => [s.id, s]));
        working.sections = incomingIds.map((id) => sectionMap.get(id)!);
        break;
      }
    }
  }

  // Final document re-validation
  const finalValidation = SiteDocumentSchema.safeParse(working);
  if (!finalValidation.success) {
    const errorDetails = finalValidation.error.issues
      .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
      .join("; ");
    return {
      success: false,
      error: {
        operationIndex: -1,
        operationType: "schema_validation",
        message: `Final document failed schema validation: ${errorDetails}`,
      },
    };
  }

  return {
    success: true,
    document: finalValidation.data,
  };
}
