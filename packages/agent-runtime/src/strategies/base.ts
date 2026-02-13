/**
 * Base strategy interface for agent decision-making.
 */

import type { JsonLdNode, HydraOperation, Payload } from "@hyprcat/protocol";
import type { HyprCATWallet } from "@hyprcat/sdk";

/** Strategy evaluation result */
export interface StrategyDecision {
  /** Whether to execute this operation */
  shouldExecute: boolean;
  /** The operation to execute */
  operation?: HydraOperation;
  /** Input payload for the operation */
  input?: Payload;
  /** Reason for the decision */
  reason: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Navigation target if not executing an operation */
  navigateTo?: string;
}

/** Strategy context available to all strategies */
export interface StrategyContext {
  /** Current resource being evaluated */
  resource: JsonLdNode;
  /** Resource types */
  types: string[];
  /** Available operations */
  operations: HydraOperation[];
  /** Agent wallet */
  wallet: HyprCATWallet;
  /** Navigation history */
  visitedUrls: Set<string>;
  /** Custom parameters */
  params: Record<string, unknown>;
}

/** Base strategy interface */
export interface AgentStrategy {
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Resource types this strategy handles */
  triggerTypes: string[];

  /** Evaluate whether this strategy applies to the current resource */
  matches(context: StrategyContext): boolean;

  /** Make a decision about what action to take */
  evaluate(context: StrategyContext): Promise<StrategyDecision>;
}
