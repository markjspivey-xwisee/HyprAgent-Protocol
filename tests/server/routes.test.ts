/**
 * Tests for @hyprcat/server routes.
 * Uses real HTTP requests via Node's http module.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
// Import app factory directly (not index.ts which auto-starts the server)
import { createApp } from "../../packages/server/src/app.js";
import type { ServerConfig } from "../../packages/server/src/config.js";

let server: http.Server;
const TEST_PORT = 19876;
const BASE = `http://localhost:${TEST_PORT}`;

async function createTestServer() {
  const config: ServerConfig = {
    port: TEST_PORT,
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
  };

  const { app } = await createApp(config);
  return new Promise<http.Server>((resolve) => {
    const s = app.listen(TEST_PORT, "localhost", () => resolve(s));
  });
}

async function request(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          Accept: "application/ld+json, application/json",
          "Content-Type": "application/ld+json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

beforeAll(async () => {
  server = await createTestServer();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Health Routes", () => {
  it("should return healthy status", async () => {
    const res = await request("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.version).toBe("1.0.0");
  });

  it("should return readiness", async () => {
    const res = await request("GET", "/ready");
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });
});

describe("Catalog Routes", () => {
  it("should serve well-known endpoint", async () => {
    const res = await request("GET", "/.well-known/hyprcat");
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("hypr:ServiceDescription");
    expect(res.body["hypr:version"]).toBe("1.0");
  });

  it("should serve catalog collection", async () => {
    const res = await request("GET", "/catalog");
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("hydra:Collection");
    expect(res.body["hydra:member"]).toBeDefined();
    expect(res.body["hydra:totalItems"]).toBeGreaterThan(0);
  });

  it("should serve prompts collection", async () => {
    const res = await request("GET", "/prompts");
    expect(res.status).toBe(200);
    expect(res.body["hydra:member"].length).toBeGreaterThan(0);
  });
});

describe("Resource Routes", () => {
  it("should serve retail node", async () => {
    const res = await request("GET", "/nodes/retail");
    expect(res.status).toBe(200);
    expect(res.body["dct:title"]).toContain("Hardware");
  });

  it("should serve analytics node", async () => {
    const res = await request("GET", "/nodes/analytics");
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toContain("dprod:DataProduct");
  });

  it("should serve LRS node", async () => {
    const res = await request("GET", "/nodes/lrs");
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toContain("xapi:LRS");
  });

  it("should return 404 for unknown resources", async () => {
    const res = await request("GET", "/nodes/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("Operation Routes", () => {
  it("should require payment for checkout without proof", async () => {
    const res = await request("POST", "/operations/checkout", {
      "schema:price": "100",
    });
    expect(res.status).toBe(402);
    expect(res.body["@type"]).toBe("x402:PaymentRequired");
  });

  it("should execute SQL query", async () => {
    const res = await request("POST", "/operations/query", {
      "schema:query": "SELECT user_id, total_spend FROM analytics",
    });
    expect(res.status).toBe(200);
    expect(res.body["@type"]).toBe("czero:ResultSet");
    expect(res.body["czero:items"]).toBeDefined();
    expect(res.body["czero:items"].length).toBeGreaterThan(0);
  });

  it("should reject query without SQL", async () => {
    const res = await request("POST", "/operations/query", {});
    expect(res.status).toBe(422);
  });

  it("should export LRS data", async () => {
    const res = await request("GET", "/operations/lrs/export");
    expect(res.status).toBe(200);
    expect(res.body["xapi:statements"]).toBeDefined();
  });
});

describe("Identity Routes", () => {
  it("should issue auth challenge", async () => {
    const res = await request("POST", "/auth/challenge");
    expect(res.status).toBe(200);
    expect(res.body.nonce).toBeTruthy();
    expect(res.body.expiresAt).toBeTruthy();
  });

  it("should reject profile without auth", async () => {
    const res = await request("GET", "/auth/profile");
    expect(res.status).toBe(401);
  });
});
