import pkg, { type Client as WWebClient, type Message as WWebMessage } from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import {
  MessagingTransport,
  TransportState,
  MessageHandler,
  InboundTransportMessage,
  InboundMedia,
} from "./interface.js";
import { StructuredReply } from "@replyiq/agent";

export interface WhatsAppTransportOptions {
  authPath?: string;
  puppeteerExecutablePath?: string;
  headless?: boolean;
  client?: WWebClient;
}

export class WhatsAppTransport implements MessagingTransport {
  readonly transportName = "whatsapp-web.js";
  private client: WWebClient | null = null;
  private state: TransportState = "disconnected";
  private messageHandler: MessageHandler | null = null;
  private options: WhatsAppTransportOptions;

  constructor(options?: WhatsAppTransportOptions) {
    this.options = options || {};
  }

  async start(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }
    this.state = "connecting";

    const puppeteerArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ];

    const puppeteerOptions: Record<string, unknown> = {
      headless: this.options.headless ?? true,
      args: puppeteerArgs,
    };

    const execPath =
      this.options.puppeteerExecutablePath ||
      process.env.PUPPETEER_EXECUTABLE_PATH;
    if (execPath) {
      puppeteerOptions.executablePath = execPath;
    }

    const authPath = this.options.authPath || process.env.WWEBJS_AUTH_PATH || ".wwebjs_auth";

    if (this.options.client) {
      this.client = this.options.client;
    } else {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: authPath }),
        puppeteer: puppeteerOptions,
      });
    }

    this.client.on("qr", (qr: string) => {
      console.log("\nScan this QR code with WhatsApp on your phone:\n");
      qrcode.generate(qr, { small: true });
    });

    this.client.on("authenticated", () => {
      this.state = "authenticated";
      console.log("WhatsApp authentication successful.");
    });

    this.client.on("ready", () => {
      this.state = "connected";
      console.log("WhatsApp Web client is ready and connected.");
    });

    this.client.on("auth_failure", (msg: string) => {
      this.state = "disconnected";
      console.error("WhatsApp authentication failure:", msg);
    });

    this.client.on("disconnected", (reason: string) => {
      this.state = "disconnected";
      console.warn("WhatsApp Web disconnected:", reason);
    });

    this.client.on("message", async (msg: WWebMessage) => {
      // 1. Ignore own messages, group messages, and status updates
      if (msg.fromMe) return;
      if (msg.from.includes("@g.us")) return;
      if (msg.from.includes("status@broadcast")) return;

      if (!this.messageHandler) return;

      const inbound: InboundTransportMessage = {
        messageId: msg.id._serialized || msg.id.id || `wweb_${Date.now()}`,
        from: msg.from,
        timestamp: (msg.timestamp ? msg.timestamp * 1000 : Date.now()),
        text: msg.body || "",
        hasMedia: Boolean(msg.hasMedia),
        isFromMe: false,
        isGroup: false,
        downloadMedia: msg.hasMedia
          ? async (): Promise<InboundMedia | null> => {
              try {
                const media = await msg.downloadMedia();
                if (!media || !media.data) return null;
                return {
                  data: Buffer.from(media.data, "base64"),
                  mimetype: media.mimetype,
                  filename: media.filename || undefined,
                };
              } catch (err) {
                console.error("Failed to download media from message:", err);
                return null;
              }
            }
          : undefined,
      };

      try {
        await this.messageHandler(inbound);
      } catch (err) {
        console.error("Error handling incoming message:", err);
      }
    });

    await this.client.initialize();
  }

  async stop(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (err) {
        console.error("Error during WhatsApp client destroy:", err);
      }
    }
    this.state = "disconnected";
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  async sendReplies(target: string, replies: StructuredReply[]): Promise<void> {
    if (!this.client || this.state !== "connected") {
      throw new Error("Cannot send replies: WhatsApp transport not connected");
    }

    for (const reply of replies) {
      const parts: string[] = [reply.text];

      // Format interactive menu items as numbered options
      if (reply.menu && reply.menu.length > 0) {
        const menuLines = reply.menu.map((item) => `${item.number}. ${item.label}`);
        parts.push(menuLines.join("\n"));
      }

      // Add preview URL or action link if present
      if (reply.previewUrl) {
        parts.push(`🔍 Preview Link:\n${reply.previewUrl}`);
      } else if (reply.link) {
        parts.push(`🔗 ${reply.link.label}:\n${reply.link.url}`);
      }

      const formatted = parts.filter(Boolean).join("\n\n");
      await this.client.sendMessage(target, formatted);
    }
  }

  async sendText(target: string, text: string): Promise<void> {
    if (!this.client || this.state !== "connected") {
      throw new Error("Cannot send text: WhatsApp transport not connected");
    }
    await this.client.sendMessage(target, text);
  }

  async sendTyping(target: string): Promise<void> {
    if (!this.client || this.state !== "connected") return;
    try {
      const chat = await this.client.getChatById(target);
      if (chat && typeof chat.sendStateTyping === "function") {
        await chat.sendStateTyping();
      }
    } catch {
      // Ignore typing indicator errors
    }
  }

  getState(): TransportState {
    return this.state;
  }

  async resolvePhoneNumber(rawId: string): Promise<string | null> {
    if (!this.client || this.state !== "connected") return null;
    try {
      const contact = await this.client.getContactById(rawId);
      if (contact && contact.number) {
        return `+${contact.number}`;
      }
    } catch {
      // Unresolved contact
    }
    return null;
  }
}
