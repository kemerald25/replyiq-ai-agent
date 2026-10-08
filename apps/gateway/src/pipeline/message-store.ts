import * as fs from "node:fs/promises";
import * as path from "node:path";

interface StoredEntry {
  id: string;
  timestamp: number;
}

export interface ProcessedMessageStoreOptions {
  maxAgeMs?: number;
  maxEntries?: number;
}

export class ProcessedMessageStore {
  private cache = new Map<string, number>();
  private filePath: string;
  private maxAgeMs: number;
  private maxEntries: number;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(filePath?: string, optionsOrMaxAgeMs?: ProcessedMessageStoreOptions | number) {
    this.filePath = filePath || path.resolve(process.cwd(), ".data/processed-messages.json");
    if (typeof optionsOrMaxAgeMs === "number") {
      this.maxAgeMs = optionsOrMaxAgeMs;
      this.maxEntries = 10_000;
    } else {
      this.maxAgeMs = optionsOrMaxAgeMs?.maxAgeMs ?? 24 * 60 * 60 * 1000;
      this.maxEntries = optionsOrMaxAgeMs?.maxEntries ?? 10_000;
    }
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      let entries: unknown;
      try {
        entries = JSON.parse(content);
      } catch {
        console.warn(`Corrupted processed-messages file at ${this.filePath}; starting fresh.`);
        this.cache.clear();
        return;
      }

      if (!Array.isArray(entries)) {
        console.warn(`Invalid processed-messages format (not an array) at ${this.filePath}; starting fresh.`);
        this.cache.clear();
        return;
      }

      const now = Date.now();
      this.cache.clear();

      for (const entry of entries) {
        if (
          entry &&
          typeof entry === "object" &&
          typeof (entry as StoredEntry).id === "string" &&
          typeof (entry as StoredEntry).timestamp === "number"
        ) {
          const item = entry as StoredEntry;
          if (now - item.timestamp < this.maxAgeMs) {
            this.cache.set(item.id, item.timestamp);
          }
        }
      }

      this.pruneToCap();
    } catch {
      // File does not exist yet (ENOENT) or read error, start fresh cleanly
      this.cache.clear();
    }
  }

  has(messageId: string): boolean {
    return this.cache.has(messageId);
  }

  async add(messageId: string): Promise<void> {
    this.cache.set(messageId, Date.now());
    this.pruneToCap();
    this.scheduleSave();
  }

  private pruneToCap(): void {
    if (this.cache.size <= this.maxEntries) {
      return;
    }

    // Sort by timestamp ascending (oldest first) and delete oldest entries
    const sorted = Array.from(this.cache.entries()).sort((a, b) => a[1] - b[1]);
    const excess = this.cache.size - this.maxEntries;
    for (let i = 0; i < excess; i++) {
      const [oldId] = sorted[i]!;
      this.cache.delete(oldId);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(async () => {
      this.saveTimeout = null;
      await this.save();
    }, 500);
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const now = Date.now();
    const entries: StoredEntry[] = [];
    for (const [id, timestamp] of this.cache.entries()) {
      if (now - timestamp < this.maxAgeMs) {
        entries.push({ id, timestamp });
      } else {
        this.cache.delete(id);
      }
    }

    this.pruneToCap();

    // Atomic write: write to temp file then atomic rename
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    try {
      await fs.writeFile(tempPath, JSON.stringify(entries, null, 2), "utf-8");
      await fs.rename(tempPath, this.filePath);
    } catch (err) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore temp file cleanup failure
      }
      console.error("Failed to atomically persist processed messages to disk:", err);
    }
  }
}
