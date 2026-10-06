import { FooterSection } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr, safeHref } from "../engine/html.js";
import { RenderContext } from "../engine/context.js";

export function renderFooter(section: FooterSection, ctx: RenderContext): SafeHtml {
  const linksHtml =
    section.links && section.links.length > 0
      ? html`<ul class="footer-links">
          ${section.links.map(
            (link) =>
              html`<li>
                <a
                  href="${safeHref(link.url)}"
                  class="footer-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${link.label}
                </a>
              </li>`,
          )}
        </ul>`
      : "";

  const brandingHtml = ctx.showBranding
    ? html`<div class="footer-branding">
        <a
          href="https://replyiq.cv"
          target="_blank"
          rel="noopener noreferrer"
          class="branding-link"
        >
          Built with <strong>ReplyIQ</strong>
        </a>
      </div>`
    : "";

  return html`<footer id="${escapeAttr(section.id)}" class="site-footer">
    <div class="container footer-container">
      ${section.copyrightText ? html`<p class="footer-copyright">${section.copyrightText}</p>` : ""}
      ${linksHtml} ${brandingHtml}
    </div>
  </footer>`;
}
