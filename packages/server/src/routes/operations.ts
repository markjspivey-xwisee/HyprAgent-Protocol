/**
 * Operation routes - handles execution of Hydra operations.
 */

import { Router } from "express";
import { HYPRCAT_INLINE_CONTEXT } from "@hyprcat/protocol";
import type { PaymentService } from "../services/payment.js";
import type { FederationService } from "../services/federation.js";
import type { ProvenanceService } from "../services/provenance.js";
import type { StorageProvider } from "../storage/interface.js";

export function createOperationRoutes(
  payment: PaymentService,
  federation: FederationService,
  provenance: ProvenanceService,
  storage: StorageProvider,
  baseUrl: string
): Router {
  const router = Router();

  // Checkout (purchase) operation
  router.post("/operations/checkout", async (req, res) => {
    const startTime = Date.now();
    const agentDid = req.agentDid || "anonymous";
    const price = parseInt(req.body["schema:price"] || "100");

    // Check payment proof
    const paymentProof = req.get("X-Payment-Proof");
    if (!paymentProof) {
      // Return 402 with payment details
      const invoice = payment.createInvoice(price, "SAT", "lnbc:retail@hub.io", "Product purchase");
      res.status(402).json(invoice);
      return;
    }

    try {
      const receipt = await payment.processPayment(
        agentDid,
        price,
        "SAT",
        "lnbc:retail@hub.io",
        paymentProof
      );

      const order = {
        "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
        "@id": `${baseUrl}/orders/${receipt.id}`,
        "@type": "schema:Order",
        "schema:orderStatus": "schema:OrderProcessing",
        "schema:orderNumber": `RETAIL-${receipt.id.substring(0, 8).toUpperCase()}`,
        "schema:price": price,
        "schema:priceCurrency": "SAT",
        "schema:description": "Autonomous purchase via HyprCAT Retail Mesh.",
        "prov:wasGeneratedBy": agentDid,
        "x402:paymentReceipt": receipt.id,
      };

      res.status(201).json(order);

      // Record provenance
      await provenance.recordActivity(agentDid, {
        label: `Purchase: ${price} SAT`,
        actionType: "schema:BuyAction",
        targetUrl: `${baseUrl}/operations/checkout`,
        method: "POST",
        statusCode: 201,
        duration: Date.now() - startTime,
        payload: { price, receiptId: receipt.id },
      });
    } catch (error) {
      res.status(400).json({
        "@type": "hypr:Error",
        "hypr:statusCode": 400,
        "hypr:detail": (error as Error).message,
      });
    }
  });

  // SQL Query operation
  router.post("/operations/query", async (req, res) => {
    const startTime = Date.now();
    const agentDid = req.agentDid || "anonymous";
    const query = req.body["schema:query"];

    if (!query) {
      res.status(422).json({
        "@type": "hypr:ValidationError",
        "hypr:statusCode": 422,
        "hypr:detail": "Missing required property: schema:query",
      });
      return;
    }

    try {
      const resultSet = await federation.executeQuery(
        query,
        "SQL",
        [{ endpoint: "jdbc:postgresql://warehouse.example/analytics", mappingType: "Direct" }]
      );

      res.json(resultSet);

      // Record provenance
      await provenance.recordActivity(agentDid, {
        label: `SQL Query Executed`,
        actionType: "czero:QueryAction",
        targetUrl: `${baseUrl}/operations/query`,
        method: "POST",
        statusCode: 200,
        duration: Date.now() - startTime,
        payload: { query, resultCount: resultSet["czero:items"].length },
      });
    } catch (error) {
      res.status(502).json({
        "@type": "czero:FederationError",
        "hypr:statusCode": 502,
        "hypr:detail": (error as Error).message,
      });
    }
  });

  // LRS Export operation
  router.get("/operations/lrs/export", async (req, res) => {
    const startTime = Date.now();
    const agentDid = req.agentDid || "anonymous";

    const statements = {
      "@context": HYPRCAT_INLINE_CONTEXT as unknown as string,
      "@id": `${baseUrl}/operations/lrs/export`,
      "@type": "xapi:StatementResult",
      "xapi:statements": [
        {
          id: crypto.randomUUID(),
          actor: { name: "Jane Engineer", mbox: "mailto:jane@corp.io" },
          verb: { id: "http://adlnet.gov/expapi/verbs/completed", display: { "en-US": "completed" } },
          object: {
            id: "https://learning.io/courses/kubernetes-201",
            definition: { name: { "en-US": "Kubernetes 201: Advanced Orchestration" } },
          },
          result: { score: { scaled: 0.92 }, completion: true },
          timestamp: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          actor: { name: "Bob Analyst", mbox: "mailto:bob@corp.io" },
          verb: { id: "http://adlnet.gov/expapi/verbs/attempted", display: { "en-US": "attempted" } },
          object: {
            id: "https://learning.io/courses/python-ml-foundations",
            definition: { name: { "en-US": "Python ML Foundations" } },
          },
          result: { score: { scaled: 0.67 }, completion: false },
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    };

    res.json(statements);

    // Record provenance
    if (agentDid !== "anonymous") {
      await provenance.recordActivity(agentDid, {
        label: "LRS Export",
        actionType: "schema:DownloadAction",
        targetUrl: `${baseUrl}/operations/lrs/export`,
        method: "GET",
        statusCode: 200,
        duration: Date.now() - startTime,
      });
    }
  });

  // Governance token operations
  router.post("/operations/token/mint", async (req, res) => {
    const agentDid = req.agentDid || "anonymous";
    const quantity = parseInt(req.body["schema:quantity"] || "1");
    const tokenCost = 500 * quantity;

    const walletState = await storage.getWalletState(agentDid);
    if (!walletState || walletState.balances.SAT < tokenCost) {
      res.status(402).json({
        "@type": "x402:PaymentRequired",
        "x402:amount": tokenCost,
        "x402:currency": "SAT",
        "hypr:detail": `Token minting requires ${tokenCost} SAT`,
      });
      return;
    }

    walletState.balances.SAT -= tokenCost;
    walletState.tokens["0xGovernanceDAO"] = (walletState.tokens["0xGovernanceDAO"] || 0) + quantity;
    await storage.setWalletState(agentDid, walletState);

    res.status(201).json({
      "@type": "schema:Order",
      "schema:orderStatus": "schema:OrderDelivered",
      "schema:orderNumber": `0x${crypto.randomUUID().replace(/-/g, "")}`,
      "schema:description": `Minted ${quantity} governance token(s)`,
    });
  });

  router.delete("/operations/token/burn", async (req, res) => {
    const agentDid = req.agentDid || "anonymous";

    const walletState = await storage.getWalletState(agentDid);
    if (!walletState || (walletState.tokens["0xGovernanceDAO"] || 0) < 1) {
      res.status(400).json({
        "@type": "hypr:Error",
        "hypr:statusCode": 400,
        "hypr:detail": "No tokens to burn",
      });
      return;
    }

    walletState.tokens["0xGovernanceDAO"]--;
    walletState.balances.SAT += 500;
    await storage.setWalletState(agentDid, walletState);

    res.json({
      "@type": "schema:ActionStatus",
      "schema:name": "Refund Successful",
      "schema:description": "Token burned. 500 SAT returned.",
    });
  });

  return router;
}
