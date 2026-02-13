/**
 * Payment Service - full x402 payment protocol implementation.
 * Handles BOLT11-like invoice generation, payment proof verification,
 * receipt tracking, and wallet state management.
 */

import type { PaymentCurrency } from "@hyprcat/protocol";
import type { StorageProvider } from "../storage/interface.js";
import {
  createPaymentInvoice,
  verifyPaymentProof,
  type PaymentInvoice,
} from "../crypto.js";

export interface PaymentReceipt {
  id: string;
  invoiceId: string;
  payerDid: string;
  amount: number;
  currency: PaymentCurrency;
  recipient: string;
  proof: string;
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  confirmedAt?: string;
}

export class PaymentService {
  private receipts = new Map<string, PaymentReceipt>();
  private pendingInvoices = new Map<string, PaymentInvoice>();

  constructor(private storage: StorageProvider) {}

  /** Create an x402 payment invoice */
  createInvoice(
    amount: number,
    currency: string,
    recipient: string,
    description: string
  ): Record<string, unknown> {
    const invoice = createPaymentInvoice(amount, currency, recipient, description);
    this.pendingInvoices.set(invoice.invoiceId, invoice);

    // Auto-expire after 10 minutes
    setTimeout(() => this.pendingInvoices.delete(invoice.invoiceId), 10 * 60 * 1000);

    return {
      "@type": "x402:PaymentRequired",
      "x402:amount": amount,
      "x402:currency": currency,
      "x402:recipient": recipient,
      "x402:description": description,
      "x402:invoiceId": invoice.invoiceId,
      "x402:bolt11": invoice.bolt11,
      "x402:expiresAt": invoice.expiresAt,
      "x402:paymentHeader": "X-Payment-Proof",
      "x402:invoiceHeader": "X-Payment-Invoice",
    };
  }

  /** Process a payment with proof verification */
  async processPayment(
    payerDid: string,
    amount: number,
    currency: PaymentCurrency,
    recipient: string,
    proof: string,
    invoiceId?: string
  ): Promise<PaymentReceipt> {
    // Verify the payment proof
    const isValid = verifyPaymentProof(proof, invoiceId || "", payerDid);
    if (!isValid) {
      throw new Error("Invalid payment proof");
    }

    // If invoice was provided, verify it matches
    if (invoiceId) {
      const invoice = this.pendingInvoices.get(invoiceId);
      if (invoice) {
        if (invoice.amount !== amount) {
          throw new Error(`Invoice amount mismatch: expected ${invoice.amount}, got ${amount}`);
        }
        if (new Date(invoice.expiresAt) < new Date()) {
          this.pendingInvoices.delete(invoiceId);
          throw new Error("Invoice has expired");
        }
        this.pendingInvoices.delete(invoiceId);
      }
    }

    // Deduct from wallet
    const walletState = await this.storage.getWalletState(payerDid);
    if (walletState) {
      const balance = walletState.balances[currency] || 0;
      if (balance < amount) {
        throw new Error(`Insufficient ${currency} balance: have ${balance}, need ${amount}`);
      }
      walletState.balances[currency] = balance - amount;
      await this.storage.setWalletState(payerDid, walletState);
    }

    // Create receipt
    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      invoiceId: invoiceId || "direct",
      payerDid,
      amount,
      currency,
      recipient,
      proof,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    this.receipts.set(receipt.id, receipt);
    return receipt;
  }

  /** Verify a token gate requirement */
  verifyTokenGate(
    _agentDid: string,
    requiredToken: string,
    minBalance: number,
    walletState: { tokens: Record<string, number> } | null
  ): boolean {
    if (!walletState) return false;
    const balance = walletState.tokens[requiredToken] || 0;
    return balance >= minBalance;
  }

  /** Get a receipt by ID */
  getReceipt(receiptId: string): PaymentReceipt | null {
    return this.receipts.get(receiptId) || null;
  }

  /** Get all receipts for a payer */
  getReceiptsByPayer(payerDid: string): PaymentReceipt[] {
    return Array.from(this.receipts.values()).filter((r) => r.payerDid === payerDid);
  }

  /** Get payment stats */
  getStats(): { totalReceipts: number; totalVolume: Record<string, number> } {
    const volume: Record<string, number> = {};
    for (const receipt of this.receipts.values()) {
      if (receipt.status === "confirmed") {
        volume[receipt.currency] = (volume[receipt.currency] || 0) + receipt.amount;
      }
    }
    return { totalReceipts: this.receipts.size, totalVolume: volume };
  }
}
