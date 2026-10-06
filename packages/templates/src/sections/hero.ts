import { HeroSection } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr, safeHref } from "../engine/html.js";
import { renderImage } from "../engine/asset.js";
import { RenderContext } from "../engine/context.js";

export function renderHero(section: HeroSection, ctx: RenderContext): SafeHtml {
  const imageHtml = section.image
    ? renderImage({
        asset: section.image,
        resolver: ctx.assetResolver,
        isAboveFold: true,
        className: "hero-img",
      })
    : "";

  const ctaHtml =
    section.cta && section.cta.label
      ? html`<div class="hero-actions">
          <a
            href="${safeHref(section.cta.url)}"
            class="btn btn-primary btn-cta"
            rel="noopener noreferrer"
          >
            ${section.cta.label}
          </a>
        </div>`
      : "";

  return html`<section id="${escapeAttr(section.id)}" class="section section-hero">
    <div class="container hero-container">
      <div class="hero-content">
        <h1 class="hero-heading">${section.heading}</h1>
        ${section.subheading ? html`<p class="hero-subheading">${section.subheading}</p>` : ""}
        ${ctaHtml}
      </div>
      ${section.image ? html`<div class="hero-media">${imageHtml}</div>` : ""}
    </div>
  </section>`;
}
