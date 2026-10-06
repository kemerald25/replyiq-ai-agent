import { GallerySection } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr } from "../engine/html.js";
import { renderImage } from "../engine/asset.js";
import { RenderContext } from "../engine/context.js";

export function renderGallery(section: GallerySection, ctx: RenderContext): SafeHtml {
  const imagesHtml = section.images.map(
    (image) =>
      html`<figure class="gallery-item">
        ${renderImage({
          asset: image,
          resolver: ctx.assetResolver,
          isAboveFold: false,
          className: "gallery-img",
        })}
        ${image.caption ? html`<figcaption class="gallery-caption">${image.caption}</figcaption>` : ""}
      </figure>`,
  );

  return html`<section id="${escapeAttr(section.id)}" class="section section-gallery">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.description ? html`<p class="section-subtitle">${section.description}</p>` : ""}
      </div>
      <div class="gallery-grid grid">${imagesHtml}</div>
    </div>
  </section>`;
}
