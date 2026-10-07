import {
  ModelProvider,
  ModelGenerationOptions,
  ModelGenerationResult,
  ModelToolCall,
} from "../contracts/provider.js";

export interface GeminiProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class GeminiProvider implements ModelProvider {
  readonly providerName = "gemini";
  private apiKey?: string;
  private model: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey;
    this.model =
      config.model ||
      (typeof process !== "undefined" && process.env?.GEMINI_MODEL) ||
      "gemini-2.5-flash";
    this.baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  async generate(options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    if (!this.apiKey) {
      throw new Error("GeminiProvider requires a GEMINI_API_KEY.");
    }

    const systemMsg = options.messages.find((m) => m.role === "system");
    const chatMsgs = options.messages.filter((m) => m.role !== "system");

    const contents = chatMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const functionDeclarations = options.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 1024,
      },
    };

    if (systemMsg) {
      payload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (functionDeclarations && functionDeclarations.length > 0) {
      payload.tools = [{ functionDeclarations }];
    }

    const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (fetchErr: unknown) {
      const err = fetchErr as Error;
      if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
        const timeoutErr = new Error(`Gemini API request timed out after ${this.timeoutMs}ms`);
        (timeoutErr as Error & { isTimeout?: boolean }).isTimeout = true;
        throw timeoutErr;
      }
      throw fetchErr;
    }

    if (!res.ok) {
      const errorText = await res.text();
      const isQuotaOrRateLimit =
        res.status === 429 ||
        errorText.includes("RESOURCE_EXHAUSTED") ||
        errorText.toLowerCase().includes("quota");

      const error = new Error(`Gemini API request failed [${res.status}]: ${errorText}`);
      if (isQuotaOrRateLimit) {
        (error as Error & { isRateLimit?: boolean; isQuotaExceeded?: boolean }).isRateLimit = true;
        (error as Error & { isRateLimit?: boolean; isQuotaExceeded?: boolean }).isQuotaExceeded = true;
      }
      throw error;
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            functionCall?: { name: string; args: Record<string, unknown> };
          }>;
        };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let text = "";
    const toolCalls: ModelToolCall[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (part.text) {
        text += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini_call_${i + 1}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const inputTokens = json.usageMetadata?.promptTokenCount ?? 200;
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 50;

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens,
        outputTokens,
        estimatedNeurons: 0, // Gemini uses its own free tier, 0 Cloudflare neurons consumed
      },
      modelName: this.model,
    };
  }
}
