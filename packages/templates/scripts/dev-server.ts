import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { renderSite } from "../src/render.js";
import { allSampleDocuments } from "../src/samples/index.js";
import type { AssetResolver } from "../src/engine/asset.js";

const DEFAULT_PORT = 3000;
const FALLBACK_PORT = 3030;

// Resolve output directory at repository root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../");
const outputDir = path.resolve(repoRoot, ".preview");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Mock asset resolver for previewing
const mockAssetResolver: AssetResolver = (assetId: string) => ({
  url: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80`,
  width: 800,
  height: 600,
  srcset: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400 400w, https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800 800w`,
});

// Render the 5 sample documents to .preview/
const allowedFiles = new Set<string>(["index.html"]);

for (const [key, doc] of Object.entries(allSampleDocuments)) {
  const fileName = `${key}.html`;
  const result = renderSite(doc, {
    mode: "preview",
    canonicalUrl: `https://${doc.subdomain}.replyiq.cv`,
    assetResolver: mockAssetResolver,
    showBranding: true,
  });

  if (result.ok) {
    fs.writeFileSync(path.join(outputDir, fileName), result.html, "utf-8");
    allowedFiles.add(fileName);
    console.log(`✓ Rendered: ${fileName} (${(result.html.length / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`✗ Failed rendering ${key}:`, result.errors);
  }
}

// Generate index navigation page
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReplyIQ — Template Preview Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 680px; margin: 3rem auto; padding: 0 1rem; color: #111827; background: #f9fafb; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; color: #0f172a; }
    p { color: #475569; margin-bottom: 1.5rem; }
    .card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 1.25rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; text-decoration: none; color: inherit; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card:hover { border-color: #059669; }
    .title { font-weight: 600; font-size: 1.1rem; color: #0f172a; }
    .desc { font-size: 0.875rem; color: #64748b; }
    .badge { background: #ecfdf5; color: #059669; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 9999px; }
  </style>
</head>
<body>
  <h1>ReplyIQ Template Previews</h1>
  <p>Select any sample website below to preview in mobile or desktop view:</p>
  <a href="/salon.html" class="card">
    <div>
      <div class="title">1. Salon Business</div>
      <div class="desc">Amaka Luxe Hair Studio (Services, bookings, testimonials, WhatsApp)</div>
    </div>
    <span class="badge">View</span>
  </a>
  <a href="/student.html" class="card">
    <div>
      <div class="title">2. Student & Creative Portfolio</div>
      <div class="desc">Tunde Adeyemi — UI/UX & CS Student at UNILAG</div>
    </div>
    <span class="badge">View</span>
  </a>
  <a href="/tailor.html" class="card">
    <div>
      <div class="title">3. Bespoke Fashion Tailor</div>
      <div class="desc">Kolawole Bespoke — Lookbook gallery, Agbada collections, Dark mode</div>
    </div>
    <span class="badge">View</span>
  </a>
  <a href="/minimal.html" class="card">
    <div>
      <div class="title">4. Minimal Document</div>
      <div class="desc">Chidi Bakery Lagos — Single Hero section and WhatsApp contact</div>
    </div>
    <span class="badge">View</span>
  </a>
  <a href="/stress.html" class="card">
    <div>
      <div class="title">5. Maximum-Content Stress Document</div>
      <div class="desc">Apex Enterprises — 20 sections, 12 services, 12 gallery images, 8 testimonials, 10 FAQs</div>
    </div>
    <span class="badge">View</span>
  </a>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml, "utf-8");

// Zero-dependency HTTP server
function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

function startServer(port: number): void {
  const server = http.createServer((req, res) => {
    const rawUrl = req.url || "/";
    const parsedPath = rawUrl.split("?")[0]?.replace(/^\//, "") || "index.html";
    const cleanFile = parsedPath === "" ? "index.html" : parsedPath;

    // Strict path traversal defense: ONLY serve files explicitly listed in allowedFiles
    if (!allowedFiles.has(cleanFile)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const filePath = path.join(outputDir, cleanFile);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server Error");
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && port === DEFAULT_PORT) {
      console.warn(`Port ${DEFAULT_PORT} in use, attempting fallback to ${FALLBACK_PORT}...`);
      startServer(FALLBACK_PORT);
    } else {
      console.error(`Failed to bind server:`, err);
      process.exit(1);
    }
  });

  // Bind to 0.0.0.0 so phone on same local Wi-Fi can view
  server.listen(port, "0.0.0.0", () => {
    const ip = getLocalIp();
    console.log(`\n======================================================`);
    console.log(`🚀 ReplyIQ Template Dev Server Running!`);
    console.log(`- Local Desktop: http://localhost:${port}`);
    console.log(`- Local Network (Phone): http://${ip}:${port}`);
    console.log(`======================================================\n`);
  });
}

startServer(DEFAULT_PORT);
