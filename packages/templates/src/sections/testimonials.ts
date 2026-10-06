import { TestimonialsSection, TestimonialItem } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr } from "../engine/html.js";
import { renderImage } from "../engine/asset.js";
import { RenderContext } from "../engine/context.js";

function renderTestimonialCard(item: TestimonialItem, ctx: RenderContext): SafeHtml {
  const avatarHtml = item.avatar
    ? renderImage({
        asset: item.avatar,
        resolver: ctx.assetResolver,
        isAboveFold: false,
        className: "testimonial-avatar",
        defaultWidth: 80,
        defaultHeight: 80,
      })
    : "";

  return html`<blockquote id="${escapeAttr(item.id)}" class="testimonial-card card">
    <p class="testimonial-quote">“${item.quote}”</p>
    <footer class="testimonial-footer">
      ${item.avatar ? html`<div class="testimonial-media">${avatarHtml}</div>` : ""}
      <div class="testimonial-meta">
        <cite class="testimonial-author">${item.author}</cite>
        ${
          item.roleOrLocation
            ? html`<span class="testimonial-role">${item.roleOrLocation}</span>`
            : ""
        }
      </div>
    </footer>
  </blockquote>`;
}

export function renderTestimonials(section: TestimonialsSection, ctx: RenderContext): SafeHtml {
  const itemsHtml = section.items.map((item) => renderTestimonialCard(item, ctx));

  return html`<section id="${escapeAttr(section.id)}" class="section section-testimonials">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
      </div>
      <div class="testimonials-grid grid">${itemsHtml}</div>
    </div>
  </section>`;
}
