/**
 * @hyprcat/agent-runtime
 *
 * Autonomous agent runtime implementing the HyprCAT O.N.A.
 * (Observe-Negotiate-Attest) execution loop.
 *
 * @packageDocumentation
 */

export { HyprAgentRuntime } from "./runtime.js";
export type { AgentConfig, AgentLog, AgentState, AgentEventType, AgentEventListener } from "./runtime.js";

export { RetailStrategy } from "./strategies/retail.js";
export { AnalyticsStrategy } from "./strategies/analytics.js";
export type { AgentStrategy, StrategyContext, StrategyDecision } from "./strategies/base.js";
