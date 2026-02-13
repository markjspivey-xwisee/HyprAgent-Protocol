/**
 * C-ZERO (Conceptual Zero-Copy) Federation types.
 * Enables federated queries across heterogeneous data sources without data movement.
 */

import type { JsonLdNode, IRI, ISO8601Duration } from "./core.js";
import type { WithOperations } from "./hydra.js";

/** Mapping types supported by C-ZERO source nodes */
export type CzeroMappingType = "R2RML" | "GraphQL-Mesh" | "Direct" | "SPARQL" | "REST";

/** Query interface types */
export type CzeroQueryInterface =
  | "GraphQL-Federation"
  | "SPARQL"
  | "SQL"
  | "Databricks-SQL-Warehouse"
  | "REST";

/** C-ZERO Virtual Graph - a federated view over multiple data sources */
export interface CzeroVirtualGraph extends JsonLdNode, WithOperations {
  "@type": "czero:VirtualGraph" | ["czero:VirtualGraph", ...string[]];
  "czero:federatedSource": CzeroSourceNode[];
  "czero:ontologySchema"?: IRI;
  "czero:queryInterface": CzeroQueryInterface;
  "czero:cacheTTL"?: ISO8601Duration;
  "czero:maxConcurrentQueries"?: number;
}

/** C-ZERO Source Node - a single federated data source */
export interface CzeroSourceNode extends JsonLdNode {
  "@type": "czero:SourceNode";
  "czero:endpoint": string;
  "czero:mappingType": CzeroMappingType;
  "czero:latency"?: string;
  "czero:healthStatus"?: "healthy" | "degraded" | "unavailable";
  "czero:lastChecked"?: string;
  "czero:priority"?: number;
}

/** C-ZERO Query Action - a query submitted to a virtual graph */
export interface CzeroQueryAction extends JsonLdNode {
  "@type": "czero:QueryAction";
  "schema:query": string;
  "czero:timeout"?: number;
  "czero:maxResults"?: number;
}

/** C-ZERO Result Set - federated query results with per-item provenance */
export interface CzeroResultSet extends JsonLdNode {
  "@type": "czero:ResultSet";
  "czero:items": CzeroResultItem[];
  "czero:totalExecutionTime"?: string;
  "czero:sourcesQueried"?: number;
  "prov:wasGeneratedBy"?: string | { "@id": string };
  "prov:wasDerivedFrom"?: string;
}

/** C-ZERO Result Item - a single result row with source provenance */
export interface CzeroResultItem {
  [key: string]: unknown;
  "czero:provenance"?: {
    sourceNode: string;
    executionTime: string;
  };
}

/** C-ZERO Federation Error - when a federated source fails */
export interface CzeroFederationError extends JsonLdNode {
  "@type": "czero:FederationError";
  "czero:failedSource": string;
  "czero:errorMessage": string;
  "czero:partialResults"?: boolean;
}
