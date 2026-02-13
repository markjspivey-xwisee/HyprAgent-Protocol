/**
 * HyprCAT Gateway - Express application setup.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import type { ServerConfig } from "./config.js";
import type { StorageProvider } from "./storage/interface.js";
import { MemoryStorage } from "./storage/memory.js";
import { FileStorage } from "./storage/file.js";
import { CatalogService } from "./services/catalog.js";
import { PaymentService } from "./services/payment.js";
import { FederationService } from "./services/federation.js";
import { ProvenanceService } from "./services/provenance.js";

import { jsonLdHeaders, contentNegotiation, addLinkHeaders } from "./middleware/jsonld.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import { createCatalogRoutes } from "./routes/catalog.js";
import { createResourceRoutes } from "./routes/resources.js";
import { createOperationRoutes } from "./routes/operations.js";
import { createIdentityRoutes } from "./routes/identity.js";
import { createHealthRoutes } from "./routes/health.js";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createApp(config: ServerConfig): Promise<{
  app: ReturnType<typeof express>;
  storage: StorageProvider;
  catalog: CatalogService;
  payment: PaymentService;
  federation: FederationService;
  provenance: ProvenanceService;
}> {
  const app = express();

  // ─── Storage Layer ────────────────────────────────────────────
  const storage: StorageProvider = config.storageBackend === "file"
    ? new FileStorage(config.storageDir)
    : new MemoryStorage();

  // ─── Services ─────────────────────────────────────────────────
  const catalog = new CatalogService(storage, config.baseUrl);
  const payment = new PaymentService(storage);
  const federation = new FederationService();
  const provenance = new ProvenanceService(storage);

  // Initialize catalog with seed data
  await catalog.initialize();

  // ─── Global Middleware ────────────────────────────────────────

  // Security
  if (config.enableHelmet) {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  // CORS
  app.use(cors({
    origin: config.corsOrigins.includes("*") ? true : config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-HyprCAT-Version",
      "X-Agent-DID",
      "X-Payment-Proof",
      "X-Payment-Invoice",
      "X-Trace-Id",
    ],
    exposedHeaders: [
      "X-HyprCAT-Version",
      "X-Provenance-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Link",
    ],
  }));

  // Compression
  if (config.enableCompression) {
    app.use(compression());
  }

  // Body parsing
  app.use(express.json({ type: ["application/json", "application/ld+json"] }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        "@type": "hypr:RateLimited",
        "hypr:statusCode": 429,
        "hypr:title": "Rate Limited",
        "hypr:detail": "Too many requests. Please retry later.",
      });
    },
  }));

  // JSON-LD response headers
  app.use(jsonLdHeaders());
  app.use(contentNegotiation());
  app.use(addLinkHeaders(config.baseUrl));

  // Optional auth (attaches agentDid if present)
  app.use(optionalAuth(storage));

  // Request logging
  if (config.enableLogging) {
    app.use((req, _res, next) => {
      const start = Date.now();
      const originalEnd = _res.end.bind(_res);
      _res.end = function (...args: Parameters<typeof originalEnd>) {
        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.url} ${_res.statusCode} ${duration}ms` +
          (req.agentDid ? ` agent=${req.agentDid.substring(0, 20)}...` : "")
        );
        return originalEnd(...args);
      } as typeof originalEnd;
      next();
    });
  }

  // ─── Routes ───────────────────────────────────────────────────
  app.use(createHealthRoutes(storage));
  app.use(createCatalogRoutes(catalog, provenance, config.baseUrl));
  app.use(createResourceRoutes(catalog, provenance, config.baseUrl));
  app.use(createOperationRoutes(payment, federation, provenance, storage, config.baseUrl));
  app.use(createIdentityRoutes(storage, config.baseUrl));

  // ─── Error Handling ───────────────────────────────────────────
  app.use(notFoundHandler());
  app.use(errorHandler());

  return { app, storage, catalog, payment, federation, provenance };
}
