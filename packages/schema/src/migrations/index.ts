import { CURRENT_SCHEMA_VERSION } from "../config.js";
import { SiteDocument, SiteDocumentSchema } from "../document.js";

/**
 * Interface representing a version-to-version schema migration step.
 */
export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate: (doc: Record<string, unknown>) => Record<string, unknown>;
}

export type MigrationResult =
  | { success: true; document: SiteDocument; versionsTraversed: number[] }
  | { success: false; error: string };

/**
 * Migration runner that applies versioned transformations sequentially.
 */
export class MigrationRunner {
  private migrations = new Map<number, Migration>();

  constructor(initialMigrations: Migration[] = []) {
    for (const m of initialMigrations) {
      this.register(m);
    }
  }

  /**
   * Registers a migration step.
   */
  register(migration: Migration): void {
    if (migration.toVersion !== migration.fromVersion + 1) {
      throw new Error(
        `Invalid migration: must transition to fromVersion + 1 (from ${migration.fromVersion} to ${migration.toVersion})`,
      );
    }
    this.migrations.set(migration.fromVersion, migration);
  }

  /**
   * Migrates a raw document to the target schema version.
   */
  migrate(rawDoc: unknown, targetVersion: number = CURRENT_SCHEMA_VERSION): MigrationResult {
    if (typeof rawDoc !== "object" || rawDoc === null || Array.isArray(rawDoc)) {
      return { success: false, error: "Document to migrate must be a valid non-null object" };
    }

    const working = { ...(rawDoc as Record<string, unknown>) };
    const versionsTraversed: number[] = [];

    let currentVersion =
      typeof working["schemaVersion"] === "number" ? working["schemaVersion"] : 0;
    versionsTraversed.push(currentVersion);

    if (currentVersion > targetVersion) {
      return {
        success: false,
        error: `Cannot downgrade document from version ${currentVersion} to ${targetVersion}`,
      };
    }

    while (currentVersion < targetVersion) {
      const migration = this.migrations.get(currentVersion);
      if (!migration) {
        return {
          success: false,
          error: `No migration path found from version ${currentVersion} to ${currentVersion + 1}`,
        };
      }

      try {
        const transformed = migration.migrate(working);
        transformed["schemaVersion"] = migration.toVersion;
        Object.assign(working, transformed);
        currentVersion = migration.toVersion;
        versionsTraversed.push(currentVersion);
      } catch (err) {
        return {
          success: false,
          error: `Migration from v${currentVersion} to v${migration.toVersion} failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Validate transformed document against the canonical schema
    const validation = SiteDocumentSchema.safeParse(working);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        success: false,
        error: `Document migrated to v${targetVersion} but failed schema validation: ${issues}`,
      };
    }

    return {
      success: true,
      document: validation.data,
      versionsTraversed,
    };
  }
}

/**
 * Default global migration registry.
 * Starts empty in v1 because v1 is the initial release.
 */
export const defaultMigrationRunner = new MigrationRunner([]);

/**
 * Helper to migrate a document using the default or custom migration runner.
 */
export function migrateDocument(
  rawDoc: unknown,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
  customRunner?: MigrationRunner,
): MigrationResult {
  const runner = customRunner ?? defaultMigrationRunner;
  return runner.migrate(rawDoc, targetVersion);
}
