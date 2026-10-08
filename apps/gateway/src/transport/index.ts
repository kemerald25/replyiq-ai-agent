import { MessagingTransport } from "./interface.js";
import { WhatsAppTransport, WhatsAppTransportOptions } from "./whatsapp-transport.js";
import { FakeMessagingTransport } from "./fake-transport.js";

export * from "./interface.js";
export * from "./whatsapp-transport.js";
export * from "./fake-transport.js";

export type TransportType = "whatsapp" | "fake";

export interface TransportFactoryConfig {
  type?: TransportType;
  whatsAppOptions?: WhatsAppTransportOptions;
}

/**
 * Factory creating the active messaging transport.
 * To change transports across the entire gateway, update the return value here.
 */
export function createTransport(config?: TransportFactoryConfig): MessagingTransport {
  const selectedType =
    config?.type ||
    (process.env.TRANSPORT_TYPE as TransportType) ||
    (process.env.NODE_ENV === "test" ? "fake" : "whatsapp");

  switch (selectedType) {
    case "fake":
      return new FakeMessagingTransport();
    case "whatsapp":
    default:
      return new WhatsAppTransport(config?.whatsAppOptions);
  }
}
