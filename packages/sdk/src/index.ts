/**
 * @hyprcat/sdk
 *
 * Client SDK for interacting with HyprCAT Protocol services.
 * Provides HATEOAS-driven navigation, operation execution,
 * payment handling, identity management, and provenance tracking.
 *
 * @packageDocumentation
 */

export { HyprCATClient } from "./client.js";
export type { HyprCATClientConfig, ClientEvent, ClientEventType, ClientEventListener } from "./client.js";

export { DiscoveryService } from "./discovery.js";
export type { DiscoveryResult, SearchCriteria } from "./discovery.js";

export { HyprCATWallet } from "./wallet.js";
export type { WalletEvent, WalletEventType, WalletEventListener, WalletTransaction } from "./wallet.js";

export { IdentityManager } from "./identity.js";
export type { IdentityConfig } from "./identity.js";

export { ProvenanceTracker } from "./provenance.js";

export * from "./errors.js";

// Re-export core types for convenience
export type {
  JsonLdNode,
  HydraOperation,
  HydraCollection,
  DcatCatalog,
  DcatDataset,
  DprodDataProduct,
  CzeroVirtualGraph,
  CzeroResultSet,
  X402PaymentRequired,
  Erc8004TokenGate,
  OdrlPolicy,
  McpPrompt,
  VerifiableCredential,
  WalletState,
  DID,
  IRI,
} from "@hyprcat/protocol";
