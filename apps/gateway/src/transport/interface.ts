import { StructuredReply } from "@replyiq/agent";

export type TransportState = "disconnected" | "connecting" | "authenticated" | "connected";

export interface InboundMedia {
  data: Buffer;
  mimetype: string;
  filename?: string;
}

export interface InboundTransportMessage {
  messageId: string;
  from: string; // e.g. "2348012345678@c.us" or "123456789@lid"
  timestamp: number; // Unix timestamp in milliseconds
  text: string;
  hasMedia: boolean;
  downloadMedia?: () => Promise<InboundMedia | null>;
  isFromMe?: boolean;
  isGroup?: boolean;
}

export type MessageHandler = (msg: InboundTransportMessage) => Promise<void>;

/**
 * Portable MessagingTransport abstraction.
 * Allows seamless 1-file swapping between whatsapp-web.js, WhatsApp Cloud API,
 * or local in-memory fake transport for development and testing.
 */
export interface MessagingTransport {
  readonly transportName: string;

  /**
   * Initializes the transport, loads session credentials, and connects to the messaging network.
   */
  start(): Promise<void>;

  /**
   * Gracefully shuts down the transport and cleans up headless browser instances or socket connections.
   */
  stop(): Promise<void>;

  /**
   * Subscribes a message handler to incoming messages.
   */
  onMessage(handler: MessageHandler): void;

  /**
   * Sends formatted StructuredReplies to the destination recipient.
   */
  sendReplies(target: string, replies: StructuredReply[]): Promise<void>;

  /**
   * Sends a simple text message.
   */
  sendText(target: string, text: string): Promise<void>;

  /**
   * Displays the typing indicator in the target chat.
   */
  sendTyping(target: string): Promise<void>;

  /**
   * Gets the current transport connection status.
   */
  getState(): TransportState;

  /**
   * Attempts to resolve the phone number for a user (e.g. from a LID identifier).
   * Returns normalized E.164 phone string if resolvable, or null if unresolved.
   */
  resolvePhoneNumber?(rawId: string): Promise<string | null>;
}
