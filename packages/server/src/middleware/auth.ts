/**
 * Authentication middleware supporting DID-Auth and Bearer tokens.
 */

import type { Request, Response, NextFunction } from "express";
import type { StorageProvider } from "../storage/interface.js";

/** Extend Express Request with agent identity */
declare global {
  namespace Express {
    interface Request {
      agentDid?: string;
      sessionData?: unknown;
    }
  }
}

/** DID-Auth middleware (optional authentication) */
export function optionalAuth(storage: StorageProvider) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");
    const agentDid = req.get("X-Agent-DID");

    if (agentDid) {
      req.agentDid = agentDid;
    }

    if (authHeader) {
      if (authHeader.startsWith("DID-Auth ")) {
        const parsed = parseDIDAuth(authHeader);
        if (parsed) {
          req.agentDid = parsed.did;
        }
      } else if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const session = await storage.getSession(`session:${token}`);
        if (session) {
          req.sessionData = session;
          req.agentDid = (session as { did?: string }).did;
        }
      }
    }

    next();
  };
}

/** DID-Auth middleware (required authentication) */
export function requireAuth(storage: StorageProvider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");

    if (!authHeader) {
      const nonce = crypto.randomUUID();
      await storage.setSession(`nonce:${nonce}`, { nonce, createdAt: Date.now() }, 300_000);

      res.status(401).json({
        "@type": "hypr:AuthenticationRequired",
        "hypr:statusCode": 401,
        "hypr:title": "Authentication Required",
        "hypr:detail": "DID-Auth or Bearer token required",
        "hypr:challenge": {
          nonce,
          domain: req.hostname,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        },
      });
      return;
    }

    // Try DID-Auth
    if (authHeader.startsWith("DID-Auth ")) {
      const parsed = parseDIDAuth(authHeader);
      if (!parsed) {
        res.status(401).json({
          "@type": "hypr:Error",
          "hypr:statusCode": 401,
          "hypr:title": "Invalid DID-Auth",
          "hypr:detail": "Could not parse DID-Auth header",
        });
        return;
      }

      // Verify nonce
      const storedNonce = await storage.getSession(`nonce:${parsed.nonce}`);
      if (!storedNonce) {
        res.status(401).json({
          "@type": "hypr:Error",
          "hypr:statusCode": 401,
          "hypr:title": "Invalid Nonce",
          "hypr:detail": "Challenge nonce is invalid or expired",
        });
        return;
      }

      await storage.deleteSession(`nonce:${parsed.nonce}`);
      req.agentDid = parsed.did;
      next();
      return;
    }

    // Try Bearer
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = await storage.getSession(`session:${token}`);
      if (!session) {
        res.status(401).json({
          "@type": "hypr:Error",
          "hypr:statusCode": 401,
          "hypr:title": "Invalid Token",
          "hypr:detail": "Session token is invalid or expired",
        });
        return;
      }

      req.sessionData = session;
      req.agentDid = (session as { did?: string }).did;
      next();
      return;
    }

    res.status(401).json({
      "@type": "hypr:Error",
      "hypr:statusCode": 401,
      "hypr:title": "Unsupported Auth Method",
      "hypr:detail": "Use DID-Auth or Bearer token",
    });
  };
}

function parseDIDAuth(header: string): { did: string; sig: string; nonce: string } | null {
  const value = header.substring("DID-Auth ".length);
  const parts: Record<string, string> = {};

  const segments = value.split(";");
  if (segments.length < 1) return null;

  parts.did = segments[0].trim();

  for (let i = 1; i < segments.length; i++) {
    const [key, val] = segments[i].split("=");
    if (key && val) parts[key.trim()] = val.trim();
  }

  if (!parts.did || !parts.sig || !parts.nonce) return null;

  return { did: parts.did, sig: parts.sig, nonce: parts.nonce };
}
