import { describe, it, expect } from "vitest";
import { formatPrice, formatIntegerWithCommas } from "../src/engine/formatters.js";

describe("Deterministic Price Formatter (No Intl)", () => {
  describe("formatIntegerWithCommas", () => {
    it("formats thousands, millions, and small numbers", () => {
      expect(formatIntegerWithCommas(0)).toBe("0");
      expect(formatIntegerWithCommas(45)).toBe("45");
      expect(formatIntegerWithCommas(999)).toBe("999");
      expect(formatIntegerWithCommas(1000)).toBe("1,000");
      expect(formatIntegerWithCommas(25000)).toBe("25,000");
      expect(formatIntegerWithCommas(150000)).toBe("150,000");
      expect(formatIntegerWithCommas(1000000)).toBe("1,000,000");
      expect(formatIntegerWithCommas(123456789)).toBe("123,456,789");
    });

    it("handles negative numbers", () => {
      expect(formatIntegerWithCommas(-5000)).toBe("-5,000");
    });
  });

  describe("formatPrice", () => {
    it("formats NGN prices with Naira symbol ₦", () => {
      expect(formatPrice(150000)).toBe("₦150,000");
      expect(formatPrice(25000, "NGN")).toBe("₦25,000");
      expect(formatPrice(0, "NGN")).toBe("₦0");
    });

    it("formats non-NGN currencies with currency code and space", () => {
      expect(formatPrice(2500, "USD")).toBe("USD 2,500");
      expect(formatPrice(180, "GBP")).toBe("GBP 180");
      expect(formatPrice(50000, "GHS")).toBe("GHS 50,000");
    });

    it("prepends price label when provided", () => {
      expect(formatPrice(150000, "NGN", "starting at")).toBe("starting at ₦150,000");
      expect(formatPrice(25000, "NGN", "from")).toBe("from ₦25,000");
      expect(formatPrice(500, "USD", "fixed")).toBe("fixed USD 500");
    });

    it("ignores empty or whitespace label", () => {
      expect(formatPrice(150000, "NGN", "")).toBe("₦150,000");
      expect(formatPrice(150000, "NGN", "   ")).toBe("₦150,000");
    });
  });
});
