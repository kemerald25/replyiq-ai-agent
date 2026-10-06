import { AssetResolver } from "./asset.js";

export type RenderMode = "preview" | "live";

export interface RenderContext {
  mode: RenderMode;
  canonicalUrl: string;
  assetResolver: AssetResolver;
  showBranding: boolean;
}

export type RenderResult = { ok: true; html: string } | { ok: false; errors: string[] };
