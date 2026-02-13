/**
 * Tests for @hyprcat/sdk
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  HyprCATWallet,
  ProvenanceTracker,
  IdentityManager,
} from "@hyprcat/sdk";
import type { DID, X402PaymentRequired, Erc8004TokenGate } from "@hyprcat/protocol";

describe("HyprCATWallet", () => {
  let wallet: HyprCATWallet;

  beforeEach(() => {
    wallet = new HyprCATWallet({
      did: "did:key:z6MkTest" as DID,
      initialBalances: { SAT: 5000 },
      provider: "Test Wallet",
    });
  });

  it("should initialize with correct balances", () => {
    expect(wallet.getBalance("SAT")).toBe(5000);
    expect(wallet.getBalance("ETH")).toBe(0);
  });

  it("should return the DID", () => {
    expect(wallet.getDID()).toBe("did:key:z6MkTest");
  });

  it("should credit balance", () => {
    wallet.credit("SAT", 1000);
    expect(wallet.getBalance("SAT")).toBe(6000);
  });

  it("should debit balance", () => {
    const result = wallet.debit("SAT", 2000);
    expect(result).toBe(true);
    expect(wallet.getBalance("SAT")).toBe(3000);
  });

  it("should reject overdraft", () => {
    const result = wallet.debit("SAT", 10000);
    expect(result).toBe(false);
    expect(wallet.getBalance("SAT")).toBe(5000);
  });

  it("should check affordability for payments", () => {
    const affordable: X402PaymentRequired = {
      "@id": "pay1",
      "@type": "x402:PaymentRequired",
      "x402:amount": 3000,
      "x402:currency": "SAT",
      "x402:recipient": "test",
    };
    expect(wallet.canAfford(affordable)).toBe(true);

    const expensive: X402PaymentRequired = {
      "@id": "pay2",
      "@type": "x402:PaymentRequired",
      "x402:amount": 10000,
      "x402:currency": "SAT",
      "x402:recipient": "test",
    };
    expect(wallet.canAfford(expensive)).toBe(false);
  });

  it("should sign payments and debit balance", async () => {
    const payment: X402PaymentRequired = {
      "@id": "pay1",
      "@type": "x402:PaymentRequired",
      "x402:amount": 2000,
      "x402:currency": "SAT",
      "x402:recipient": "merchant",
    };

    const proof = await wallet.signPayment(payment);
    expect(proof.preimage).toBeTruthy();
    expect(proof.invoice).toBeTruthy();
    expect(proof.paidAt).toBeTruthy();
    expect(wallet.getBalance("SAT")).toBe(3000);
  });

  it("should manage tokens", () => {
    wallet.addTokens("0xDAO", 5);
    expect(wallet.getTokenBalance("0xDAO")).toBe(5);

    wallet.removeTokens("0xDAO", 2);
    expect(wallet.getTokenBalance("0xDAO")).toBe(3);
  });

  it("should check token gate satisfaction", () => {
    wallet.addTokens("0xDAO", 3);

    const gate: Erc8004TokenGate = {
      "@id": "gate1",
      "@type": "erc8004:TokenGate",
      "erc8004:requiredToken": "0xDAO",
      "erc8004:tokenStandard": "ERC-20",
      "erc8004:minBalance": 2,
      "erc8004:chainId": 1,
    };
    expect(wallet.satisfiesTokenGate(gate)).toBe(true);

    const highGate: Erc8004TokenGate = {
      ...gate,
      "@id": "gate2",
      "erc8004:minBalance": 10,
    };
    expect(wallet.satisfiesTokenGate(highGate)).toBe(false);
  });

  it("should track transaction history", async () => {
    const payment: X402PaymentRequired = {
      "@id": "pay1",
      "@type": "x402:PaymentRequired",
      "x402:amount": 100,
      "x402:currency": "SAT",
      "x402:recipient": "test",
    };

    await wallet.signPayment(payment);
    const txs = wallet.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(100);
    expect(txs[0].status).toBe("completed");
  });

  it("should manage subscriptions", () => {
    const sub = wallet.addSubscription({
      resourceId: "https://example.com/data",
      amount: 100,
      currency: "SAT",
      interval: "P30D",
      startDate: new Date().toISOString(),
      nextPayment: new Date(Date.now() + 30 * 86400000).toISOString(),
      active: true,
    });

    expect(wallet.getSubscriptions()).toHaveLength(1);

    wallet.cancelSubscription(sub.id);
    expect(wallet.getSubscriptions()).toHaveLength(0);
  });

  it("should emit events", async () => {
    const events: string[] = [];
    wallet.on("balance-change", () => events.push("balance"));
    wallet.on("payment", () => events.push("payment"));

    const payment: X402PaymentRequired = {
      "@id": "pay1",
      "@type": "x402:PaymentRequired",
      "x402:amount": 100,
      "x402:currency": "SAT",
      "x402:recipient": "test",
    };

    await wallet.signPayment(payment);
    expect(events).toContain("balance");
    expect(events).toContain("payment");
  });
});

describe("ProvenanceTracker", () => {
  let tracker: ProvenanceTracker;

  beforeEach(() => {
    tracker = new ProvenanceTracker("did:key:z6MkTest" as DID);
  });

  it("should initialize with empty chain", () => {
    expect(tracker.getLength()).toBe(0);
    expect(tracker.getEntities()).toHaveLength(0);
    expect(tracker.getActivities()).toHaveLength(0);
  });

  it("should record entities", () => {
    const id = tracker.recordEntity({
      "@id": "https://example.com/resource/1",
      "@type": "dcat:Dataset",
      "dct:title": "Test Dataset",
    });

    expect(id).toMatch(/^urn:uuid:/);
    expect(tracker.getEntities()).toHaveLength(1);
    expect(tracker.getEntities()[0].label).toBe("Test Dataset");
  });

  it("should record activities linked to entities", () => {
    tracker.recordEntity({
      "@id": "https://example.com/resource/1",
      "@type": "dcat:Dataset",
      "dct:title": "Test",
    });

    const activityId = tracker.recordActivity("Query Executed", {
      actionType: "czero:QueryAction",
      payload: { query: "SELECT * FROM test" },
      strategy: "DATA_ANALYTICS",
    });

    expect(activityId).toMatch(/^urn:uuid:/);
    expect(tracker.getActivities()).toHaveLength(1);
    expect(tracker.getActivities()[0].label).toBe("Query Executed");
    expect(tracker.getActivities()[0].usedEntityId).toBeTruthy();
  });

  it("should throw if recording activity without entity", () => {
    expect(() =>
      tracker.recordActivity("Bad Activity", {
        actionType: "test",
        payload: {},
        strategy: "test",
      })
    ).toThrow();
  });

  it("should export as JSON-LD", () => {
    tracker.recordEntity({
      "@id": "https://example.com/1",
      "@type": "dcat:Dataset",
      "dct:title": "Test",
    });
    tracker.recordActivity("Test Op", {
      actionType: "test",
      payload: {},
      strategy: "test",
    });

    const jsonLd = tracker.exportAsJsonLd();
    expect(jsonLd).toHaveProperty("@type", "prov:Bundle");
    expect((jsonLd as Record<string, unknown>)["prov:hadMember"]).toBeTruthy();
  });

  it("should seal and prevent modifications", () => {
    expect(tracker.isSealed()).toBe(false);
    tracker.seal();
    expect(tracker.isSealed()).toBe(true);
  });

  it("should reset the chain", () => {
    tracker.recordEntity({ "@id": "x", "@type": "test", "dct:title": "T" });
    expect(tracker.getLength()).toBe(1);

    tracker.reset();
    expect(tracker.getLength()).toBe(0);
    expect(tracker.getCurrentEntityId()).toBeNull();
  });
});

describe("IdentityManager", () => {
  let identity: IdentityManager;

  beforeEach(() => {
    identity = new IdentityManager({
      did: "did:key:z6MkTestKey" as DID,
    });
  });

  it("should return the DID", () => {
    expect(identity.getDID()).toBe("did:key:z6MkTestKey");
  });

  it("should return the DID method", () => {
    expect(identity.getDIDMethod()).toBe("key");
  });

  it("should generate a new DID", () => {
    const { did, didDocument } = IdentityManager.generateDID();
    expect(did).toMatch(/^did:key:/);
    expect(didDocument.id).toBe(did);
    expect(didDocument.authentication).toHaveLength(1);
  });

  it("should store and retrieve credentials", () => {
    const cred = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "urn:uuid:cred-1",
      type: ["VerifiableCredential"],
      issuer: "did:web:issuer.example" as DID,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: "did:key:z6MkTestKey" as DID,
        "hypr:accessLevel": "premium",
      },
      proof: {
        type: "Ed25519Signature2020",
        created: new Date().toISOString(),
        verificationMethod: "did:web:issuer.example#keys-1",
        proofPurpose: "assertionMethod" as const,
        proofValue: "test-proof",
      },
    };

    identity.addCredential(cred);
    expect(identity.getCredential("urn:uuid:cred-1")).toBeTruthy();
    expect(identity.getAllCredentials()).toHaveLength(1);
    expect(identity.getCredentialsByType("VerifiableCredential")).toHaveLength(1);
  });

  it("should create DID-Auth responses", async () => {
    const challenge = {
      nonce: "test-nonce-123",
      domain: "example.com",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };

    const response = await identity.authenticate(challenge);
    expect(response.did).toBe("did:key:z6MkTestKey");
    expect(response.nonce).toBe("test-nonce-123");
    expect(response.signature).toBeTruthy();
  });

  it("should format auth headers", async () => {
    const response = {
      did: "did:key:z6MkTestKey" as DID,
      signature: "test-sig",
      nonce: "test-nonce",
    };

    const header = identity.formatAuthHeader(response);
    expect(header).toContain("DID-Auth");
    expect(header).toContain("did:key:z6MkTestKey");
    expect(header).toContain("sig=test-sig");
    expect(header).toContain("nonce=test-nonce");
  });

  it("should manage sessions", () => {
    const token = {
      token: "abc123",
      did: "did:key:z6MkTestKey" as DID,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      scope: ["read", "write"],
    };

    identity.setSession("example.com", token);
    expect(identity.hasValidSession("example.com")).toBe(true);
    expect(identity.getSession("example.com")?.token).toBe("abc123");
    expect(identity.hasValidSession("other.com")).toBe(false);
  });
});
