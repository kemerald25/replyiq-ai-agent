import { describe, it, expect } from "vitest";
import { parseOwnerKey, validateOwnerKey, OwnerKeySchema } from "../src/index.js";

describe("Owner Identity & Key Validation (parseOwnerKey)", () => {
  describe("E.164 Phone Identities", () => {
    it("parses Nigerian local format (080...) to E.164", () => {
      const res = parseOwnerKey("08031234567");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "phone") {
        expect(res.identity.type).toBe("phone");
        expect(res.identity.key).toBe("+2348031234567");
        expect(res.identity.e164).toBe("+2348031234567");
      }
    });

    it("parses Nigerian 234 format without +", () => {
      const res = parseOwnerKey("2348031234567");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "phone") {
        expect(res.identity.key).toBe("+2348031234567");
      }
    });

    it("parses international E.164 phone numbers", () => {
      const res = parseOwnerKey("+14155552671");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "phone") {
        expect(res.identity.type).toBe("phone");
        expect(res.identity.key).toBe("+14155552671");
        expect(res.identity.e164).toBe("+14155552671");
      }
    });

    it("handles spacing and punctuation in phone numbers", () => {
      const res = parseOwnerKey("+234 (803) 123-4567");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "phone") {
        expect(res.identity.key).toBe("+2348031234567");
      }
    });
  });

  describe("WhatsApp LID Identities", () => {
    it("parses numeric LID identity", () => {
      const res = parseOwnerKey("lid:123456789012345");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "lid") {
        expect(res.identity.type).toBe("lid");
        expect(res.identity.key).toBe("lid:123456789012345");
        expect(res.identity.lid).toBe("123456789012345");
      }
    });

    it("parses alphanumeric LID identity with dashes and underscores", () => {
      const res = parseOwnerKey("lid:user_123-test.abc:1");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "lid") {
        expect(res.identity.type).toBe("lid");
        expect(res.identity.key).toBe("lid:user_123-test.abc:1");
        expect(res.identity.lid).toBe("user_123-test.abc:1");
      }
    });

    it("rejects empty lid identifier after prefix", () => {
      const res = parseOwnerKey("lid:");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toMatch(/cannot be empty/);
      }
    });

    it("rejects LID identifier exceeding 64 characters or containing illegal chars", () => {
      const tooLong = `lid:${"a".repeat(65)}`;
      expect(parseOwnerKey(tooLong).valid).toBe(false);

      const illegalChars = "lid:bad<id>";
      expect(parseOwnerKey(illegalChars).valid).toBe(false);
    });
  });

  describe("Telegram Numeric Identities", () => {
    it("parses valid numeric Telegram identity", () => {
      const res = parseOwnerKey("tg:1234567890");
      expect(res.valid).toBe(true);
      if (res.valid && res.identity.type === "telegram") {
        expect(res.identity.type).toBe("telegram");
        expect(res.identity.key).toBe("tg:1234567890");
        expect(res.identity.telegramId).toBe("1234567890");
      }
    });

    it("rejects empty Telegram id after tg: prefix", () => {
      const res = parseOwnerKey("tg:");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toMatch(/cannot be empty/);
      }
    });

    it("rejects non-numeric Telegram identifiers", () => {
      expect(parseOwnerKey("tg:abc").valid).toBe(false);
      expect(parseOwnerKey("tg:user_123").valid).toBe(false);
      expect(parseOwnerKey("tg:-12345").valid).toBe(false);
      expect(parseOwnerKey("tg:123.45").valid).toBe(false);
    });

    it("rejects Telegram identifiers exceeding 32 digits", () => {
      const tooLong = `tg:${"1".repeat(33)}`;
      expect(parseOwnerKey(tooLong).valid).toBe(false);
    });
  });

  describe("Invalid inputs & Schema validation", () => {
    it("rejects non-string and empty inputs", () => {
      expect(parseOwnerKey(null).valid).toBe(false);
      expect(parseOwnerKey("").valid).toBe(false);
      expect(parseOwnerKey("   ").valid).toBe(false);
      expect(validateOwnerKey(12345)).toBe(false);
    });

    it("rejects arbitrary text that is neither a phone nor a lid", () => {
      expect(validateOwnerKey("john_doe")).toBe(false);
      expect(validateOwnerKey("some-random-string")).toBe(false);
    });

    it("works with OwnerKeySchema parser and transformer", () => {
      expect(OwnerKeySchema.parse("08031234567")).toBe("+2348031234567");
      expect(OwnerKeySchema.parse("lid:user_9988")).toBe("lid:user_9988");
      expect(() => OwnerKeySchema.parse("invalid")).toThrow();
    });
  });
});
