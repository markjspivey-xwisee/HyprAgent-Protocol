/**
 * Schema validation utilities for HyprCAT Protocol resources.
 * Provides runtime validation of JSON-LD resources against protocol requirements.
 */

import type { JsonLdNode, HyprError } from "../types/core.js";
import type { HydraOperation, HydraSupportedProperty } from "../types/hydra.js";

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  path: string;
  message: string;
  code: ValidationErrorCode;
}

/** Validation warning */
export interface ValidationWarning {
  path: string;
  message: string;
}

/** Error codes */
export type ValidationErrorCode =
  | "MISSING_CONTEXT"
  | "MISSING_ID"
  | "MISSING_TYPE"
  | "INVALID_IRI"
  | "MISSING_REQUIRED_PROPERTY"
  | "INVALID_PROPERTY_TYPE"
  | "INVALID_METHOD"
  | "SHACL_VIOLATION"
  | "INVALID_CONSTRAINT";

/** Known resource types in the HyprCAT ontology */
const KNOWN_TYPES = new Set([
  "hypr:ServiceDescription",
  "hypr:Error",
  "hydra:Collection",
  "hydra:ApiDocumentation",
  "hydra:Operation",
  "hydra:IriTemplate",
  "dcat:Catalog",
  "dcat:Dataset",
  "dcat:Distribution",
  "dprod:DataProduct",
  "dprod:Port",
  "czero:VirtualGraph",
  "czero:SourceNode",
  "czero:QueryAction",
  "czero:ResultSet",
  "schema:Product",
  "schema:Store",
  "schema:Order",
  "schema:BuyAction",
  "schema:SearchAction",
  "schema:DownloadAction",
  "x402:PaymentRequired",
  "x402:Subscription",
  "erc8004:TokenGate",
  "odrl:Policy",
  "odrl:Set",
  "odrl:Offer",
  "odrl:Agreement",
  "prov:Entity",
  "prov:Activity",
  "prov:Agent",
  "mcp:Prompt",
  "mcp:PromptCollection",
  "mcp:Tool",
  "mcp:Resource",
  "xapi:LRS",
]);

const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

