# ReplyIQ

> **WhatsApp-first website creator for Nigerian small businesses, creatives, and students.**

ReplyIQ allows business owners to create, publish, and update fast, mobile-friendly websites entirely by chatting on WhatsApp. Site visitors can browse services, portfolios, and testimonials, and instantly start a conversation with the owner through direct WhatsApp links.

---

## Core Architectural Principle

> **"AI edits content JSON only, never template code."**

1. **Strict Content/Presentation Separation**: The AI agent NEVER generates, edits, or injects HTML, CSS, client-side scripts, or template logic. It acts solely as an intelligent content editor operating on a typed, versioned JSON document (`SiteDocument`).
2. **Deterministic Static Rendering**: Prebuilt, audited, accessible templates (`@replyiq/templates`) consume the validated `SiteDocument` and emit lightweight static HTML optimized for low-bandwidth mobile networks in Nigeria.
3. **Immutability & Atomic Batch Edits**: Updates are applied via typed operations (`Operation`). Modifications are completely atomic—if any single edit in a batch fails validation or constraints, the entire batch rolls back, leaving the document unchanged.
4. **Single Configuration Constant**: All user sites are hosted on subdomains of the base domain (`replyiq.cv`), which is defined as a single configuration constant and never hardcoded.

---

## Monorepo Layout

This repository uses **npm workspaces** with a single `package-lock.json` at the root:

```text
replyiq-ai-agent/
├── AGENTS.md                  # System rules, AI editing principles, constants, guidelines
├── README.md                  # Monorepo overview and developer guide
├── package.json               # Root scripts and npm workspace configuration
├── tsconfig.base.json         # Strict TypeScript configuration (NodeNext, ES2022)
├── eslint.config.js           # Modern ESLint flat config with typescript-eslint
├── vitest.config.ts           # Vitest configuration with coverage enforcement (>90%)
├── apps/
│   └── .gitkeep               # Placeholder for future services (webhook listener, publisher)
└── packages/
    ├── schema/                # Canonical SiteDocument schema, validations, and operations
    │   ├── src/
    │   │   ├── config.ts      # Single BASE_DOMAIN constant and system limits
    │   │   ├── common/        # Text safety, Asset IDs, safe URLs, phone normalizer, slug validator
    │   │   ├── theme/         # Curated palette tokens and font allowlists (no arbitrary CSS)
    │   │   ├── sections/      # Discriminated union of sections (one-file extensibility)
    │   │   ├── document.ts    # Canonical SiteDocument schema & validators
    │   │   ├── operations/    # Atomic AI edit operations runner (applyOperations)
    │   │   └── migrations/    # Versioned schema migration runner
    │   ├── tests/             # Comprehensive test suites (100% statement coverage)
    │   └── README.md          # Extension guide for adding sections and operations
    └── templates/             # Prebuilt static HTML/CSS templates (placeholder)
```

---

## Security & Validation Rules

- **Plain-Text Safety**: All user-facing text fields reject tag-like HTML patterns (`<script>`, `<div>`, `<!...`), control characters, and Unicode bidirectional override characters. Emojis and Nigerian language diacritics (Yorùbá, Igbo, Hausa) pass cleanly.
- **Asset ID Containment**: Images are referenced solely by managed Asset IDs (`asset_<identifier>`), never by arbitrary external URLs.
- **Strict Link Protocols**: External links are strictly confined to `https://` or `wa.me/` URLs. Pseudo-protocols (`javascript:`, `data:`) and unencrypted `http://` are rejected.
- **Nigerian Phone Normalization**: Accepts common Nigerian phone patterns (`0803...`, `+234803...`, `234803...`, `(0803)...`) and outputs standardized E.164 (`+234...`). Also accepts valid international E.164 numbers.
- **Subdomain Protection**: Subdomain slugs are validated for length, hyphen positioning, and against a comprehensive list of reserved infrastructure names (`api`, `admin`, `console`, `dashboard`, `auth`, etc.).
- **Worker & Node Compatibility**: The TypeScript base configuration excludes the browser `DOM` library, ensuring code runs safely on both Cloudflare Workers and Node.js LTS without accidental references to `window` or `document`.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22` recommended; see [.nvmrc](file:///.nvmrc))
- **npm**: `v10.0.0` or higher

```bash
# If using nvm
nvm use

# Install dependencies (workspaces root)
npm install
```

### Development Scripts

From the repository root, run:

| Command                | Description                                                               |
| :--------------------- | :------------------------------------------------------------------------ |
| `npm run build`        | Compiles all packages across the workspace via TypeScript                 |
| `npm run test`         | Runs all test suites with Vitest and generates v8 coverage reports        |
| `npm run lint`         | Lints all TypeScript and JavaScript files using ESLint flat config        |
| `npm run typecheck`    | Performs workspace-wide typechecking across project references (`tsc -b`) |
| `npm run format:check` | Verifies code formatting with Prettier                                    |
| `npm run format`       | Auto-formats the codebase with Prettier                                   |

---

## Testing & Quality Expectations

- **Coverage Requirement**: The repository enforces a minimum of **90% coverage** across lines, functions, statements, and branches in core packages.
- **Current Coverage**: `packages/schema` currently maintains **100% statement, line, and function coverage** across 121 unit and integration tests.

To run the test suite and inspect coverage:

```bash
npm run test
```

---

## Guidelines for AI Agents & Contributors

- **Read [AGENTS.md](file:///AGENTS.md)** before writing any code.
- **Never add dependencies** without explicit discussion and technical justification.
- **Adding new section types or edit operations**: Refer to the walkthrough in [packages/schema/README.md](file:///packages/schema/README.md).
