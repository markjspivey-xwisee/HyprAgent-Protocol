/**
 * Tests for @hyprcat/protocol types and validation
 */

import { describe, it, expect } from "vitest";
import {
  validateResource,
  validateOperation,
  validateInput,
  createErrorResponse,
  getResourceTypes,
  isResourceType,
  hasOperations,
  getOperations,
  expandIRI,
  compactIRI,
  HYPRCAT_VERSION,
  HYPRCAT_CONTEXT_URI,
  HEADERS,
  STATUS_CODES,
  NAMESPACES,
} from "@hyprcat/protocol";

describe("Protocol Constants", () => {
  it("should have correct protocol version", () => {
    expect(HYPRCAT_VERSION).toBe("1.0.0");
  });

  it("should have correct context URI", () => {
    expect(HYPRCAT_CONTEXT_URI).toBe("https://w3id.org/hyprcat/v1");
  });

  it("should define all required headers", () => {
    expect(HEADERS.VERSION).toBe("X-HyprCAT-Version");
    expect(HEADERS.PROVENANCE_ID).toBe("X-Provenance-Id");
    expect(HEADERS.PAYMENT_PROOF).toBe("X-Payment-Proof");
    expect(HEADERS.AGENT_DID).toBe("X-Agent-DID");
    expect(HEADERS.TRACE_ID).toBe("X-Trace-Id");
  });

  it("should define all HTTP status codes", () => {
    expect(STATUS_CODES.OK).toBe(200);
    expect(STATUS_CODES.PAYMENT_REQUIRED).toBe(402);
    expect(STATUS_CODES.NOT_FOUND).toBe(404);
    expect(STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
  });
});

describe("Namespace IRI Functions", () => {
  it("should expand prefixed IRIs", () => {
    expect(expandIRI("hydra:Collection")).toBe("http://www.w3.org/ns/hydra/core#Collection");
    expect(expandIRI("schema:Product")).toBe("https://schema.org/Product");
    expect(expandIRI("x402:PaymentRequired")).toBe("https://w3id.org/x402#PaymentRequired");
    expect(expandIRI("prov:Activity")).toBe("http://www.w3.org/ns/prov#Activity");
  });

  it("should return unprefixed values unchanged", () => {
    expect(expandIRI("https://example.com/foo")).toBe("https://example.com/foo");
    expect(expandIRI("Person")).toBe("Person");
  });

  it("should compact full IRIs to prefixed form", () => {
    expect(compactIRI("http://www.w3.org/ns/hydra/core#Collection")).toBe("hydra:Collection");
    expect(compactIRI("https://schema.org/Product")).toBe("schema:Product");
  });

  it("should return unknown IRIs unchanged", () => {
    expect(compactIRI("https://unknown.example/foo")).toBe("https://unknown.example/foo");
  });
});

describe("Resource Validation", () => {
  it("should validate a correct resource", () => {
    const result = validateResource({
      "@context": "https://w3id.org/hyprcat/v1",
      "@id": "https://example.com/resource/1",
      "@type": "dcat:Dataset",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject resource without @id", () => {
    const result = validateResource({
      "@type": "dcat:Dataset",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_ID")).toBe(true);
  });

  it("should reject resource without @type", () => {
    const result = validateResource({
      "@id": "https://example.com/resource/1",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_TYPE")).toBe(true);
  });

  it("should reject non-object input", () => {
    const result = validateResource(null);
    expect(result.valid).toBe(false);
  });

  it("should warn about missing @context", () => {
    const result = validateResource({
      "@id": "https://example.com/resource/1",
      "@type": "dcat:Dataset",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path === "@context")).toBe(true);
  });

  it("should accept array @type", () => {
    const result = validateResource({
      "@context": "https://w3id.org/hyprcat/v1",
      "@id": "https://example.com/resource/1",
      "@type": ["schema:Store", "hydra:Collection"],
    });
    expect(result.valid).toBe(true);
  });
});

describe("Operation Validation", () => {
  it("should validate a correct operation", () => {
    const result = validateOperation({
      "@id": "https://example.com/op/1",
      "@type": "hydra:Operation",
      "hydra:method": "POST",
      "hydra:title": "Create Resource",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject operation without method", () => {
    const result = validateOperation({
      "@id": "https://example.com/op/1",
      "@type": "hydra:Operation",
      "hydra:title": "Create Resource",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_PROPERTY")).toBe(true);
  });

  it("should reject invalid HTTP method", () => {
    const result = validateOperation({
      "@id": "https://example.com/op/1",
      "@type": "hydra:Operation",
      "hydra:method": "INVALID",
      "hydra:title": "Bad Op",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_METHOD")).toBe(true);
  });
});

describe("Input Validation (SHACL-lite)", () => {
  const properties = [
    {
      "hydra:property": "schema:name",
      "hydra:title": "Name",
      "hydra:required": true,
      "sh:datatype": "xsd:string",
      "sh:minLength": 1,
      "sh:maxLength": 100,
    },
    {
      "hydra:property": "schema:price",
      "hydra:title": "Price",
      "hydra:required": true,
      "sh:datatype": "xsd:integer",
      "sh:minInclusive": 0,
    },
    {
      "hydra:property": "schema:description",
      "hydra:title": "Description",
      "hydra:required": false,
    },
  ];

  it("should accept valid input", () => {
    const result = validateInput(
      { "schema:name": "Widget", "schema:price": 100 },
      properties
    );
    expect(result.valid).toBe(true);
  });

  it("should reject missing required fields", () => {
    const result = validateInput({ "schema:description": "test" }, properties);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("should enforce minLength", () => {
    const result = validateInput(
      { "schema:name": "", "schema:price": 100 },
      properties
    );
    expect(result.valid).toBe(false);
  });

  it("should enforce minInclusive", () => {
    const result = validateInput(
      { "schema:name": "Widget", "schema:price": -1 },
      properties
    );
    expect(result.valid).toBe(false);
  });

  it("should accept optional fields as missing", () => {
    const result = validateInput(
      { "schema:name": "Widget", "schema:price": 0 },
      properties
    );
    expect(result.valid).toBe(true);
  });
});

describe("Resource Type Utilities", () => {
  it("should extract types from string @type", () => {
    const types = getResourceTypes({ "@id": "x", "@type": "schema:Product" });
    expect(types).toEqual(["schema:Product"]);
  });

  it("should extract types from array @type", () => {
    const types = getResourceTypes({
      "@id": "x",
      "@type": ["schema:Store", "hydra:Collection"],
    });
    expect(types).toEqual(["schema:Store", "hydra:Collection"]);
  });

  it("should check isResourceType", () => {
    const node = { "@id": "x", "@type": ["schema:Store", "hydra:Collection"] };
    expect(isResourceType(node, "schema:Store")).toBe(true);
    expect(isResourceType(node, "schema:Product")).toBe(false);
  });

  it("should detect operations", () => {
    expect(hasOperations({ "hydra:operation": [{ "@id": "op1" }] })).toBe(true);
    expect(hasOperations({ "hydra:operation": [] })).toBe(false);
    expect(hasOperations({})).toBe(false);
  });

  it("should extract operations from resource", () => {
    const ops = getOperations({
      "hydra:operation": [
        { "@id": "op1", "@type": "hydra:Operation", "hydra:method": "GET", "hydra:title": "Get" },
      ],
    });
    expect(ops).toHaveLength(1);
    expect(ops[0]["hydra:title"]).toBe("Get");
  });

  it("should extract operations from collection members", () => {
    const ops = getOperations({
      "hydra:member": [
        {
          "@id": "item1",
          "hydra:operation": [
            { "@id": "op1", "@type": "hydra:Operation", "hydra:method": "POST", "hydra:title": "Buy" },
          ],
        },
      ],
    });
    expect(ops).toHaveLength(1);
  });
});

describe("Error Response", () => {
  it("should create properly formatted error response", () => {
    const error = createErrorResponse(404, "Not Found", "Resource does not exist", "/foo");
    expect(error["@type"]).toBe("hypr:Error");
    expect(error["hypr:statusCode"]).toBe(404);
    expect(error["hypr:title"]).toBe("Not Found");
    expect(error["hypr:detail"]).toBe("Resource does not exist");
    expect(error["hypr:instance"]).toBe("/foo");
    expect(error["@id"]).toMatch(/^urn:uuid:/);
  });
});
