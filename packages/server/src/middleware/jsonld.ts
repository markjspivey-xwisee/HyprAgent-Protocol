/**
 * JSON-LD middleware for content negotiation and response formatting.
 */

import type { Request, Response, NextFunction } from "express";
import {
  CONTENT_TYPE_JSONLD,
  CONTENT_TYPE_JSON,
  HEADERS,
  HYPRCAT_VERSION,
  LINK_RELATIONS,
} from "@hyprcat/protocol";

/** Set JSON-LD response headers */
export function jsonLdHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(HEADERS.VERSION, HYPRCAT_VERSION);
    res.setHeader("Content-Type", CONTENT_TYPE_JSONLD);
    next();
  };
}

/** Content negotiation middleware */
export function contentNegotiation() {
  return (req: Request, res: Response, next: NextFunction) => {
    const accept = req.get("Accept") || "";
    if (
      accept.includes("application/ld+json") ||
      accept.includes("application/json") ||
      accept.includes("*/*") ||
      accept === ""
    ) {
      next();
    } else {
      res.status(406).json({
        "@type": "hypr:Error",
        "hypr:statusCode": 406,
        "hypr:title": "Not Acceptable",
        "hypr:detail": "This server only serves application/ld+json and application/json",
      });
    }
  };
}

/** Add Link headers for HATEOAS discoverability */
export function addLinkHeaders(baseUrl: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const links = [
      `<${baseUrl}/catalog>; rel="${LINK_RELATIONS.CATALOG}"`,
      `<${baseUrl}/.well-known/hyprcat>; rel="service-desc"`,
    ];
    res.setHeader("Link", links.join(", "));
    next();
  };
}
