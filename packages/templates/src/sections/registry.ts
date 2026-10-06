import { Section } from "@replyiq/schema";
import { SafeHtml } from "../engine/html.js";
import { RenderContext } from "../engine/context.js";
import { renderHero } from "./hero.js";
import { renderAbout } from "./about.js";
import { renderServices } from "./services.js";
import { renderGallery } from "./gallery.js";
import { renderTestimonials } from "./testimonials.js";
import { renderFaq } from "./faq.js";
import { renderContact } from "./contact.js";
import { renderFooter } from "./footer.js";

/**
 * Type-level exhaustiveness assertion.
 * If a new section type is added to @replyiq/schema, this triggers a TypeScript compile error.
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled section type: ${JSON.stringify(value)}`);
}

/**
 * Renders any Section from the discriminated union.
 * Uses an exhaustive switch to enforce compile-time completeness.
 */
export function renderSection(section: Section, ctx: RenderContext): SafeHtml {
  switch (section.type) {
    case "hero":
      return renderHero(section, ctx);
    case "about":
      return renderAbout(section, ctx);
    case "services":
      return renderServices(section, ctx);
    case "gallery":
      return renderGallery(section, ctx);
    case "testimonials":
      return renderTestimonials(section, ctx);
    case "faq":
      return renderFaq(section, ctx);
    case "contact":
      return renderContact(section, ctx);
    case "footer":
      return renderFooter(section, ctx);
    default:
      return assertNever(section);
  }
}
