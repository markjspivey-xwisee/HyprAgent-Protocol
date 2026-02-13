/**
 * Wallet Management for the HyprCAT SDK.
 * Handles payment signing, token management, and balance tracking.
 */

import type {
  WalletState,
  PaymentCurrency,
  PaymentNetwork,
  X402PaymentRequired,
  X402PaymentProof,
  Erc8004TokenGate,
  Erc8004TokenProof,
  SubscriptionRecord,
  DID,
  ISO8601DateTime,
} from "@hyprcat/protocol";

/** Wallet event types */
export type WalletEventType = "payment" | "token-change" | "balance-change" | "subscription";

/** Wallet event */
export interface WalletEvent {
  type: WalletEventType;
  timestamp: number;
  data: unknown;
}

/** Wallet event listener */
export type WalletEventListener = (event: WalletEvent) => void;

/**
 * HyprCAT Wallet
 *
 * Manages digital assets, payment signing, and token verification
 * for autonomous agents operating in the HyprCAT mesh.
 */
export class HyprCATWallet {
  private state: WalletState;
  private listeners: Map<WalletEventType, Set<WalletEventListener>> = new Map();
  private transactionHistory: WalletTransaction[] = [];

  constructor(config: {
    did: DID;
    initialBalances?: Partial<Record<PaymentCurrency, number>>;
    provider?: string;
  }) {
    this.state = {
      did: config.did,
      balances: {
        SAT: 0,
        BTC: 0,
        ETH: 0,
        USDC: 0,
        USD: 0,
        ...config.initialBalances,
      },
      tokens: {},
      provider: config.provider || "HyprCAT Wallet",
      subscriptions: [],
    };
  }

  // ─── Balance Management ───────────────────────────────────────

  /** Get the DID associated with this wallet */
  getDID(): DID {
    return this.state.did as DID;
  }

  /** Get balance for a currency */
  getBalance(currency: PaymentCurrency): number {
    return this.state.balances[currency] || 0;
  }

  /** Get all balances */
  getBalances(): Record<PaymentCurrency, number> {
    return { ...this.state.balances };
  }

  /** Credit balance */
  credit(currency: PaymentCurrency, amount: number): void {
    this.state.balances[currency] = (this.state.balances[currency] || 0) + amount;
    this.emit("balance-change", { currency, amount, direction: "credit", newBalance: this.state.balances[currency] });
  }

  /** Debit balance */
  debit(currency: PaymentCurrency, amount: number): boolean {
    if (this.state.balances[currency] < amount) return false;
    this.state.balances[currency] -= amount;
    this.emit("balance-change", { currency, amount, direction: "debit", newBalance: this.state.balances[currency] });
    return true;
  }

  // ─── Payment Operations ───────────────────────────────────────

  /** Check if wallet can afford a payment */
  canAfford(payment: X402PaymentRequired): boolean {
    const currency = payment["x402:currency"];
    const amount = payment["x402:amount"];
    return this.getBalance(currency) >= amount;
  }

  /** Sign a payment (simulate Lightning invoice signing) */
  async signPayment(payment: X402PaymentRequired): Promise<X402PaymentProof> {
    const currency = payment["x402:currency"];
    const amount = payment["x402:amount"];

    if (!this.canAfford(payment)) {
      throw new Error(`Insufficient ${currency} balance: have ${this.getBalance(currency)}, need ${amount}`);
    }

    this.debit(currency, amount);

    const proof: X402PaymentProof = {
      preimage: this.generatePreimage(),
      invoice: payment["x402:invoice"] || `hyprcat-pay-${Date.now()}`,
      paidAt: new Date().toISOString(),
    };

    const tx: WalletTransaction = {
      id: crypto.randomUUID(),
      type: "payment",
      amount,
      currency,
      recipient: payment["x402:recipient"],
      timestamp: new Date().toISOString(),
      proof: proof.preimage,
      status: "completed",
    };

    this.transactionHistory.push(tx);
    this.emit("payment", tx);

    return proof;
  }

  /** Verify a payment proof */
  verifyPaymentProof(proof: X402PaymentProof): boolean {
    return proof.preimage.length > 0 && proof.invoice.length > 0;
  }

