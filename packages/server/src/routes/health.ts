/**
 * Health and monitoring routes.
 */

import { Router } from "express";
import type { StorageProvider } from "../storage/interface.js";
import { HYPRCAT_VERSION } from "@hyprcat/protocol";

export function createHealthRoutes(storage: StorageProvider): Router {
  const router = Router();

  // Health check
  router.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      version: HYPRCAT_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Readiness check
  router.get("/ready", (_req, res) => {
    res.json({
      ready: true,
      version: HYPRCAT_VERSION,
    });
  });

  // Stats (for monitoring)
  router.get("/stats", async (_req, res) => {
    const resourceList = await storage.listResources();
    res.json({
      resources: resourceList.length,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      uptime: process.uptime(),
    });
  });

  // Provenance endpoint
  router.get("/provenance/:agentDid", async (req, res) => {
    // This would be connected to the provenance service
    res.json({
      "@type": "prov:Bundle",
      "@id": `urn:provenance:${req.params.agentDid}`,
      "prov:agent": req.params.agentDid,
    });
  });

  return router;
}
