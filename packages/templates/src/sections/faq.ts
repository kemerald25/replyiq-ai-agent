import { FaqSection } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr } from "../engine/html.js";
import { RenderContext } from "../engine/context.js";

export function renderFaq(section: FaqSection, _ctx: RenderContext): SafeHtml {
  const itemsHtml = section.items.map(
    (item) =>
      html`<details id="${escapeAttr(item.id)}" class="faq-item card">
        <summary class="faq-question">
          <span>${item.question}</span>
          <span class="faq-chevron" aria-hidden="true">▾</span>
        </summary>
        <div class="faq-answer">
          <p>${item.answer}</p>
        </div>
      </details>`,
  );

  return html`<section id="${escapeAttr(section.id)}" class="section section-faq">
    <div class="container container-narrow">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
      </div>
      <div class="faq-list">${itemsHtml}</div>
    </div>
  </section>`;
}
