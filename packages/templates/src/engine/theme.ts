import {
  Theme,
  PaletteTokens,
  PRESET_PALETTES,
  FONT_ALLOWLIST,
  AllowedFont,
  PalettePreset,
} from "@replyiq/schema";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * High-contrast dark mode token definitions for every preset.
 */
export const DARK_PRESET_PALETTES: Record<PalettePreset, PaletteTokens> = {
  "lagos-emerald": {
    primary: "#10b981",
    secondary: "#34d399",
    background: "#091712",
    surface: "#11261e",
    text: "#f9fafb",
    muted: "#9ca3af",
  },
  "sunset-amber": {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    background: "#18140c",
    surface: "#282012",
    text: "#fef3c7",
    muted: "#a8a29e",
  },
  "slate-minimal": {
    primary: "#38bdf8",
    secondary: "#818cf8",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f8fafc",
    muted: "#94a3b8",
  },
  "ocean-indigo": {
    primary: "#60a5fa",
    secondary: "#818cf8",
    background: "#0b1329",
    surface: "#162044",
    text: "#f8fafc",
    muted: "#94a3b8",
  },
  terracotta: {
    primary: "#fb923c",
    secondary: "#ea580c",
    background: "#1c1411",
    surface: "#2c1f1a",
    text: "#ffedd5",
    muted: "#a8a29e",
  },
  "royal-gold": {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    background: "#18181b",
    surface: "#27272a",
    text: "#fafafa",
    muted: "#a1a1aa",
  },
};

/**
 * Validated CSS theme variables and font configuration.
 */
export interface ResolvedTheme {
  tokens: PaletteTokens;
  font: AllowedFont;
  fontFamily: string;
  fontLinkTag: string;
  isDark: boolean;
  cssVariables: string;
}

const FONT_FAMILIES: Record<AllowedFont, string> = {
  "system-sans": `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
  inter: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  outfit: `'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "plus-jakarta-sans": `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "dm-sans": `'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  "playfair-display": `'Playfair Display', Georgia, "Times New Roman", serif`,
  roboto: `'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
};

const GOOGLE_FONT_NAMES: Record<AllowedFont, string | null> = {
  "system-sans": null,
  inter: "Inter:wght@400;500;600;700",
  outfit: "Outfit:wght@400;500;600;700",
  "plus-jakarta-sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
  "dm-sans": "DM+Sans:wght@400;500;700",
  "playfair-display": "Playfair+Display:wght@400;600;700",
  roboto: "Roboto:wght@400;500;700",
};

/**
 * Validates a color hex string at render time.
 * If invalid or contains injection attempts, falls back to the safe fallback hex.
 */
export function sanitizeColor(candidate: unknown, fallback: string): string {
  if (typeof candidate === "string" && HEX_REGEX.test(candidate.trim())) {
    return candidate.trim();
  }
  return fallback;
}

/**
 * Resolves theme configuration into safe CSS custom properties and font rules.
 * Strictly re-validates all values at render time to prevent CSS injection.
 */
export function resolveTheme(theme: Partial<Theme> | undefined): ResolvedTheme {
  const mode = theme?.mode === "dark" ? "dark" : "light";
  const isDark = mode === "dark";

  // Validate palette preset
  const presetKey: PalettePreset =
    theme?.palette && theme.palette in PRESET_PALETTES ? theme.palette : "lagos-emerald";

  const basePreset = isDark ? DARK_PRESET_PALETTES[presetKey] : PRESET_PALETTES[presetKey];

  // Resolve tokens with strict hex re-validation at render time
  const custom = theme?.tokens;
  const tokens: PaletteTokens = {
    primary: sanitizeColor(custom?.primary, basePreset.primary),
    secondary: sanitizeColor(custom?.secondary, basePreset.secondary),
    background: sanitizeColor(custom?.background, basePreset.background),
    surface: sanitizeColor(custom?.surface, basePreset.surface),
    text: sanitizeColor(custom?.text, basePreset.text),
    muted: sanitizeColor(custom?.muted, basePreset.muted),
  };

  // Validate font choice against allowlist; default to system-sans
  const font: AllowedFont =
    theme?.font && (FONT_ALLOWLIST as readonly string[]).includes(theme.font)
      ? (theme.font as AllowedFont)
      : "system-sans";

  const fontFamily = FONT_FAMILIES[font];

  // Fonts: Plain link with display=swap, no inline JS. system-sans loads no external font.
  let fontLinkTag = "";
  const googleFontParam = GOOGLE_FONT_NAMES[font];
  if (googleFontParam) {
    fontLinkTag = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${googleFontParam}&display=swap">`;
  }

  // Generate safe CSS variables block
  const cssVariables = `
    --color-primary: ${tokens.primary};
    --color-secondary: ${tokens.secondary};
    --color-background: ${tokens.background};
    --color-surface: ${tokens.surface};
    --color-text: ${tokens.text};
    --color-muted: ${tokens.muted};
    --font-family: ${fontFamily};
  `;

  return {
    tokens,
    font,
    fontFamily,
    fontLinkTag,
    isDark,
    cssVariables,
  };
}
