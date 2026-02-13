/**
 * DCAT (Data Catalog Vocabulary) and DPROD (Data Product) types.
 * Implements W3C DCAT 3 and CDMC DPROD for data marketplace descriptions.
 */

import type { JsonLdNode, IRI, DID } from "./core.js";
import type { HydraCollection, WithOperations } from "./hydra.js";

/** DCAT Catalog - top-level data marketplace entry point */
export interface DcatCatalog extends JsonLdNode, WithOperations {
  "@type": "dcat:Catalog" | ["dcat:Catalog", ...string[]];
  "dct:title": string;
  "dct:description": string;
  "dct:publisher"?: string | { "@id": string; "schema:name"?: string };
  "dct:issued"?: string;
  "dct:modified"?: string;
  "dcat:dataset"?: JsonLdNode[];
  "dcat:service"?: JsonLdNode[];
  "dcat:themeTaxonomy"?: IRI;
}

/** DCAT Dataset - a single dataset in the catalog */
export interface DcatDataset extends JsonLdNode, WithOperations {
  "@type": "dcat:Dataset" | ["dcat:Dataset", ...string[]];
  "dct:title": string;
  "dct:description": string;
  "dct:publisher"?: string | { "@id": string; "schema:name"?: string };
  "dct:issued"?: string;
  "dct:modified"?: string;
  "dcat:keyword"?: string[];
  "dcat:theme"?: IRI[];
  "dcat:distribution"?: DcatDistribution[];
  "dcat:contactPoint"?: {
    "@type": "schema:ContactPoint";
    "schema:email"?: string;
    "schema:name"?: string;
  };
}

/** DCAT Distribution - describes how to access a dataset */
export interface DcatDistribution extends JsonLdNode {
  "@type": "dcat:Distribution";
  "dcat:mediaType"?: string;
  "dcat:accessURL"?: IRI;
  "dcat:downloadURL"?: IRI;
  "dcat:byteSize"?: number;
  "dcat:compressFormat"?: string;
  "dct:format"?: string;
}

/** DPROD Data Product - a curated data product with defined ports */
export interface DprodDataProduct extends DcatDataset {
  "@type": "dprod:DataProduct" | ["dprod:DataProduct", ...string[]];
  "dprod:domainInfo": string;
  "dprod:dataProductOwner": DID | string;
  "dprod:inputPort"?: DprodPort[];
  "dprod:outputPort"?: DprodPort[];
  "dprod:sla"?: DprodSLA;
  "dprod:status"?: "dprod:Draft" | "dprod:Active" | "dprod:Deprecated" | "dprod:Retired";
}

/** DPROD Port - an input or output endpoint for a data product */
export interface DprodPort extends JsonLdNode {
  "@type": "dprod:Port";
  "dct:title": string;
  "dct:description"?: string;
  "dcat:accessURL"?: IRI;
  "dcat:mediaType"?: string;
  "dprod:protocol"?: string;
}

/** DPROD Service Level Agreement */
export interface DprodSLA {
  "@type": "dprod:SLA";
  "dprod:availability"?: string;
  "dprod:latency"?: string;
  "dprod:throughput"?: string;
  "dprod:freshness"?: string;
}

/** Schema.org Product - physical or digital product in ecommerce context */
export interface SchemaProduct extends JsonLdNode, WithOperations {
  "@type": "schema:Product" | ["schema:Product", ...string[]];
  "schema:name": string;
  "schema:description"?: string;
  "schema:price": number;
  "schema:priceCurrency": string;
  "schema:inventoryLevel"?: number;
  "schema:sku"?: string;
  "schema:image"?: IRI;
  "schema:category"?: string;
}

/** Schema.org Store - an ecommerce store node */
export interface SchemaStore extends HydraCollection {
  "@type": ["schema:Store", "hydra:Collection"];
  "dct:title": string;
  "dct:description": string;
}

/** Schema.org Order - result of a purchase action */
export interface SchemaOrder extends JsonLdNode {
  "@type": "schema:Order";
  "schema:orderStatus": string;
  "schema:orderNumber": string;
  "schema:price"?: number;
  "schema:priceCurrency"?: string;
  "schema:description"?: string;
  "prov:wasGeneratedBy"?: string | { "@id": string };
}
