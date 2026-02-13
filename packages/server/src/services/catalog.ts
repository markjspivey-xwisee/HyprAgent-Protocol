/**
 * Catalog Service - manages the HyprCAT data mesh catalog and its resources.
 */

import type { JsonLdNode, IRI } from "@hyprcat/protocol";
import { HYPRCAT_INLINE_CONTEXT, getResourceTypes } from "@hyprcat/protocol";
import type { StorageProvider } from "../storage/interface.js";

export class CatalogService {
  constructor(private storage: StorageProvider, private baseUrl: string) {}

  /** Initialize the catalog with seed data */
  async initialize(): Promise<void> {
    // Service Description (well-known)
    await this.storage.setResource(`${this.baseUrl}/.well-known/hyprcat`, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `${this.baseUrl}/.well-known/hyprcat`,
      "@type": "hypr:ServiceDescription",
      "hypr:entrypoint": `${this.baseUrl}/catalog`,
      "hypr:version": "1.0",
      "hypr:capabilities": [
        "hypr:HATEOASNavigation",
        "hypr:x402Payments",
        "hypr:ERC8004TokenGating",
        "hypr:CZEROFederation",
        "hypr:PROVOProvenance",
        "hypr:DIDAuth",
      ],
    });

    // Root API Documentation
    await this.storage.setResource(`${this.baseUrl}/`, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `did:web:${new URL(this.baseUrl).hostname}`,
      "@type": ["dcat:Catalog", "hydra:ApiDocumentation"],
      "dct:title": "HyprCAT Data Marketplace",
      "dct:description": "A HyprCAT-compliant decentralized data exchange with autonomous agent support.",
      "hydra:entrypoint": `${this.baseUrl}/catalog`,
      "mcp:prompts": { "@id": `${this.baseUrl}/prompts` },
    });

    // Main Catalog Collection
    await this.storage.setResource(`${this.baseUrl}/catalog`, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `${this.baseUrl}/catalog`,
      "@type": "hydra:Collection",
      "hydra:title": "Data Marketplace Catalog",
      "hydra:member": [],
      "hydra:operation": [
        {
          "@id": `${this.baseUrl}/catalog#search`,
          "@type": "hydra:IriTemplate",
          "hydra:template": `${this.baseUrl}/catalog{?q,type,domain}`,
          "hydra:mapping": [
            { "hydra:variable": "q", "hydra:property": "schema:query" },
            { "hydra:variable": "type", "hydra:property": "@type" },
            { "hydra:variable": "domain", "hydra:property": "dprod:domainInfo" },
          ],
        },
      ],
    });

    // Demo: Hardware Hub (Retail)
    const retailUrl = `${this.baseUrl}/nodes/retail`;
    await this.storage.setResource(retailUrl, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": retailUrl,
      "@type": ["schema:Store", "hydra:Collection"],
      "dct:title": "Global Hardware Hub",
      "dct:description": "Autonomous retail node. Supports x402 instant settlement for high-demand inventory.",
      "hydra:member": [
        {
          "@id": `${retailUrl}/products/h100`,
          "@type": "schema:Product",
          "schema:name": "NVIDIA H100 Tensor Core GPU",
          "schema:price": 3500,
          "schema:priceCurrency": "SAT",
          "schema:inventoryLevel": 12,
          "hydra:operation": [
            {
              "@id": `${retailUrl}/products/h100#buy`,
              "@type": ["hydra:Operation", "schema:BuyAction"],
              "hydra:method": "POST",
              "hydra:title": "Instant Purchase (3500 SAT)",
              "target": `${this.baseUrl}/operations/checkout`,
              "hydra:expects": {
                "@id": `${retailUrl}/products/h100#order-shape`,
                "@type": "schema:Order",
                "hydra:supportedProperty": [
                  { "hydra:property": "schema:price", "hydra:required": true, "hydra:title": "Price (SAT)" },
                ],
              },
              "hypr:constraint": {
                "@type": "x402:PaymentRequired",
                "@id": `${retailUrl}/products/h100#payment`,
                "x402:amount": 3500,
                "x402:currency": "SAT",
                "x402:recipient": "lnbc:retail@hardware-hub.io",
              },
            },
          ],
        },
      ],
    });

    // Demo: Databricks Analytics (Data Product)
    const analyticsUrl = `${this.baseUrl}/nodes/analytics`;
    await this.storage.setResource(analyticsUrl, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": analyticsUrl,
      "@type": ["dprod:DataProduct", "czero:VirtualGraph"],
      "dct:title": "Sales Analytics (Gold Layer)",
      "dct:description": "Unity Catalog curated dataset. SQL endpoint for autonomous analysis.",
      "dprod:domainInfo": "Business Intelligence",
      "czero:queryInterface": "SQL",
      "czero:federatedSource": [
        {
          "@id": `${analyticsUrl}/sources/warehouse`,
          "@type": "czero:SourceNode",
          "czero:endpoint": "jdbc:postgresql://warehouse.example/analytics",
          "czero:mappingType": "Direct",
          "czero:latency": "120ms",
        },
      ],
      "hydra:operation": [
        {
          "@id": `${analyticsUrl}#query`,
          "@type": ["hydra:Operation", "czero:QueryAction"],
          "hydra:method": "POST",
          "hydra:title": "Execute SQL Query",
          "target": `${this.baseUrl}/operations/query`,
          "hydra:expects": {
            "@id": `${analyticsUrl}#query-shape`,
            "@type": "schema:SearchAction",
            "hydra:supportedProperty": [
              { "hydra:property": "schema:query", "hydra:required": true, "hydra:title": "SQL Statement" },
            ],
          },
          "hydra:returns": "czero:ResultSet",
        },
      ],
    });

    // Demo: Learning Record Store (xAPI)
    const lrsUrl = `${this.baseUrl}/nodes/lrs`;
    await this.storage.setResource(lrsUrl, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": lrsUrl,
      "@type": ["dprod:DataProduct", "xapi:LRS"],
      "dct:title": "Enterprise Learning Record Store",
      "dct:description": "Streaming xAPI telemetry. Real-time capture of employee skill acquisition events.",
      "dprod:outputPort": [
        {
          "@type": "dprod:Port",
          "dct:title": "xAPI Statement Stream",
          "dcat:accessURL": `wss://${new URL(this.baseUrl).hostname}/xapi/live`,
        },
      ],
      "hydra:operation": [
        {
          "@id": `${lrsUrl}#export`,
          "@type": ["hydra:Operation", "schema:DownloadAction"],
          "hydra:method": "GET",
          "hydra:title": "Export Activity Statements (JSON)",
          "target": `${this.baseUrl}/operations/lrs/export`,
        },
      ],
    });

    // Demo: Prompts Collection
    await this.storage.setResource(`${this.baseUrl}/prompts`, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `${this.baseUrl}/prompts`,
      "@type": ["hydra:Collection", "mcp:PromptCollection"],
      "hydra:title": "System Prompts",
      "hydra:member": [
        {
          "@id": `${this.baseUrl}/prompts/retail`,
          "@type": "mcp:Prompt",
          "schema:name": "Retail Arbitrage Agent",
          "schema:description": "Locate high-demand hardware and purchase instantly.",
          "mcp:instruction": "Browse 'Hardware Hub'. If NVIDIA GPUs are in stock, execute a BuyAction using the wallet.",
        },
        {
          "@id": `${this.baseUrl}/prompts/engineer`,
          "@type": "mcp:Prompt",
          "schema:name": "Data Engineer (Analytics)",
          "schema:description": "Run analytics queries on curated datasets.",
          "mcp:instruction": "Access 'Sales Analytics'. Execute a SQL query to extract user spend metrics.",
        },
        {
          "@id": `${this.baseUrl}/prompts/hr`,
          "@type": "mcp:Prompt",
          "schema:name": "L&D Analyst (xAPI)",
          "schema:description": "Harvest learning telemetry from LRS.",
          "mcp:instruction": "Locate the LRS telemetry node. Download recent statements to analyze skill gaps.",
        },
      ],
      "hydra:totalItems": 3,
    });

    // Update catalog with member references
    await this.storage.setResource(`${this.baseUrl}/catalog`, {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `${this.baseUrl}/catalog`,
      "@type": "hydra:Collection",
      "hydra:title": "Data Marketplace Catalog",
      "hydra:totalItems": 3,
      "hydra:member": [
        { "@id": retailUrl, "@type": "schema:Store", "dct:title": "Hardware Hub (Retail)" },
        { "@id": analyticsUrl, "@type": "dprod:DataProduct", "dct:title": "Sales Analytics (Gold Layer)" },
        { "@id": lrsUrl, "@type": "xapi:LRS", "dct:title": "Learning Record Store" },
      ],
    });
  }

  /** Get a resource by IRI */
  async getResource(iri: string): Promise<JsonLdNode | null> {
    return this.storage.getResource(iri);
  }

  /** Register a new data product in the catalog */
  async registerDataProduct(product: JsonLdNode): Promise<void> {
    await this.storage.setResource(product["@id"], product);

    // Add to catalog
    const catalog = await this.storage.getResource(`${this.baseUrl}/catalog`);
    if (catalog) {
      const members = ((catalog as Record<string, unknown>)["hydra:member"] as JsonLdNode[]) || [];
      members.push({
        "@id": product["@id"],
        "@type": product["@type"],
        "dct:title": (product as Record<string, unknown>)["dct:title"] as string,
      } as JsonLdNode);
      (catalog as Record<string, unknown>)["hydra:member"] = members;
      (catalog as Record<string, unknown>)["hydra:totalItems"] = members.length;
      await this.storage.setResource(`${this.baseUrl}/catalog`, catalog);
    }
  }

  /** Search catalog by query string */
  async search(query?: string, type?: string, domain?: string): Promise<JsonLdNode[]> {
    const resources = await this.storage.listResources();
    const results: JsonLdNode[] = [];

    for (const iri of resources) {
      const resource = await this.storage.getResource(iri);
      if (!resource) continue;

      const r = resource as Record<string, unknown>;

      // Filter by type
      if (type) {
        const types = getResourceTypes(resource);
        if (!types.includes(type)) continue;
      }

      // Filter by domain
      if (domain && r["dprod:domainInfo"] !== domain) continue;

      // Filter by query (search title and description)
      if (query) {
        const title = String(r["dct:title"] || r["schema:name"] || "").toLowerCase();
        const desc = String(r["dct:description"] || "").toLowerCase();
        if (!title.includes(query.toLowerCase()) && !desc.includes(query.toLowerCase())) continue;
      }

      results.push(resource);
    }

    return results;
  }
}
