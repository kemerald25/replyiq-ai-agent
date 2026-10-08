import { describe, it, expect } from "vitest";
import {
  splitParagraphs,
  expandReplies,
  sendPacedReplies,
} from "../src/pipeline/reply-pacer.js";
import { FakeMessagingTransport } from "../src/transport/fake-transport.js";

describe("Reply Pacer & Paragraph Splitter", () => {
  it("keeps messages under 1,500 characters intact", () => {
    const text = "Short message under limit.";
    const chunks = splitParagraphs(text, 1200, 1500);
    expect(chunks).toEqual([text]);
  });

  it("splits long text at paragraph boundaries between 1,200 and 1,500 characters", () => {
    const p1 = "A".repeat(1250);
    const p2 = "B".repeat(1300);
    const fullText = `${p1}\n\n${p2}`;

    const chunks = splitParagraphs(fullText, 1200, 1500);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe(p1);
    expect(chunks[1]).toBe(p2);
  });

  it("splits long text at sentence or space boundaries when no paragraph break exists", () => {
    const s1 = "This is sentence one that goes on for a while. ".repeat(30); // ~1400 chars
    const s2 = "This is sentence two that continues further. ".repeat(30);
    const full = s1 + s2;

    const chunks = splitParagraphs(full, 1200, 1500);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1500);
    }
  });

  it("splits text at space boundary when no periods or newlines exist", () => {
    const word = "word ".repeat(350); // ~1750 chars
    const chunks = splitParagraphs(word, 1200, 1500);
    expect(chunks.length).toBe(2);
    expect(chunks[0]!.length).toBeLessThanOrEqual(1500);
  });

  it("hard splits unbroken continuous string without any spaces or punctuation", () => {
    const unbroken = "Z".repeat(2500);
    const chunks = splitParagraphs(unbroken, 1200, 1500);
    expect(chunks.length).toBe(2);
    expect(chunks[0]!.length).toBe(1500);
    expect(chunks[1]!.length).toBe(1000);
  });

  it("preserves menus, links, and previewUrl on the final chunk in expandReplies", () => {
    const longText = "Para 1 ".repeat(200) + "\n\n" + "Para 2 ".repeat(200);
    const original = [
      {
        text: longText,
        menu: [{ number: 1, label: "Option 1" }],
        previewUrl: "https://preview.replyiq.cv/abc",
      },
    ];

    const expanded = expandReplies(original);
    expect(expanded.length).toBeGreaterThan(1);
    // First chunk has text only
    expect(expanded[0]?.menu).toBeUndefined();
    expect(expanded[0]?.previewUrl).toBeUndefined();
    // Last chunk has the interactive components
    const last = expanded[expanded.length - 1]!;
    expect(last.menu).toEqual([{ number: 1, label: "Option 1" }]);
    expect(last.previewUrl).toBe("https://preview.replyiq.cv/abc");
  });

  it("sends nothing when agent returns no replies", async () => {
    const transport = new FakeMessagingTransport();
    await transport.start();

    await sendPacedReplies(transport, "+2348012345678", []);
    expect(transport.sentMessages.length).toBe(0);
    expect(transport.typingEvents.length).toBe(0);
  });

  it("delivers multi-part replies with typing indicator and caps total delay at 8s", async () => {
    const transport = new FakeMessagingTransport();
    await transport.start();

    const replies = [
      { text: "Part 1 of the reply" },
      { text: "Part 2 of the reply" },
      { text: "Part 3 of the reply" },
    ];

    const startTime = Date.now();
    await sendPacedReplies(transport, "+2348012345678", replies, {
      maxTotalDelayMs: 2000, // Test with 2s cap
      skipDelaysForTests: false,
    });
    const elapsed = Date.now() - startTime;

    expect(transport.sentMessages.length).toBe(3);
    expect(transport.typingEvents.length).toBeGreaterThanOrEqual(1);
    expect(elapsed).toBeLessThanOrEqual(3000); // Well bounded
  });
});
