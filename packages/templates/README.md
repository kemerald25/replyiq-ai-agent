# @replyiq/templates

Deterministic, accessible, zero-JavaScript static HTML/CSS templates for ReplyIQ.

---

## Architectural Principles

1. **Pure & Deterministic**: `renderSite(document, context)` is a pure function with no I/O. The same `SiteDocument` and context always yield identical HTML.
2. **Zero Dependencies & Zero Client JS**: The template engine uses zero runtime libraries and renders completely static HTML without client-side scripts.
3. **Inlined CSS**: All styling is inlined into `<style>` in `<head>` using Vanilla CSS custom properties. No external stylesheets.
4. **Platform Portability**: Excludes the DOM library to run identically on Cloudflare Workers and Node.js LTS.
5. **Mobile-First & Low Bandwidth**: Optimized for Nigerian mobile devices (360px viewport upwards) and high-latency cellular connections. Total HTML + CSS remains under 40 KB for typical sites and under 100 KB for maximum-content stress test sites.

---

## How to Add a New Template

To create a new design template (e.g. `"minimal"` or `"commerce"`):

1. **Add to Schema Allowlist**:
   In `packages/schema/src/document.ts`, append the new template ID to `REGISTERED_TEMPLATES`:
   ```ts
   export const REGISTERED_TEMPLATES = ["portfolio", "minimal"] as const;
   ```
2. **Create Template Directory**:
   Create `packages/templates/src/templates/<template-name>/` containing:
   - `styles.ts`: Pure CSS string returning responsive styles.
   - `layout.ts`: Functional layout combining header, sections, and footer.
   - `index.ts`: Exports `id`, `name`, `render`, and `getStyles`.
3. **Register in Template Registry**:
   In `packages/templates/src/templates/registry.ts`, import your template and register it in `templateRegistry`:
   ```ts
   export const templateRegistry: Record<TemplateId, TemplateDefinition> = {
     portfolio: portfolioTemplate,
     minimal: minimalTemplate,
   };
   ```

Because section components are shared across templates, adding a new template is primarily an exercise in layout and CSS styling.

---

## How to Add a New Section Renderer

When a new section type is added to `@replyiq/schema`, TypeScript will immediately flag an **exhaustive check compile error** in `packages/templates/src/sections/registry.ts` via `assertNever(section)`.

To add the renderer:

1. Create `packages/templates/src/sections/<section-type>.ts`:
   ```ts
   import { YourNewSection } from "@replyiq/schema";
   import { html, SafeHtml, escapeAttr } from "../engine/html.js";
   import { RenderContext } from "../engine/context.js";

   export function renderYourNewSection(section: YourNewSection, ctx: RenderContext): SafeHtml {
     return html`<section id="${escapeAttr(section.id)}" class="section section-new">
       <div class="container">
         <h2>${section.title}</h2>
       </div>
     </section>`;
   }
   ```
2. Add a `case` in `packages/templates/src/sections/registry.ts`:
   ```ts
   case "your_new_type":
     return renderYourNewSection(section, ctx);
   ```

---

## Local Dev Server & Preview Tooling

To render the 5 sample documents (`salon`, `student`, `tailor`, `minimal`, `stress`) and launch the zero-dependency local preview server:

```bash
npm run preview
```

- Binds to `0.0.0.0` on port `3000` (falls back to `3030` if port 3000 is occupied).
- Accessible on desktop at `http://localhost:3000`.
- Accessible on your mobile phone on the same local Wi-Fi at `http://<your-network-ip>:3000`.
- Output HTML files are written to `.preview/` (git-ignored).
- Defends against path traversal by serving only exact filenames in the `.preview/` catalog.

---

## Manual Lighthouse Audit Checklist (Mobile Target: $\ge 95$)

Before releasing any template or layout change, run Google Chrome DevTools Lighthouse in **Mobile Mode** (simulated Moto G Power / Slow 4G throttling):

### 1. Performance Target ($\ge 95$)

- [ ] **First Contentful Paint (FCP) < 1.8s**: Zero external scripts, zero external CSS files blocking render.
- [ ] **Largest Contentful Paint (LCP) < 2.5s**: Hero image uses `loading="eager"`, `fetchpriority="high"`, and explicit `width`/`height`.
- [ ] **Cumulative Layout Shift (CLS) = 0**: All `<img>` tags declare native `width` and `height` dimensions.
- [ ] **Total Blocking Time (TBT) = 0ms**: No client JavaScript executes on the main thread.
- [ ] **Transfer Size < 40 KB**: Total page payload (HTML + CSS) must remain under budget.

### 2. Accessibility Target ($\ge 95$)

- [ ] **Heading Hierarchy**: Exactly one `<h1>` tag present on the page. All sub-headings follow a clean `<h2>` $\rightarrow$ `<h3>` sequence.
- [ ] **Contrast Ratio**: Body text satisfies WCAG AA ($\ge 4.5:1$) on both light and dark backgrounds.
- [ ] **Landmarks**: Valid `<header>`, `<nav>`, `<main id="main-content">`, `<section>`, and `<footer>` elements present.
- [ ] **Keyboard Navigation**: Skip link (`.skip-link`) jumps directly to `#main-content`. All interactive buttons and links feature high-contrast `:focus-visible` outlines.
- [ ] **Motion Sensitivity**: `@media (prefers-reduced-motion: reduce)` disables smooth scrolling and animations.
- [ ] **Image Descriptions**: Every `<img>` has a descriptive, non-empty `alt` attribute.

### 3. Best Practices & SEO ($\ge 95$)

- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0">` included in `<head>`.
- [ ] Valid `<title>` and `<meta name="description">` populated.
- [ ] Open Graph and Twitter summary meta tags present in live mode.
- [ ] Tap targets (buttons, links) are at least 48px by 48px on touchscreens.
