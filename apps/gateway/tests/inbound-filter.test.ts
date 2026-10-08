import { describe, it, expect } from "vitest";
import { InboundFilter } from "../src/pipeline/inbound-filter.js";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";

describe("Inbound Filter", () => {
  it("drops stale messages older than freshness window (3 minutes)", async () => {
    const filter = new InboundFilter({ freshnessWindowMs: 180_000 });
    const transport = new FakeMessagingTransport();

    const staleTimestamp = Date.now() - (4 * 60 * 1000); // 4 minutes ago
    const res = await filter.filter(
      {
        messageId: "msg_stale_1",
        from: "+2348011112222",
        timestamp: staleTimestamp,
        text: "Old message",
        hasMedia: false,
      },
      transport
    );

    expect(res.allow).toBe(false);
    expect(res.reason).toBe("stale_message");
    // Should NOT send offline apology when not in reconnect state
    expect(transport.sentMessages.length).toBe(0);
  });

  it("sends at most one apology per affected chat after reconnecting, rate-limited", async () => {
    const filter = new InboundFilter({
      freshnessWindowMs: 180_000,
      maxApologiesPerMinute: 2,
    });
    const transport = new FakeMessagingTransport();
    await transport.start();

    filter.notifyReconnected();

    const staleTimestamp = Date.now() - (5 * 60 * 1000);

    // Stale message from Chat A
    await filter.filter(
      {
        messageId: "msg_a_1",
        from: "+2348011110001",
        timestamp: staleTimestamp,
        text: "Hello",
        hasMedia: false,
      },
      transport
    );

    // Stale message 2 from Chat A (should NOT send duplicate apology)
    await filter.filter(
      {
        messageId: "msg_a_2",
        from: "+2348011110001",
        timestamp: staleTimestamp,
        text: "Hello again",
        hasMedia: false,
      },
      transport
    );

    // Stale message from Chat B (apology 2)
    await filter.filter(
      {
        messageId: "msg_b_1",
        from: "+2348011110002",
        timestamp: staleTimestamp,
        text: "Hi",
        hasMedia: false,
      },
      transport
    );

    // Stale message from Chat C (should exceed max apologies per minute = 2)
    await filter.filter(
      {
        messageId: "msg_c_1",
        from: "+2348011110003",
        timestamp: staleTimestamp,
        text: "Hey",
        hasMedia: false,
      },
      transport
    );

    // Verify apologies sent
    const apologies = transport.sentMessages.filter((m) =>
      m.text?.includes("Sorry, I was offline")
    );
    expect(apologies.length).toBe(2);
    expect(apologies[0]?.target).toBe("+2348011110001");
    expect(apologies[1]?.target).toBe("+2348011110002");
  });

  it("enforces chat inbound rate limits with exactly one warning per window", async () => {
    const filter = new InboundFilter({
      chatRateLimitMax: 3,
      chatRateLimitWindowMs: 10_000,
    });
    const transport = new FakeMessagingTransport();
    await transport.start();
    const from = "+2348012345678";

    // 1st, 2nd, 3rd messages allowed
    expect((await filter.filter({ messageId: "1", from, timestamp: Date.now(), text: "1", hasMedia: false }, transport)).allow).toBe(true);
    expect((await filter.filter({ messageId: "2", from, timestamp: Date.now(), text: "2", hasMedia: false }, transport)).allow).toBe(true);
    expect((await filter.filter({ messageId: "3", from, timestamp: Date.now(), text: "3", hasMedia: false }, transport)).allow).toBe(true);

    // 4th message exceeds limit: rejected and triggers warning
    const res4 = await filter.filter({ messageId: "4", from, timestamp: Date.now(), text: "4", hasMedia: false }, transport);
    expect(res4.allow).toBe(false);
    expect(res4.reason).toBe("chat_rate_limit_exceeded");
    expect(transport.sentMessages.length).toBe(1);
    expect(transport.sentMessages[0]?.text).toContain("sending messages too fast");

    // 5th message exceeds limit: rejected but NO duplicate warning sent
    const res5 = await filter.filter({ messageId: "5", from, timestamp: Date.now(), text: "5", hasMedia: false }, transport);
    expect(res5.allow).toBe(false);
    expect(transport.sentMessages.length).toBe(1);
  });
});
