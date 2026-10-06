/**
 * Branded static error pages for ReplyIQ edge worker.
 * Follows core rules:
 * - Zero client JavaScript
 * - Inlined self-contained CSS
 * - Mobile-first layout with clean typography
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderNotFoundPage(baseDomain: string, slug?: string): string {
  const safeSlug = slug ? escapeHtml(slug) : "";
  const message = safeSlug
    ? `The website <strong>${safeSlug}.${escapeHtml(baseDomain)}</strong> does not exist or has not been published yet.`
    : "The page you are looking for does not exist.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Not Found — ReplyIQ</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
    }
    .container {
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    p {
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    p strong {
      color: #e2e8f0;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">404 Not Found</div>
    <h1>Site Not Found</h1>
    <p>${message}</p>
    <div class="footer">
      Powered by <a href="https://${escapeHtml(baseDomain)}">ReplyIQ</a> &bull; Fast WhatsApp Websites
    </div>
  </div>
</body>
</html>`;
}

export function renderSuspendedPage(baseDomain: string, reason?: string | null): string {
  const safeReason = reason
    ? escapeHtml(reason)
    : "This website has been temporarily suspended by the platform administrator.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Website Unavailable — ReplyIQ</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
    }
    .container {
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #e11d48;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #e11d48;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    p {
      color: #cbd5e1;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .notice {
      background: rgba(225, 29, 72, 0.1);
      border-left: 3px solid #e11d48;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.875rem;
      color: #fda4af;
      margin-bottom: 1.5rem;
      border-radius: 0 0.5rem 0.5rem 0;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">403 Forbidden</div>
    <h1>Website Unavailable</h1>
    <p>This website is currently inactive or under moderation review.</p>
    <div class="notice">
      ${safeReason}
    </div>
    <div class="footer">
      Notice provided by <a href="https://${escapeHtml(baseDomain)}">ReplyIQ</a>
    </div>
  </div>
</body>
</html>`;
}

export function renderLocalDevLandingPage(
  baseDomain: string,
  projects: Array<{ slug: string; name: string; template: string }> = []
): string {
  const safeBase = escapeHtml(baseDomain);
  const itemsHtml =
    projects.length > 0
      ? projects
          .map(
            (p) => `
      <li>
        <a href="http://${escapeHtml(p.slug)}.${safeBase}:8787">${escapeHtml(p.slug)}.${safeBase}:8787</a>
        <span class="tag">${escapeHtml(p.template || "site")}</span>
      </li>`
          )
          .join("")
      : `<li><span style="color: #94a3b8;">No live sites in local D1. Run: <code>npm run sites:seed</code></span></li>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReplyIQ Local Development</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .container {
      max-width: 560px;
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    ul { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
    li {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    a {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
    }
    a:hover { text-decoration: underline; }
    .tag {
      font-size: 0.75rem;
      background: #1e293b;
      color: #94a3b8;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid #475569;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.8125rem;
      color: #64748b;
      text-align: center;
    }
    code {
      background: #0f172a;
      color: #38bdf8;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.775rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Local Development Server</div>
    <h1>⚡ ReplyIQ Sites Worker</h1>
    <p>Sites in local D1 database. Click any live site below:</p>
    <ul>
      ${itemsHtml}
    </ul>
    <div class="footer">
      Tip: In local dev, query override also works: <code>?site=&lt;slug&gt;</code>
    </div>
  </div>
</body>
</html>`;
}
