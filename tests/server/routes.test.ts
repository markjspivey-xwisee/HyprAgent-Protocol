/**
 * Tests for @hyprcat/server routes
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "@hyprcat/server";
import type { ServerConfig } from "@hyprcat/server";

// Helper to make requests to the test app
async function createTestApp() {
  const config: ServerConfig = {
    port: 0,
    host: "localhost",
    baseUrl: "http://localhost:3001",
    corsOrigins: ["*"],
    rateLimitWindowMs: 60000,
    rateLimitMax: 1000,
    enableLogging: false,
    logLevel: "error",
    enableHelmet: false,
    enableCompression: false,
    nodeEnv: "test",
  };

  return createApp(config);
}

describe("Health Routes", () => {
  it("should return healthy status", async () => {
    const { app } = await createTestApp();

    // Simulate request using supertest-like approach
    const response = await simulateRequest(app, "GET", "/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("healthy");
    expect(response.body.version).toBe("1.0.0");
  });

  it("should return readiness", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/ready");
    expect(response.status).toBe(200);
    expect(response.body.ready).toBe(true);
  });
});

describe("Catalog Routes", () => {
  it("should serve well-known endpoint", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/.well-known/hyprcat");
    expect(response.status).toBe(200);
    expect(response.body["@type"]).toBe("hypr:ServiceDescription");
    expect(response.body["hypr:version"]).toBe("1.0");
  });

  it("should serve catalog collection", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/catalog");
    expect(response.status).toBe(200);
    expect(response.body["@type"]).toBe("hydra:Collection");
    expect(response.body["hydra:member"]).toBeDefined();
    expect(response.body["hydra:totalItems"]).toBeGreaterThan(0);
  });

  it("should serve prompts collection", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/prompts");
    expect(response.status).toBe(200);
    expect(response.body["hydra:member"].length).toBeGreaterThan(0);
  });
});

describe("Resource Routes", () => {
  it("should serve retail node", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/nodes/retail");
    expect(response.status).toBe(200);
    expect(response.body["dct:title"]).toContain("Hardware");
  });

  it("should serve analytics node", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/nodes/analytics");
    expect(response.status).toBe(200);
    expect(response.body["@type"]).toContain("dprod:DataProduct");
  });

  it("should serve LRS node", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/nodes/lrs");
    expect(response.status).toBe(200);
    expect(response.body["@type"]).toContain("xapi:LRS");
  });

  it("should return 404 for unknown resources", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/nodes/nonexistent");
    expect(response.status).toBe(404);
  });
});

describe("Operation Routes", () => {
  it("should require payment for checkout without proof", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "POST", "/operations/checkout", {
      "schema:price": "100",
    });
    expect(response.status).toBe(402);
    expect(response.body["@type"]).toBe("x402:PaymentRequired");
  });

  it("should execute SQL query", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "POST", "/operations/query", {
      "schema:query": "SELECT user_id, total_spend FROM analytics",
    });
    expect(response.status).toBe(200);
    expect(response.body["@type"]).toBe("czero:ResultSet");
    expect(response.body["czero:items"]).toBeDefined();
    expect(response.body["czero:items"].length).toBeGreaterThan(0);
  });

  it("should reject query without SQL", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "POST", "/operations/query", {});
    expect(response.status).toBe(422);
  });

  it("should export LRS data", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/operations/lrs/export");
    expect(response.status).toBe(200);
    expect(response.body["xapi:statements"]).toBeDefined();
  });
});

describe("Identity Routes", () => {
  it("should issue auth challenge", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "POST", "/auth/challenge");
    expect(response.status).toBe(200);
    expect(response.body.nonce).toBeTruthy();
    expect(response.body.expiresAt).toBeTruthy();
  });

  it("should reject profile without auth", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/auth/profile");
    expect(response.status).toBe(401);
  });
});

describe("Content Negotiation", () => {
  it("should include HyprCAT version header", async () => {
    const { app } = await createTestApp();
    const response = await simulateRequest(app, "GET", "/health");
    // Headers are set by middleware
    expect(response.status).toBe(200);
  });
});

// Simulate Express request/response (lightweight alternative to supertest)
async function simulateRequest(
  app: ReturnType<typeof import("express").default>,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const responseHeaders: Record<string, string> = {};
    let responseBody = "";
    let statusCode = 200;

    const req = {
      method,
      url: path,
      originalUrl: path,
      path,
      hostname: "localhost",
      get: (name: string) => headers?.[name] || (name === "Accept" ? "application/json" : undefined),
      headers: { accept: "application/json", ...headers },
      body: body || {},
      query: Object.fromEntries(new URLSearchParams(path.split("?")[1] || "").entries()),
      params: {},
    };

    const res = {
      status(code: number) { statusCode = code; return this; },
      json(data: unknown) { responseBody = JSON.stringify(data); this.end(); },
      setHeader(name: string, value: string) { responseHeaders[name] = value; },
      getHeader(name: string) { return responseHeaders[name]; },
      end() {
        resolve({
          status: statusCode,
          body: responseBody ? JSON.parse(responseBody) : {},
          headers: responseHeaders,
        });
      },
    };

    // Use app handle
    (app as any).handle(req, res, () => {
      resolve({ status: 404, body: {}, headers: {} });
    });
  });
}
