import { SiteDocument } from "@replyiq/schema";
import { SafeHtml } from "../../engine/html.js";
import { RenderContext } from "../../engine/context.js";
import { renderPortfolioLayout } from "./layout.js";
import { getPortfolioStyles } from "./styles.js";

export const portfolioTemplate = {
  id: "portfolio" as const,
  name: "Portfolio",
  render(doc: SiteDocument, ctx: RenderContext): SafeHtml {
    return renderPortfolioLayout(doc, ctx);
  },
  getStyles(): string {
    return getPortfolioStyles();
  },
};
