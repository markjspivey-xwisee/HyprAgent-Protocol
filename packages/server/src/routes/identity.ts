/**
 * Identity routes - DID-Auth, session management, and credential verification.
 */

import { Router } from "express";
import type { StorageProvider } from "../storage/interface.js";

export function createIdentityRoutes(storage: StorageProvider, baseUrl: string): Router {
  const router = Router();

  // DID-Auth challenge
  router.post("/auth/challenge", async (req, res) => {
    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 300_000).toISOString();

    await storage.setSession(`nonce:${nonce}`, { nonce, createdAt: Date.now() }, 300_000);

    res.json({
      "@type": "hypr:AuthChallenge",
      nonce,
      domain: req.hostname,
      issuedAt: new Date().toISOString(),
      expiresAt,
    });
  });

  // DID-Auth verification (exchange challenge for session token)
  router.post("/auth/verify", async (req, res) => {
    const { did, signature, nonce } = req.body;

    if (!did || !signature || !nonce) {
      res.status(400).json({
        "@type": "hypr:InvalidRequest",
        "hypr:detail": "Missing required fields: did, signature, nonce",
      });
      return;
    }

    // Verify nonce
    const storedNonce = await storage.getSession(`nonce:${nonce}`);
    if (!storedNonce) {
      res.status(401).json({
        "@type": "hypr:Error",
        "hypr:statusCode": 401,
        "hypr:detail": "Invalid or expired nonce",
      });
      return;
    }

    await storage.deleteSession(`nonce:${nonce}`);

    // In production: resolve DID document, verify signature against public key
    // For now, accept the authentication

    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    await storage.setSession(
      `session:${sessionToken}`,
      { did, scope: ["read", "write", "execute"], createdAt: Date.now() },
      3600_000
    );

    // Initialize wallet state for the agent
    const existingWallet = await storage.getWalletState(did);
    if (!existingWallet) {
      await storage.setWalletState(did, {
        did,
        balances: { SAT: 10000, BTC: 0, ETH: 0, USDC: 0, USD: 0 },
        tokens: {},
        provider: "HyprCAT Gateway",
        subscriptions: [],
      });
    }

    res.json({
      "@type": "hypr:SessionToken",
      token: sessionToken,
      did,
      issuedAt: new Date().toISOString(),
      expiresAt,
      scope: ["read", "write", "execute"],
    });
  });

  // Get agent profile
  router.get("/auth/profile", async (req, res) => {
    if (!req.agentDid) {
      res.status(401).json({
        "@type": "hypr:AuthenticationRequired",
        "hypr:detail": "Authentication required to view profile",
      });
      return;
    }

    const walletState = await storage.getWalletState(req.agentDid);

    res.json({
      "@context": "https://w3id.org/hyprcat/v1",
      "@id": req.agentDid,
      "@type": "schema:Person",
      "schema:name": `Agent ${req.agentDid.split(":").pop()?.substring(0, 8)}`,
      "x402:wallet": walletState
        ? {
            balance: walletState.balances.SAT,
            currency: "SAT",
            provider: walletState.provider,
            tokens: walletState.tokens,
          }
        : null,
    });
  });

  // Wallet operations
  router.get("/wallet", async (req, res) => {
    if (!req.agentDid) {
      res.status(401).json({ "@type": "hypr:AuthenticationRequired" });
      return;
    }

    const walletState = await storage.getWalletState(req.agentDid);
    if (!walletState) {
      res.status(404).json({ "@type": "hypr:NotFound", "hypr:detail": "No wallet found" });
      return;
    }

    res.json({
      "@type": "x402:Wallet",
      "@id": `${baseUrl}/wallet`,
      did: walletState.did,
      balances: walletState.balances,
      tokens: walletState.tokens,
      subscriptions: walletState.subscriptions,
    });
  });

  return router;
}
