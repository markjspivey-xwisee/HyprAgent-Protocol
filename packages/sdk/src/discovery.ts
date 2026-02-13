/**
 * Resource Discovery Service for the HyprCAT SDK.
 * Provides intelligent mesh navigation and resource search.
 */

import type {
  JsonLdNode,
  HydraCollection,
  HydraIriTemplate,
  HydraOperation,
  IRI,
} from "@hyprcat/protocol";
import { getResourceTypes, getOperations, isResourceType } from "@hyprcat/protocol";
import { HyprCATClient } from "./client.js";

/** Discovery result */
export interface DiscoveryResult {
  resource: JsonLdNode;
  url: IRI;
  types: string[];
  operations: HydraOperation[];
  depth: number;
}

/** Search criteria for resource discovery */
export interface SearchCriteria {
  /** Resource type to find (e.g., "schema:Product", "dprod:DataProduct") */
  type?: string;
  /** Keyword to match against titles/descriptions */
  keyword?: string;
  /** Property to match against */
  property?: { key: string; value: unknown };
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Maximum results to return */
  maxResults?: number;
}

/**
 * Resource Discovery Service
 *
 * Provides methods for traversing the HyprCAT mesh,
 * discovering resources, and searching by type/keyword.
 */
export class DiscoveryService {
  private client: HyprCATClient;
  private visited: Set<string> = new Set();

  constructor(client: HyprCATClient) {
    this.client = client;
  }

  /** Discover entry point of a HyprCAT mesh */
  async discoverMesh(baseUrl: string): Promise<JsonLdNode> {
    return this.client.discover(baseUrl);
  }

  /** Search the mesh for resources matching criteria */
  async search(
    startUrl: string,
    criteria: SearchCriteria
  ): Promise<DiscoveryResult[]> {
    this.visited.clear();
    const results: DiscoveryResult[] = [];
    const maxDepth = criteria.maxDepth ?? 3;
    const maxResults = criteria.maxResults ?? 50;

    await this.crawl(startUrl, criteria, results, 0, maxDepth, maxResults);

    return results;
  }

  /** Find all resources of a specific type */
  async findByType(startUrl: string, type: string, maxDepth: number = 3): Promise<DiscoveryResult[]> {
    return this.search(startUrl, { type, maxDepth });
  }

  /** Find all operations available at a resource */
  async findOperations(url: string): Promise<HydraOperation[]> {
    const resource = await this.client.fetch(url);
    return this.client.getOperations(resource);
  }

  /** Expand an IRI template with given variables */
  expandTemplate(template: HydraIriTemplate, variables: Record<string, string>): string {
    let expanded = template["hydra:template"];

    for (const mapping of template["hydra:mapping"]) {
      const variable = mapping["hydra:variable"];
      const value = variables[variable];

      if (value !== undefined) {
        // Simple template expansion (RFC 6570 Level 1)
        expanded = expanded.replace(`{${variable}}`, encodeURIComponent(value));
        expanded = expanded.replace(`{?${variable}}`, `?${variable}=${encodeURIComponent(value)}`);
      } else {
        // Remove unresolved optionals
        expanded = expanded.replace(`{${variable}}`, "");
        expanded = expanded.replace(`{?${variable}}`, "");
      }
    }

    // Handle multi-variable query templates like {?q,type,domain}
    const queryMatch = expanded.match(/\{\?([^}]+)\}/);
    if (queryMatch) {
      const vars = queryMatch[1].split(",");
      const queryParts: string[] = [];
      for (const v of vars) {
        const trimmed = v.trim();
        if (variables[trimmed] !== undefined) {
          queryParts.push(`${trimmed}=${encodeURIComponent(variables[trimmed])}`);
        }
      }
      expanded = expanded.replace(
        queryMatch[0],
        queryParts.length > 0 ? `?${queryParts.join("&")}` : ""
      );
    }

    return expanded;
  }

  /** Build a graph of all reachable resources from a starting point */
  async buildMeshGraph(
    startUrl: string,
    maxDepth: number = 3
  ): Promise<Map<string, DiscoveryResult>> {
    const graph = new Map<string, DiscoveryResult>();
    this.visited.clear();
    await this.crawlGraph(startUrl, graph, 0, maxDepth);
    return graph;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async crawl(
    url: string,
    criteria: SearchCriteria,
    results: DiscoveryResult[],
    depth: number,
    maxDepth: number,
    maxResults: number
  ): Promise<void> {
    if (depth > maxDepth || results.length >= maxResults || this.visited.has(url)) return;
    this.visited.add(url);

    let resource: JsonLdNode;
    try {
      resource = await this.client.fetch(url);
    } catch {
      return;
    }

    const types = getResourceTypes(resource);
    const operations = getOperations(resource as Record<string, unknown>);

    // Check if resource matches criteria
    if (this.matchesCriteria(resource, types, criteria)) {
      results.push({ resource, url, types, operations, depth });
    }

    if (results.length >= maxResults) return;

    // Traverse collection members
    const members = (resource as Record<string, unknown>)["hydra:member"];
    if (Array.isArray(members)) {
      for (const member of members) {
        if (member["@id"] && !this.visited.has(member["@id"])) {
          await this.crawl(
            member["@id"],
            criteria,
            results,
            depth + 1,
            maxDepth,
            maxResults
          );
        }
      }
    }

    // Follow datasets
    const datasets = (resource as Record<string, unknown>)["dcat:dataset"];
    if (Array.isArray(datasets)) {
      for (const ds of datasets) {
        if (ds["@id"] && !this.visited.has(ds["@id"])) {
          await this.crawl(ds["@id"], criteria, results, depth + 1, maxDepth, maxResults);
        }
      }
    }
  }

  private matchesCriteria(
    resource: JsonLdNode,
    types: string[],
    criteria: SearchCriteria
  ): boolean {
    if (criteria.type && !types.includes(criteria.type)) return false;

    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      const title = String(
        (resource as Record<string, unknown>)["dct:title"] ||
        (resource as Record<string, unknown>)["schema:name"] ||
        ""
      ).toLowerCase();
      const desc = String(
        (resource as Record<string, unknown>)["dct:description"] ||
        (resource as Record<string, unknown>)["schema:description"] ||
        ""
      ).toLowerCase();

      if (!title.includes(keyword) && !desc.includes(keyword)) return false;
    }

    if (criteria.property) {
      const val = (resource as Record<string, unknown>)[criteria.property.key];
      if (val !== criteria.property.value) return false;
    }

    return true;
  }

  private async crawlGraph(
    url: string,
    graph: Map<string, DiscoveryResult>,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth > maxDepth || this.visited.has(url)) return;
    this.visited.add(url);

    let resource: JsonLdNode;
    try {
      resource = await this.client.fetch(url);
    } catch {
      return;
    }

    const types = getResourceTypes(resource);
    const operations = getOperations(resource as Record<string, unknown>);
    graph.set(url, { resource, url, types, operations, depth });

    const members = (resource as Record<string, unknown>)["hydra:member"];
    if (Array.isArray(members)) {
      for (const member of members) {
        if (member["@id"]) {
          await this.crawlGraph(member["@id"], graph, depth + 1, maxDepth);
        }
      }
    }
  }
}
