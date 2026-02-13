/**
 * Core JSON-LD types for the HyprCAT Protocol.
 * These form the foundation for all resource descriptions in the mesh.
 */

/** JSON-LD Context - can be a URI string, an object, or an array of both */
export type JsonLdContext = string | Record<string, unknown> | Array<string | Record<string, unknown>>;

/** Base JSON-LD node - every resource in the HyprCAT mesh extends this */
export interface JsonLdNode {
  "@context"?: JsonLdContext;
  "@id": string;
  "@type": string | string[];
  [key: string]: unknown;
}

/** Typed wrapper for specific JSON-LD types */
export interface TypedJsonLdNode<T extends string> extends JsonLdNode {
  "@type": T | [T, ...string[]];
}

/** IRI (Internationalized Resource Identifier) */
export type IRI = string;

/** DID (Decentralized Identifier) */
export type DID = `did:${string}:${string}`;

/** URN (Uniform Resource Name) */
export type URN = `urn:${string}:${string}`;

/** ISO 8601 datetime string */
export type ISO8601DateTime = string;

/** Duration in ISO 8601 format */
export type ISO8601Duration = string;

/** Supported HTTP methods for operations */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Resource identifier - can be a URL, DID, or URN */
export type ResourceIdentifier = IRI | DID | URN;

/** Generic key-value payload */
export type Payload = Record<string, unknown>;

/** HyprCAT error response */
export interface HyprError extends JsonLdNode {
  "@type": "hypr:Error";
  "hypr:statusCode": number;
  "hypr:title": string;
  "hypr:detail": string;
  "hypr:instance"?: string;
}

/** Service description returned from well-known endpoint */
export interface HyprServiceDescription extends JsonLdNode {
  "@type": "hypr:ServiceDescription";
  "hypr:entrypoint": IRI;
  "hypr:version": string;
  "hypr:capabilities": HyprCapability[];
}

/** Supported capabilities */
export type HyprCapability =
  | "hypr:HATEOASNavigation"
  | "hypr:x402Payments"
  | "hypr:ERC8004TokenGating"
  | "hypr:CZEROFederation"
  | "hypr:PROVOProvenance"
  | "hypr:DIDAuth"
  | "hypr:MCPIntegration"
  | "hypr:ODRLPolicies";

/** Conformance levels */
export enum ConformanceLevel {
  /** Basic: Valid JSON-LD, @id/@type, hydra:Collection */
  Basic = 1,
  /** Interactive: Operations, inputs, x402 */
  Interactive = 2,
  /** Autonomous: DID-Auth, PROV-O, C-ZERO, O.N.A. */
  Autonomous = 3,
}
