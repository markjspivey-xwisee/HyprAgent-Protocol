/**
 * Authentication middleware for DID-Auth + JWT sessions.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../crypto.js";
import type { StorageProvider } from "../storage/interface.js";

declare global {
  namespace Express {
    interface Request {
      agentDid?: string;
      sessionData?: Record<string, unknown>;
    }
  }
}

/**
 * Optional auth - extracts identity from JWT Bearer token, DID-Auth header,
 * or X-Agent-DID header. Does not reject unauthenticated requests.
 */
export function optionalAuth(_storage: StorageProvider) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");

    // 1. Check Bearer token (JWT)
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyJWT(token);
      if (payload) {
        req.agentDid = payload.sub;
        req.sessionData = payload as unknown as Record<string, unknown>;
        return next();
      }
    }

    // 2. Check DID-Auth header
    if (authHeader?.startsWith("DID-Auth ")) {
      const parsed = parseDIDAuth(authHeader);
      if (parsed) {
        req.agentDid = parsed.did;
        return next();
      }
    }

    // 3. Check X-Agent-DID header (lightweight identification)
    const agentDid = req.get("X-Agent-DID");
    if (agentDid) {
      req.agentDid = agentDid;
    }

    next();
  };
}

/**
 * Require auth - rejects requests without valid authentication.
 * Returns 401 with a DID-Auth challenge.
 */
export function requireAuth(_storage: StorageProvider) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");

    // Check Bearer JWT
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyJWT(token);
      if (payload) {
        req.agentDid = payload.sub;
        req.sessionData = payload as unknown as Record<string, unknown>;
        return next();
      }
    }

    // Check DID-Auth
    if (authHeader?.startsWith("DID-Auth ")) {
      const parsed = parseDIDAuth(authHeader);
      if (parsed) {
        req.agentDid = parsed.did;
        return next();
      }
    }

    // No valid auth found
    res.status(401).json({
      "@type": "hypr:AuthenticationRequired",
      "hypr:statusCode": 401,
      "hypr:title": "Authentication Required",
      "hypr:detail": "Provide a Bearer token or DID-Auth header",
      "hypr:challengeEndpoint": "/auth/challenge",
      "hypr:supportedMethods": ["Bearer", "DID-Auth"],
    });
  };
}

/** Parse DID-Auth header: "DID-Auth did:key:z...; sig=abcdef; nonce=123456" */
function parseDIDAuth(
  header: string
): { did: string; sig: string; nonce: string } | null {
  const value = header.substring("DID-Auth ".length);
  const segments = value.split(";");
  if (segments.length < 1) return null;

  const parts: Record<string, string> = {};
  parts.did = segments[0].trim();

  for (let i = 1; i < segments.length; i++) {
    const [key, val] = segments[i].split("=");
    if (key && val) parts[key.trim()] = val.trim();
  }

  if (!parts.did || !parts.sig || !parts.nonce) return null;
  return { did: parts.did, sig: parts.sig, nonce: parts.nonce };
}
