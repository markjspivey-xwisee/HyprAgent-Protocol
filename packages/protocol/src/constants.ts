/**
 * Protocol constants for HyprCAT v1.0
 */

/** Protocol version */
export const HYPRCAT_VERSION = "1.0.0";

/** Well-known URI path */
export const WELL_KNOWN_PATH = "/.well-known/hyprcat";

/** Default content type */
export const CONTENT_TYPE_JSONLD = "application/ld+json";

/** HyprCAT profile URI for content negotiation */
export const CONTENT_TYPE_HYPRCAT = 'application/ld+json;profile="https://w3id.org/hyprcat/v1"';

/** Fallback content type */
export const CONTENT_TYPE_JSON = "application/json";

/** Custom HTTP headers */
export const HEADERS = {
  /** Protocol version */
  VERSION: "X-HyprCAT-Version",
  /** Provenance ID for the current operation */
  PROVENANCE_ID: "X-Provenance-Id",
  /** Payment proof (base64 preimage) */
  PAYMENT_PROOF: "X-Payment-Proof",
  /** Payment invoice reference */
  PAYMENT_INVOICE: "X-Payment-Invoice",
  /** Rate limit - total allowed */
  RATE_LIMIT: "X-RateLimit-Limit",
  /** Rate limit - remaining */
  RATE_REMAINING: "X-RateLimit-Remaining",
  /** Rate limit - reset timestamp */
  RATE_RESET: "X-RateLimit-Reset",
  /** DID of the requesting agent */
  AGENT_DID: "X-Agent-DID",
  /** Request trace ID */
  TRACE_ID: "X-Trace-Id",
} as const;

/** Link relation types */
export const LINK_RELATIONS = {
  ENTRYPOINT: "https://w3id.org/hyprcat#entrypoint",
  PROVENANCE: "http://www.w3.org/ns/prov#has_provenance",
  CATALOG: "https://w3id.org/hyprcat#catalog",
  DOCUMENTATION: "http://www.w3.org/ns/hydra/core#apiDocumentation",
} as const;

/** HTTP status codes used by HyprCAT */
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Default rate limit configuration */
export const DEFAULT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 100,
} as const;

/** Default pagination */
export const DEFAULT_PAGINATION = {
  pageSize: 20,
  maxPageSize: 100,
} as const;
