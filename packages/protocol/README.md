# @hyprcat/protocol

Core protocol types, schemas, and validation for the **HyprCAT Protocol** (Hypermedia Context & Action Transfer).

## Installation

```bash
pnpm add @hyprcat/protocol
```

## Usage

```typescript
import {
  // Types
  type JsonLdNode,
  type HydraOperation,
  type DcatCatalog,
  type DprodDataProduct,
  type X402PaymentRequired,
  type Erc8004TokenGate,
  type DID,

  // Validation
  validateResource,
  validateOperation,
  validateInput,
  getResourceTypes,
  isResourceType,
  getOperations,

  // Constants
  HYPRCAT_VERSION,
  HYPRCAT_CONTEXT_URI,
  CONTENT_TYPE_JSONLD,
  HYPRCAT_INLINE_CONTEXT,

  // Schemas
  expandIRI,
  compactIRI,
  NAMESPACES,
} from "@hyprcat/protocol";
```

## Type System

The protocol defines types across these W3C/industry vocabularies:

| Module | Vocabulary | Key Types |
|--------|-----------|-----------|
| `core` | JSON-LD | `JsonLdNode`, `IRI`, `DID`, `HttpMethod` |
| `hydra` | W3C Hydra | `HydraOperation`, `HydraCollection`, `HydraClass` |
| `dcat` | W3C DCAT / DPROD | `DcatCatalog`, `DcatDataset`, `DprodDataProduct` |
| `governance` | x402 / ERC-8004 | `X402PaymentRequired`, `Erc8004TokenGate`, `OdrlPolicy` |
| `identity` | DID / VC | `DIDDocument`, `VerifiableCredential`, `SessionToken` |
| `provenance` | W3C PROV-O | `ProvEntity`, `ProvActivity`, `ProvenanceChain` |
| `czero` | C-ZERO | `CzeroVirtualGraph`, `CzeroResultSet` |
| `mcp` | MCP / xAPI | `McpPrompt`, `McpTool`, `XapiStatement` |

## Validation

```typescript
import { validateResource, validateOperation } from "@hyprcat/protocol";

const resource = { "@id": "urn:example", "@type": "schema:Product" };
const result = validateResource(resource);
// { valid: true, errors: [] }
```

## License

Apache-2.0
