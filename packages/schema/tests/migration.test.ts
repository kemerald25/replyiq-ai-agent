import { describe, it, expect } from "vitest";
import { Migration, MigrationRunner, migrateDocument } from "../src/migrations/index.js";
import { normalizePhone } from "../src/common/phone.js";
import { validMinimalDoc } from "./document.test.js";

describe("Schema Migration Mechanism", () => {
  // Test fixture: Legacy v0 document representation
  const legacyV0Doc = {
    schemaVersion: 0,
    slug: "chidi-bakery", // was named 'slug' instead of 'subdomain'
    name: "Chidi Bakery", // was named 'name' instead of 'metadata.title'
    about: "Artisanal bread and pastries baked in Lagos",
    phone: "0803 123 4567", // was raw unformatted local string
    sections: [
      {
        id: "hero-1",
        type: "hero",
        heading: "Fresh Bread Daily",
      },
    ],
  };

  // Test fixture: Migration from v0 to canonical v1
  const v0ToV1Migration: Migration = {
    fromVersion: 0,
    toVersion: 1,
    migrate: (raw) => {
      const phoneNorm = normalizePhone(String(raw["phone"] ?? "08030000000"));
      return {
        schemaVersion: 1,
        subdomain: raw["slug"],
        template: "portfolio",
        metadata: {
          title: raw["name"],
          description: raw["about"],
          language: "en",
          locale: "en-NG",
        },
        theme: {
          palette: "lagos-emerald",
          font: "system-sans",
          mode: "light",
        },
        contact: {
          whatsappNumber: phoneNorm.valid ? phoneNorm.e164 : "+2348030000000",
        },
        sections: raw["sections"],
      };
    },
  };

  it("migrates a legacy v0 document to canonical v1 schema", () => {
    const runner = new MigrationRunner([v0ToV1Migration]);
    const result = runner.migrate(legacyV0Doc, 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document.schemaVersion).toBe(1);
      expect(result.document.subdomain).toBe("chidi-bakery");
      expect(result.document.metadata.title).toBe("Chidi Bakery");
      expect(result.document.contact.whatsappNumber).toBe("+2348031234567");
      expect(result.versionsTraversed).toEqual([0, 1]);
    }
  });

  it("returns document as-is when already at target version", () => {
    const runner = new MigrationRunner([v0ToV1Migration]);
    const result = runner.migrate(validMinimalDoc, 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.document.schemaVersion).toBe(1);
      expect(result.versionsTraversed).toEqual([1]);
    }
  });

  it("rejects attempted downgrades", () => {
    const runner = new MigrationRunner([]);
    const docV2 = { ...validMinimalDoc, schemaVersion: 2 };
    const result = runner.migrate(docV2, 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Cannot downgrade document from version 2 to 1");
    }
  });

  it("fails cleanly when migration path is missing", () => {
    const runner = new MigrationRunner([]); // empty runner without v0 -> v1
    const result = runner.migrate(legacyV0Doc, 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No migration path found from version 0 to 1");
    }
  });

  it("fails when migration function throws an exception", () => {
    const failingMigration: Migration = {
      fromVersion: 0,
      toVersion: 1,
      migrate: () => {
        throw new Error("Corrupted payload structure");
      },
    };

    const runner = new MigrationRunner([failingMigration]);
    const result = runner.migrate(legacyV0Doc, 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Corrupted payload structure");
    }
  });

  it("fails when migrated output does not satisfy canonical schema", () => {
    const invalidOutputMigration: Migration = {
      fromVersion: 0,
      toVersion: 1,
      migrate: () => ({
        schemaVersion: 1,
        subdomain: "invalid_subdomain_with_underscores!",
      }),
    };

    const runner = new MigrationRunner([invalidOutputMigration]);
    const result = runner.migrate(legacyV0Doc, 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("failed schema validation");
    }
  });

  it("rejects registering a non-sequential migration", () => {
    const runner = new MigrationRunner();
    expect(() => {
      runner.register({
        fromVersion: 1,
        toVersion: 3, // gap of 2
        migrate: (d) => d,
      });
    }).toThrow(/must transition to fromVersion \+ 1/);
  });

  it("default migrateDocument helper works with current v1 document", () => {
    const result = migrateDocument(validMinimalDoc);
    expect(result.success).toBe(true);
  });

  it("fails when passed a non-object input", () => {
    const res1 = migrateDocument(null);
    expect(res1.success).toBe(false);
    const res2 = migrateDocument("not-an-object");
    expect(res2.success).toBe(false);
  });
});
