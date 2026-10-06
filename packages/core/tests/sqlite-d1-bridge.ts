import { DatabaseSync } from "node:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { D1DatabaseLike, D1PreparedStatementLike } from "../src/adapters/cloudflare/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a D1DatabaseLike adapter backed by real in-memory SQLite (node:sqlite).
 * Enables running genuine SQL constraints, migrations, and transactions in Vitest.
 */
export interface SqliteD1Database extends D1DatabaseLike {
  raw: DatabaseSync;
}

export function createSqliteD1Database(): SqliteD1Database {
  const db = new DatabaseSync(":memory:");

  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON;");

  function createStatement(sql: string, boundParams: unknown[] = []): D1PreparedStatementLike {
    return {
      bind(...values: unknown[]) {
        return createStatement(sql, values);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const stmt = db.prepare(sql);
        const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] as T) ?? null;
        return row as T;
      },
      async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...boundParams) as T[];
        return { results: rows, success: true };
      },
      async run(): Promise<{ success: boolean; meta?: { changes?: number } }> {
        const stmt = db.prepare(sql);
        const result = stmt.run(...boundParams);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }

  return {
    raw: db,
    prepare(query: string): D1PreparedStatementLike {
      return createStatement(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<Array<{ results?: T[]; success: boolean; meta?: { changes?: number } }>> {
      db.exec("BEGIN TRANSACTION;");
      try {
        const results = [];
        for (const stmt of statements) {
          const res = await stmt.run();
          results.push({ success: res.success, meta: res.meta });
        }
        db.exec("COMMIT;");
        return results;
      } catch (err) {
        db.exec("ROLLBACK;");
        throw err;
      }
    },
  };
}

/**
 * Applies the 0001_initial.sql migration to the target SQLite database.
 */
export function applyInitialMigration(db: SqliteD1Database): void {
  const migrationPath = path.resolve(__dirname, "../migrations/0001_initial.sql");
  const sql = fs.readFileSync(migrationPath, "utf-8");
  db.raw.exec(sql);
}
