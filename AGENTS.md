# AGENTS.md — ReplyIQ System Rules and Architecture

## Product Overview: ReplyIQ

ReplyIQ enables Nigerian small businesses, creatives, and students to create and maintain fast, mobile-first websites directly via WhatsApp conversation.

The base domain for user sites must be a single configuration constant, never hardcoded.

Sites are served on subdomains of the base domain (e.g. `business.replyiq.cv`). Site visitors communicate directly with the site owner through WhatsApp links; there are no integrated payments in v1.

---

## Core Architectural Principle

> **"AI edits content JSON only, never template code."**

1. **Strict Separation of Content and Presentation**:
   - The AI agent NEVER writes, modifies, or generates HTML, CSS, JSX, client scripts, or template logic.
   - The AI agent operates strictly as a content editor on a structured, strongly typed, and versioned JSON document (`SiteDocument`).
2. **Deterministic Prebuilt Templates**:
   - Static rendering is handled entirely by prebuilt, audited templates (`@replyiq/templates`).
   - Templates consume the validated `SiteDocument` and output lightweight, accessible, low-bandwidth static HTML.
3. **Immutability & Atomic Editing**:
   - Site modifications occur exclusively via typed edit operations (`Operation`).
   - Edits must be atomic: if any single operation in a batch fails validation or constraints, the entire batch is rejected and the document remains unchanged.
   - Documents are re-validated through the Zod schema before any state change is committed.

---

## Workspace & Package Management

1. **npm Workspaces Only**:
   - Use `npm` workspaces exclusively. Never use `pnpm`, `yarn`, or other package managers.
   - Maintain a single `package-lock.json` at the root.
2. **Ask Before Adding Dependencies**:
   - Every dependency introduces maintenance, bundle, and security overhead.
   - Never add a runtime or development dependency without explicit user discussion and technical justification.
   - Prefer standard library, modern TypeScript, and built-in Node.js APIs wherever possible.

---

## Repository Layout

- `apps/`: Future deployable applications (WhatsApp webhook listener, site builder/publisher).
- `packages/schema`: The source of truth for the `SiteDocument` schema, field limits, security sanitization, phone normalization, subdomain validation, typed edit operations, and schema migrations.
- `packages/templates`: Prebuilt, mobile-optimized HTML/CSS templates (placeholder in v1 foundation).

---

## Coding & Naming Conventions

- **TypeScript**: Strict mode enabled (`strict: true`, no implicit `any`, strict null checks, unchecked indexed access). Target ES2022+ with Node ESM (`NodeNext`).
- **File Names**: `kebab-case.ts` (e.g., `text-safety.ts`, `phone-normalizer.ts`, `hero-section.ts`).
- **Types & Interfaces**: `PascalCase` (e.g., `SiteDocument`, `Section`, `OperationResult`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `BASE_DOMAIN`, `MAX_SECTIONS_PER_DOCUMENT`).
- **Functions & Variables**: `camelCase` (e.g., `normalizeNigerianPhone`, `applyOperations`).
- **Discriminated Unions**: Discriminated on `"type"` using lowercase strings (e.g., `type: "hero"`).
- **Section Extensibility**: Adding a new section must be a one-file change in `packages/schema/src/sections/`.

---

## Testing Expectations

- **Framework**: Vitest with `@vitest/coverage-v8`.
- **Coverage**: Maintain at least 90% test coverage across statements, branches, functions, and lines in core packages.
- **Required Test Suites**:
  - Valid and invalid document fixtures.
  - Every boundary limit (string lengths, list lengths, section count limits).
  - Malicious input rejection (HTML tags, script patterns, control characters, bidi overrides).
  - Phone normalizer edge cases (Nigerian prefixes, spacing, country codes, international E.164 numbers).
  - Subdomain slug validation and reserved keyword collision checks.
  - All operation types and transaction atomicity (all-or-nothing rollback on error).
  - Schema migrations (e.g., v0 legacy document migration to current v1).
