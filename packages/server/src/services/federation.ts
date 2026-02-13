/**
 * Federation Service - C-ZERO federated query execution engine.
 * Parses SQL-like queries, dispatches to multiple data sources,
 * and merges results with provenance metadata.
 */

import type { CzeroResultSet, CzeroResultItem } from "@hyprcat/protocol";
import { HYPRCAT_INLINE_CONTEXT } from "@hyprcat/protocol";

interface SourceConfig {
  endpoint: string;
  mappingType: string;
}

interface ParsedQuery {
  select: string[];
  from: string;
  where: WhereClause[];
  limit: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

interface WhereClause {
  field: string;
  operator: string;
  value: string | number;
}

/** Simulated data sources with realistic datasets */
const DATA_SOURCES: Record<string, CzeroResultItem[]> = {
  analytics: [
    { user_id: 101, total_spend: 540.2, last_login: "2024-05-01", region: "US-West", segment: "premium" },
    { user_id: 204, total_spend: 1200.0, last_login: "2024-04-28", region: "EU-West", segment: "enterprise" },
    { user_id: 305, total_spend: 89.5, last_login: "2024-05-03", region: "US-East", segment: "basic" },
    { user_id: 412, total_spend: 3200.0, last_login: "2024-04-15", region: "APAC", segment: "enterprise" },
    { user_id: 567, total_spend: 420.75, last_login: "2024-05-02", region: "US-West", segment: "premium" },
    { user_id: 623, total_spend: 15.0, last_login: "2024-03-22", region: "EU-East", segment: "basic" },
    { user_id: 789, total_spend: 890.3, last_login: "2024-04-30", region: "US-East", segment: "premium" },
    { user_id: 891, total_spend: 5600.0, last_login: "2024-05-01", region: "APAC", segment: "enterprise" },
  ],
  sales: [
    { product_id: "GPU-H100", revenue: 35000, units_sold: 10, quarter: "Q2-2024", category: "hardware" },
    { product_id: "GPU-A100", revenue: 22000, units_sold: 15, quarter: "Q2-2024", category: "hardware" },
    { product_id: "SSD-4TB", revenue: 8500, units_sold: 50, quarter: "Q2-2024", category: "storage" },
    { product_id: "RAM-128G", revenue: 12000, units_sold: 30, quarter: "Q2-2024", category: "memory" },
    { product_id: "CPU-EPYC", revenue: 45000, units_sold: 5, quarter: "Q1-2024", category: "compute" },
    { product_id: "NET-100G", revenue: 6000, units_sold: 20, quarter: "Q1-2024", category: "networking" },
  ],
  inventory: [
    { sku: "GPU-H100", stock: 12, warehouse: "US-West-1", reorder_point: 5, unit_cost: 3500 },
    { sku: "GPU-A100", stock: 25, warehouse: "US-East-1", reorder_point: 10, unit_cost: 1500 },
    { sku: "SSD-4TB", stock: 150, warehouse: "EU-Central", reorder_point: 50, unit_cost: 170 },
    { sku: "RAM-128G", stock: 80, warehouse: "US-West-1", reorder_point: 20, unit_cost: 400 },
    { sku: "CPU-EPYC", stock: 3, warehouse: "US-East-1", reorder_point: 2, unit_cost: 9000 },
  ],
  telemetry: [
    { learner_id: "L001", course: "Kubernetes 201", score: 0.92, completed: true, hours: 12 },
    { learner_id: "L002", course: "Python ML Foundations", score: 0.67, completed: false, hours: 8 },
    { learner_id: "L003", course: "Data Engineering", score: 0.85, completed: true, hours: 16 },
    { learner_id: "L004", course: "Cloud Architecture", score: 0.78, completed: true, hours: 20 },
    { learner_id: "L005", course: "Kubernetes 201", score: 0.95, completed: true, hours: 10 },
  ],
};

export class FederationService {
  /** Execute a federated query across data sources */
  async executeQuery(
    query: string,
    queryLanguage: string,
    sources: SourceConfig[]
  ): Promise<CzeroResultSet> {
    const startTime = Date.now();

    // Parse the query
    const parsed = this.parseQuery(query);

    // Determine which data sources to query
    const sourceResults: Array<{
      source: string;
      items: CzeroResultItem[];
      duration: number;
    }> = [];

    // Query matching data sources
    const targetSource = this.resolveDataSource(parsed.from, sources);
    const sourceStart = Date.now();
    const rawItems = this.queryDataSource(targetSource, parsed);
    sourceResults.push({
      source: targetSource,
      items: rawItems,
      duration: Date.now() - sourceStart,
    });

    // If query references multiple tables (e.g., JOIN), query additional sources
    const additionalSources = this.detectAdditionalSources(query);
    for (const src of additionalSources) {
      if (src !== targetSource) {
        const srcStart = Date.now();
        const srcItems = DATA_SOURCES[src] || [];
        sourceResults.push({
          source: src,
          items: srcItems.slice(0, parsed.limit),
          duration: Date.now() - srcStart,
        });
      }
    }

    // Merge results
    const mergedItems = sourceResults.flatMap((sr) => sr.items);

    // Apply final limit
    const finalItems = mergedItems.slice(0, parsed.limit);

    const totalDuration = Date.now() - startTime;

    return {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `urn:czero:result:${crypto.randomUUID()}`,
      "@type": "czero:ResultSet",
      "czero:items": finalItems,
      "czero:totalResults": mergedItems.length,
      "czero:queryLanguage": queryLanguage,
      "czero:executionTime": `${totalDuration}ms`,
      "czero:sources": sourceResults.map((sr) => ({
        "@type": "czero:SourceResult",
        "czero:endpoint": sr.source,
        "czero:itemCount": sr.items.length,
        "czero:latency": `${sr.duration}ms`,
      })),
      "prov:wasGeneratedBy": {
        "@type": "prov:Activity",
        "prov:startedAtTime": new Date(startTime).toISOString(),
        "prov:endedAtTime": new Date().toISOString(),
        "prov:used": sources.map((s) => s.endpoint),
      },
    } as unknown as CzeroResultSet;
  }

