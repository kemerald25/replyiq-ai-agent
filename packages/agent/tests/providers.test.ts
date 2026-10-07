import { describe, it, expect, vi, afterEach } from "vitest";
import { WorkersAIProvider } from "../src/providers/workers-ai-provider.js";
import { GeminiProvider } from "../src/providers/gemini-provider.js";

describe("Model Providers (WorkersAIProvider & GeminiProvider)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("WorkersAIProvider", () => {
    it("throws when neither aiBinding, accountId, nor gatewayUrl is provided for REST", async () => {
      const provider = new WorkersAIProvider({});
      await expect(
        provider.generate({
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("WorkersAIProvider requires either an AI binding");
    });

    it("generates using direct Cloudflare AI binding", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({
          response: "Website updated successfully",
          usage: { prompt_tokens: 50, completion_tokens: 20 },
        }),
      };

      const provider = new WorkersAIProvider({ aiBinding: mockAi });
      const res = await provider.generate({
        messages: [{ role: "user", content: "Change price" }],
      });

      expect(mockAi.run).toHaveBeenCalledTimes(1);
      expect(res.text).toBe("Website updated successfully");
      expect(res.usage.inputTokens).toBe(50);
      expect(res.usage.outputTokens).toBe(20);
      expect(res.usage.estimatedNeurons).toBeGreaterThan(0);
    });

    it("generates using Cloudflare REST endpoint with bearer token and tool calls", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            text: "Calling tool",
            tool_calls: [
              {
                id: "call_1",
                name: "edit_site",
                arguments: JSON.stringify({ summary: "Updated heading" }),
              },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 40 },
          },
        }),
      }) as any;

      const provider = new WorkersAIProvider({
        accountId: "test-acc-123",
        apiToken: "test-token-xyz",
      });

      const res = await provider.generate({
        messages: [{ role: "user", content: "Update heading" }],
        tools: [
          {
            name: "edit_site",
            description: "Edit website",
            parameters: { type: "object", properties: {} },
          },
        ],
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.cloudflare.com/client/v4/accounts/test-acc-123/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-xyz",
          }),
        })
      );

      expect(res.toolCalls).toHaveLength(1);
      expect(res.toolCalls?.[0]?.name).toBe("edit_site");
      expect(res.toolCalls?.[0]?.arguments).toEqual({ summary: "Updated heading" });
    });

    it("throws when REST endpoint returns non-200 error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      }) as any;

      const provider = new WorkersAIProvider({
        accountId: "test-acc",
        apiToken: "test-tok",
      });

      await expect(
        provider.generate({
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("Workers AI request failed [500]: Internal server error");
    });
  });

  describe("GeminiProvider", () => {
    it("throws when GEMINI_API_KEY is missing", async () => {
      const provider = new GeminiProvider({});
      await expect(
        provider.generate({
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("GeminiProvider requires a GEMINI_API_KEY");
    });

    it("generates using Gemini REST endpoint with tools and candidate parsing", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Here is your update" },
                  {
                    functionCall: {
                      name: "ask_clarification",
                      args: { question: "Which color?" },
                    },
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 120,
            candidatesTokenCount: 45,
          },
        }),
      }) as any;

      const provider = new GeminiProvider({
        apiKey: "test-gemini-key",
      });

      const res = await provider.generate({
        messages: [
          { role: "system", content: "You are ReplyIQ agent." },
          { role: "user", content: "Change color" },
        ],
        tools: [
          {
            name: "ask_clarification",
            description: "Ask clarification",
            parameters: { type: "object", properties: {} },
          },
        ],
      });

      expect(res.text).toBe("Here is your update");
      expect(res.toolCalls).toHaveLength(1);
      expect(res.toolCalls?.[0]?.name).toBe("ask_clarification");
      expect(res.toolCalls?.[0]?.arguments).toEqual({ question: "Which color?" });
      expect(res.usage.estimatedNeurons).toBe(0); // Gemini consumes 0 Cloudflare neurons
    });

    it("throws when Gemini API returns non-200 error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "API key expired",
      }) as any;

      const provider = new GeminiProvider({
        apiKey: "expired-key",
      });

      await expect(
        provider.generate({
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("Gemini API request failed [403]: API key expired");
    });

    it("identifies rate limit and quota exhaustion errors", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "RESOURCE_EXHAUSTED: Quota exceeded",
      }) as any;

      const provider = new GeminiProvider({ apiKey: "key-123" });
      try {
        await provider.generate({ messages: [{ role: "user", content: "Hi" }] });
        expect.unreachable();
      } catch (err: any) {
        expect(err.isQuotaExceeded).toBe(true);
        expect(err.isRateLimit).toBe(true);
      }
    });

    it("handles Gemini timeout error", async () => {
      const timeoutErr = new Error("The operation timed out");
      timeoutErr.name = "TimeoutError";
      globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

      const provider = new GeminiProvider({ apiKey: "key-123" });
      await expect(
        provider.generate({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow(/timed out/);
    });

    it("handles Gemini response without usageMetadata and empty parts", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Hello" }] } }],
        }),
      }) as any;

      const provider = new GeminiProvider({ apiKey: "key-123" });
      const res = await provider.generate({ messages: [{ role: "user", content: "Hi" }] });
      expect(res.text).toBe("Hello");
      expect(res.usage.inputTokens).toBe(200);
    });
  });

  describe("WorkersAIProvider additional branches", () => {
    it("uses gatewayUrl when provided", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { response: "ok" },
        }),
      }) as any;

      const provider = new WorkersAIProvider({
        gatewayUrl: "https://gateway.ai.cloudflare.com/v1/my-slug/my-gw/workers-ai",
        apiToken: "gw-token",
      });

      const res = await provider.generate({ messages: [{ role: "user", content: "Hi" }] });
      expect(res.text).toBe("ok");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://gateway.ai.cloudflare.com/v1/my-slug/my-gw/workers-ai"),
        expect.anything()
      );
    });

    it("handles Workers AI timeout error", async () => {
      const timeoutErr = new Error("The operation timed out");
      timeoutErr.name = "TimeoutError";
      globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

      const provider = new WorkersAIProvider({
        accountId: "acc",
        apiToken: "tok",
      });

      await expect(
        provider.generate({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow(/timed out/);
    });

    it("handles unparseable tool call arguments safely", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            tool_calls: [
              {
                id: "call_bad",
                name: "do_something",
                arguments: "invalid json {",
              },
            ],
          },
        }),
      }) as any;

      const provider = new WorkersAIProvider({
        accountId: "acc",
        apiToken: "tok",
      });

      const res = await provider.generate({ messages: [{ role: "user", content: "Hi" }] });
      expect(res.toolCalls?.[0]?.arguments).toEqual({});
    });
  });
});

