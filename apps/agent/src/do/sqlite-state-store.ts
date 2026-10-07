import {
  IOwnerStateStore,
  OwnerState,
  AgentResponse,
  getUtcDateKey,
} from "@replyiq/agent";

export class SqliteOwnerStateStore implements IOwnerStateStore {
  private inMemoryQueue: Promise<void> = Promise.resolve();

  constructor(private sql: SqlStorage) {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS owner_state (
        owner_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS processed_messages (
        message_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        response_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS processing_locks (
        lock_key TEXT PRIMARY KEY,
        message_id TEXT,
        acquired_at INTEGER NOT NULL
      );
    `);
  }

  async getState(ownerId: string): Promise<OwnerState> {
    const cursor = this.sql.exec(`SELECT state_json FROM owner_state WHERE owner_id = ?`, ownerId);
    const row = cursor.toArray()[0] as { state_json: string } | undefined;

    if (row) {
      const state: OwnerState = JSON.parse(row.state_json);
      const today = getUtcDateKey();
      if (state.usage.dateKey !== today) {
        state.usage = {
          dateKey: today,
          messageCount: 0,
          modelCallCount: 0,
          fallbackCallCount: 0,
          totalNeurons: 0,
        };
      }
      return state;
    }

    const newState: OwnerState = {
      ownerId,
      activeProjectId: null,
      conversationState: "IDLE",
      pendingConfirmation: null,
      conversationHistory: [],
      usage: {
        dateKey: getUtcDateKey(),
        messageCount: 0,
        modelCallCount: 0,
        fallbackCallCount: 0,
        totalNeurons: 0,
      },
    };
    await this.saveState(ownerId, newState);
    return newState;
  }

  async saveState(ownerId: string, state: OwnerState): Promise<void> {
    const json = JSON.stringify(state);
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO owner_state (owner_id, state_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         state_json = excluded.state_json,
         updated_at = excluded.updated_at`,
      ownerId,
      json,
      now
    );
  }

  async isMessageProcessed(_ownerId: string, messageId: string): Promise<boolean> {
    const cursor = this.sql.exec(
      `SELECT 1 FROM processed_messages WHERE message_id = ?`,
      messageId
    );
    return cursor.toArray().length > 0;
  }

  async getProcessedResponse(
    _ownerId: string,
    messageId: string
  ): Promise<AgentResponse | null> {
    const cursor = this.sql.exec(
      `SELECT response_json FROM processed_messages WHERE message_id = ?`,
      messageId
    );
    const row = cursor.toArray()[0] as { response_json: string } | undefined;
    return row ? JSON.parse(row.response_json) : null;
  }

  async recordProcessedMessage(
    ownerId: string,
    messageId: string,
    response: AgentResponse
  ): Promise<void> {
    const json = JSON.stringify(response);
    const now = Date.now();
    this.sql.exec(
      `INSERT OR REPLACE INTO processed_messages (message_id, owner_id, response_json, created_at)
       VALUES (?, ?, ?, ?)`,
      messageId,
      ownerId,
      json,
      now
    );
  }

  async acquireLock(ownerId: string): Promise<() => Promise<void>> {
    // 1. In-memory promise chain ensures local sequential serialization
    let releaseQueue: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    const prev = this.inMemoryQueue;
    this.inMemoryQueue = prev.then(() => lockPromise);
    await prev;

    // 2. Persisted SQLite lock marker for crash recovery (cleans locks > 60s lease)
    const now = Date.now();
    const staleThreshold = now - 60_000;
    this.sql.exec(
      `DELETE FROM processing_locks WHERE lock_key = ? AND acquired_at < ?`,
      ownerId,
      staleThreshold
    );

    this.sql.exec(
      `INSERT OR REPLACE INTO processing_locks (lock_key, acquired_at)
       VALUES (?, ?)`,
      ownerId,
      now
    );

    // 3. Heartbeat renewal every 15s to keep the lock active during long operations
    const renewalInterval = setInterval(() => {
      try {
        this.sql.exec(
          `UPDATE processing_locks SET acquired_at = ? WHERE lock_key = ?`,
          Date.now(),
          ownerId
        );
      } catch {
        // Ignored if lock was already removed
      }
    }, 15_000);

    return async () => {
      clearInterval(renewalInterval);
      this.sql.exec(`DELETE FROM processing_locks WHERE lock_key = ?`, ownerId);
      releaseQueue();
    };
  }
}
