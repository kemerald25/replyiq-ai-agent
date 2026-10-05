import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  normalizePhoneOrThrow,
  buildWhatsAppLink,
  PhoneNumberSchema,
} from "../src/common/phone.js";

describe("Phone Number Normalizer", () => {
  describe("Nigerian phone numbers", () => {
    it("normalizes local 11-digit numbers starting with 0", () => {
      expect(normalizePhone("08031234567")).toEqual({ valid: true, e164: "+2348031234567" });
      expect(normalizePhone("07012345678")).toEqual({ valid: true, e164: "+2347012345678" });
      expect(normalizePhone("09087654321")).toEqual({ valid: true, e164: "+2349087654321" });
      expect(normalizePhone("08123456789")).toEqual({ valid: true, e164: "+2348123456789" });
      expect(normalizePhone("09123456789")).toEqual({ valid: true, e164: "+2349123456789" });
    });

    it("handles spacing, hyphens, and parentheses in local format", () => {
      expect(normalizePhone("0803 123 4567")).toEqual({ valid: true, e164: "+2348031234567" });
      expect(normalizePhone("(0803) 123-4567")).toEqual({ valid: true, e164: "+2348031234567" });
      expect(normalizePhone("0803.123.4567")).toEqual({ valid: true, e164: "+2348031234567" });
    });

    it("normalizes 13-digit format starting with 234 without +", () => {
      expect(normalizePhone("2348031234567")).toEqual({ valid: true, e164: "+2348031234567" });
      expect(normalizePhone("234-803-123-4567")).toEqual({ valid: true, e164: "+2348031234567" });
    });

    it("normalizes international format starting with +234", () => {
      expect(normalizePhone("+2348031234567")).toEqual({ valid: true, e164: "+2348031234567" });
      expect(normalizePhone("+234 803 123 4567")).toEqual({ valid: true, e164: "+2348031234567" });
    });

    it("normalizes +234 (0) 803... formatting artifact", () => {
      expect(normalizePhone("+234 (0) 803 123 4567")).toEqual({
        valid: true,
        e164: "+2348031234567",
      });
      expect(normalizePhone("234 (0) 803 123 4567")).toEqual({
        valid: true,
        e164: "+2348031234567",
      });
    });
  });

  describe("International E.164 numbers", () => {
    it("accepts valid international numbers", () => {
      expect(normalizePhone("+14155552671")).toEqual({ valid: true, e164: "+14155552671" });
      expect(normalizePhone("+447911123456")).toEqual({ valid: true, e164: "+447911123456" });
      expect(normalizePhone("+233201234567")).toEqual({ valid: true, e164: "+233201234567" });
    });
  });

  describe("Invalid phone numbers", () => {
    it("rejects empty or whitespace string", () => {
      expect(normalizePhone("")).toEqual({ valid: false, error: "Phone number cannot be empty" });
      expect(normalizePhone("   ")).toEqual({
        valid: false,
        error: "Phone number cannot be empty",
      });
    });

    it("rejects non-string input", () => {
      expect(normalizePhone(12345 as unknown as string)).toEqual({
        valid: false,
        error: "Phone number must be a string",
      });
    });

    it("rejects numbers containing letters or invalid characters", () => {
      expect(normalizePhone("0803HELLO67").valid).toBe(false);
      expect(normalizePhone("+234803bad12").valid).toBe(false);
    });

    it("rejects numbers that are too short", () => {
      expect(normalizePhone("12345").valid).toBe(false);
      expect(normalizePhone("080312").valid).toBe(false);
    });

    it("normalizePhoneOrThrow throws on invalid", () => {
      expect(() => normalizePhoneOrThrow("invalid")).toThrow(/Invalid phone number format/);
    });
  });

  describe("PhoneNumberSchema (Zod transformation)", () => {
    it("transforms valid raw phone input to E.164", () => {
      expect(PhoneNumberSchema.parse("0803 123 4567")).toBe("+2348031234567");
    });

    it("fails Zod validation for malformed input", () => {
      expect(() => PhoneNumberSchema.parse("not-a-number")).toThrow();
    });
  });

  describe("buildWhatsAppLink helper", () => {
    it("generates clean wa.me link with digits only (no leading +)", () => {
      const link = buildWhatsAppLink("08031234567");
      expect(link).toBe("https://wa.me/2348031234567");
    });

    it("appends percent-encoded prefilled message when provided", () => {
      const link = buildWhatsAppLink("08031234567", "Hello, I want to order 2 cakes!");
      expect(link).toBe(
        "https://wa.me/2348031234567?text=Hello%2C%20I%20want%20to%20order%202%20cakes!",
      );
    });

    it("ignores empty or whitespace-only messages", () => {
      const link = buildWhatsAppLink("08031234567", "   ");
      expect(link).toBe("https://wa.me/2348031234567");
    });

    it("works with international numbers", () => {
      const link = buildWhatsAppLink("+14155552671", "Hi!");
      expect(link).toBe("https://wa.me/14155552671?text=Hi!");
    });
  });
});
