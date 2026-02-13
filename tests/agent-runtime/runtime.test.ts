/**
 * Tests for @hyprcat/agent-runtime
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyprCATWallet } from "@hyprcat/sdk";
import {
  RetailStrategy,
  AnalyticsStrategy,
} from "@hyprcat/agent-runtime";
import type { DID, HydraOperation, JsonLdNode } from "@hyprcat/protocol";
import type { StrategyContext } from "@hyprcat/agent-runtime";

function createTestContext(
  resource: JsonLdNode,
  wallet?: HyprCATWallet
): StrategyContext {
  const r = resource as Record<string, unknown>;
  const types = Array.isArray(resource["@type"])
    ? resource["@type"]
    : [resource["@type"]];
  const operations = (r["hydra:operation"] as HydraOperation[]) || [];

  // Also extract operations from members
  const members = r["hydra:member"];
  if (Array.isArray(members)) {
    for (const member of members) {
      const memberOps = (member as Record<string, unknown>)["hydra:operation"];
      if (Array.isArray(memberOps)) {
        operations.push(...(memberOps as HydraOperation[]));
      }
    }
  }

  return {
    resource,
    types,
    operations,
    wallet: wallet || new HyprCATWallet({ did: "did:key:z6MkTest" as DID, initialBalances: { SAT: 10000 } }),
    visitedUrls: new Set(),
    params: {},
  };
}

describe("RetailStrategy", () => {
  let strategy: RetailStrategy;

  beforeEach(() => {
    strategy = new RetailStrategy(5000);
  });

  it("should match store resources", () => {
    const context = createTestContext({
      "@id": "https://store.example",
      "@type": "schema:Store",
    });
    expect(strategy.matches(context)).toBe(true);
  });

  it("should match product resources", () => {
    const context = createTestContext({
      "@id": "https://product.example",
      "@type": "schema:Product",
    });
    expect(strategy.matches(context)).toBe(true);
  });

  it("should not match non-retail resources", () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": "dprod:DataProduct",
    });
    expect(strategy.matches(context)).toBe(false);
  });

  it("should decide to buy affordable in-stock product", async () => {
    const context = createTestContext({
      "@id": "https://store.example",
      "@type": ["schema:Store", "hydra:Collection"],
      "hydra:member": [
        {
          "@id": "https://store.example/products/gpu",
          "@type": "schema:Product",
          "schema:name": "NVIDIA H100",
          "schema:price": 3500,
          "schema:inventoryLevel": 5,
          "hydra:operation": [
            {
              "@id": "buy-op",
              "@type": ["hydra:Operation", "schema:BuyAction"],
              "hydra:method": "POST",
              "hydra:title": "Buy Now",
              "target": "https://store.example/checkout",
            },
          ],
        },
      ],
    });

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(true);
    expect(decision.operation?.["hydra:title"]).toBe("Buy Now");
    expect(decision.input?.["schema:price"]).toBe("3500");
    expect(decision.priority).toBe(10);
  });

  it("should not buy if insufficient balance", async () => {
    const wallet = new HyprCATWallet({ did: "did:key:z6MkTest" as DID, initialBalances: { SAT: 100 } });
    const context = createTestContext(
      {
        "@id": "https://store.example",
        "@type": ["schema:Store", "hydra:Collection"],
        "hydra:member": [
          {
            "@id": "https://store.example/products/gpu",
            "@type": "schema:Product",
            "schema:name": "NVIDIA H100",
            "schema:price": 3500,
            "schema:inventoryLevel": 5,
            "hydra:operation": [
              {
                "@id": "buy-op",
                "@type": ["hydra:Operation", "schema:BuyAction"],
                "hydra:method": "POST",
                "hydra:title": "Buy Now",
                "target": "https://store.example/checkout",
              },
            ],
          },
        ],
      },
      wallet
    );

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(false);
  });

  it("should not buy if out of stock", async () => {
    const context = createTestContext({
      "@id": "https://store.example",
      "@type": ["schema:Store", "hydra:Collection"],
      "hydra:member": [
        {
          "@id": "https://store.example/products/gpu",
          "@type": "schema:Product",
          "schema:name": "NVIDIA H100",
          "schema:price": 3500,
          "schema:inventoryLevel": 0,
          "hydra:operation": [
            {
              "@id": "buy-op",
              "@type": ["hydra:Operation", "schema:BuyAction"],
              "hydra:method": "POST",
              "hydra:title": "Buy Now",
              "target": "https://store.example/checkout",
            },
          ],
        },
      ],
    });

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(false);
  });
});

describe("AnalyticsStrategy", () => {
  let strategy: AnalyticsStrategy;

  beforeEach(() => {
    strategy = new AnalyticsStrategy("SELECT * FROM users LIMIT 10");
  });

  it("should match data products", () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": "dprod:DataProduct",
    });
    expect(strategy.matches(context)).toBe(true);
  });

  it("should match virtual graphs", () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": "czero:VirtualGraph",
    });
    expect(strategy.matches(context)).toBe(true);
  });

  it("should not match retail resources", () => {
    const context = createTestContext({
      "@id": "https://store.example",
      "@type": "schema:Store",
    });
    expect(strategy.matches(context)).toBe(false);
  });

  it("should decide to execute query operation", async () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": ["dprod:DataProduct", "czero:VirtualGraph"],
      "hydra:operation": [
        {
          "@id": "query-op",
          "@type": ["hydra:Operation", "czero:QueryAction"],
          "hydra:method": "POST",
          "hydra:title": "Execute SQL Query",
          "target": "https://data.example/query",
        },
      ],
    });

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(true);
    expect(decision.input?.["schema:query"]).toContain("SELECT");
    expect(decision.priority).toBe(8);
  });

  it("should decide to execute download operation", async () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": "dprod:DataProduct",
      "hydra:operation": [
        {
          "@id": "download-op",
          "@type": ["hydra:Operation", "schema:DownloadAction"],
          "hydra:method": "GET",
          "hydra:title": "Export Data",
          "target": "https://data.example/export",
        },
      ],
    });

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(true);
    expect(decision.priority).toBe(6);
  });

  it("should not execute when no operations available", async () => {
    const context = createTestContext({
      "@id": "https://data.example",
      "@type": "dprod:DataProduct",
    });

    const decision = await strategy.evaluate(context);
    expect(decision.shouldExecute).toBe(false);
  });
});