/** Validate a JSON-LD node conforms to HyprCAT requirements */
export function validateResource(node: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!node || typeof node !== "object") {
    errors.push({ path: "$", message: "Resource must be a JSON object", code: "MISSING_CONTEXT" });
    return { valid: false, errors, warnings };
  }

  const resource = node as Record<string, unknown>;

  // Check @id
  if (!resource["@id"]) {
    errors.push({ path: "@id", message: "Resource must have an @id property", code: "MISSING_ID" });
  } else if (typeof resource["@id"] !== "string") {
    errors.push({ path: "@id", message: "@id must be a string IRI", code: "INVALID_IRI" });
  }

  // Check @type
  if (!resource["@type"]) {
    errors.push({ path: "@type", message: "Resource must have an @type property", code: "MISSING_TYPE" });
  } else {
    const types = Array.isArray(resource["@type"]) ? resource["@type"] : [resource["@type"]];
    for (const type of types) {
      if (typeof type !== "string") {
        errors.push({ path: "@type", message: `Type must be a string, got ${typeof type}`, code: "INVALID_PROPERTY_TYPE" });
      } else if (!KNOWN_TYPES.has(type) && !type.includes(":") && !type.startsWith("http")) {
        warnings.push({ path: "@type", message: `Unknown type "${type}" - consider using a namespaced type` });
      }
    }
  }

  // Check @context (warning, not error, as it may be inherited)
  if (!resource["@context"]) {
    warnings.push({ path: "@context", message: "Resource should include @context for self-describing JSON-LD" });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate a Hydra operation */
export function validateOperation(operation: unknown): ValidationResult {
  const base = validateResource(operation);
  const op = operation as Partial<HydraOperation>;

  if (!op["hydra:method"]) {
    base.errors.push({ path: "hydra:method", message: "Operation must specify HTTP method", code: "MISSING_REQUIRED_PROPERTY" });
  } else if (!VALID_METHODS.has(op["hydra:method"])) {
    base.errors.push({ path: "hydra:method", message: `Invalid HTTP method: ${op["hydra:method"]}`, code: "INVALID_METHOD" });
  }

  if (!op["hydra:title"]) {
    base.errors.push({ path: "hydra:title", message: "Operation must have a title", code: "MISSING_REQUIRED_PROPERTY" });
  }

  base.valid = base.errors.length === 0;
  return base;
}

/** Validate operation input against SHACL-lite supported properties */
export function validateInput(
  input: Record<string, unknown>,
  properties: HydraSupportedProperty[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const prop of properties) {
    const key = prop["hydra:property"];
    const value = input[key];

    // Check required
    if (prop["hydra:required"] && (value === undefined || value === null || value === "")) {
      errors.push({
        path: key,
        message: `Required property "${prop["hydra:title"] || key}" is missing`,
        code: "MISSING_REQUIRED_PROPERTY",
      });
      continue;
    }

    if (value === undefined || value === null) continue;

    // Check SHACL constraints
    if (prop["sh:datatype"]) {
      const valid = validateShaclDatatype(value, prop["sh:datatype"]);
      if (!valid) {
        errors.push({
          path: key,
          message: `Value does not match expected type ${prop["sh:datatype"]}`,
          code: "SHACL_VIOLATION",
        });
      }
    }

    if (prop["sh:minLength"] !== undefined && typeof value === "string" && value.length < prop["sh:minLength"]) {
      errors.push({
        path: key,
        message: `String length ${value.length} is below minimum ${prop["sh:minLength"]}`,
        code: "SHACL_VIOLATION",
      });
    }

    if (prop["sh:maxLength"] !== undefined && typeof value === "string" && value.length > prop["sh:maxLength"]) {
      errors.push({
        path: key,
        message: `String length ${value.length} exceeds maximum ${prop["sh:maxLength"]}`,
        code: "SHACL_VIOLATION",
      });
    }

    if (prop["sh:minInclusive"] !== undefined && typeof value === "number" && value < prop["sh:minInclusive"]) {
      errors.push({
        path: key,
        message: `Value ${value} is below minimum ${prop["sh:minInclusive"]}`,
        code: "SHACL_VIOLATION",
      });
    }

    if (prop["sh:maxInclusive"] !== undefined && typeof value === "number" && value > prop["sh:maxInclusive"]) {
      errors.push({
        path: key,
        message: `Value ${value} exceeds maximum ${prop["sh:maxInclusive"]}`,
        code: "SHACL_VIOLATION",
      });
    }

    if (prop["sh:pattern"] !== undefined && typeof value === "string") {
      const regex = new RegExp(prop["sh:pattern"]);
      if (!regex.test(value)) {
        errors.push({
          path: key,
          message: `Value does not match pattern ${prop["sh:pattern"]}`,
          code: "SHACL_VIOLATION",
        });
      }
    }

    if (prop["sh:in"] !== undefined) {
      if (!prop["sh:in"].includes(value)) {
        errors.push({
          path: key,
          message: `Value must be one of: ${prop["sh:in"].join(", ")}`,
          code: "SHACL_VIOLATION",
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateShaclDatatype(value: unknown, datatype: string): boolean {
  switch (datatype) {
    case "xsd:string":
      return typeof value === "string";
    case "xsd:integer":
      return typeof value === "number" && Number.isInteger(value);
    case "xsd:decimal":
    case "xsd:float":
    case "xsd:double":
      return typeof value === "number";
    case "xsd:boolean":
      return typeof value === "boolean";
    case "xsd:dateTime":
      return typeof value === "string" && !isNaN(Date.parse(value));
    case "xsd:anyURI":
      return typeof value === "string" && (value.startsWith("http") || value.startsWith("urn:") || value.startsWith("did:"));
    default:
      return true;
  }
}

/** Create a standardized HyprCAT error response */
export function createErrorResponse(
  statusCode: number,
  title: string,
  detail: string,
  instance?: string
): HyprError {
  return {
    "@context": "https://w3id.org/hyprcat/v1" as unknown as undefined,
    "@id": `urn:uuid:${crypto.randomUUID()}`,
    "@type": "hypr:Error",
    "hypr:statusCode": statusCode,
    "hypr:title": title,
    "hypr:detail": detail,
    ...(instance ? { "hypr:instance": instance } : {}),
  } as HyprError;
}

/** Extract resource types as an array */
export function getResourceTypes(node: JsonLdNode): string[] {
  if (Array.isArray(node["@type"])) return node["@type"];
  return [node["@type"]];
}

/** Check if a resource is of a given type */
export function isResourceType(node: JsonLdNode, type: string): boolean {
  return getResourceTypes(node).includes(type);
}

/** Check if a resource has operations (affordances) */
export function hasOperations(node: Record<string, unknown>): boolean {
  const ops = node["hydra:operation"];
  return Array.isArray(ops) && ops.length > 0;
}

/** Extract operations from a resource */
export function getOperations(node: Record<string, unknown>): HydraOperation[] {
  const ops = node["hydra:operation"];
  if (Array.isArray(ops)) return ops as HydraOperation[];

  // Also check members for nested operations
  const members = node["hydra:member"];
  if (Array.isArray(members)) {
    return members.flatMap((m: Record<string, unknown>) =>
      Array.isArray(m["hydra:operation"]) ? (m["hydra:operation"] as HydraOperation[]) : []
    );
  }

  return [];
}
