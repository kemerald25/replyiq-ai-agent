import {
  ModelProvider,
  ModelGenerationOptions,
  ModelGenerationResult,
  ModelToolCall,
} from "../contracts/provider.js";
import { calculateNeuronUsage } from "../budget/pricing.js";

interface WorkersAiToolCall {
  id?: string;
  name?: string;
  function?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
  arguments?: string | Record<string, unknown>;
}

interface WorkersAiRawResponse {
  response?: string;
  text?: string;
  tool_calls?: WorkersAiToolCall[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface WorkersAIProviderConfig {
  accountId?: string;
  apiToken?: string;
  model?: string;
  gatewayUrl?: string; // Optional Cloudflare AI Gateway endpoint
  aiBinding?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  timeoutMs?: number;
}

export class WorkersAIProvider implements ModelProvider {
  readonly providerName = "workers-ai";
  private model: string;
  private accountId?: string;
  private apiToken?: string;
  private gatewayUrl?: string;
  private aiBinding?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  private timeoutMs: number;

  constructor(config: WorkersAIProviderConfig = {}) {
    this.model = config.model || "@cf/meta/llama-3.1-8b-instruct-fp8";
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.gatewayUrl = config.gatewayUrl;
    this.aiBinding = config.aiBinding;
    this.timeoutMs = config.timeoutMs ?? 20_000;
  }

  async generate(options: ModelGenerationOptions): Promise<ModelGenerationResult> {
    const formattedTools = options.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const inputPayload = {
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: formattedTools,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1024,
    };

    let rawResponse: WorkersAiRawResponse;

    // 1. Direct Workers AI binding if running inside Cloudflare Worker
    if (this.aiBinding) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Workers AI binding timed out after ${this.timeoutMs}ms`)), this.timeoutMs);
      });
      try {
        rawResponse = (await Promise.race([
          this.aiBinding.run(this.model, inputPayload),
          timeoutPromise,
        ])) as WorkersAiRawResponse;
      } finally {
        clearTimeout(timer);
      }
    } else {
      // 2. HTTP REST invocation (runs on Node CLI, eval runner, or external caller)
      let endpoint: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.gatewayUrl) {
        endpoint = `${this.gatewayUrl}/${this.model}`;
      } else if (this.accountId) {
        endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
      } else {
        throw new Error(
          "WorkersAIProvider requires either an AI binding, an accountId with apiToken, or a gatewayUrl."
        );
      }

      if (this.apiToken) {
        headers["Authorization"] = `Bearer ${this.apiToken}`;
      }

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(inputPayload),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (fetchErr: unknown) {
        const err = fetchErr as Error;
        if (err.name === "TimeoutError" || err.message?.includes("timed out")) {
          const timeoutErr = new Error(`Workers AI request timed out after ${this.timeoutMs}ms`);
          (timeoutErr as Error & { isTimeout?: boolean }).isTimeout = true;
          throw timeoutErr;
        }
        throw fetchErr;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Workers AI request failed [${res.status}]: ${errorText}`);
      }

      const json = (await res.json()) as { result?: WorkersAiRawResponse } & WorkersAiRawResponse;
      rawResponse = json.result || json;
    }

    // Parse text and tool calls from response
    const text = rawResponse.response || rawResponse.text || "";
    const toolCalls: ModelToolCall[] = [];

    if (Array.isArray(rawResponse.tool_calls)) {
      for (let i = 0; i < rawResponse.tool_calls.length; i++) {
        const tc = rawResponse.tool_calls[i];
        if (!tc) continue;
        const fnName = tc.name || tc.function?.name;
        let fnArgs = tc.arguments || tc.function?.arguments;
        if (typeof fnArgs === "string") {
          try {
            fnArgs = JSON.parse(fnArgs);
          } catch {
            fnArgs = {};
          }
        }
        if (fnName) {
          toolCalls.push({
            id: tc.id || `call_${i + 1}`,
            name: fnName,
            arguments: (fnArgs as Record<string, unknown>) || {},
          });
        }
      }
    }

    // Estimate token usage if not provided by backend
    const inputTokens = rawResponse.usage?.prompt_tokens ?? Math.ceil(JSON.stringify(options.messages).length / 4);
    const outputTokens = rawResponse.usage?.completion_tokens ?? Math.ceil(text.length / 4);
    const estimatedNeurons = calculateNeuronUsage(this.model, inputTokens, outputTokens);

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens,
        outputTokens,
        estimatedNeurons,
      },
      modelName: this.model,
    };
  }
}
