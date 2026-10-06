import { describe, it, expect } from "vitest";
import { resolveTheme } from "../src/engine/theme.js";
import { PALETTE_PRESETS, PalettePreset } from "@replyiq/schema";

/**
 * Calculates WCAG 2.1 Relative Luminance for an sRGB hex color.
 */
function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b);
}

/**
 * Calculates WCAG 2.1 Contrast Ratio between two hex colors.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG AA Contrast Ratios Across All Palettes & Modes", () => {
  const modes: ("light" | "dark")[] = ["light", "dark"];

  for (const preset of PALETTE_PRESETS) {
    for (const mode of modes) {
      it(`preset "${preset}" in ${mode} mode satisfies WCAG AA (>= 4.5:1) for body text`, () => {
        const resolved = resolveTheme({ palette: preset as PalettePreset, mode });
        const { text, background, surface } = resolved.tokens;

        const textOnBackground = getContrastRatio(text, background);
        const textOnSurface = getContrastRatio(text, surface);

        // WCAG AA for normal text requires at least 4.5:1
        expect(
          textOnBackground,
          `Failed: text (${text}) on background (${background}) in "${preset}" (${mode}) has ratio ${textOnBackground.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);

        expect(
          textOnSurface,
          `Failed: text (${text}) on surface (${surface}) in "${preset}" (${mode}) has ratio ${textOnSurface.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
