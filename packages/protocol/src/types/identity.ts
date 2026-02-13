/**
 * Identity types for the HyprCAT Protocol.
 * Covers DIDs, DID Documents, Verifiable Credentials, and authentication.
 */

import type { IRI, DID, ISO8601DateTime } from "./core.js";

// ─── DID (Decentralized Identifiers) ─────────────────────────────

/** Supported DID methods */
export type DIDMethod = "web" | "key" | "pkh" | "ion" | "ethr";

/** DID Document - describes the identity and capabilities of an entity */
export interface DIDDocument {
  "@context": string | string[];
  id: DID;
  controller?: DID | DID[];
  alsoKnownAs?: string[];
  authentication?: VerificationMethod[];
  assertionMethod?: VerificationMethod[];
  keyAgreement?: VerificationMethod[];
  capabilityInvocation?: VerificationMethod[];
  capabilityDelegation?: VerificationMethod[];
  service?: DIDService[];
  created?: ISO8601DateTime;
  updated?: ISO8601DateTime;
}

/** Verification Method - a cryptographic key or proof mechanism */
export interface VerificationMethod {
  id: string;
  type: VerificationMethodType;
  controller: DID;
  publicKeyMultibase?: string;
  publicKeyJwk?: JsonWebKey;
  blockchainAccountId?: string;
}

/** Supported verification method types */
export type VerificationMethodType =
  | "Ed25519VerificationKey2020"
  | "X25519KeyAgreementKey2020"
  | "EcdsaSecp256k1VerificationKey2019"
  | "JsonWebKey2020";

/** DID Service - a service endpoint associated with a DID */
export interface DIDService {
  id: string;
  type: string | string[];
  serviceEndpoint: string | string[] | Record<string, string>;
  description?: string;
}

/** JSON Web Key */
export interface JsonWebKey {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  d?: string;
  kid?: string;
  use?: string;
  alg?: string;
}

// ─── Verifiable Credentials ──────────────────────────────────────

/** W3C Verifiable Credential */
export interface VerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: DID | { id: DID; name?: string };
  issuanceDate: ISO8601DateTime;
  expirationDate?: ISO8601DateTime;
  credentialSubject: CredentialSubject;
  credentialStatus?: CredentialStatus;
  proof: CredentialProof;
}

/** Credential Subject - the claims being made */
export interface CredentialSubject {
  id: DID;
  [claim: string]: unknown;
}

/** Credential Proof - the cryptographic proof */
export interface CredentialProof {
  type: string;
  created: ISO8601DateTime;
  verificationMethod: string;
  proofPurpose: "assertionMethod" | "authentication" | "capabilityInvocation" | "capabilityDelegation";
  proofValue?: string;
  jws?: string;
}

/** Credential Status - revocation check */
export interface CredentialStatus {
  id: string;
  type: "RevocationList2020Status" | "StatusList2021Entry";
  statusListIndex?: string;
  statusListCredential?: string;
}

/** W3C Verifiable Presentation - wraps one or more VCs */
export interface VerifiablePresentation {
  "@context": string[];
  type: string[];
  holder: DID;
  verifiableCredential: VerifiableCredential[];
  proof: CredentialProof;
}

// ─── HyprCAT Access Credential ──────────────────────────────────

/** HyprCAT-specific access credential */
export interface HyprCATAccessCredential extends VerifiableCredential {
  type: ["VerifiableCredential", "HyprCATAccessCredential"];
  credentialSubject: HyprCATAccessSubject;
}

/** HyprCAT access claims */
export interface HyprCATAccessSubject extends CredentialSubject {
  "hypr:accessLevel": "basic" | "premium" | "enterprise";
  "hypr:allowedDomains"?: string[];
  "hypr:maxOperationsPerDay"?: number;
  "hypr:allowedOperations"?: string[];
}

// ─── Authentication ─────────────────────────────────────────────

/** DID-Auth challenge from server */
export interface DIDAuthChallenge {
  nonce: string;
  domain: string;
  issuedAt: ISO8601DateTime;
  expiresAt: ISO8601DateTime;
}

/** DID-Auth response from agent */
export interface DIDAuthResponse {
  did: DID;
  signature: string;
  nonce: string;
}

/** Session token issued after successful DID-Auth */
export interface SessionToken {
  token: string;
  did: DID;
  issuedAt: ISO8601DateTime;
  expiresAt: ISO8601DateTime;
  scope: string[];
}
