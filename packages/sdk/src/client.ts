/**
 * HyprCAT Client - the primary SDK entry point for interacting with the HyprCAT mesh.
 * Provides HATEOAS-driven navigation, operation execution, and governance handling.
 */

import type {
  JsonLdNode,
  HydraOperation,
  HydraCollection,
  HttpMethod,
  IRI,
  Payload,
  WalletState,
  X402PaymentProof,
  Erc8004TokenProof,
  SessionToken,
  DIDAuthChallenge,
  DIDAuthResponse,
} from "@hyprcat/protocol";
import {
  CONTENT_TYPE_JSONLD,
  CONTENT_TYPE_JSON,
  HEADERS,
  HYPRCAT_VERSION,
  WELL_KNOWN_PATH,
  getOperations,
  getResourceTypes,
  isResourceType,
  validateResource,
  validateInput,
} from "@hyprcat/protocol";
import {
  HyprCATError,
  NetworkError,
  NotFoundError,
  AuthenticationError,
  PaymentRequiredError,
  RateLimitError,
} from "./errors.js";

/** Client configuration */
export interface HyprCATClientConfig {
  /** Base URL of the HyprCAT gateway (optional, for single-server mode) */
  baseUrl?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for transient failures */
  maxRetries?: number;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** DID for authentication */
  agentDid?: string;
  /** Session token (obtained via DID-Auth) */
  sessionToken?: string;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
  /** Enable request/response logging */
  debug?: boolean;
}

/** Event types emitted by the client */
export type ClientEventType =
  | "request"
  | "response"
  | "error"
  | "payment"
  | "navigation"
  | "operation";

/** Client event */
export interface ClientEvent {
  type: ClientEventType;
  timestamp: number;
  url?: string;
  method?: HttpMethod;
  statusCode?: number;
  data?: unknown;
}

/** Event listener */
export type ClientEventListener = (event: ClientEvent) => void;

/** Default configuration */
const DEFAULT_CONFIG: Required<Pick<HyprCATClientConfig, "timeout" | "maxRetries" | "debug">> = {
  timeout: 30_000,
  maxRetries: 3,
  debug: false,
};

/**
 * HyprCAT Client
 *
 * The main interface for interacting with a HyprCAT mesh.
 * Supports HATEOAS-driven discovery, operation execution,
 * payment handling, and provenance tracking.
 */
export class HyprCATClient {
  private config: HyprCATClientConfig & typeof DEFAULT_CONFIG;
  private fetchFn: typeof globalThis.fetch;
  private listeners: Map<ClientEventType, Set<ClientEventListener>> = new Map();
  private cache: Map<string, { data: JsonLdNode; expires: number }> = new Map();
  private navigationHistory: IRI[] = [];

