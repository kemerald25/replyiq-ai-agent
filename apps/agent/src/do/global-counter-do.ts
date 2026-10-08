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
      CREATE TABLE IF NOT EXISTS gateway_heartbeat (
        id TEXT PRIMARY KEY,
        gateway_version TEXT NOT NULL,
        transport_state TEXT NOT NULL,
        last_seen INTEGER NOT NULL
      );
    `);
  }

  async recordHeartbeat(data: { gatewayVersion: string; transportState: string; lastSeen?: number }): Promise<void> {
    const lastSeen = data.lastSeen ?? Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO gateway_heartbeat (id, gateway_version, transport_state, last_seen)
       VALUES ('primary', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         gateway_version = excluded.gateway_version,
         transport_state = excluded.transport_state,
         last_seen = excluded.last_seen`,
      data.gatewayVersion,
      data.transportState,
      lastSeen
    );
  }

  async getHeartbeat(): Promise<{ gatewayVersion: string; transportState: string; lastSeen: number } | null> {
    const cursor = this.ctx.storage.sql.exec(
      `SELECT gateway_version as gatewayVersion, transport_state as transportState, last_seen as lastSeen
       FROM gateway_heartbeat WHERE id = 'primary'`
    );
    const row = cursor.toArray()[0] as { gatewayVersion: string; transportState: string; lastSeen: number } | undefined;
    return row || null;
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
