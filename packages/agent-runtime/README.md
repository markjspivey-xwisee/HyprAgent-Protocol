# @hyprcat/agent-runtime

Autonomous agent runtime implementing the HyprCAT **O.N.A. (Observe-Negotiate-Attest)** loop for navigating decentralized data marketplaces.

## Installation

```bash
pnpm add @hyprcat/agent-runtime @hyprcat/sdk @hyprcat/protocol
```

## Usage

```typescript
import { HyprAgentRuntime, RetailStrategy, AnalyticsStrategy } from "@hyprcat/agent-runtime";
import { HyprCATWallet, HyprCATClient } from "@hyprcat/sdk";

// Set up wallet and client
const wallet = new HyprCATWallet("did:key:z6Mk...", { balances: { SAT: 10000 } });
const client = new HyprCATClient({ baseUrl: "http://localhost:3001" });

// Create runtime
const agent = new HyprAgentRuntime(
  {
    did: "did:key:z6Mk...",
    startUrl: "http://localhost:3001/catalog",
    maxIterations: 10,
    autoPayEnabled: true,
    autoPayMaxAmount: 5000,
  },
  wallet,
  client
);

// Register strategies
agent.registerStrategies([
  new RetailStrategy(5000),      // Buy products under 5000 SAT
  new AnalyticsStrategy("SELECT * FROM analytics LIMIT 10"),
]);

// Listen for events
agent.on("observe", (e) => console.log("Observing:", e.data));
agent.on("negotiate", (e) => console.log("Decision:", e.data));
agent.on("payment", (e) => console.log("Payment:", e.data));

// Run the O.N.A. loop
await agent.run();

// Inspect results
console.log("Visited:", agent.getVisitedUrls());
console.log("Provenance:", agent.getProvenanceJsonLd());
```

## Strategies

### RetailStrategy
Evaluates retail products and executes purchases when price and inventory criteria are met.

### AnalyticsStrategy
Discovers and executes analytical queries on data products and virtual graphs.

### Custom Strategies

```typescript
import type { AgentStrategy, StrategyContext, StrategyDecision } from "@hyprcat/agent-runtime";

class MyStrategy implements AgentStrategy {
  name = "MY_STRATEGY";
  description = "Custom agent behavior";
  triggerTypes = ["schema:SomeType"];

  matches(context: StrategyContext): boolean {
    return context.types.some(t => this.triggerTypes.includes(t));
  }

  async evaluate(context: StrategyContext): Promise<StrategyDecision> {
    return {
      shouldExecute: true,
      operation: context.operations[0],
      reason: "Found matching operation",
      priority: 10,
    };
  }
}
```

## License

Apache-2.0
