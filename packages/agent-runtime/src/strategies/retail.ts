/**
 * Retail strategy - handles purchasing decisions in ecommerce nodes.
 */

import type { HydraOperation } from "@hyprcat/protocol";
import type { AgentStrategy, StrategyContext, StrategyDecision } from "./base.js";

export class RetailStrategy implements AgentStrategy {
  name = "RETAIL_INSPECTION";
  description = "Evaluate retail products and execute purchases when criteria are met";
  triggerTypes = ["schema:Store", "schema:Product"];

  /** Max price the agent is willing to pay */
  private maxPrice: number;

  constructor(maxPrice: number = 5000) {
    this.maxPrice = maxPrice;
  }

  matches(context: StrategyContext): boolean {
    return context.types.some((t) => this.triggerTypes.includes(t));
  }

  async evaluate(context: StrategyContext): Promise<StrategyDecision> {
    const { resource, operations, wallet } = context;
    const r = resource as Record<string, unknown>;

    // Check if this is a collection with product members
    const members = r["hydra:member"];
    if (Array.isArray(members)) {
      for (const member of members) {
        const m = member as Record<string, unknown>;
        const price = m["schema:price"] as number;
        const inventory = m["schema:inventoryLevel"] as number;
        const name = m["schema:name"] as string;

        if (inventory > 0 && price <= this.maxPrice) {
          // Find buy operation
          const memberOps = m["hydra:operation"] as HydraOperation[] | undefined;
          if (memberOps) {
            const buyOp = memberOps.find((op) => {
              const types = Array.isArray(op["@type"]) ? op["@type"] : [op["@type"]];
              return types.includes("schema:BuyAction");
            });

            if (buyOp) {
              const balance = wallet.getBalance("SAT");
              if (balance >= price) {
                return {
                  shouldExecute: true,
                  operation: buyOp,
                  input: { "schema:price": String(price) },
                  reason: `Found "${name}" at ${price} SAT (inventory: ${inventory}). Balance sufficient (${balance} SAT).`,
                  priority: 10,
                };
              } else {
                return {
                  shouldExecute: false,
                  reason: `Found "${name}" at ${price} SAT but insufficient balance (${balance} SAT).`,
                  priority: 1,
                };
              }
            }
          }
        }
      }

      return {
        shouldExecute: false,
        reason: "No products meeting criteria found in store.",
        priority: 0,
      };
    }

    // Direct product resource
    const price = r["schema:price"] as number;
    if (price && price <= this.maxPrice) {
      const buyOp = operations.find((op) => {
        const types = Array.isArray(op["@type"]) ? op["@type"] : [op["@type"]];
        return types.includes("schema:BuyAction");
      });

      if (buyOp) {
        return {
          shouldExecute: true,
          operation: buyOp,
          input: { "schema:price": String(price) },
          reason: `Product available at ${price} SAT. Executing purchase.`,
          priority: 10,
        };
      }
    }

    return {
      shouldExecute: false,
      reason: "No actionable retail opportunity found.",
      priority: 0,
    };
  }
}
