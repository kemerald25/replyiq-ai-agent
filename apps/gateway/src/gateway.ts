import { MessagingTransport } from "./transport/interface.js";
import { AgentBridgeClient } from "./bridge/client.js";
import { InboundFilter } from "./pipeline/inbound-filter.js";
import { ProcessedMessageStore } from "./pipeline/message-store.js";
import { resolveIdentity } from "./pipeline/identity-resolver.js";
import { processImageMedia } from "./media/processor.js";
import { sendPacedReplies } from "./pipeline/reply-pacer.js";
import { HealthServer } from "./server/health-server.js";
import { MediaReference } from "@replyiq/agent";

export interface GatewayServiceConfig {
  transport: MessagingTransport;
  bridgeClient: AgentBridgeClient;
  messageStore?: ProcessedMessageStore;
  inboundFilter?: InboundFilter;
  healthHost?: string;
  healthPort?: number;
  heartbeatIntervalMs?: number;
  skipPacerDelaysForTests?: boolean;
}

export class GatewayService {
  public transport: MessagingTransport;
  public bridgeClient: AgentBridgeClient;
  public messageStore: ProcessedMessageStore;
  public inboundFilter: InboundFilter;
  private healthServer: HealthServer;
  private heartbeatIntervalMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatTime: number | null = null;
  private skipPacerDelaysForTests: boolean;

  constructor(config: GatewayServiceConfig) {
    this.transport = config.transport;
    this.bridgeClient = config.bridgeClient;
    this.messageStore = config.messageStore || new ProcessedMessageStore();
    this.inboundFilter = config.inboundFilter || new InboundFilter();
    this.heartbeatIntervalMs = config.heartbeatIntervalMs ?? 30_000;
    this.skipPacerDelaysForTests = config.skipPacerDelaysForTests ?? false;

    this.healthServer = new HealthServer({
      host: config.healthHost,
      port: config.healthPort,
      transport: this.transport,
      getLastHeartbeat: () => this.lastHeartbeatTime,
    });
  }

  async start(): Promise<void> {
    // 1. Load persistent message IDs from disk
    await this.messageStore.load();

    // 2. Start Health HTTP server (127.0.0.1:8789)
    await this.healthServer.start();

    // 3. Register message dispatch pipeline
    this.transport.onMessage(async (msg) => {
      await this.handleInboundMessage(msg);
    });

    // 4. Start messaging transport
    await this.transport.start();
    this.inboundFilter.notifyReconnected();

    // 5. Start periodic heartbeat to Agent Worker
    this.startHeartbeatLoop();
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await this.transport.stop();
    await this.healthServer.stop();
    await this.messageStore.save();
  }

  private startHeartbeatLoop(): void {
    const runHeartbeat = async () => {
      const state = this.transport.getState();
      const ok = await this.bridgeClient.sendHeartbeat(state);
      if (ok) {
        this.lastHeartbeatTime = Date.now();
      }
    };

    // Initial heartbeat
    runHeartbeat().catch(() => {});

    this.heartbeatTimer = setInterval(() => {
      runHeartbeat().catch(() => {});
    }, this.heartbeatIntervalMs);
  }

  /**
   * Main inbound message execution pipeline.
   */
  async handleInboundMessage(msg: {
    messageId: string;
    from: string;
    timestamp: number;
    text: string;
    hasMedia: boolean;
    downloadMedia?: () => Promise<{ data: Buffer; mimetype: string; filename?: string } | null>;
  }): Promise<void> {
    // 1. Persistent deduplication check
    if (this.messageStore.has(msg.messageId)) {
      return;
    }

    // 2. Inbound filtering (freshness window, reconnect apologies, chat rate limiting)
    const filterResult = await this.inboundFilter.filter(msg, this.transport);
    if (!filterResult.allow) {
      return;
    }

    // 3. Resolve sender identity (normalized phone or lid:<id>)
    const identity = await resolveIdentity(msg.from, this.transport);

    // 4. Media processing if attachment present
    let mediaReferences: MediaReference[] | undefined;
    if (msg.hasMedia && msg.downloadMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.data) {
          const processed = await processImageMedia(media.data, media.mimetype);
          const uploaded = await this.bridgeClient.uploadAsset(identity.ownerKey, processed.base64);
          mediaReferences = [
            {
              url: `asset://${uploaded.assetId}`,
              mimeType: processed.mimeType,
              caption: msg.text || undefined,
            },
          ];
        }
      } catch (mediaErr) {
        console.error("Failed to process or upload media asset:", mediaErr);
        await this.transport.sendText(
          msg.from,
          "Sorry, could not process that image. Please ensure it is a JPEG, PNG, or WebP under 5 MB."
        );
        return;
      }
    }

    try {
      // 5. Send message to Agent Worker Durable Object
      const response = await this.bridgeClient.sendMessage({
        ownerKey: identity.ownerKey,
        messageId: msg.messageId,
        text: msg.text,
        mediaReferences,
        channel: "whatsapp",
        timestamp: msg.timestamp,
      });

      // 6. Record message ID to persistent store
      await this.messageStore.add(msg.messageId);

      // 7. Deliver humanized, paced replies (if agent returned no replies e.g. after STOP, send nothing)
      if (response && response.replies && response.replies.length > 0) {
        await sendPacedReplies(this.transport, msg.from, response.replies, {
          skipDelaysForTests: this.skipPacerDelaysForTests,
        });
      }
    } catch (err) {
      console.error("Bridge communication failure:", err);
      try {
        await this.transport.sendText(
          msg.from,
          "Sorry, our assistant is temporarily busy or reconnecting. Please send your message again in a moment."
        );
      } catch {
        // Transport error
      }
    }
  }
}
