# @hyprcat/sdk

Client SDK for interacting with HyprCAT Protocol services. Provides a high-level API for resource discovery, wallet management, identity, and provenance tracking.

## Installation

```bash
pnpm add @hyprcat/sdk @hyprcat/protocol
```

## Quick Start

```typescript
import { HyprCATClient, HyprCATWallet, IdentityManager, ProvenanceTracker } from "@hyprcat/sdk";

// Create a client
const client = new HyprCATClient({
  baseUrl: "http://localhost:3001",
  agentDid: "did:key:z6MkExample",
});

// Discover resources
const catalog = await client.discover();
const operations = client.getOperations(catalog);

// Execute an operation
const result = await client.executeOperation(operations[0], {
  "schema:query": "SELECT * FROM analytics LIMIT 5",
});
```

## Modules

### HyprCATClient

HATEOAS-driven HTTP client with automatic JSON-LD content negotiation, caching, retry logic, and event system.

```typescript
const client = new HyprCATClient({
  baseUrl: "http://localhost:3001",
  agentDid: "did:key:z6Mk...",
  debug: false,
});

// Fetch any resource
const resource = await client.fetch("http://localhost:3001/nodes/retail");

// Navigate links
const operations = client.getOperations(resource);
```

### HyprCATWallet

Lightning Network wallet with balance management, x402 payment signing, ERC-8004 token operations, and subscription tracking.

```typescript
const wallet = new HyprCATWallet("did:key:z6Mk...", {
  balances: { SAT: 10000 },
});

// Check affordability
const canPay = wallet.canAfford(paymentDetails);

// Sign a payment
const proof = await wallet.signPayment(paymentDetails);

// Token operations
wallet.mintToken("0xDAO", 5);
const hasAccess = wallet.satisfiesTokenGate(tokenGate);
```

### IdentityManager

DID resolution, Verifiable Credential management, and DID-Auth challenge/response.

```typescript
const identity = new IdentityManager("did:key:z6Mk...");

// Respond to auth challenge
const response = await identity.createAuthResponse(challenge);

// Manage credentials
identity.addCredential(credential);
const creds = identity.getCredentials({ type: "HyprCATAccess" });
```

### ProvenanceTracker

W3C PROV-O compliant provenance chain recording with JSON-LD export.

```typescript
const provenance = new ProvenanceTracker("did:key:z6Mk...");

// Record entities and activities
provenance.recordEntity(resource, "Catalog snapshot");
provenance.recordActivity("SQL Query", {
  actionType: "czero:QueryAction",
  method: "POST",
  targetUrl: "/operations/query",
  statusCode: 200,
  duration: 120,
});

// Export as JSON-LD
const jsonld = provenance.exportAsJsonLd();
```

## Error Handling

```typescript
import {
  HyprCATError,
  PaymentRequiredError,
  TokenGateError,
  NotFoundError,
  RateLimitError,
} from "@hyprcat/sdk";

try {
  await client.fetch(url);
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    // Handle x402 payment
    const proof = await wallet.signPayment(error.paymentDetails);
  }
  if (error instanceof TokenGateError) {
    // Handle ERC-8004 token gate
    console.log("Need token:", error.gateDetails["erc8004:requiredToken"]);
  }
}
```

## License

Apache-2.0
