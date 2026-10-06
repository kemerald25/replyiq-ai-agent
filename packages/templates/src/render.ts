import { validateSiteDocument, SiteDocument, TemplateId } from "@replyiq/schema";
import { RenderContext, RenderResult } from "./engine/context.js";
import { escapeHtml, escapeAttr } from "./engine/html.js";
import { resolveTheme } from "./engine/theme.js";
import { getTemplate } from "./templates/registry.js";

/**
 * Pure, deterministic site renderer.
 *
 * Rules:
 * 1. Validates document first; returns { ok: false, errors } on failure.
 * 2. Deterministic: identical input yields byte-for-byte identical output.
 * 3. Zero JavaScript: rendered HTML contains no client scripts.
 * 4. Self-contained: CSS is strictly inlined in <style> without external stylesheets.
 * 5. Strict security: user text is HTML-escaped and NEVER placed in <style> or attribute contexts directly.
 */
export function renderSite(document: unknown, context: RenderContext): RenderResult {
  const validation = validateSiteDocument(document);
  if (!validation.valid) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const doc: SiteDocument = validation.document;

  // Resolve theme with strict hex-color revalidation
  const theme = resolveTheme(doc.theme);

  // Retrieve template from registry (defaults to "portfolio")
  const templateId: TemplateId = doc.template || "portfolio";
  const template = getTemplate(templateId);

  // SEO & Head Metadata
  const langAttr = escapeAttr(doc.metadata.language || "en");
  const titleText = escapeHtml(doc.metadata.title);
  const descriptionAttr = escapeAttr(doc.metadata.description);

  let robotsTag = "";
  let canonicalTag = "";
  let openGraphTags = "";

  if (context.mode === "preview") {
    robotsTag = `<meta name="robots" content="noindex, nofollow">\n`;
  } else {
    robotsTag = `<meta name="robots" content="index, follow">\n`;
    if (context.canonicalUrl) {
      const canonicalEscaped = escapeAttr(context.canonicalUrl);
      canonicalTag = `<link rel="canonical" href="${canonicalEscaped}">\n`;
      openGraphTags = `
    <meta property="og:type" content="website">
    <meta property="og:title" content="${titleText}">
    <meta property="og:description" content="${descriptionAttr}">
    <meta property="og:url" content="${canonicalEscaped}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${titleText}">
    <meta name="twitter:description" content="${descriptionAttr}">\n`;
    }
  }

  // Render template body
  const bodyContent = template.render(doc, context);

  // Assemble full HTML document
  const htmlOutput = `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
    <meta name="description" content="${descriptionAttr}">
    ${robotsTag}${canonicalTag}${openGraphTags}${theme.fontLinkTag ? `    ${theme.fontLinkTag}\n` : ""}    <style>
      :root {${theme.cssVariables}}
      ${template.getStyles()}
    </style>
</head>
<body class="${theme.isDark ? "dark" : "light"}">
${bodyContent.value}
</body>
</html>`;

  return {
    ok: true,
    html: htmlOutput,
  };
}
