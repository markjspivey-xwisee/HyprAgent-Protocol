/**
 * End-to-end integration tests.
 * Spins up a real server and exercises the full auth, payment, query, and agent flows.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp } from "../../packages/server/src/app.js";
import type { ServerConfig } from "../../packages/server/src/config.js";

let server: http.Server;
const PORT = 19877;
const BASE = `http://localhost:${PORT}`;

async function req(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const r = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          Accept: "application/ld+json, application/json",
          "Content-Type": "application/ld+json",
          ...(bodyStr ? { "Content-Length": String(Buffer.byteLength(bodyStr)) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          let parsed: unknown = {};
          try { parsed = JSON.parse(data); } catch {}
          const h: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") h[k] = v;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: h });
        });
      }
    );
    r.on("error", reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

beforeAll(async () => {
  const config: ServerConfig = {
    port: PORT,
    host: "localhost",
    baseUrl: BASE,
    corsOrigins: ["*"],
    rateLimitWindowMs: 60000,
    rateLimitMax: 1000,
    enableLogging: false,
    logLevel: "error",
    enableHelmet: false,
    enableCompression: false,
    nodeEnv: "test",
    storageBackend: "memory",
    storageDir: "./data-test",
  };
  const { app } = await createApp(config);
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(PORT, "localhost", () => resolve(s));
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ─── Authentication Flow ──────────────────────────────────────────

describe("DID-Auth E2E Flow", () => {
  let jwt: string;
  const testDid = "did:key:z6MkIntegrationTestAgent";

  it("should issue a challenge", async () => {
    const res = await req("POST", "/auth/challenge");
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("hypr:AuthChallenge");
    expect(res.body.nonce).toBeTruthy();
    expect(res.body["hypr:verifyEndpoint"]).toContain("/auth/verify");
  });

  it("should exchange challenge for JWT", async () => {
    // Get challenge
    const challenge = await req("POST", "/auth/challenge");
    const nonce = challenge.body.nonce;

    // Verify with simulated signature
    const verify = await req("POST", "/auth/verify", {
      did: testDid,
      signature: "simulated-sig-" + Date.now(),
      nonce,
    });

    expect(verify.status).toBe(200);
    expect(verify.body["@type"]).toBe("hypr:SessionToken");
    expect(verify.body.token).toBeTruthy();
    expect(verify.body.did).toBe(testDid);
    expect(verify.body.scope).toContain("read");

    jwt = verify.body.token;
  });

  it("should reject invalid nonce", async () => {
    const res = await req("POST", "/auth/verify", {
      did: testDid,
      signature: "simulated-sig-" + Date.now(),
      nonce: "invalid-nonce",
    });
    expect(res.status).toBe(401);
  });

  it("should access profile with JWT", async () => {
    const res = await req("GET", "/auth/profile", undefined, {
      Authorization: `Bearer ${jwt}`,
    });
    expect(res.status).toBe(200);
    expect(res.body["@id"]).toBe(testDid);
    expect(res.body["hypr:authenticated"]).toBe(true);
    expect(res.body["x402:wallet"]).toBeTruthy();
    expect(res.body["x402:wallet"].balance).toBe(10000);
  });

  it("should access wallet with JWT", async () => {
    const res = await req("GET", "/wallet", undefined, {
      Authorization: `Bearer ${jwt}`,
    });
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("x402:Wallet");
    expect(res.body.balances.SAT).toBe(10000);
  });

  it("should reject profile without auth", async () => {
    const res = await req("GET", "/auth/profile");
    expect(res.status).toBe(401);
  });
});

// ─── Payment Flow ──────────────────────────────────────────────────

describe("x402 Payment E2E Flow", () => {
  it("should return 402 without payment proof", async () => {
    const res = await req("POST", "/operations/checkout", {
      "schema:price": "100",
    });
    expect(res.status).toBe(402);
    expect(res.body["@type"]).toBe("x402:PaymentRequired");
    expect(res.body["x402:amount"]).toBe(100);
    expect(res.body["x402:bolt11"]).toBeTruthy();
    expect(res.body["x402:invoiceId"]).toBeTruthy();
    expect(res.body["x402:paymentHeader"]).toBe("X-Payment-Proof");
  });

  it("should process payment with valid proof", async () => {
    // First authenticate to get a wallet
    const challenge = await req("POST", "/auth/challenge");
    const verify = await req("POST", "/auth/verify", {
      did: "did:key:z6MkPaymentTestAgent",
      signature: "simulated-sig-" + Date.now(),
      nonce: challenge.body.nonce,
    });
    const jwt = verify.body.token;

    // Attempt checkout with payment proof
    const res = await req(
      "POST",
      "/operations/checkout",
      { "schema:price": "100" },
      {
        Authorization: `Bearer ${jwt}`,
        "X-Payment-Proof": "a]b]c]d]e]f]1]2]3]4]5]6]7]8]9]0",
      }
    );
    expect(res.status).toBe(201);
    expect(res.body["@type"]).toBe("schema:Order");
    expect(res.body["schema:price"]).toBe(100);
    expect(res.body["x402:paymentReceipt"]).toBeTruthy();
  });
});

// ─── Federated Query Flow ──────────────────────────────────────────

describe("C-ZERO Federation E2E", () => {
  it("should execute SQL with WHERE clause", async () => {
    const res = await req("POST", "/operations/query", {
      "schema:query": "SELECT user_id, total_spend FROM analytics WHERE total_spend > 500",
    });
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("czero:ResultSet");
    expect(res.body["czero:items"].length).toBeGreaterThan(0);
    // All results should have total_spend > 500
    for (const item of res.body["czero:items"]) {
      expect(item.total_spend).toBeGreaterThan(500);
    }
  });

  it("should execute SQL with ORDER BY", async () => {
    const res = await req("POST", "/operations/query", {
      "schema:query": "SELECT * FROM analytics ORDER BY total_spend DESC LIMIT 3",
    });
    expect(res.status).toBe(200);
    const items = res.body["czero:items"];
    expect(items.length).toBeLessThanOrEqual(3);
    // Verify descending order
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].total_spend).toBeGreaterThanOrEqual(items[i].total_spend);
    }
  });

  it("should query sales data source", async () => {
    const res = await req("POST", "/operations/query", {
      "schema:query": "SELECT product_id, revenue FROM sales WHERE category = 'hardware'",
    });
    expect(res.status).toBe(200);
    const items = res.body["czero:items"];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.product_id).toBeTruthy();
    }
  });

  it("should include provenance metadata", async () => {
    const res = await req("POST", "/operations/query", {
      "schema:query": "SELECT * FROM analytics LIMIT 1",
    });
    expect(res.body["czero:sources"]).toBeDefined();
    expect(res.body["czero:executionTime"]).toBeDefined();
    expect(res.body["prov:wasGeneratedBy"]).toBeDefined();
  });

  it("should reject missing query", async () => {
    const res = await req("POST", "/operations/query", {});
    expect(res.status).toBe(422);
  });
});

// ─── Resource Discovery Flow ────────────────────────────────────────

describe("HATEOAS Navigation E2E", () => {
  it("should discover entry point → catalog → resources", async () => {
    // 1. Entry point
    const wellKnown = await req("GET", "/.well-known/hyprcat");
    expect(wellKnown.status).toBe(200);
    expect(wellKnown.body["hypr:entrypoint"]).toContain("/catalog");

    // 2. Catalog
    const catalog = await req("GET", "/catalog");
    expect(catalog.status).toBe(200);
    expect(catalog.body["hydra:member"].length).toBeGreaterThan(0);

    // 3. Navigate to first member
    const firstMember = catalog.body["hydra:member"][0];
    expect(firstMember["@id"]).toBeTruthy();

    // Extract path from the member's @id
    const memberUrl = new URL(firstMember["@id"]);
    const resource = await req("GET", memberUrl.pathname);
    expect(resource.status).toBe(200);
    expect(resource.body["dct:title"]).toBeTruthy();
  });

  it("should provide JSON-LD headers", async () => {
    const res = await req("GET", "/catalog");
    expect(res.headers["content-type"]).toContain("application/");
    expect(res.headers["x-hyprcat-version"]).toBe("1.0.0");
  });
});
