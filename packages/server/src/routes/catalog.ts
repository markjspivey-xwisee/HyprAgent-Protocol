/**
 * Catalog routes - resource discovery and navigation endpoints.
 */

import { Router } from "express";
import type { CatalogService } from "../services/catalog.js";
import type { ProvenanceService } from "../services/provenance.js";

export function createCatalogRoutes(
  catalog: CatalogService,
  provenance: ProvenanceService,
  baseUrl: string
): Router {
  const router = Router();

  // Well-known entry point
  router.get("/.well-known/hyprcat", async (req, res) => {
    const resource = await catalog.getResource(`${baseUrl}/.well-known/hyprcat`);
    if (!resource) return res.status(404).json({ "@type": "hypr:NotFound" });
    res.json(resource);
  });

  // Root API documentation
  router.get("/", async (req, res) => {
    const resource = await catalog.getResource(`${baseUrl}/`);
    if (!resource) return res.status(404).json({ "@type": "hypr:NotFound" });
    res.json(resource);
  });

  // Main catalog with search support
  router.get("/catalog", async (req, res) => {
    const { q, type, domain, page, pageSize } = req.query;
    const startTime = Date.now();

    if (q || type || domain) {
      const results = await catalog.search(
        q as string,
        type as string,
        domain as string
      );

      const pageNum = parseInt((page as string) || "1");
      const size = Math.min(parseInt((pageSize as string) || "20"), 100);
      const start = (pageNum - 1) * size;
      const paged = results.slice(start, start + size);

      res.json({
        "@context": "https://w3id.org/hyprcat/v1",
        "@id": `${baseUrl}/catalog?q=${q || ""}`,
        "@type": "hydra:Collection",
        "hydra:totalItems": results.length,
        "hydra:member": paged,
        "hydra:view": {
          "@id": `${baseUrl}/catalog?page=${pageNum}`,
          ...(pageNum > 1 ? { "hydra:previous": `${baseUrl}/catalog?page=${pageNum - 1}` } : {}),
          ...(start + size < results.length ? { "hydra:next": `${baseUrl}/catalog?page=${pageNum + 1}` } : {}),
        },
      });
    } else {
      const resource = await catalog.getResource(`${baseUrl}/catalog`);
      if (!resource) return res.status(404).json({ "@type": "hypr:NotFound" });
      res.json(resource);
    }

    // Record provenance
    if (req.agentDid) {
      await provenance.recordActivity(req.agentDid, {
        label: "Catalog Browse",
        actionType: "schema:SearchAction",
        targetUrl: `${baseUrl}/catalog`,
        method: "GET",
        statusCode: 200,
        duration: Date.now() - startTime,
      });
    }
  });

  // Get prompts collection
  router.get("/prompts", async (req, res) => {
    const resource = await catalog.getResource(`${baseUrl}/prompts`);
    if (!resource) return res.status(404).json({ "@type": "hypr:NotFound" });
    res.json(resource);
  });

  return router;
}
