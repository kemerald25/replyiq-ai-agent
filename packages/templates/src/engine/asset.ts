import { ImageAsset } from "@replyiq/schema";
import { html, SafeHtml } from "./html.js";

export interface ResolvedAsset {
  url: string;
  width: number;
  height: number;
  srcset?: string;
}

export type AssetResolver = (assetId: string) => ResolvedAsset | null;

export interface RenderImageOptions {
  asset?: ImageAsset | null;
  resolver: AssetResolver;
  isAboveFold?: boolean;
  className?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

/**
 * Renders an image using resolved CDN details or a neutral fallback placeholder.
 *
 * Rules:
 * 1. Missing or unresolvable assets degrade to a neutral placeholder, never a broken image.
 * 2. Uses explicit width and height attributes to avoid layout shifts (CLS).
 * 3. Uses loading="lazy" for all images except above-the-fold heroes.
 * 4. Includes srcset if provided by the resolver.
 */
export function renderImage(options: RenderImageOptions): SafeHtml {
  const {
    asset,
    resolver,
    isAboveFold = false,
    className = "",
    defaultWidth = 600,
    defaultHeight = 400,
  } = options;

  if (asset && asset.assetId) {
    const resolved = resolver(asset.assetId);

    if (resolved && resolved.url) {
      const loading = isAboveFold ? "eager" : "lazy";

      return html`<img
        src="${resolved.url}"
        ${resolved.srcset ? html`srcset="${resolved.srcset}" ` : ""}width="${resolved.width || defaultWidth}"
        height="${resolved.height || defaultHeight}"
        alt="${asset.alt}"
        loading="${loading}"
        decoding="async"
        ${className ? html`class="${className}" ` : ""}
      />`;
    }
  }

  // Graceful degradation: Neutral placeholder when asset is missing or not resolved
  const altText = asset?.alt || "Image placeholder";
  const classNames = ["asset-placeholder", className].filter(Boolean).join(" ");

  return html`<div class="${classNames}" role="img" aria-label="${altText}">
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>`;
}
