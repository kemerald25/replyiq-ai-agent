/**
 * Configuration constants for ReplyIQ.
 *
 * CRITICAL ARCHITECTURAL RULE:
 * The base domain for user sites must be a single configuration constant, never hardcoded.
 */
export const BASE_DOMAIN = "replyiq.cv";

/**
 * Default locale for ReplyIQ sites (targeting Nigerian market).
 */
export const DEFAULT_LOCALE = "en-NG";

/**
 * Default language for ReplyIQ sites.
 */
export const DEFAULT_LANGUAGE = "en";

/**
 * Current version of the SiteDocument schema.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Maximum number of sections permitted in a single SiteDocument.
 */
export const MAX_SECTIONS_PER_DOCUMENT = 20;

/**
 * Maximum number of edit operations permitted in a single batch.
 */
export const MAX_OPERATIONS_PER_BATCH = 20;
