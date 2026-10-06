import { ContactSection, buildWhatsAppLink } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr, safeHref } from "../engine/html.js";
import { RenderContext } from "../engine/context.js";

export function renderContact(section: ContactSection, _ctx: RenderContext): SafeHtml {
  const whatsappHtml = section.whatsappNumber
    ? html`<div class="contact-method card">
        <h3 class="contact-method-title">WhatsApp</h3>
        <p class="contact-method-value">
          <a
            href="${safeHref(buildWhatsAppLink(section.whatsappNumber, "Hello! I am contacting you from your website."))}"
            class="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat with us on WhatsApp (${section.whatsappNumber})
          </a>
        </p>
      </div>`
    : "";

  const emailHtml = section.email
    ? html`<div class="contact-method card">
        <h3 class="contact-method-title">Email</h3>
        <p class="contact-method-value">
          <a href="${escapeAttr(`mailto:${section.email}`)}" class="contact-link">
            ${section.email}
          </a>
        </p>
      </div>`
    : "";

  const addressHtml = section.address
    ? html`<div class="contact-method card">
        <h3 class="contact-method-title">Location</h3>
        <address class="contact-address">${section.address}</address>
      </div>`
    : "";

  const socialLinksHtml =
    section.socialLinks && section.socialLinks.length > 0
      ? html`<div class="contact-socials">
          <h3 class="contact-socials-title">Follow Us</h3>
          <ul class="social-links-list">
            ${section.socialLinks.map(
              (s) =>
                html`<li>
                  <a
                    href="${safeHref(s.url)}"
                    class="social-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${s.platform}
                  </a>
                </li>`,
            )}
          </ul>
        </div>`
      : "";

  return html`<section id="${escapeAttr(section.id)}" class="section section-contact">
    <div class="container container-narrow">
      <div class="section-header">
        <h2 class="section-title">${section.title}</h2>
        ${section.description ? html`<p class="section-subtitle">${section.description}</p>` : ""}
      </div>
      <div class="contact-grid">${whatsappHtml} ${emailHtml} ${addressHtml}</div>
      ${socialLinksHtml}
    </div>
  </section>`;
}
