import { AgentResponse, MediaReference } from "@replyiq/agent";
import { signBridgeRequest } from "./signer.js";

export interface BridgeClientConfig {
  baseUrl: string;
  secret: string;
  gatewayVersion?: string;
  timeoutMs?: number;
}

export class BridgeClientError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "BridgeClientError";
  }
}

export class AgentBridgeClient {
  private baseUrl: string;
  private secret: string;
  private gatewayVersion: string;
  private timeoutMs: number;

  constructor(config: BridgeClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.secret = config.secret;
    this.gatewayVersion = config.gatewayVersion || "1.0.0";
    this.timeoutMs = config.timeoutMs ?? 45_000;
  }

  private async fetchWithAuth(path: string, bodyJson: string): Promise<Response> {
    const method = "POST";
    const timestamp = Date.now();
    const signature = await signBridgeRequest({
      secret: this.secret,
      method,
      path,
      timestamp,
      body: bodyJson,
    });

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-ReplyIQ-Timestamp": timestamp.toString(),
          "X-ReplyIQ-Signature": signature,
        },
        body: bodyJson,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendMessage(payload: {
    ownerKey: string;
    messageId: string;
    text: string;
    mediaReferences?: MediaReference[];
    channel?: string;
    timestamp?: number;
  }): Promise<AgentResponse> {
    const body = JSON.stringify(payload);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await this.fetchWithAuth("/v1/message", body);
        if (res.status === 200) {
          return (await res.json()) as AgentResponse;
        }

        const errText = await res.text();
        if (res.status >= 500 && attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempts * 500));
          continue;
        }
        throw new BridgeClientError(`Agent returned status ${res.status}: ${errText}`, res.status);
      } catch (err: unknown) {
        if (err instanceof BridgeClientError) throw err;
        if (attempts >= maxAttempts) {
          throw new BridgeClientError(
            `Failed to communicate with Agent Worker after ${maxAttempts} attempts: ${(err as Error)?.message}`
          );
        }
        await new Promise((r) => setTimeout(r, attempts * 500));
      }
    }

    throw new BridgeClientError("Unreachable agent worker");
  }

  async uploadAsset(
    ownerKey: string,
    dataBase64: string
  ): Promise<{
    assetId: string;
    hash: string;
    width: number;
    height: number;
    mimeType: string;
  }> {
    const body = JSON.stringify({ ownerKey, data: dataBase64 });
    const res = await this.fetchWithAuth("/v1/assets", body);

    if (res.status !== 200) {
      const errText = await res.text();
      throw new BridgeClientError(`Asset upload failed (${res.status}): ${errText}`, res.status);
    }

    return (await res.json()) as {
      assetId: string;
      hash: string;
      width: number;
      height: number;
      mimeType: string;
    };
  }

  async sendHeartbeat(transportState: string): Promise<boolean> {
    try {
      const body = JSON.stringify({
        gatewayVersion: this.gatewayVersion,
        transportState,
        lastSeen: Date.now(),
      });
      const res = await this.fetchWithAuth("/v1/heartbeat", body);
      return res.status === 200;
    } catch {
      return false;
    }
  }
}
