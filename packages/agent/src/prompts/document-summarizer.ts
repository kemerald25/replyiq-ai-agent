import { SiteDocument } from "@replyiq/schema";
import { sanitizeDocumentText } from "./sanitizer.js";

/**
 * Produces a compact, token-efficient summary of the current SiteDocument.
 * This avoids feeding unbounded JSON into the model context while giving the LLM
 * all the section IDs, service names, and prices it needs to generate precise operations.
 */
export function summarizeSiteDocument(doc: SiteDocument): string {
  const lines: string[] = [];

  lines.push(`Title: "${sanitizeDocumentText(doc.metadata.title)}"`);
  if (doc.metadata.description) {
    lines.push(`Tagline: "${sanitizeDocumentText(doc.metadata.description)}"`);
  }
  lines.push(`Subdomain: "${doc.subdomain}" | Template: "${doc.template}"`);
  lines.push(
    `Theme: palette="${doc.theme.palette}", font="${doc.theme.font}", mode="${doc.theme.mode}"` +
      (doc.theme.tokens?.primary ? `, primary="${doc.theme.tokens.primary}"` : "")
  );

  if (doc.contact) {
    lines.push(`Contact: WhatsApp="${doc.contact.whatsappNumber}"`);
  }

  lines.push(`Sections (${doc.sections.length}):`);
  for (const section of doc.sections) {
    switch (section.type) {
      case "hero": {
        lines.push(
          `  - [id: ${section.id}] type: "hero", heading: "${sanitizeDocumentText(section.heading)}"` +
            (section.subheading ? `, subheading: "${sanitizeDocumentText(section.subheading)}"` : "")
        );
        break;
      }
      case "about": {
        lines.push(`  - [id: ${section.id}] type: "about", title: "${sanitizeDocumentText(section.title)}"`);
        break;
      }
      case "services": {
        const items = section.items
          .map((i) => `"${sanitizeDocumentText(i.name)}": ${i.price !== undefined ? `${i.currency} ${i.price}` : "no price"}`)
          .join(", ");
        lines.push(`  - [id: ${section.id}] type: "services", title: "${sanitizeDocumentText(section.title)}", items: [${items}]`);
        break;
      }
      case "gallery": {
        lines.push(`  - [id: ${section.id}] type: "gallery", title: "${sanitizeDocumentText(section.title)}", images: ${section.images.length}`);
        break;
      }
      case "testimonials": {
        lines.push(`  - [id: ${section.id}] type: "testimonials", title: "${sanitizeDocumentText(section.title)}", count: ${section.items.length}`);
        break;
      }
      case "faq": {
        lines.push(`  - [id: ${section.id}] type: "faq", title: "${sanitizeDocumentText(section.title)}", questions: ${section.items.length}`);
        break;
      }
      case "contact": {
        lines.push(`  - [id: ${section.id}] type: "contact", title: "${sanitizeDocumentText(section.title)}"`);
        break;
      }
      case "footer": {
        lines.push(`  - [id: ${section.id}] type: "footer"`);
        break;
      }
      default: {
        lines.push(`  - [id: ${(section as any).id}] type: "${(section as any).type}"`);
        break;
      }
    }
  }

  return lines.join("\n");
}
