import { ServicesSection, ServiceItem } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr } from "../engine/html.js";
import { formatPrice } from "../engine/formatters.js";
import { renderImage } from "../engine/asset.js";
import { RenderContext } from "../engine/context.js";

function renderServiceItem(item: ServiceItem, ctx: RenderContext): SafeHtml {
  const imageHtml = item.image
    ? renderImage({
        asset: item.image,
        resolver: ctx.assetResolver,
        isAboveFold: false,
        className: "service-item-img",
      })
    : "";

  const priceHtml =
    item.price !== undefined
      ? html`<div class="service-price">
          ${formatPrice(item.price, item.currency || "NGN", item.priceLabel)}
        </div>`
      : "";

  return html`<article id="${escapeAttr(item.id)}" class="service-card card">
    ${item.image ? html`<div class="service-media">${imageHtml}</div>` : ""}
    <div class="service-card-body">
      <h3 class="service-name">${item.name}</h3>
      ${item.description ? html`<p class="service-desc">${item.description}</p>` : ""} ${priceHtml}
    </div>
  </article>`;
}

export function renderServices(section: ServicesSection, ctx: RenderContext): SafeHtml {
  const itemsHtml = section.items.map((item) => renderServiceItem(item, ctx));

  return html`<section id="${escapeAttr(section.id)}" class="section section-services">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.subtitle ? html`<p class="section-subtitle">${section.subtitle}</p>` : ""}
      </div>
      <div class="services-grid grid">${itemsHtml}</div>
    </div>
  </section>`;
}
