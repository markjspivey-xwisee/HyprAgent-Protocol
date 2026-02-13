/**
 * Identity routes - DID-Auth challenge/response, JWT session management, wallet.
 */

import { Router } from "express";
import type { StorageProvider } from "../storage/interface.js";
import {
  createAuthChallenge,
  verifyAuthResponse,
  createJWT,
} from "../crypto.js";

export function createIdentityRoutes(storage: StorageProvider, baseUrl: string): Router {
  const router = Router();

  // ─── DID-Auth Challenge ──────────────────────────────────────────
  router.post("/auth/challenge", (req, res) => {
    const domain = req.hostname || new URL(baseUrl).hostname;
    const challenge = createAuthChallenge(domain);

    res.json({
      "@type": "hypr:AuthChallenge",
      nonce: challenge.nonce,
      domain: challenge.domain,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
      "hypr:verifyEndpoint": `${baseUrl}/auth/verify`,
      "hypr:signatureFormat": "HMAC-SHA256(did:nonce:domain)",
    });
  });

  // ─── DID-Auth Verify (exchange signed challenge for JWT) ─────────
  router.post("/auth/verify", async (req, res) => {
    const { did, signature, nonce } = req.body;

    if (!did || !signature || !nonce) {
      res.status(400).json({
        "@type": "hypr:ValidationError",
        "hypr:statusCode": 400,
        "hypr:detail": "Missing required fields: did, signature, nonce",
      });
      return;
    }

    // Verify the challenge response
    const isValid = verifyAuthResponse(did, signature, nonce);
    if (!isValid) {
      res.status(401).json({
        "@type": "hypr:AuthenticationFailed",
        "hypr:statusCode": 401,
        "hypr:detail": "Invalid signature or expired challenge",
      });
      return;
    }

    // Issue JWT
    const token = createJWT(did, {
      scope: ["read", "write", "execute"],
      provider: "HyprCAT Gateway",
    });

    // Initialize wallet state for new agents
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
      token,
      did,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      scope: ["read", "write", "execute"],
    });
  });

  // ─── Agent Profile ───────────────────────────────────────────────
  router.get("/auth/profile", async (req, res) => {
    if (!req.agentDid) {
      res.status(401).json({
        "@type": "hypr:AuthenticationRequired",
        "hypr:detail": "Authentication required to view profile",
        "hypr:challengeEndpoint": `${baseUrl}/auth/challenge`,
      });
      return;
    }

    const walletState = await storage.getWalletState(req.agentDid);

    res.json({
      "@context": "https://w3id.org/hyprcat/v1",
      "@id": req.agentDid,
      "@type": "schema:Person",
      "schema:name": `Agent ${req.agentDid.split(":").pop()?.substring(0, 8)}`,
      "hypr:authenticated": true,
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

  // ─── Wallet ──────────────────────────────────────────────────────
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
