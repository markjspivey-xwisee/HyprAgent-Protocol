/**
 * Identity & Credential Management for the HyprCAT SDK.
 * Handles DID resolution, Verifiable Credential management, and DID-Auth.
 */

import type {
  DID,
  DIDDocument,
  DIDMethod,
  DIDService,
  VerificationMethod,
  VerifiableCredential,
  VerifiablePresentation,
  CredentialProof,
  DIDAuthChallenge,
  DIDAuthResponse,
  SessionToken,
  HyprCATAccessCredential,
  ISO8601DateTime,
} from "@hyprcat/protocol";

/** Identity configuration */
export interface IdentityConfig {
  /** The agent's DID */
  did: DID;
  /** DID Document (if known; otherwise resolved) */
  didDocument?: DIDDocument;
  /** Stored credentials */
  credentials?: VerifiableCredential[];
}

/**
 * Identity Manager
 *
 * Manages decentralized identity, credential storage,
 * and authentication for HyprCAT agents.
 */
export class IdentityManager {
  private did: DID;
  private didDocument: DIDDocument | null;
  private credentials: Map<string, VerifiableCredential> = new Map();
  private sessions: Map<string, SessionToken> = new Map();

  constructor(config: IdentityConfig) {
    this.did = config.did;
    this.didDocument = config.didDocument || null;

    if (config.credentials) {
      for (const cred of config.credentials) {
        this.credentials.set(cred.id, cred);
      }
    }
  }

  // ─── DID Management ───────────────────────────────────────────

  /** Get the agent's DID */
  getDID(): DID {
    return this.did;
  }

  /** Get the DID method (e.g., "web", "key") */
  getDIDMethod(): DIDMethod {
    const parts = this.did.split(":");
    return parts[1] as DIDMethod;
  }

  /** Get the DID Document */
  getDIDDocument(): DIDDocument | null {
    return this.didDocument;
  }

  /** Resolve a DID to its DID Document */
  async resolveDID(did: DID): Promise<DIDDocument> {
    const method = did.split(":")[1];

    switch (method) {
      case "web":
        return this.resolveDidWeb(did);
      case "key":
        return this.resolveDidKey(did);
      default:
        throw new Error(`Unsupported DID method: ${method}`);
    }
  }

  /** Generate a new DID (did:key) */
  static generateDID(): { did: DID; didDocument: DIDDocument } {
    const keyId = generateRandomKeyId();
    const did = `did:key:${keyId}` as DID;

    const didDocument: DIDDocument = {
      "@context": "https://www.w3.org/ns/did/v1",
      id: did,
      authentication: [
        {
          id: `${did}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: keyId,
        },
      ],
      service: [],
      created: new Date().toISOString(),
    };

    return { did, didDocument };
  }

  // ─── Credential Management ────────────────────────────────────

  /** Store a verifiable credential */
  addCredential(credential: VerifiableCredential): void {
    this.credentials.set(credential.id, credential);
  }

  /** Get a credential by ID */
  getCredential(id: string): VerifiableCredential | undefined {
    return this.credentials.get(id);
  }

  /** Get all credentials */
  getAllCredentials(): VerifiableCredential[] {
    return Array.from(this.credentials.values());
  }

  /** Get credentials by type */
  getCredentialsByType(type: string): VerifiableCredential[] {
    return this.getAllCredentials().filter((c) => c.type.includes(type));
  }

  /** Remove a credential */
  removeCredential(id: string): boolean {
    return this.credentials.delete(id);
  }

  /** Check if a credential is expired */
  isCredentialExpired(credential: VerifiableCredential): boolean {
    if (!credential.expirationDate) return false;
    return new Date(credential.expirationDate) < new Date();
  }

  /** Create a Verifiable Presentation wrapping selected credentials */
  async createPresentation(
    credentialIds: string[]
  ): Promise<VerifiablePresentation> {
    const credentials = credentialIds
      .map((id) => this.credentials.get(id))
      .filter((c): c is VerifiableCredential => c !== undefined);

    if (credentials.length === 0) {
      throw new Error("No valid credentials found for presentation");
    }

    return {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/hyprcat/v1",
      ],
      type: ["VerifiablePresentation"],
      holder: this.did,
      verifiableCredential: credentials,
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: `${this.did}#keys-1`,
        proofPurpose: "authentication",
        proofValue: await this.sign(JSON.stringify(credentials)),
      },
    };
  }

  // ─── Authentication ───────────────────────────────────────────

  /** Create a DID-Auth response to a challenge */
  async authenticate(challenge: DIDAuthChallenge): Promise<DIDAuthResponse> {
    const signature = await this.sign(
      JSON.stringify({
        nonce: challenge.nonce,
        domain: challenge.domain,
        issuedAt: challenge.issuedAt,
      })
    );

    return {
      did: this.did,
      signature,
      nonce: challenge.nonce,
    };
  }

  /** Store a session token */
  setSession(domain: string, token: SessionToken): void {
    this.sessions.set(domain, token);
  }

  /** Get a session token for a domain */
  getSession(domain: string): SessionToken | undefined {
    const session = this.sessions.get(domain);
    if (session && new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(domain);
      return undefined;
    }
    return session;
  }

  /** Check if a session is valid for a domain */
  hasValidSession(domain: string): boolean {
    return this.getSession(domain) !== undefined;
  }

  /** Create the Authorization header value for DID-Auth */
  formatAuthHeader(response: DIDAuthResponse): string {
    return `DID-Auth ${response.did};sig=${response.signature};nonce=${response.nonce}`;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async resolveDidWeb(did: DID): Promise<DIDDocument> {
    const parts = did.replace("did:web:", "").split(":");
    const domain = parts[0];
    const path = parts.slice(1).join("/");
    const url = `https://${domain}${path ? `/${path}` : ""}/.well-known/did.json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to resolve ${did}: ${response.status}`);
    }
    return response.json();
  }

  private async resolveDidKey(did: DID): Promise<DIDDocument> {
    const keyId = did.replace("did:key:", "");
    return {
      "@context": "https://www.w3.org/ns/did/v1",
      id: did,
      authentication: [
        {
          id: `${did}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: did,
          publicKeyMultibase: keyId,
        },
      ],
      service: [],
    };
  }

  private async sign(data: string): Promise<string> {
    // Simulated signing - in production, use actual Ed25519 signing
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

function generateRandomKeyId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "z6Mk" + Array.from(bytes)
    .map((b) => b.toString(36))
    .join("")
    .substring(0, 44);
}
