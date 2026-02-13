/**
 * In-memory storage provider for development and testing.
 */

import type { JsonLdNode, IRI, ProvenanceChain, WalletState } from "@hyprcat/protocol";
import { getResourceTypes } from "@hyprcat/protocol";
import type { StorageProvider } from "./interface.js";

interface SessionEntry {
  data: unknown;
  expiresAt: number;
}

export class MemoryStorage implements StorageProvider {
  private resources: Map<string, JsonLdNode> = new Map();
  private provenance: Map<string, ProvenanceChain[]> = new Map();
  private wallets: Map<string, WalletState> = new Map();
  private sessions: Map<string, SessionEntry> = new Map();

  async getResource(iri: IRI): Promise<JsonLdNode | null> {
    return this.resources.get(iri) || null;
  }

  async setResource(iri: IRI, resource: JsonLdNode): Promise<void> {
    this.resources.set(iri, resource);
  }

  async deleteResource(iri: IRI): Promise<boolean> {
    return this.resources.delete(iri);
  }

  async listResources(): Promise<IRI[]> {
    return Array.from(this.resources.keys());
  }

  async findResourcesByType(type: string): Promise<JsonLdNode[]> {
    const results: JsonLdNode[] = [];
    for (const resource of this.resources.values()) {
      const types = getResourceTypes(resource);
      if (types.includes(type)) {
        results.push(resource);
      }
    }
    return results;
  }

  async storeProvenanceChain(chain: ProvenanceChain): Promise<void> {
    const existing = this.provenance.get(chain.agentDid) || [];
    existing.push(chain);
    this.provenance.set(chain.agentDid, existing);
  }

  async getProvenanceChains(agentDid: string): Promise<ProvenanceChain[]> {
    return this.provenance.get(agentDid) || [];
  }

  async getWalletState(did: string): Promise<WalletState | null> {
    return this.wallets.get(did) || null;
  }

  async setWalletState(did: string, state: WalletState): Promise<void> {
    this.wallets.set(did, state);
  }

  async setSession(key: string, data: unknown, ttlMs: number): Promise<void> {
    this.sessions.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  async getSession(key: string): Promise<unknown | null> {
    const entry = this.sessions.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(key);
      return null;
    }
    return entry.data;
  }

  async deleteSession(key: string): Promise<boolean> {
    return this.sessions.delete(key);
  }

  /** Bulk load resources (useful for initialization) */
  async loadResources(resources: Record<string, JsonLdNode>): Promise<void> {
    for (const [iri, resource] of Object.entries(resources)) {
      this.resources.set(iri, resource);
    }
  }

  /** Get stats for monitoring */
  getStats() {
    return {
      resources: this.resources.size,
      provenanceChains: Array.from(this.provenance.values()).reduce((sum, chains) => sum + chains.length, 0),
      wallets: this.wallets.size,
      sessions: this.sessions.size,
    };
  }
}
