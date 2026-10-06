import { AboutSection } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr } from "../engine/html.js";
import { renderImage } from "../engine/asset.js";
import { RenderContext } from "../engine/context.js";

export function renderAbout(section: AboutSection, ctx: RenderContext): SafeHtml {
  const imageHtml = section.image
    ? renderImage({
        asset: section.image,
        resolver: ctx.assetResolver,
        isAboveFold: false,
        className: "about-img",
      })
    : "";

  return html`<section id="${escapeAttr(section.id)}" class="section section-about">
    <div class="container about-container">
      <div class="about-content">
        <h2 class="section-title">${section.title}</h2>
        <div class="about-text">
          <p>${section.content}</p>
        </div>
      </div>
      ${section.image ? html`<div class="about-media">${imageHtml}</div>` : ""}
    </div>
  </section>`;
}
