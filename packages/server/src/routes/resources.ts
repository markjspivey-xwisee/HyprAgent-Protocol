/**
 * Resource routes - individual resource access endpoints.
 */

import { Router } from "express";
import type { CatalogService } from "../services/catalog.js";
import type { ProvenanceService } from "../services/provenance.js";

export function createResourceRoutes(
  catalog: CatalogService,
  provenance: ProvenanceService,
  baseUrl: string
): Router {
  const router = Router();

  // Get any resource node by path
  router.get("/nodes/:nodeType", async (req, res) => {
    const iri = `${baseUrl}/nodes/${req.params.nodeType}`;
    const startTime = Date.now();

    const resource = await catalog.getResource(iri);
    if (!resource) {
      res.status(404).json({
        "@context": "https://w3id.org/hyprcat/v1",
        "@type": "hypr:NotFound",
        "hypr:statusCode": 404,
        "hypr:title": "Resource Not Found",
        "hypr:detail": `No resource at ${iri}`,
      });
      return;
    }

    // Add provenance header
    const provenanceId = `urn:uuid:${crypto.randomUUID()}`;
    res.setHeader("X-Provenance-Id", provenanceId);
    res.setHeader(
      "Link",
      `<${baseUrl}/provenance/${provenanceId}>; rel="http://www.w3.org/ns/prov#has_provenance"`
    );

    res.json(resource);

    // Record provenance
    if (req.agentDid) {
      await provenance.recordActivity(req.agentDid, {
        label: `Fetch ${(resource as Record<string, unknown>)["dct:title"] || req.params.nodeType}`,
        actionType: "schema:ViewAction",
        targetUrl: iri,
        method: "GET",
        statusCode: 200,
        duration: Date.now() - startTime,
      });
    }
  });

  // Get nested resources (e.g., /nodes/retail/products/h100)
  router.get("/nodes/:nodeType/:subType/:resourceId", async (req, res) => {
    const iri = `${baseUrl}/nodes/${req.params.nodeType}/${req.params.subType}/${req.params.resourceId}`;

    const resource = await catalog.getResource(iri);
    if (!resource) {
      // Try to find it as a member of the parent
      const parentIri = `${baseUrl}/nodes/${req.params.nodeType}`;
      const parent = await catalog.getResource(parentIri);
      if (parent) {
        const members = (parent as Record<string, unknown>)["hydra:member"];
        if (Array.isArray(members)) {
          const member = members.find((m: Record<string, unknown>) => m["@id"] === iri);
          if (member) {
            res.json(member);
            return;
          }
        }
      }

      res.status(404).json({
        "@type": "hypr:NotFound",
        "hypr:statusCode": 404,
        "hypr:detail": `No resource at ${iri}`,
      });
      return;
    }

    res.json(resource);
  });

  // Register a new data product
  router.post("/nodes", async (req, res) => {
    const product = req.body;

    if (!product["@id"] || !product["@type"]) {
      res.status(400).json({
        "@type": "hypr:InvalidRequest",
        "hypr:statusCode": 400,
        "hypr:detail": "Resource must have @id and @type",
      });
      return;
    }

    await catalog.registerDataProduct(product);

    res.status(201).json({
      "@type": "schema:ActionStatus",
      "schema:name": "Resource Registered",
      "schema:description": `Resource ${product["@id"]} registered in catalog`,
    });
  });

  return router;
}
