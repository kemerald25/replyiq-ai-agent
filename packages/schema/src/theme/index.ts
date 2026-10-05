import { z } from "zod";

/**
 * Curated font allowlist.
 * Includes "system-sans" as default for zero bandwidth penalty on Nigerian mobile connections.
 */
export const FONT_ALLOWLIST = [
  "system-sans",
  "inter",
  "outfit",
  "plus-jakarta-sans",
  "dm-sans",
  "playfair-display",
  "roboto",
] as const;

export type AllowedFont = (typeof FONT_ALLOWLIST)[number];

/**
 * Named palette presets tailored for Nigerian businesses and creatives.
 */
export const PALETTE_PRESETS = [
  "lagos-emerald",
  "sunset-amber",
  "slate-minimal",
  "ocean-indigo",
  "terracotta",
  "royal-gold",
] as const;

export type PalettePreset = (typeof PALETTE_PRESETS)[number];

/**
 * Strict 6-character HEX color validator.
 * Arbitrary CSS (expressions, urls, rgb functions, gradients) is strictly disallowed.
 */
export const ColorHexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color token must be a 6-character hex string (e.g. #10B981)");

/**
 * Named palette tokens for semantic styling.
 */
export const PaletteTokensSchema = z.object({
  primary: ColorHexSchema,
  secondary: ColorHexSchema,
  background: ColorHexSchema,
  surface: ColorHexSchema,
  text: ColorHexSchema,
  muted: ColorHexSchema,
});

export type PaletteTokens = z.infer<typeof PaletteTokensSchema>;

/**
 * Predefined token maps for each palette preset.
 */
export const PRESET_PALETTES: Record<PalettePreset, PaletteTokens> = {
  "lagos-emerald": {
    primary: "#059669",
    secondary: "#10b981",
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
  },
  "sunset-amber": {
    primary: "#d97706",
    secondary: "#f59e0b",
    background: "#fffbeb",
    surface: "#ffffff",
    text: "#1f2937",
    muted: "#78716c",
  },
  "slate-minimal": {
    primary: "#0f172a",
    secondary: "#334155",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    muted: "#64748b",
  },
  "ocean-indigo": {
    primary: "#2563eb",
    secondary: "#4f46e5",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
  },
  terracotta: {
    primary: "#c2410c",
    secondary: "#ea580c",
    background: "#fff7ed",
    surface: "#ffffff",
    text: "#1c1917",
    muted: "#78716c",
  },
  "royal-gold": {
    primary: "#b45309",
    secondary: "#d97706",
    background: "#18181b",
    surface: "#27272a",
    text: "#fafafa",
    muted: "#a1a1aa",
  },
};

/**
 * Theme schema.
 * Rejects any arbitrary CSS strings, allowing only named tokens and allowlisted fonts.
 */
export const ThemeSchema = z.object({
  palette: z.enum(PALETTE_PRESETS).default("lagos-emerald"),
  tokens: PaletteTokensSchema.optional(),
  font: z.enum(FONT_ALLOWLIST).default("system-sans"),
  mode: z.enum(["light", "dark"]).default("light"),
});

export type Theme = z.infer<typeof ThemeSchema>;
