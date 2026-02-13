/**
 * Hydra Core Vocabulary types for hypermedia-driven API interactions.
 * Implements the W3C Hydra specification for machine-readable API descriptions.
 */

import type { JsonLdNode, HttpMethod, IRI } from "./core.js";

/** Hydra Operation - describes an action that can be performed on a resource */
export interface HydraOperation extends JsonLdNode {
  "@type": "hydra:Operation" | ["hydra:Operation", ...string[]];
  "hydra:method": HttpMethod;
  "hydra:title": string;
  "hydra:description"?: string;
  "hydra:expects"?: HydraClass;
  "hydra:returns"?: string;
  "target"?: IRI;
  "hypr:constraint"?: JsonLdNode;
}

/** Hydra Class - describes the shape of expected input */
export interface HydraClass extends JsonLdNode {
  "hydra:supportedProperty": HydraSupportedProperty[];
}

/** Hydra Supported Property - describes a single input field */
export interface HydraSupportedProperty {
  "hydra:property": string;
  "hydra:title"?: string;
  "hydra:description"?: string;
  "hydra:required"?: boolean;
  "hydra:readable"?: boolean;
  "hydra:writeable"?: boolean;
  /** SHACL-lite constraints */
  "sh:datatype"?: string;
  "sh:minLength"?: number;
  "sh:maxLength"?: number;
  "sh:minInclusive"?: number;
  "sh:maxInclusive"?: number;
  "sh:pattern"?: string;
  "sh:in"?: unknown[];
}

/** Hydra Collection - a paginated list of resources */
export interface HydraCollection extends JsonLdNode {
  "@type": "hydra:Collection" | ["hydra:Collection", ...string[]];
  "hydra:member": JsonLdNode[];
  "hydra:totalItems"?: number;
  "hydra:view"?: HydraPartialCollectionView;
}

/** Hydra Partial Collection View - pagination links */
export interface HydraPartialCollectionView {
  "@id": string;
  "@type"?: "hydra:PartialCollectionView";
  "hydra:first"?: IRI;
  "hydra:previous"?: IRI;
  "hydra:next"?: IRI;
  "hydra:last"?: IRI;
}

/** Hydra IRI Template - URL template for parameterized requests */
export interface HydraIriTemplate extends JsonLdNode {
  "@type": "hydra:IriTemplate";
  "hydra:template": string;
  "hydra:variableRepresentation"?: "hydra:BasicRepresentation" | "hydra:ExplicitRepresentation";
  "hydra:mapping": HydraIriTemplateMapping[];
}

/** Hydra IRI Template Mapping - maps a variable to a property */
export interface HydraIriTemplateMapping {
  "hydra:variable": string;
  "hydra:property": string;
  "hydra:required"?: boolean;
}

/** Hydra API Documentation - top-level API description */
export interface HydraApiDocumentation extends JsonLdNode {
  "@type": "hydra:ApiDocumentation" | ["hydra:ApiDocumentation", ...string[]];
  "hydra:title"?: string;
  "hydra:description"?: string;
  "hydra:entrypoint": IRI;
  "hydra:supportedClass"?: HydraClass[];
}

/** Helper type for resources that have operations */
export interface WithOperations {
  "hydra:operation"?: HydraOperation[];
}
