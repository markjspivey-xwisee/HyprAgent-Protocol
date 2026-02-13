/**
 * Storage interface for the HyprCAT Gateway.
 * Defines the contract for persisting resources, provenance, and wallet state.
 */

import type { JsonLdNode, IRI, ProvenanceChain, WalletState } from "@hyprcat/protocol";

/** Storage interface */
export interface StorageProvider {
  // ─── Resources ─────────────────────────────────────────────
  /** Get a resource by IRI */
  getResource(iri: IRI): Promise<JsonLdNode | null>;
  /** Set a resource */
  setResource(iri: IRI, resource: JsonLdNode): Promise<void>;
  /** Delete a resource */
  deleteResource(iri: IRI): Promise<boolean>;
  /** List all resources */
  listResources(): Promise<IRI[]>;
  /** Search resources by type */
  findResourcesByType(type: string): Promise<JsonLdNode[]>;

  // ─── Provenance ────────────────────────────────────────────
  /** Store a provenance chain */
  storeProvenanceChain(chain: ProvenanceChain): Promise<void>;
  /** Get provenance chains for an agent */
  getProvenanceChains(agentDid: string): Promise<ProvenanceChain[]>;

  // ─── Wallet State ──────────────────────────────────────────
  /** Get wallet state */
  getWalletState(did: string): Promise<WalletState | null>;
  /** Update wallet state */
  setWalletState(did: string, state: WalletState): Promise<void>;

  // ─── Sessions ──────────────────────────────────────────────
  /** Store session data */
  setSession(key: string, data: unknown, ttlMs: number): Promise<void>;
  /** Get session data */
  getSession(key: string): Promise<unknown | null>;
  /** Delete session data */
  deleteSession(key: string): Promise<boolean>;
}
