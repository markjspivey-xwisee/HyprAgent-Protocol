/**
 * HyprAgent Runtime - implements the O.N.A. (Observe-Negotiate-Attest) loop.
 * This is the core autonomous agent execution engine.
 */

import type {
  JsonLdNode,
  HydraOperation,
  DID,
  Payload,
  X402PaymentRequired,
  Erc8004TokenGate,
} from "@hyprcat/protocol";
import { getResourceTypes, getOperations, isResourceType } from "@hyprcat/protocol";
import {
  HyprCATClient,
  HyprCATWallet,
  ProvenanceTracker,
  PaymentRequiredError,
  TokenGateError,
} from "@hyprcat/sdk";
import type { AgentStrategy, StrategyContext, StrategyDecision } from "./strategies/base.js";

/** Agent configuration */
export interface AgentConfig {
  /** Agent DID */
  did: DID;
  /** Starting URL for mesh navigation */
  startUrl: string;
  /** Maximum iterations for the O.N.A. loop */
  maxIterations?: number;
  /** Delay between iterations (ms) */
  iterationDelay?: number;
  /** Auto-pay when encountering x402 constraints */
  autoPayEnabled?: boolean;
  /** Maximum auto-pay amount */
  autoPayMaxAmount?: number;
}

/** Agent log entry */
export interface AgentLog {
  timestamp: string;
  phase: "observe" | "negotiate" | "attest" | "info" | "error";
  message: string;
  data?: unknown;
}

/** Agent state */
export type AgentState = "idle" | "running" | "paused" | "completed" | "error";

/** Agent event types */
export type AgentEventType =
  | "stateChange"
  | "log"
  | "observe"
  | "negotiate"
  | "attest"
  | "navigation"
  | "payment"
  | "error"
  | "complete";

/** Agent event listener */
export type AgentEventListener = (event: { type: AgentEventType; data: unknown }) => void;

/**
 * HyprAgent Runtime
 *
 * The autonomous agent execution engine. Implements the O.N.A. loop:
 * - **Observe:** Fetch and parse resources, discover affordances
 * - **Negotiate:** Evaluate strategies, satisfy constraints, execute operations
 * - **Attest:** Record provenance, verify results
 */
export class HyprAgentRuntime {
  private client: HyprCATClient;
  private wallet: HyprCATWallet;
  private provenance: ProvenanceTracker;
  private strategies: AgentStrategy[] = [];
  private config: Required<AgentConfig>;
  private state: AgentState = "idle";
  private logs: AgentLog[] = [];
  private visitedUrls: Set<string> = new Set();
  private listeners: Map<AgentEventType, Set<AgentEventListener>> = new Map();
  private currentUrl: string;
  private iterationCount: number = 0;
  private abortController: AbortController | null = null;

  constructor(config: AgentConfig, wallet: HyprCATWallet, client?: HyprCATClient) {
    this.config = {
      maxIterations: 20,
      iterationDelay: 1000,
      autoPayEnabled: true,
      autoPayMaxAmount: 5000,
      ...config,
    };

    this.wallet = wallet;
    this.client = client || new HyprCATClient({
      agentDid: config.did,
      debug: false,
    });
    this.provenance = new ProvenanceTracker(config.did);
    this.currentUrl = config.startUrl;
  }

  // ─── Strategy Registration ────────────────────────────────────

  /** Register an agent strategy */
  registerStrategy(strategy: AgentStrategy): void {
    this.strategies.push(strategy);
    this.log("info", `Strategy registered: ${strategy.name}`);
  }

  /** Register multiple strategies */
  registerStrategies(strategies: AgentStrategy[]): void {
    strategies.forEach((s) => this.registerStrategy(s));
  }

  // ─── O.N.A. Loop ──────────────────────────────────────────────

  /** Start the autonomous O.N.A. loop */
  async run(): Promise<void> {
    if (this.state === "running") return;

    this.setState("running");
    this.abortController = new AbortController();
    this.iterationCount = 0;

    this.log("info", `Agent starting. DID: ${this.config.did}`);
    this.log("info", `Entry point: ${this.config.startUrl}`);
    this.log("info", `Strategies: ${this.strategies.map((s) => s.name).join(", ")}`);

    try {
      while (
        this.state === "running" &&
        this.iterationCount < this.config.maxIterations
      ) {
        await this.iterate();
        this.iterationCount++;

        if (this.config.iterationDelay > 0) {
          await this.delay(this.config.iterationDelay);
        }
      }

      if (this.iterationCount >= this.config.maxIterations) {
        this.log("info", `Max iterations (${this.config.maxIterations}) reached.`);
      }

      this.setState("completed");
    } catch (error) {
      this.log("error", `Agent error: ${(error as Error).message}`);
      this.setState("error");
    }
  }