  /** Parse a SQL-like query string */
  private parseQuery(query: string): ParsedQuery {
    const normalized = query.trim().replace(/\s+/g, " ");

    // Extract SELECT fields
    const selectMatch = normalized.match(/SELECT\s+(.+?)\s+FROM/i);
    const selectFields = selectMatch
      ? selectMatch[1].split(",").map((f) => f.trim())
      : ["*"];

    // Extract FROM table
    const fromMatch = normalized.match(/FROM\s+(\S+)/i);
    const from = fromMatch ? fromMatch[1].replace(/[`;]/g, "") : "analytics";

    // Extract WHERE clauses
    const where: WhereClause[] = [];
    const whereMatch = normalized.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1].split(/\s+AND\s+/i);
      for (const cond of conditions) {
        const parts = cond.match(/(\w+)\s*(>=|<=|!=|=|>|<|LIKE)\s*['"]*([^'"]*)['"]*\s*/i);
        if (parts) {
          const value = isNaN(Number(parts[3])) ? parts[3] : Number(parts[3]);
          where.push({ field: parts[1], operator: parts[2].toUpperCase(), value });
        }
      }
    }

    // Extract LIMIT
    const limitMatch = normalized.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;

    // Extract ORDER BY
    const orderMatch = normalized.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    const orderBy = orderMatch ? orderMatch[1] : undefined;
    const orderDir = orderMatch ? ((orderMatch[2] || "ASC").toUpperCase() as "ASC" | "DESC") : undefined;

    return { select: selectFields, from, where, limit, orderBy, orderDir };
  }

  /** Resolve which data source to query based on table name */
  private resolveDataSource(tableName: string, _sources: SourceConfig[]): string {
    const name = tableName.toLowerCase().replace(/[^a-z_]/g, "");

    // Map table names to data sources
    if (name.includes("user") || name.includes("analytics") || name.includes("spend")) {
      return "analytics";
    }
    if (name.includes("sale") || name.includes("revenue") || name.includes("product")) {
      return "sales";
    }
    if (name.includes("inventory") || name.includes("stock") || name.includes("warehouse")) {
      return "inventory";
    }
    if (name.includes("learn") || name.includes("telemetry") || name.includes("course")) {
      return "telemetry";
    }

    return "analytics"; // default
  }

  /** Query a specific data source with parsed conditions */
  private queryDataSource(sourceName: string, parsed: ParsedQuery): CzeroResultItem[] {
    const data = DATA_SOURCES[sourceName] || [];

    // Apply WHERE filters
    let filtered = data.filter((item) => {
      return parsed.where.every((clause) => {
        const value = item[clause.field];
        if (value === undefined) return true; // Skip unknown fields

        switch (clause.operator) {
          case "=":
            return String(value) === String(clause.value);
          case "!=":
            return String(value) !== String(clause.value);
          case ">":
            return Number(value) > Number(clause.value);
          case ">=":
            return Number(value) >= Number(clause.value);
          case "<":
            return Number(value) < Number(clause.value);
          case "<=":
            return Number(value) <= Number(clause.value);
          case "LIKE":
            return String(value)
              .toLowerCase()
              .includes(String(clause.value).toLowerCase().replace(/%/g, ""));
          default:
            return true;
        }
      });
    });

    // Apply ORDER BY
    if (parsed.orderBy) {
      const dir = parsed.orderDir === "DESC" ? -1 : 1;
      filtered.sort((a, b) => {
        const va = a[parsed.orderBy!];
        const vb = b[parsed.orderBy!];
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
    }

    // Apply SELECT projection
    if (!parsed.select.includes("*")) {
      filtered = filtered.map((item) => {
        const projected: CzeroResultItem = {};
        for (const field of parsed.select) {
          const cleanField = field.replace(/^\w+\./, ""); // Remove table prefix
          if (item[cleanField] !== undefined) {
            projected[cleanField] = item[cleanField];
          }
        }
        return projected;
      });
    }

    // Apply LIMIT
    return filtered.slice(0, parsed.limit);
  }

  /** Detect references to additional data sources in the query */
  private detectAdditionalSources(query: string): string[] {
    const sources: string[] = [];
    const lower = query.toLowerCase();

    if (lower.includes("join") || lower.includes("union")) {
      // Look for additional table references
      const joinMatch = lower.match(/join\s+(\w+)/gi);
      if (joinMatch) {
        for (const m of joinMatch) {
          const table = m.replace(/join\s+/i, "");
          const resolved = this.resolveDataSource(table, []);
          if (!sources.includes(resolved)) sources.push(resolved);
        }
      }
    }

    return sources;
  }
}
