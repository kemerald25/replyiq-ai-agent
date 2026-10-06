import { SiteDocument, buildWhatsAppLink } from "@replyiq/schema";
import { html, SafeHtml, escapeAttr, safeHref, raw } from "../../engine/html.js";
import { RenderContext } from "../../engine/context.js";
import { renderSection } from "../../sections/registry.js";

/**
 * Returns a human-readable title for a section to display in the navigation bar.
 */
function getSectionNavLabel(section: SiteDocument["sections"][number]): string | null {
  switch (section.type) {
    case "hero":
      return null; // Hero doesn't need a nav link
    case "about":
      return section.title || "About";
    case "services":
      return section.title || "Services";
    case "gallery":
      return section.title || "Gallery";
    case "testimonials":
      return section.title || "Testimonials";
    case "faq":
      return section.title || "FAQ";
    case "contact":
      return section.title || "Contact";
    case "footer":
      return null;
    default:
      return null;
  }
}

/**
 * Clean WhatsApp SVG icon.
 */
const WHATSAPP_SVG_ICON = `<svg class="whatsapp-icon" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

export function renderPortfolioLayout(doc: SiteDocument, ctx: RenderContext): SafeHtml {
  const hasHero = doc.sections.some((s) => s.type === "hero");

  // Build navigation strictly from the document's actual sections
  const navItems = doc.sections
    .map((section) => {
      const label = getSectionNavLabel(section);
      if (!label) return null;
      return html`<a href="#${escapeAttr(section.id)}" class="nav-link">${label}</a>`;
    })
    .filter(Boolean);

  const navHtml =
    navItems.length > 0
      ? html`<nav class="site-nav" aria-label="Site Navigation">${navItems}</nav>`
      : "";

  // Logo tag: exactly one <h1> per page. If hero exists, hero gets h1. Otherwise logo gets h1.
  const logoHtml = hasHero
    ? html`<span class="site-logo">${doc.metadata.title}</span>`
    : html`<h1 class="site-logo">${doc.metadata.title}</h1>`;

  // Render sections
  const renderedSections = doc.sections.map((section) => renderSection(section, ctx));

  // Floating WhatsApp button
  const whatsappUrl = buildWhatsAppLink(doc.contact.whatsappNumber, doc.contact.defaultMessage);
  const floatingWhatsappHtml = html`<a
    href="${safeHref(whatsappUrl)}"
    class="floating-whatsapp"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat with ${doc.metadata.title} on WhatsApp"
  >
    ${raw(WHATSAPP_SVG_ICON)}
  </a>`;

  return html`
    <!-- Skip to main content link for keyboard & screen reader accessibility -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    ${
      ctx.mode === "preview"
        ? html`<div class="preview-ribbon" role="status">
            Preview Mode &mdash; Site Not Published
          </div>`
        : ""
    }

    <header class="site-header">
      <div class="container header-container">${logoHtml} ${navHtml}</div>
    </header>

    <main id="main-content">${renderedSections}</main>

    ${floatingWhatsappHtml}
  `;
}
