export interface ModelToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ModelToolCall[];
  toolCallId?: string;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  estimatedNeurons: number;
}

export interface ModelGenerationResult {
  text: string;
  toolCalls?: ModelToolCall[];
  usage: UsageStats;
  modelName: string;
}

export interface ModelGenerationOptions {
  messages: ModelMessage[];
  tools?: ModelTool[];
  temperature?: number;
  maxTokens?: number;
}

export interface ModelProvider {
  readonly providerName: string;
  generate(options: ModelGenerationOptions): Promise<ModelGenerationResult>;
}
