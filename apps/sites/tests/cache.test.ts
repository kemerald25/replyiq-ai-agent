import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEdgeCachedResponse,
  putEdgeCachedResponse,
  purgeEdgeCachedResponse,
} from "../src/cache.js";

describe("Edge Cache Utility", () => {
  let mockMatch: any;
  let mockPut: any;
  let mockDelete: any;

  beforeEach(() => {
    mockMatch = vi.fn();
    mockPut = vi.fn();
    mockDelete = vi.fn();

    vi.stubGlobal("caches", {
      default: {
        match: mockMatch,
        put: mockPut,
        delete: mockDelete,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns cached response on cache hit", async () => {
    const cachedRes = new Response("Cached HTML", { status: 200 });
    mockMatch.mockResolvedValue(cachedRes);

    const result = await getEdgeCachedResponse("https://amaka-luxe.replyiq.cv/");
    expect(result).toBe(cachedRes);
    expect(mockMatch).toHaveBeenCalledWith("https://amaka-luxe.replyiq.cv/");
  });

  it("returns null on cache miss", async () => {
    mockMatch.mockResolvedValue(undefined);

    const result = await getEdgeCachedResponse("https://amaka-luxe.replyiq.cv/");
    expect(result).toBeNull();
  });

  it("puts response in cache with waitUntil support", async () => {
    mockPut.mockResolvedValue(undefined);
    const waitUntilSpy = vi.fn();

    const res = new Response("Live HTML", { status: 200 });
    await putEdgeCachedResponse("https://amaka-luxe.replyiq.cv/", res, waitUntilSpy);

    expect(waitUntilSpy).toHaveBeenCalled();
  });

  it("puts response in cache synchronously if waitUntil is not provided", async () => {
    mockPut.mockResolvedValue(undefined);

    const res = new Response("Live HTML", { status: 200 });
    await putEdgeCachedResponse("https://amaka-luxe.replyiq.cv/", res);

    expect(mockPut).toHaveBeenCalled();
  });

  it("purges cached response", async () => {
    mockDelete.mockResolvedValue(true);

    const purged = await purgeEdgeCachedResponse("https://amaka-luxe.replyiq.cv/");
    expect(purged).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("https://amaka-luxe.replyiq.cv/");
  });

  it("gracefully handles environment without caches.default", async () => {
    vi.unstubAllGlobals();
    // caches is undefined
    const res = await getEdgeCachedResponse("https://amaka-luxe.replyiq.cv/");
    expect(res).toBeNull();

    await putEdgeCachedResponse("https://amaka-luxe.replyiq.cv/", new Response("ok"));

    const purged = await purgeEdgeCachedResponse("https://amaka-luxe.replyiq.cv/");
    expect(purged).toBe(false);
  });

  it("handles exceptions thrown by cache methods gracefully", async () => {
    mockMatch.mockRejectedValue(new Error("Cache read error"));
    expect(await getEdgeCachedResponse("https://amaka-luxe.replyiq.cv/")).toBeNull();

    mockPut.mockRejectedValue(new Error("Cache write error"));
    await expect(putEdgeCachedResponse("https://amaka-luxe.replyiq.cv/", new Response("ok"))).resolves.not.toThrow();

    mockDelete.mockRejectedValue(new Error("Cache delete error"));
    expect(await purgeEdgeCachedResponse("https://amaka-luxe.replyiq.cv/")).toBe(false);
  });
});
