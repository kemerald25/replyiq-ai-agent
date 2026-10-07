import { DurableObject } from "cloudflare:workers";

export class GlobalCounterDO extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS global_daily_neurons (
        date_key TEXT PRIMARY KEY,
        neurons REAL NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  async getDailyNeurons(dateKey: string): Promise<number> {
    const cursor = this.ctx.storage.sql.exec(
      `SELECT neurons FROM global_daily_neurons WHERE date_key = ?`,
      dateKey
    );
    const row = cursor.toArray()[0] as { neurons: number } | undefined;
    return row ? row.neurons : 0;
  }

  async incrementDailyNeurons(dateKey: string, neurons: number): Promise<number> {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO global_daily_neurons (date_key, neurons, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date_key) DO UPDATE SET
         neurons = neurons + excluded.neurons,
         updated_at = excluded.updated_at`,
      dateKey,
      neurons,
      now
    );

    return this.getDailyNeurons(dateKey);
  }
}
