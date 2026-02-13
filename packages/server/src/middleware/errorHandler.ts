/**
 * Global error handling middleware.
 */

import type { Request, Response, NextFunction } from "express";
import { CONTENT_TYPE_JSONLD, HYPRCAT_CONTEXT_URI } from "@hyprcat/protocol";

/** Error response shape */
interface ErrorResponse {
  "@context": string;
  "@id": string;
  "@type": string;
  "hypr:statusCode": number;
  "hypr:title": string;
  "hypr:detail": string;
  "hypr:instance"?: string;
}

/** Global error handler */
export function errorHandler() {
  return (err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const errorType = mapErrorType(statusCode);

    const errorResponse: ErrorResponse = {
      "@context": HYPRCAT_CONTEXT_URI,
      "@id": `urn:uuid:${crypto.randomUUID()}`,
      "@type": errorType,
      "hypr:statusCode": statusCode,
      "hypr:title": getErrorTitle(statusCode),
      "hypr:detail": statusCode >= 500 ? "An internal server error occurred" : err.message,
      "hypr:instance": req.originalUrl,
    };

    if (process.env.NODE_ENV !== "production" && statusCode >= 500) {
      console.error(`[ERROR] ${req.method} ${req.url}:`, err);
    }

    res.status(statusCode).json(errorResponse);
  };
}

/** 404 handler */
export function notFoundHandler() {
  return (req: Request, res: Response) => {
    res.status(404).json({
      "@context": HYPRCAT_CONTEXT_URI,
      "@id": `urn:uuid:${crypto.randomUUID()}`,
      "@type": "hypr:NotFound",
      "hypr:statusCode": 404,
      "hypr:title": "Resource Not Found",
      "hypr:detail": `No resource exists at ${req.originalUrl}`,
      "hypr:instance": req.originalUrl,
    });
  };
}

function mapErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400: return "hypr:InvalidRequest";
    case 401: return "hypr:AuthenticationRequired";
    case 402: return "x402:PaymentRequired";
    case 403: return "hypr:AccessDenied";
    case 404: return "hypr:NotFound";
    case 405: return "hypr:MethodNotAllowed";
    case 409: return "hypr:Conflict";
    case 422: return "hypr:ValidationError";
    case 429: return "hypr:RateLimited";
    case 502: return "czero:FederationError";
    case 503: return "hypr:ServiceUnavailable";
    default: return "hypr:InternalError";
  }
}

function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400: return "Invalid Request";
    case 401: return "Authentication Required";
    case 402: return "Payment Required";
    case 403: return "Access Denied";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 409: return "Conflict";
    case 422: return "Validation Error";
    case 429: return "Rate Limited";
    case 500: return "Internal Server Error";
    case 502: return "Federation Error";
    case 503: return "Service Unavailable";
    default: return "Error";
  }
}