  /** Execute a single O.N.A. iteration */
  private async iterate(): Promise<void> {
    this.log("info", `─── Iteration ${this.iterationCount + 1} ───`);

    // ── OBSERVE ──────────────────────────────────────────────
    const resource = await this.observe(this.currentUrl);
    if (!resource) return;

    // ── NEGOTIATE ────────────────────────────────────────────
    const decision = await this.negotiate(resource);

    // ── ATTEST ───────────────────────────────────────────────
    if (decision.shouldExecute && decision.operation) {
      const result = await this.executeAndAttest(decision.operation, decision.input);
      if (result) {
        this.log("attest", `Result recorded: ${result["@type"]}`);
      }
    } else if (decision.navigateTo) {
      this.log("negotiate", `Navigating to: ${decision.navigateTo}`);
      this.currentUrl = decision.navigateTo;
    } else {
      this.log("negotiate", `No action: ${decision.reason}`);
      // Try to find unexplored links
      const nextUrl = this.findUnvisitedLink(resource);
      if (nextUrl) {
        this.log("info", `Exploring: ${nextUrl}`);
        this.currentUrl = nextUrl;
      } else {
        this.log("info", "All reachable resources explored. Stopping.");
        this.setState("completed");
      }
    }
  }

  /** OBSERVE phase: Fetch and parse a resource */
  private async observe(url: string): Promise<JsonLdNode | null> {
    this.emit("observe", { url });
    this.log("observe", `Fetching: ${url}`);

    try {
      const resource = await this.client.fetch(url);
      this.visitedUrls.add(url);

      const types = getResourceTypes(resource);
      const operations = this.client.getOperations(resource);

      this.log("observe", `Resource: ${(resource as Record<string, unknown>)["dct:title"] || resource["@id"]}`);
      this.log("observe", `Types: ${types.join(", ")}`);
      this.log("observe", `Operations: ${operations.length} available`);

      // Record provenance entity
      this.provenance.recordEntity(resource);

      return resource;
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        this.log("observe", `Payment required: ${error.paymentDetails["x402:amount"]} ${error.paymentDetails["x402:currency"]}`);
        if (this.config.autoPayEnabled) {
          return this.handlePayment(url, error.paymentDetails);
        }
      }
      this.log("error", `Fetch failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** NEGOTIATE phase: Evaluate strategies and decide on action */
  private async negotiate(resource: JsonLdNode): Promise<StrategyDecision> {
    const types = getResourceTypes(resource);
    const operations = this.client.getOperations(resource);

    const context: StrategyContext = {
      resource,
      types,
      operations,
      wallet: this.wallet,
      visitedUrls: this.visitedUrls,
      params: {},
    };

    // Evaluate all matching strategies
    const decisions: StrategyDecision[] = [];
    for (const strategy of this.strategies) {
      if (strategy.matches(context)) {
        this.log("negotiate", `Evaluating strategy: ${strategy.name}`);
        const decision = await strategy.evaluate(context);
        decisions.push(decision);
        this.log("negotiate", `${strategy.name}: ${decision.reason} (priority: ${decision.priority})`);
      }
    }

    // Select highest priority executable decision
    const executable = decisions
      .filter((d) => d.shouldExecute)
      .sort((a, b) => b.priority - a.priority);

    if (executable.length > 0) {
      this.emit("negotiate", executable[0]);
      return executable[0];
    }

    // Check for navigation suggestions
    const navigable = decisions.filter((d) => d.navigateTo);
    if (navigable.length > 0) return navigable[0];

    // Default: explore catalog links
    return {
      shouldExecute: false,
      reason: "No strategy matched. Exploring mesh.",
      priority: 0,
    };
  }

  /** Execute an operation and record provenance (ATTEST phase) */
  private async executeAndAttest(
    operation: HydraOperation,
    input?: Payload
  ): Promise<JsonLdNode | null> {
    const target = operation["target"] || operation["@id"];
    this.log("attest", `Executing: ${operation["hydra:title"]} → ${target}`);
    this.emit("attest", { operation: operation["hydra:title"], target, input });

    const startTime = Date.now();

    try {
      // Check for governance constraints
      const constraint = operation["hypr:constraint"] as JsonLdNode | undefined;
      if (constraint) {
        await this.satisfyConstraint(constraint);
      }

      const result = await this.client.executeOperation(operation, input);
      const duration = Date.now() - startTime;

      // Record provenance activity
      this.provenance.recordActivity(`Execute: ${operation["hydra:title"]}`, {
        actionType: String(operation["@type"]),
        payload: input || {},
        strategy: "agent-runtime",
        method: operation["hydra:method"],
        targetUrl: target,
        statusCode: 200,
        duration,
      });

      // Record result entity
      if (result["@id"]) {
        this.provenance.recordEntity(result, `Result: ${operation["hydra:title"]}`);
      }

      this.log("attest", `Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.provenance.recordActivity(`Failed: ${operation["hydra:title"]}`, {
        actionType: String(operation["@type"]),
        payload: { error: (error as Error).message },
        strategy: "agent-runtime",
        method: operation["hydra:method"],
        targetUrl: target,
        statusCode: 500,
        duration,
      });

      this.log("error", `Operation failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** Handle x402 payment constraint */
  private async handlePayment(
    url: string,
    paymentDetails: X402PaymentRequired
  ): Promise<JsonLdNode | null> {
    const amount = paymentDetails["x402:amount"];
    const currency = paymentDetails["x402:currency"];

    if (amount > this.config.autoPayMaxAmount) {
      this.log("negotiate", `Payment ${amount} ${currency} exceeds max auto-pay (${this.config.autoPayMaxAmount}).`);
      return null;
    }

    if (!this.wallet.canAfford(paymentDetails)) {
      this.log("negotiate", `Insufficient balance for ${amount} ${currency}.`);
      return null;
    }

    this.log("negotiate", `Signing payment: ${amount} ${currency}`);
    const proof = await this.wallet.signPayment(paymentDetails);
    this.emit("payment", { amount, currency, proof });

    // Retry with payment proof
    // In production: add X-Payment-Proof header
    this.log("negotiate", `Payment signed. Retrying request.`);
    return null; // The actual retry would need custom fetch headers
  }

  /** Satisfy a governance constraint */
  private async satisfyConstraint(constraint: JsonLdNode): Promise<void> {
    const types = getResourceTypes(constraint);

    if (types.includes("x402:PaymentRequired")) {
      const payment = constraint as unknown as X402PaymentRequired;
      if (this.config.autoPayEnabled && this.wallet.canAfford(payment)) {
        await this.wallet.signPayment(payment);
        this.log("negotiate", `Payment satisfied: ${payment["x402:amount"]} ${payment["x402:currency"]}`);
      }
    }

    if (types.includes("erc8004:TokenGate")) {
      const gate = constraint as unknown as Erc8004TokenGate;
      if (!this.wallet.satisfiesTokenGate(gate)) {
        this.log("negotiate", `Token gate not satisfied: need ${gate["erc8004:minBalance"]} of ${gate["erc8004:requiredToken"]}`);
      }
    }
  }

  /** Find an unvisited link in the current resource */
  private findUnvisitedLink(resource: JsonLdNode): string | null {
    const r = resource as Record<string, unknown>;

    // Check collection members
    const members = r["hydra:member"];
    if (Array.isArray(members)) {
      for (const member of members) {
        const id = (member as Record<string, unknown>)["@id"] as string;
        if (id && !this.visitedUrls.has(id)) return id;
      }
    }

    // Check datasets
    const datasets = r["dcat:dataset"];
    if (Array.isArray(datasets)) {
      for (const ds of datasets) {
        const id = (ds as Record<string, unknown>)["@id"] as string;
        if (id && !this.visitedUrls.has(id)) return id;
      }
    }

    return null;
  }

  // ─── State Management ─────────────────────────────────────────

  /** Pause the agent */
  pause(): void {
    if (this.state === "running") {
      this.setState("paused");
      this.log("info", "Agent paused.");
    }
  }

  /** Resume the agent */
  resume(): void {
    if (this.state === "paused") {
      this.setState("running");
      this.log("info", "Agent resumed.");
      this.run();
    }
  }

  /** Stop the agent */
  stop(): void {
    this.setState("completed");
    this.abortController?.abort();
    this.log("info", "Agent stopped.");
  }

  /** Get current state */
  getState(): AgentState {
    return this.state;
  }

  /** Get agent logs */
  getLogs(): AgentLog[] {
    return [...this.logs];
  }

  /** Get provenance chain */
  getProvenance(): ReturnType<ProvenanceTracker["getChain"]> {
    return this.provenance.getChain();
  }

  /** Get provenance as JSON-LD */
  getProvenanceJsonLd(): object {
    return this.provenance.exportAsJsonLd();
  }

  /** Get wallet state */
  getWalletState() {
    return this.wallet.getState();
  }

  /** Get visited URLs */
  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }

  private setState(state: AgentState): void {
    this.state = state;
    this.emit("stateChange", { state });
  }

  // ─── Events ───────────────────────────────────────────────────

  on(event: AgentEventType, listener: AgentEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(type: AgentEventType, data: unknown = {}): void {
    this.listeners.get(type)?.forEach((listener) => listener({ type, data }));
  }

  // ─── Logging ──────────────────────────────────────────────────

  private log(phase: AgentLog["phase"], message: string, data?: unknown): void {
    const entry: AgentLog = {
      timestamp: new Date().toISOString(),
      phase,
      message,
      data,
    };
    this.logs.push(entry);
    this.emit("log", entry);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