  // ─── Token Operations ─────────────────────────────────────────

  /** Get token balance */
  getTokenBalance(tokenAddress: string): number {
    return this.state.tokens[tokenAddress] || 0;
  }

  /** Get all token balances */
  getTokenBalances(): Record<string, number> {
    return { ...this.state.tokens };
  }

  /** Add tokens */
  addTokens(tokenAddress: string, amount: number): void {
    this.state.tokens[tokenAddress] = (this.state.tokens[tokenAddress] || 0) + amount;
    this.emit("token-change", { token: tokenAddress, amount, direction: "add", newBalance: this.state.tokens[tokenAddress] });
  }

  /** Remove tokens */
  removeTokens(tokenAddress: string, amount: number): boolean {
    if ((this.state.tokens[tokenAddress] || 0) < amount) return false;
    this.state.tokens[tokenAddress] -= amount;
    this.emit("token-change", { token: tokenAddress, amount, direction: "remove", newBalance: this.state.tokens[tokenAddress] });
    return true;
  }

  /** Check if wallet satisfies a token gate */
  satisfiesTokenGate(gate: Erc8004TokenGate): boolean {
    const tokenBalance = this.getTokenBalance(gate["erc8004:requiredToken"]);
    return tokenBalance >= gate["erc8004:minBalance"];
  }

  /** Generate a token ownership proof (simulate EIP-712 signing) */
  async signTokenProof(gate: Erc8004TokenGate): Promise<Erc8004TokenProof> {
    if (!this.satisfiesTokenGate(gate)) {
      throw new Error(
        `Insufficient token balance: have ${this.getTokenBalance(gate["erc8004:requiredToken"])}, ` +
        `need ${gate["erc8004:minBalance"]} of ${gate["erc8004:requiredToken"]}`
      );
    }

    return {
      address: this.state.did,
      chainId: gate["erc8004:chainId"],
      signature: this.generateSignature(),
      message: JSON.stringify({
        token: gate["erc8004:requiredToken"],
        minBalance: gate["erc8004:minBalance"],
        holder: this.state.did,
      }),
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Subscription Management ──────────────────────────────────

  /** Get active subscriptions */
  getSubscriptions(): SubscriptionRecord[] {
    return this.state.subscriptions.filter((s: SubscriptionRecord) => s.active);
  }

  /** Add a subscription */
  addSubscription(sub: Omit<SubscriptionRecord, "id">): SubscriptionRecord {
    const record: SubscriptionRecord = {
      ...sub,
      id: crypto.randomUUID(),
    };
    this.state.subscriptions.push(record);
    this.emit("subscription", { action: "created", subscription: record });
    return record;
  }

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string): boolean {
    const sub = this.state.subscriptions.find((s: SubscriptionRecord) => s.id === subscriptionId);
    if (!sub) return false;
    sub.active = false;
    this.emit("subscription", { action: "cancelled", subscription: sub });
    return true;
  }

  // ─── Transaction History ──────────────────────────────────────

  /** Get transaction history */
  getTransactions(): WalletTransaction[] {
    return [...this.transactionHistory];
  }

  /** Get full wallet state (snapshot) */
  getState(): WalletState {
    return {
      ...this.state,
      balances: { ...this.state.balances },
      tokens: { ...this.state.tokens },
      subscriptions: [...this.state.subscriptions],
    };
  }

  // ─── Events ───────────────────────────────────────────────────

  /** Subscribe to wallet events */
  on(event: WalletEventType, listener: WalletEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit(type: WalletEventType, data: unknown): void {
    const event: WalletEvent = { type, timestamp: Date.now(), data };
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  // ─── Crypto Helpers ───────────────────────────────────────────

  private generatePreimage(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private generateSignature(): string {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return "0x" + Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

/** Transaction record */
export interface WalletTransaction {
  id: string;
  type: "payment" | "token-mint" | "token-burn" | "subscription";
  amount: number;
  currency: PaymentCurrency | string;
  recipient?: string;
  timestamp: ISO8601DateTime;
  proof?: string;
  status: "pending" | "completed" | "failed";
}