  constructor(config: HyprCATClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  // ─── Resource Navigation ──────────────────────────────────────

  /** Fetch a resource by URL, following HyprCAT protocol conventions */
  async fetch(url: string): Promise<JsonLdNode> {
    this.emit("navigation", { url });

    // Check cache
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const response = await this.request("GET", url);
    const resource = response as JsonLdNode;

    // Validate
    const validation = validateResource(resource);
    if (!validation.valid && this.config.debug) {
      console.warn(`Resource validation warnings for ${url}:`, validation.errors);
    }

    this.navigationHistory.push(url);
    return resource;
  }

  /** Discover the entry point of a HyprCAT mesh */
  async discover(baseUrl: string): Promise<JsonLdNode> {
    const wellKnownUrl = `${baseUrl.replace(/\/$/, "")}${WELL_KNOWN_PATH}`;
    try {
      const serviceDesc = await this.fetch(wellKnownUrl);
      const entrypoint = serviceDesc["hypr:entrypoint"] as string;
      if (entrypoint) {
        return this.fetch(entrypoint);
      }
    } catch {
      // Fall back to baseUrl itself
    }
    return this.fetch(baseUrl);
  }

  /** Navigate to a linked resource */
  async navigate(resourceOrUrl: JsonLdNode | string): Promise<JsonLdNode> {
    const url = typeof resourceOrUrl === "string" ? resourceOrUrl : resourceOrUrl["@id"];
    return this.fetch(url);
  }

  /** Get members of a collection */
  async getMembers(collection: HydraCollection): Promise<JsonLdNode[]> {
    return collection["hydra:member"] || [];
  }

  /** Get all pages of a paginated collection */
  async getAllMembers(collection: HydraCollection): Promise<JsonLdNode[]> {
    const allMembers: JsonLdNode[] = [...(collection["hydra:member"] || [])];
    let nextUrl = collection["hydra:view"]?.["hydra:next"];

    while (nextUrl) {
      const nextPage = await this.fetch(nextUrl) as HydraCollection;
      allMembers.push(...(nextPage["hydra:member"] || []));
      nextUrl = nextPage["hydra:view"]?.["hydra:next"];
    }

    return allMembers;
  }

  // ─── Operation Discovery & Execution ──────────────────────────

  /** Get available operations on a resource */
  getOperations(resource: JsonLdNode): HydraOperation[] {
    return getOperations(resource as Record<string, unknown>);
  }

  /** Find a specific operation by title or type */
  findOperation(resource: JsonLdNode, titleOrType: string): HydraOperation | undefined {
    const ops = this.getOperations(resource);
    return ops.find(
      (op) =>
        op["hydra:title"] === titleOrType ||
        getResourceTypes(op).includes(titleOrType)
    );
  }

  /** Execute a Hydra operation */
  async executeOperation(
    operation: HydraOperation,
    input?: Payload
  ): Promise<JsonLdNode> {
    const method = operation["hydra:method"];
    const target = operation["target"] || operation["@id"];

    // Validate input against hydra:expects
    if (operation["hydra:expects"] && input) {
      const properties = operation["hydra:expects"]["hydra:supportedProperty"];
      if (properties) {
        const validation = validateInput(input as Record<string, unknown>, properties);
        if (!validation.valid) {
          throw new HyprCATError(
            `Input validation failed: ${validation.errors.map((e) => e.message).join("; ")}`,
            422,
            "hypr:ValidationError"
          );
        }
      }
    }

    this.emit("operation", {
      url: target,
      method,
      data: { operation: operation["hydra:title"], input },
    });

    const result = await this.request(method, target, input);
    return result as JsonLdNode;
  }

  // ─── Core HTTP Layer ──────────────────────────────────────────

  private async request(
    method: HttpMethod,
    url: string,
    body?: Payload,
    retryCount: number = 0
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: `${CONTENT_TYPE_JSONLD}, ${CONTENT_TYPE_JSON};q=0.9`,
      [HEADERS.VERSION]: HYPRCAT_VERSION,
      [HEADERS.TRACE_ID]: crypto.randomUUID(),
      ...this.config.headers,
    };

    if (this.config.agentDid) {
      headers[HEADERS.AGENT_DID] = this.config.agentDid;
    }

    if (this.config.sessionToken) {
      headers["Authorization"] = `Bearer ${this.config.sessionToken}`;
    }

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      headers["Content-Type"] = CONTENT_TYPE_JSONLD;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    this.emit("request", { url, method, data: body });

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Cache control
      const cacheControl = response.headers.get("Cache-Control");
      const maxAge = cacheControl?.match(/max-age=(\d+)/)?.[1];

      this.emit("response", { url, method, statusCode: response.status });

      // Handle specific status codes
      if (response.status === 401) {
        const challenge = response.headers.get("WWW-Authenticate");
        throw new AuthenticationError("Authentication required", challenge ?? undefined);
      }

      if (response.status === 402) {
        const paymentDetails = await response.json();
        throw new PaymentRequiredError(paymentDetails);
      }

      if (response.status === 404) {
        throw new NotFoundError(url);
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60");
        if (retryCount < this.config.maxRetries) {
          await this.delay(retryAfter * 1000);
          return this.request(method, url, body, retryCount + 1);
        }
        throw new RateLimitError(retryAfter);
      }

      if (response.status >= 500 && retryCount < this.config.maxRetries) {
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.request(method, url, body, retryCount + 1);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new HyprCATError(
          errorBody?.["hypr:detail"] || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      // Cache successful GET responses
      if (method === "GET" && maxAge) {
        this.cache.set(url, {
          data,
          expires: Date.now() + parseInt(maxAge) * 1000,
        });
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof HyprCATError) throw error;

      const err = error as Error;
      if (err.name === "AbortError") {
        throw new NetworkError(`Request timeout after ${this.config.timeout}ms`, err);
      }

      if (retryCount < this.config.maxRetries) {
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.request(method, url, body, retryCount + 1);
      }

      throw new NetworkError(`Network error: ${err.message}`, err);
    }
  }

  // ─── Event System ─────────────────────────────────────────────

  /** Subscribe to client events */
  on(event: ClientEventType, listener: ClientEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(type: ClientEventType, data: Partial<ClientEvent> = {}) {
    const event: ClientEvent = { type, timestamp: Date.now(), ...data };
    this.listeners.get(type)?.forEach((listener) => listener(event));

    if (this.config.debug) {
      console.log(`[HyprCAT] ${type}:`, data);
    }
  }

  // ─── Utility Methods ──────────────────────────────────────────

  /** Clear the resource cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get navigation history */
  getHistory(): IRI[] {
    return [...this.navigationHistory];
  }

  /** Clear navigation history */
  clearHistory(): void {
    this.navigationHistory = [];
  }

  /** Check if a resource has a specific type */
  isType(resource: JsonLdNode, type: string): boolean {
    return isResourceType(resource, type);
  }

  /** Get types of a resource */
  getTypes(resource: JsonLdNode): string[] {
    return getResourceTypes(resource);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
