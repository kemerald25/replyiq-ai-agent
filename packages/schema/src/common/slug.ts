import { z } from "zod";
import { BASE_DOMAIN } from "../config.js";

/**
 * Reserved subdomain slugs that cannot be claimed by user sites.
 * Prevents phishing, infrastructure collisions, and system route hijacking.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "console",
  "dashboard",
  "docs",
  "ftp",
  "help",
  "login",
  "mail",
  "ns1",
  "ns2",
  "onboard",
  "partners",
  "portal",
  "preview",
  "privacy",
  "replyiq",
  "root",
  "signup",
  "smtp",
  "status",
  "support",
  "terms",
  "www",
]);

export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 30;

/**
 * Enforces:
 * 1. Lowercase ASCII letters, numbers, and hyphens only
 * 2. Cannot start or end with a hyphen
 * 3. No consecutive hyphens
 * 4. Length between 3 and 30 characters
 * 5. Not in the reserved names list
 */
export function validateSubdomainSlug(
  slug: string,
): { valid: true; slug: string } | { valid: false; error: string } {
  if (typeof slug !== "string") {
    return { valid: false, error: "Subdomain slug must be a string" };
  }

  const trimmed = slug.trim().toLowerCase();

  if (trimmed.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Subdomain slug must be at least ${MIN_SLUG_LENGTH} characters long`,
    };
  }

  if (trimmed.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Subdomain slug must not exceed ${MAX_SLUG_LENGTH} characters`,
    };
  }

  if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
    return {
      valid: false,
      error: "Subdomain slug cannot begin or end with a hyphen",
    };
  }

  if (trimmed.includes("--")) {
    return {
      valid: false,
      error: "Subdomain slug cannot contain consecutive hyphens ('--')",
    };
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed)) {
    return {
      valid: false,
      error: "Subdomain slug can only contain lowercase letters, digits, and single hyphens",
    };
  }

  if (RESERVED_SLUGS.has(trimmed)) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved system name and cannot be used as a subdomain`,
    };
  }

  return { valid: true, slug: trimmed };
}

/**
 * Builds the fully qualified site URL from a validated subdomain using the single BASE_DOMAIN constant.
 */
export function buildSiteUrl(subdomain: string): string {
  const check = validateSubdomainSlug(subdomain);
  if (!check.valid) {
    throw new Error(check.error);
  }
  return `https://${check.slug}.${BASE_DOMAIN}`;
}

export const SubdomainSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(MIN_SLUG_LENGTH)
  .max(MAX_SLUG_LENGTH)
  .refine(
    (slug) => validateSubdomainSlug(slug).valid,
    (slug) => {
      const res = validateSubdomainSlug(slug);
      return { message: res.valid ? "Invalid slug" : res.error };
    },
  );
