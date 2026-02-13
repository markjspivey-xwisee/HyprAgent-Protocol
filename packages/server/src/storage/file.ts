/**
 * File-based persistent storage provider.
 * Stores data as JSON files in a configurable directory.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { JsonLdNode, IRI, ProvenanceChain, WalletState } from "@hyprcat/protocol";
import { getResourceTypes } from "@hyprcat/protocol";
import type { StorageProvider } from "./interface.js";

/** Sanitize an IRI to a safe filename */
function iriToFilename(iri: string): string {
  return encodeURIComponent(iri).replace(/%/g, "_");
}

export class FileStorage implements StorageProvider {
  private baseDir: string;
  private resourceDir: string;
  private provenanceDir: string;
  private walletDir: string;
  private sessionDir: string;
  private initialized = false;

  constructor(baseDir: string = "./data") {
    this.baseDir = path.resolve(baseDir);
    this.resourceDir = path.join(this.baseDir, "resources");
    this.provenanceDir = path.join(this.baseDir, "provenance");
    this.walletDir = path.join(this.baseDir, "wallets");
    this.sessionDir = path.join(this.baseDir, "sessions");
  }

  /** Ensure all directories exist */
  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.resourceDir, { recursive: true });
    await fs.mkdir(this.provenanceDir, { recursive: true });
    await fs.mkdir(this.walletDir, { recursive: true });
    await fs.mkdir(this.sessionDir, { recursive: true });
    this.initialized = true;
  }

  /** Write JSON atomically using a temp file */
  private async writeJson(filePath: string, data: unknown): Promise<void> {
    const tmpPath = filePath + ".tmp";
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmpPath, filePath);
  }

  /** Read JSON file, returns null if not found */
  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as T;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  // ─── Resources ──────────────────────────────────────────────────

  async getResource(iri: IRI): Promise<JsonLdNode | null> {
    await this.ensureInit();
    return this.readJson<JsonLdNode>(
      path.join(this.resourceDir, `${iriToFilename(iri)}.json`)
    );
  }

  async setResource(iri: IRI, resource: JsonLdNode): Promise<void> {
    await this.ensureInit();
    await this.writeJson(
      path.join(this.resourceDir, `${iriToFilename(iri)}.json`),
      resource
    );
  }

  async deleteResource(iri: IRI): Promise<boolean> {
    await this.ensureInit();
    try {
      await fs.unlink(path.join(this.resourceDir, `${iriToFilename(iri)}.json`));
      return true;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  async listResources(): Promise<IRI[]> {
    await this.ensureInit();
    const files = await fs.readdir(this.resourceDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => decodeURIComponent(f.replace(/\.json$/, "").replace(/_/g, "%")));
  }

  async findResourcesByType(type: string): Promise<JsonLdNode[]> {
    await this.ensureInit();
    const iris = await this.listResources();
    const results: JsonLdNode[] = [];
    for (const iri of iris) {
      const resource = await this.getResource(iri);
      if (resource && getResourceTypes(resource).includes(type)) {
        results.push(resource);
      }
    }
    return results;
  }

  // ─── Provenance ──────────────────────────────────────────────────

  async storeProvenanceChain(chain: ProvenanceChain): Promise<void> {
    await this.ensureInit();
    const did = chain.agentDid || "anonymous";
    const filePath = path.join(this.provenanceDir, `${iriToFilename(did)}.json`);
    const existing = (await this.readJson<ProvenanceChain[]>(filePath)) || [];
    existing.push(chain);
    await this.writeJson(filePath, existing);
  }

  async getProvenanceChains(agentDid: string): Promise<ProvenanceChain[]> {
    await this.ensureInit();
    return (
      (await this.readJson<ProvenanceChain[]>(
        path.join(this.provenanceDir, `${iriToFilename(agentDid)}.json`)
      )) || []
    );
  }

  // ─── Wallet ──────────────────────────────────────────────────────

  async getWalletState(did: string): Promise<WalletState | null> {
    await this.ensureInit();
    return this.readJson<WalletState>(
      path.join(this.walletDir, `${iriToFilename(did)}.json`)
    );
  }

  async setWalletState(did: string, state: WalletState): Promise<void> {
    await this.ensureInit();
    await this.writeJson(
      path.join(this.walletDir, `${iriToFilename(did)}.json`),
      state
    );
  }

  // ─── Sessions ──────────────────────────────────────────────────

  async setSession(
    sessionId: string,
    data: unknown,
    ttlMs: number
  ): Promise<void> {
    await this.ensureInit();
    const session = {
      ...(typeof data === "object" && data !== null ? data : { value: data }),
      _expiresAt: Date.now() + ttlMs,
    } as Record<string, unknown>;
    await this.writeJson(
      path.join(this.sessionDir, `${iriToFilename(sessionId)}.json`),
      session
    );
  }

  async getSession(sessionId: string): Promise<unknown | null> {
    await this.ensureInit();
    const session = await this.readJson<Record<string, unknown>>(
      path.join(this.sessionDir, `${iriToFilename(sessionId)}.json`)
    );
    if (!session) return null;
    if (typeof session._expiresAt === "number" && session._expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }
    const { _expiresAt: _, ...data } = session;
    return data;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureInit();
    try {
      await fs.unlink(path.join(this.sessionDir, `${iriToFilename(sessionId)}.json`));
      return true;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────

  /** Get storage statistics */
  async getStats(): Promise<Record<string, number>> {
    await this.ensureInit();
    const count = async (dir: string) => {
      const files = await fs.readdir(dir);
      return files.filter((f) => f.endsWith(".json")).length;
    };
    return {
      resources: await count(this.resourceDir),
      provenanceChains: await count(this.provenanceDir),
      wallets: await count(this.walletDir),
      sessions: await count(this.sessionDir),
    };
  }

  /** Clear all data */
  async clear(): Promise<void> {
    await fs.rm(this.baseDir, { recursive: true, force: true });
    this.initialized = false;
  }
}
