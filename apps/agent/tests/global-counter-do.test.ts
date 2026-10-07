/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { GlobalCounterDO } from "../src/do/global-counter-do.js";

function createMockSqlStorage(): SqlStorage {
  const db = new DatabaseSync(":memory:");

  return {
    exec(query: string, ...params: any[]) {
      const trimmed = query.trim();
      if (trimmed.includes("CREATE TABLE")) {
        db.exec(query);
        return {
          toArray: () => [],
        } as any;
      }

      if (trimmed.toUpperCase().startsWith("SELECT")) {
        const stmt = db.prepare(query);
        const rows = stmt.all(...params);
        return {
          toArray: () => rows,
        } as any;
      }

      const stmt = db.prepare(query);
      stmt.run(...params);
      return {
        toArray: () => [],
      } as any;
    },
  } as unknown as SqlStorage;
}

describe("GlobalCounterDO Durable Object", () => {
  let counterDO: GlobalCounterDO;

  beforeEach(() => {
    const mockSql = createMockSqlStorage();
    const mockCtx = {
      storage: {
        sql: mockSql,
      },
    } as unknown as DurableObjectState;

    counterDO = new GlobalCounterDO(mockCtx, {});
  });

  it("returns 0 neurons when date key has no entries", async () => {
    const neurons = await counterDO.getDailyNeurons("2026-10-06");
    expect(neurons).toBe(0);
  });

  it("increments and aggregates daily neuron usage accurately", async () => {
    const res1 = await counterDO.incrementDailyNeurons("2026-10-06", 150.5);
    expect(res1).toBe(150.5);

    const res2 = await counterDO.incrementDailyNeurons("2026-10-06", 200.25);
    expect(res2).toBe(350.75);

    const check = await counterDO.getDailyNeurons("2026-10-06");
    expect(check).toBe(350.75);
  });

  it("isolates neuron counts for different date keys", async () => {
    await counterDO.incrementDailyNeurons("2026-10-06", 500);
    await counterDO.incrementDailyNeurons("2026-10-07", 100);

    expect(await counterDO.getDailyNeurons("2026-10-06")).toBe(500);
    expect(await counterDO.getDailyNeurons("2026-10-07")).toBe(100);
  });
});
