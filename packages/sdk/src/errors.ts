/**
 * Error types for the HyprCAT SDK.
 */

import type { HyprError, X402PaymentRequired, Erc8004TokenGate } from "@hyprcat/protocol";

/** Base SDK error */
export class HyprCATError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;

  constructor(message: string, statusCode: number = 500, errorType: string = "hypr:Error") {
    super(message);
    this.name = "HyprCATError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }

  static fromResponse(error: HyprError): HyprCATError {
    return new HyprCATError(
      error["hypr:detail"],
      error["hypr:statusCode"],
      error["@type"]
    );
  }
}

/** Network/connectivity error */
export class NetworkError extends HyprCATError {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message, 0, "hypr:NetworkError");
    this.name = "NetworkError";
    this.originalError = originalError;
  }
}

/** Resource not found (404) */
export class NotFoundError extends HyprCATError {
  public readonly resourceId: string;

  constructor(resourceId: string) {
    super(`Resource not found: ${resourceId}`, 404, "hypr:NotFound");
    this.name = "NotFoundError";
    this.resourceId = resourceId;
  }
}

/** Authentication required (401) */
export class AuthenticationError extends HyprCATError {
  public readonly challenge?: string;

  constructor(message: string = "Authentication required", challenge?: string) {
    super(message, 401, "hypr:AuthenticationRequired");
    this.name = "AuthenticationError";
    this.challenge = challenge;
  }
}

/** Payment required (402) */
export class PaymentRequiredError extends HyprCATError {
  public readonly paymentDetails: X402PaymentRequired;

  constructor(paymentDetails: X402PaymentRequired) {
    super(
      `Payment required: ${paymentDetails["x402:amount"]} ${paymentDetails["x402:currency"]}`,
      402,
      "x402:PaymentRequired"
    );
    this.name = "PaymentRequiredError";
    this.paymentDetails = paymentDetails;
  }
}

/** Token gate (403) */
export class TokenGateError extends HyprCATError {
  public readonly gateDetails: Erc8004TokenGate;

  constructor(gateDetails: Erc8004TokenGate) {
    super(
      `Token required: ${gateDetails["erc8004:minBalance"]} of ${gateDetails["erc8004:requiredToken"]}`,
      403,
      "erc8004:TokenGateRequired"
    );
    this.name = "TokenGateError";
    this.gateDetails = gateDetails;
  }
}

/** Rate limited (429) */
export class RateLimitError extends HyprCATError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super(`Rate limited. Retry after ${retryAfter} seconds`, 429, "hypr:RateLimited");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Validation error (422) */
export class ValidationError extends HyprCATError {
  public readonly validationErrors: Array<{ path: string; message: string }>;

  constructor(errors: Array<{ path: string; message: string }>) {
    super(
      `Validation failed: ${errors.map((e) => e.message).join("; ")}`,
      422,
      "hypr:ValidationError"
    );
    this.name = "ValidationError";
    this.validationErrors = errors;
  }
}

/** Federation error (502) */
export class FederationError extends HyprCATError {
  public readonly failedSource: string;

  constructor(failedSource: string, message: string) {
    super(`Federation error from ${failedSource}: ${message}`, 502, "czero:FederationError");
    this.name = "FederationError";
    this.failedSource = failedSource;
  }
}
