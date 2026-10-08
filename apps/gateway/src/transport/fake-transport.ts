import {
  MessagingTransport,
  TransportState,
  MessageHandler,
  InboundTransportMessage,
} from "./interface.js";
import { StructuredReply } from "@replyiq/agent";

export interface SentMessageRecord {
  target: string;
  replies?: StructuredReply[];
  text?: string;
  timestamp: number;
}

export class FakeMessagingTransport implements MessagingTransport {
  readonly transportName = "fake-transport";
  private state: TransportState = "disconnected";
  private handler: MessageHandler | null = null;
  public sentMessages: SentMessageRecord[] = [];
  public typingEvents: string[] = [];
  private phoneMappings = new Map<string, string>();

  async start(): Promise<void> {
    this.state = "connected";
  }

  async stop(): Promise<void> {
    this.state = "disconnected";
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async sendReplies(target: string, replies: StructuredReply[]): Promise<void> {
    if (this.state !== "connected") {
      throw new Error("Fake transport not connected");
    }
    this.sentMessages.push({
      target,
      replies,
      timestamp: Date.now(),
    });
  }

  async sendText(target: string, text: string): Promise<void> {
    if (this.state !== "connected") {
      throw new Error("Fake transport not connected");
    }
    this.sentMessages.push({
      target,
      text,
      timestamp: Date.now(),
    });
  }

  async sendTyping(target: string): Promise<void> {
    this.typingEvents.push(target);
  }

  getState(): TransportState {
    return this.state;
  }

  setState(state: TransportState): void {
    this.state = state;
  }

  setPhoneMapping(rawId: string, phone: string): void {
    this.phoneMappings.set(rawId, phone);
  }

  async resolvePhoneNumber(rawId: string): Promise<string | null> {
    return this.phoneMappings.get(rawId) || null;
  }

  /**
   * Test helper to simulate an incoming message from a WhatsApp user.
   */
  async simulateInboundMessage(message: InboundTransportMessage): Promise<void> {
    if (this.handler) {
      await this.handler(message);
    }
  }

  clear(): void {
    this.sentMessages = [];
    this.typingEvents = [];
  }
}
