import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { WhatsAppTransport } from "../src/transport/whatsapp-transport.js";
import type { Client as WWebClient, Message as WWebMessage } from "whatsapp-web.js";

class MockWWebClient extends EventEmitter {
  initialize = vi.fn().mockResolvedValue(undefined);
  destroy = vi.fn().mockResolvedValue(undefined);
  sendMessage = vi.fn().mockResolvedValue(undefined);
  sendPresenceAvailable = vi.fn().mockResolvedValue(undefined);
  getChatById = vi.fn().mockResolvedValue({
    sendStateTyping: vi.fn().mockResolvedValue(undefined),
  });
  getContactById = vi.fn().mockResolvedValue({
    number: "2348012345678",
  });
}

describe("WhatsAppTransport (Events, QR, Disconnect, and Message Dispatch)", () => {
  it("handles QR, authenticated, ready, and disconnected event transitions", async () => {
    const mockClient = new MockWWebClient();
    const transport = new WhatsAppTransport({ client: mockClient as unknown as WWebClient });

    expect(transport.getState()).toBe("disconnected");

    const startPromise = transport.start();
    expect(transport.getState()).toBe("connecting");

    // QR event fired
    mockClient.emit("qr", "test_qr_code_string");
    expect(transport.getState()).toBe("connecting");

    // Authenticated event fired
    mockClient.emit("authenticated");
    expect(transport.getState()).toBe("authenticated");

    // Ready event fired
    mockClient.emit("ready");
    expect(transport.getState()).toBe("connected");

    await startPromise;

    // Disconnected event fired
    mockClient.emit("disconnected", "LOGOUT");
    expect(transport.getState()).toBe("disconnected");

    // Auth failure event fired
    mockClient.emit("auth_failure", "Credentials invalid");
    expect(transport.getState()).toBe("disconnected");
  });

  it("filters out fromMe, group, and broadcast messages, but dispatches valid inbound messages", async () => {
    const mockClient = new MockWWebClient();
    const transport = new WhatsAppTransport({ client: mockClient as unknown as WWebClient });
    await transport.start();

    const receivedMessages: any[] = [];
    transport.onMessage(async (msg) => {
      receivedMessages.push(msg);
    });

    // 1. fromMe should be ignored
    mockClient.emit("message", {
      fromMe: true,
      from: "1234567890@c.us",
      body: "Sent by bot",
    });

    // 2. Group chat (@g.us) should be ignored
    mockClient.emit("message", {
      fromMe: false,
      from: "1234567890-123456@g.us",
      body: "Group message",
    });

    // 3. Status broadcast should be ignored
    mockClient.emit("message", {
      fromMe: false,
      from: "status@broadcast",
      body: "Status update",
    });

    expect(receivedMessages.length).toBe(0);

    // 4. Valid inbound message
    mockClient.emit("message", {
      fromMe: false,
      from: "2348012345678@c.us",
      id: { _serialized: "wweb_msg_1", id: "1" },
      timestamp: 1700000000,
      body: "Hello ReplyIQ",
      hasMedia: false,
    } as unknown as WWebMessage);

    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0]?.messageId).toBe("wweb_msg_1");
    expect(receivedMessages[0]?.from).toBe("2348012345678@c.us");
    expect(receivedMessages[0]?.text).toBe("Hello ReplyIQ");
    expect(receivedMessages[0]?.timestamp).toBe(1700000000 * 1000);
  });

  it("sends text, typing indicators, and replies through client", async () => {
    const mockClient = new MockWWebClient();
    const transport = new WhatsAppTransport({ client: mockClient as unknown as WWebClient });
    await transport.start();
    mockClient.emit("ready");

    // sendText
    await transport.sendText("2348012345678@c.us", "Welcome!");
    expect(mockClient.sendMessage).toHaveBeenCalledWith("2348012345678@c.us", "Welcome!");

    // sendTyping
    await transport.sendTyping("2348012345678@c.us");
    expect(mockClient.getChatById).toHaveBeenCalledWith("2348012345678@c.us");

    // sendReplies with menu and previewUrl
    await transport.sendReplies("2348012345678@c.us", [
      {
        text: "Main menu",
        menu: [{ number: 1, label: "View Site" }],
        previewUrl: "https://preview.replyiq.cv/abc",
      },
    ]);
    expect(mockClient.sendMessage).toHaveBeenCalledTimes(2);

    // resolvePhoneNumber
    const resolved = await transport.resolvePhoneNumber!("2348012345678@lid");
    expect(resolved).toBe("+2348012345678");

    // stop
    await transport.stop();
    expect(mockClient.destroy).toHaveBeenCalled();
  });
});
