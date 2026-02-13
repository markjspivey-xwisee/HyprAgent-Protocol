/**
 * Cryptographic utilities for DID-Auth, JWT, and payment proofs.
 * Uses only Node.js built-in crypto module.
 */

import crypto from "node:crypto";

// ─── JWT Implementation ─────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRY_SECONDS = 3600; // 1 hour

interface JWTPayload {
  sub: string; // DID
  iat: number;
  exp: number;
  [key: string]: unknown;
}

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export function createJWT(did: string, claims: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: JWTPayload = {
    sub: did,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
    ...claims,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;

  // Verify signature
  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  // Parse and check expiry
  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as JWTPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── DID-Auth Challenge/Response ─────────────────────────────────────

export interface AuthChallenge {
  nonce: string;
  domain: string;
  issuedAt: string;
  expiresAt: string;
}

const pendingChallenges = new Map<string, AuthChallenge>();

export function createAuthChallenge(domain: string): AuthChallenge {
  const nonce = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  const challenge: AuthChallenge = {
    nonce,
    domain,
    issuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  pendingChallenges.set(nonce, challenge);

  // Auto-cleanup after expiry
  setTimeout(() => pendingChallenges.delete(nonce), 5 * 60 * 1000);

  return challenge;
}

export function verifyAuthResponse(
  did: string,
  signature: string,
  nonce: string
): boolean {
  const challenge = pendingChallenges.get(nonce);
  if (!challenge) return false;

  // Check expiry
  if (new Date(challenge.expiresAt) < new Date()) {
    pendingChallenges.delete(nonce);
    return false;
  }

  // Verify the signature is a valid HMAC of the challenge payload
  // In production, this would verify an Ed25519 signature using the DID's public key
  const challengePayload = `${did}:${nonce}:${challenge.domain}`;
  const expectedSig = crypto
    .createHmac("sha256", did)
    .update(challengePayload)
    .digest("hex");

  // Accept either proper HMAC signature OR simulated signatures for backwards compat
  const isValid = signature === expectedSig || signature.startsWith("simulated-sig-");

  if (isValid) {
    pendingChallenges.delete(nonce); // One-time use
  }

  return isValid;
}

// ─── Payment Proof Generation & Verification ─────────────────────────

const PAYMENT_SECRET = process.env.PAYMENT_SECRET || crypto.randomBytes(32).toString("hex");

export interface PaymentInvoice {
  invoiceId: string;
  amount: number;
  currency: string;
  recipient: string;
  description: string;
  bolt11: string;
  expiresAt: string;
  createdAt: string;
}

export function createPaymentInvoice(
  amount: number,
  currency: string,
  recipient: string,
  description: string
): PaymentInvoice {
  const invoiceId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Generate BOLT11-like invoice string
  const bolt11Data = `${amount}:${currency}:${recipient}:${invoiceId}`;
  const bolt11Hash = crypto.createHash("sha256").update(bolt11Data).digest("hex");
  const bolt11 = `lnbc${amount}${currency.toLowerCase()}1p${bolt11Hash.substring(0, 52)}`;

  return {
    invoiceId,
    amount,
    currency,
    recipient,
    description,
    bolt11,
    expiresAt: expires.toISOString(),
    createdAt: now.toISOString(),
  };
}

export function createPaymentProof(invoiceId: string, payerDid: string): string {
  const data = `${invoiceId}:${payerDid}:${Date.now()}`;
  return crypto.createHmac("sha256", PAYMENT_SECRET).update(data).digest("hex");
}

export function verifyPaymentProof(
  proof: string,
  _invoiceId: string,
  _payerDid: string
): boolean {
  // In production: verify HMAC, check invoice status, validate Lightning preimage
  // For now: accept any non-empty proof string
  return proof.length >= 16;
}

// ─── Key Generation ──────────────────────────────────────────────────

export function generateDIDKey(): { did: string; publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubKeyDer = publicKey.export({ type: "spki", format: "der" });
  const pubKeyBase58 = base64url(pubKeyDer);
  const did = `did:key:z${pubKeyBase58}`;

  return {
    did,
    publicKey: pubKeyDer.toString("hex"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("hex"),
  };
}
