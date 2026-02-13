/**
 * Governance types for access control in the HyprCAT Protocol.
 * Covers x402 payments, ERC-8004 token gating, and ODRL policies.
 */

import type { JsonLdNode, IRI, ISO8601DateTime, ISO8601Duration } from "./core.js";

// ─── x402 Payment Protocol ────────────────────────────────────────

/** Supported payment networks */
export type PaymentNetwork = "lightning" | "base" | "ethereum" | "bitcoin";

/** Supported payment currencies */
export type PaymentCurrency = "SAT" | "BTC" | "ETH" | "USDC" | "USD";

/** x402 Payment Constraint - requires payment before access */
export interface X402PaymentRequired extends JsonLdNode {
  "@type": "x402:PaymentRequired";
  "x402:amount": number;
  "x402:currency": PaymentCurrency;
  "x402:recipient": string;
  "x402:network"?: PaymentNetwork;
  "x402:invoice"?: string;
  "x402:expiresAt"?: ISO8601DateTime;
  "x402:description"?: string;
}

/** x402 Payment Proof - submitted by agent after signing */
export interface X402PaymentProof {
  preimage: string;
  invoice: string;
  paidAt: ISO8601DateTime;
}

/** x402 Subscription - recurring payment model */
export interface X402Subscription extends JsonLdNode {
  "@type": "x402:Subscription";
  "x402:amount": number;
  "x402:currency": PaymentCurrency;
  "x402:interval": ISO8601Duration;
  "x402:autoRenew"?: boolean;
  "x402:startDate"?: ISO8601DateTime;
  "x402:endDate"?: ISO8601DateTime;
  "x402:cancelURL"?: IRI;
}

/** Wallet state for payment operations */
export interface WalletState {
  did: string;
  balances: Record<PaymentCurrency, number>;
  tokens: Record<string, number>;
  provider: string;
  subscriptions: SubscriptionRecord[];
}

/** Subscription tracking record */
export interface SubscriptionRecord {
  id: string;
  resourceId: IRI;
  amount: number;
  currency: PaymentCurrency;
  interval: ISO8601Duration;
  startDate: ISO8601DateTime;
  nextPayment: ISO8601DateTime;
  active: boolean;
}

// ─── ERC-8004 Token Gating ────────────────────────────────────────

/** Supported token standards */
export type TokenStandard = "ERC-20" | "ERC-721" | "ERC-1155";

/** ERC-8004 Token Gate - requires token ownership for access */
export interface Erc8004TokenGate extends JsonLdNode {
  "@type": "erc8004:TokenGate";
  "erc8004:requiredToken": string;
  "erc8004:tokenStandard": TokenStandard;
  "erc8004:minBalance": number;
  "erc8004:chainId": number;
  "erc8004:contractAddress"?: string;
  "erc8004:verificationMethod"?: "erc8004:OnChainVerification" | "erc8004:SignatureVerification";
}

/** ERC-8004 Token Proof - submitted by agent to prove ownership */
export interface Erc8004TokenProof {
  address: string;
  chainId: number;
  signature: string;
  message: string;
  timestamp: ISO8601DateTime;
}

// ─── ODRL Policies ────────────────────────────────────────────────

/** ODRL Action types */
export type OdrlAction =
  | "odrl:read"
  | "odrl:write"
  | "odrl:execute"
  | "odrl:distribute"
  | "odrl:derive"
  | "odrl:delete"
  | "odrl:aggregate"
  | "odrl:annotate"
  | "odrl:archive"
  | "odrl:extract"
  | "odrl:stream";

/** ODRL Operator types */
export type OdrlOperator =
  | "odrl:eq"
  | "odrl:neq"
  | "odrl:lt"
  | "odrl:lteq"
  | "odrl:gt"
  | "odrl:gteq"
  | "odrl:isPartOf"
  | "odrl:isA";

/** ODRL Policy - rights management for resources */
export interface OdrlPolicy extends JsonLdNode {
  "@type": "odrl:Policy" | "odrl:Set" | "odrl:Offer" | "odrl:Agreement";
  "odrl:permission"?: OdrlPermission[];
  "odrl:prohibition"?: OdrlProhibition[];
  "odrl:obligation"?: OdrlDuty[];
}

/** ODRL Permission */
export interface OdrlPermission {
  "odrl:target": IRI;
  "odrl:action": OdrlAction;
  "odrl:assignee"?: string;
  "odrl:assigner"?: string;
  "odrl:constraint"?: OdrlConstraint[];
  "odrl:duty"?: OdrlDuty[];
}

/** ODRL Prohibition */
export interface OdrlProhibition {
  "odrl:target": IRI;
  "odrl:action": OdrlAction;
  "odrl:assignee"?: string;
}

/** ODRL Duty (obligation) */
export interface OdrlDuty {
  "odrl:action": OdrlAction;
  "odrl:target"?: IRI;
  "odrl:constraint"?: OdrlConstraint[];
}

/** ODRL Constraint */
export interface OdrlConstraint {
  "odrl:leftOperand": string;
  "odrl:operator": OdrlOperator;
  "odrl:rightOperand": string | number | boolean;
  "odrl:unit"?: string;
}

// ─── Composite Constraints ───────────────────────────────────────

/** Composite constraint combining multiple governance requirements */
export interface CompositeConstraint extends JsonLdNode {
  "@type": "hypr:CompositeConstraint";
  "hypr:operator": "AND" | "OR";
  "hypr:constraints": JsonLdNode[];
}
