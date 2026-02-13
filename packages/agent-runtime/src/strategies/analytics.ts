/**
 * Analytics strategy - handles data queries and analysis operations.
 */

import type { AgentStrategy, StrategyContext, StrategyDecision } from "./base.js";

export class AnalyticsStrategy implements AgentStrategy {
  name = "DATA_ANALYTICS";
  description = "Execute analytical queries on data products and virtual graphs";
  triggerTypes = ["dprod:DataProduct", "czero:VirtualGraph"];

  /** Default query to execute */
  private defaultQuery: string;

  constructor(defaultQuery?: string) {
    this.defaultQuery = defaultQuery || "SELECT * FROM analytics LIMIT 10";
  }

  matches(context: StrategyContext): boolean {
    return context.types.some((t) => this.triggerTypes.includes(t));
  }

  async evaluate(context: StrategyContext): Promise<StrategyDecision> {
    const { operations, params } = context;

    // Find query operation
    const queryOp = operations.find((op) => {
      const types = Array.isArray(op["@type"]) ? op["@type"] : [op["@type"]];
      return types.includes("czero:QueryAction") || op["hydra:title"]?.toLowerCase().includes("query");
    });

    if (queryOp) {
      const query = (params["query"] as string) || this.defaultQuery;
      return {
        shouldExecute: true,
        operation: queryOp,
        input: { "schema:query": query },
        reason: `Found query endpoint. Executing: "${query.substring(0, 50)}..."`,
        priority: 8,
      };
    }

    // Find download/export operation
    const downloadOp = operations.find((op) => {
      const types = Array.isArray(op["@type"]) ? op["@type"] : [op["@type"]];
      return types.includes("schema:DownloadAction") || op["hydra:title"]?.toLowerCase().includes("export");
    });

    if (downloadOp) {
      return {
        shouldExecute: true,
        operation: downloadOp,
        reason: "Found export endpoint. Downloading data.",
        priority: 6,
      };
    }

    return {
      shouldExecute: false,
      reason: "No actionable data operations found.",
      priority: 0,
    };
  }
}
