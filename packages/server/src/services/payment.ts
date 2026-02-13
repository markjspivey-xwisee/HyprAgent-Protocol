/**
 * Payment Service - handles x402 payment processing and token gate verification.
 */

import type { PaymentCurrency } from "@hyprcat/protocol";
import type { StorageProvider } from "../storage/interface.js";

/** Payment receipt */
export interface PaymentReceipt {
  id: string;
  amount: number;
  currency: PaymentCurrency;
  payer: string;
  recipient: string;
  timestamp: string;
  invoice: string;
  status: "completed" | "pending" | "failed";
}

export class PaymentService {
  private receipts: Map<string, PaymentReceipt> = new Map();

  constructor(private storage: StorageProvider) {}

  /** Process a payment */
  async processPayment(
    payerDid: string,
    amount: number,
    currency: PaymentCurrency,
    recipient: string,
    proof: string
  ): Promise<PaymentReceipt> {
    // Verify the payment proof
    if (!proof || proof.length < 10) {
      throw new Error("Invalid payment proof");
    }

    // In production, verify Lightning invoice preimage or on-chain tx
    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      amount,
      currency,
      payer: payerDid,
      recipient,
      timestamp: new Date().toISOString(),
      invoice: `hyprcat-inv-${Date.now()}`,
      status: "completed",
    };

    this.receipts.set(receipt.id, receipt);

    // Update payer wallet
    const walletState = await this.storage.getWalletState(payerDid);
    if (walletState) {
      walletState.balances[currency] = (walletState.balances[currency] || 0) - amount;
      await this.storage.setWalletState(payerDid, walletState);
    }

    return receipt;
  }

  /** Verify a token gate requirement */
  async verifyTokenGate(
    holderDid: string,
    tokenAddress: string,
    minBalance: number
  ): Promise<boolean> {
    const walletState = await this.storage.getWalletState(holderDid);
    if (!walletState) return false;

    const tokenBalance = walletState.tokens[tokenAddress] || 0;
    return tokenBalance >= minBalance;
  }

  /** Get payment receipt */
  getReceipt(id: string): PaymentReceipt | undefined {
    return this.receipts.get(id);
  }

  /** Get all receipts for a payer */
  getReceiptsByPayer(payerDid: string): PaymentReceipt[] {
    return Array.from(this.receipts.values()).filter((r) => r.payer === payerDid);
  }

  /** Create a payment invoice for a resource */
  createInvoice(
    amount: number,
    currency: PaymentCurrency,
    recipient: string,
    description: string
  ): object {
    return {
      "@type": "x402:PaymentRequired",
      "@id": `urn:uuid:${crypto.randomUUID()}`,
      "x402:amount": amount,
      "x402:currency": currency,
      "x402:recipient": recipient,
      "x402:network": "lightning",
      "x402:invoice": `lnbc${amount}n1${crypto.randomUUID().replace(/-/g, "")}`,
      "x402:expiresAt": new Date(Date.now() + 600_000).toISOString(),
      "x402:description": description,
    };
  }
}
