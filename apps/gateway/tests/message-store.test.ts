import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ProcessedMessageStore } from "../src/pipeline/message-store.js";

describe("ProcessedMessageStore (Disk Persistence)", () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "replyiq-store-test-"));
    filePath = path.join(tmpDir, "processed.json");
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it("stores and remembers message IDs across reloads", async () => {
    const store1 = new ProcessedMessageStore(filePath);
    await store1.load();

    expect(store1.has("msg_1")).toBe(false);
    await store1.add("msg_1");
    await store1.add("msg_2");
    expect(store1.has("msg_1")).toBe(true);
    expect(store1.has("msg_2")).toBe(true);

    // Force flush to disk
    await store1.save();

    // Create fresh instance simulating restart
    const store2 = new ProcessedMessageStore(filePath);
    await store2.load();
    expect(store2.has("msg_1")).toBe(true);
    expect(store2.has("msg_2")).toBe(true);
    expect(store2.has("msg_3")).toBe(false);
  });

  it("prunes messages older than max age", async () => {
    const store = new ProcessedMessageStore(filePath, 100); // 100ms max age
    await store.load();
    await store.add("msg_quick");

    expect(store.has("msg_quick")).toBe(true);
    await new Promise((r) => setTimeout(r, 150)); // Wait for expiration

    await store.save();
    const storeReload = new ProcessedMessageStore(filePath, 100);
    await storeReload.load();
    expect(storeReload.has("msg_quick")).toBe(false);
  });

  it("tolerates missing file without crashing", async () => {
    const nonExistentPath = path.join(tmpDir, "missing.json");
    const store = new ProcessedMessageStore(nonExistentPath);
    await expect(store.load()).resolves.toBeUndefined();
    expect(store.has("any_id")).toBe(false);
  });

  it("tolerates corrupted or non-array JSON file and starts fresh", async () => {
    // 1. Invalid JSON
    await fs.writeFile(filePath, "{ corrupt json ...", "utf-8");
    const store1 = new ProcessedMessageStore(filePath);
    await store1.load();
    expect(store1.has("any_id")).toBe(false);

    // 2. Valid JSON but not an array
    await fs.writeFile(filePath, JSON.stringify({ notAnArray: true }), "utf-8");
    const store2 = new ProcessedMessageStore(filePath);
    await store2.load();
    expect(store2.has("any_id")).toBe(false);

    // Should still be able to add and save normally afterwards
    await store2.add("msg_fresh");
    await store2.save();
    expect(store2.has("msg_fresh")).toBe(true);
  });

  it("caps size by pruning oldest IDs when exceeding maxEntries", async () => {
    const store = new ProcessedMessageStore(filePath, { maxEntries: 3 });
    await store.load();

    await store.add("msg_old_1");
    await new Promise((r) => setTimeout(r, 10));
    await store.add("msg_old_2");
    await new Promise((r) => setTimeout(r, 10));
    await store.add("msg_mid_3");
    await new Promise((r) => setTimeout(r, 10));
    await store.add("msg_new_4");
    await new Promise((r) => setTimeout(r, 10));
    await store.add("msg_new_5");

    // Cache should immediately be capped to 3 entries
    expect(store.has("msg_old_1")).toBe(false);
    expect(store.has("msg_old_2")).toBe(false);
    expect(store.has("msg_mid_3")).toBe(true);
    expect(store.has("msg_new_4")).toBe(true);
    expect(store.has("msg_new_5")).toBe(true);

    // After atomic save and reload, cap is persisted
    await store.save();
    const reloaded = new ProcessedMessageStore(filePath, { maxEntries: 3 });
    await reloaded.load();

    expect(reloaded.has("msg_old_1")).toBe(false);
    expect(reloaded.has("msg_mid_3")).toBe(true);
    expect(reloaded.has("msg_new_4")).toBe(true);
    expect(reloaded.has("msg_new_5")).toBe(true);
  });
});
