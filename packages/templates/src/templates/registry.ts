import { SiteDocument, TemplateId } from "@replyiq/schema";
import { SafeHtml } from "../engine/html.js";
import { RenderContext } from "../engine/context.js";
import { portfolioTemplate } from "./portfolio/index.js";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  render(doc: SiteDocument, ctx: RenderContext): SafeHtml;
  getStyles(): string;
}

export const templateRegistry: Record<TemplateId, TemplateDefinition> = {
  portfolio: portfolioTemplate,
};

export function getTemplate(templateId: TemplateId): TemplateDefinition {
  const tpl = templateRegistry[templateId];
  if (!tpl) {
    // Fallback to portfolio if unexpected
    return portfolioTemplate;
  }
  return tpl;
}
