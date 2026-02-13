/**
 * Provenance Service - records and manages PROV-O audit trails server-side.
 */

import type { ProvenanceChain, ProvEntitySnapshot, ProvActivityRecord, ProvenanceItem, DID, URN } from "@hyprcat/protocol";
import type { StorageProvider } from "../storage/interface.js";

export class ProvenanceService {
  constructor(private storage: StorageProvider) {}

  /** Record a server-side provenance activity */
  async recordActivity(
    agentDid: string,
    activity: {
      label: string;
      actionType: string;
      targetUrl: string;
      method: string;
      statusCode: number;
      duration: number;
      payload?: Record<string, unknown>;
    }
  ): Promise<string> {
    const activityId = `urn:uuid:${crypto.randomUUID()}`;

    const record: ProvActivityRecord = {
      id: activityId as URN,
      type: "activity",
      label: activity.label,
      details: {
        actionType: activity.actionType,
        payload: activity.payload || {},
        strategy: "server-recorded",
        method: activity.method,
        targetUrl: activity.targetUrl,
        statusCode: activity.statusCode,
        duration: activity.duration,
      },
      usedEntityId: activityId as URN,
      timestamp: Date.now(),
      agentDid: agentDid as DID,
    };

    // Get or create chain for this agent
    const chains = await this.storage.getProvenanceChains(agentDid);
    let currentChain: ProvenanceChain;

    if (chains.length > 0 && !chains[chains.length - 1].sealed) {
      currentChain = chains[chains.length - 1];
      currentChain.items.push(record);
    } else {
      currentChain = {
        id: `urn:uuid:${crypto.randomUUID()}` as URN,
        agentDid: agentDid as DID,
        startedAt: new Date().toISOString(),
        items: [record],
      };
    }

    await this.storage.storeProvenanceChain(currentChain);
    return activityId;
  }

  /** Get provenance history for an agent */
  async getHistory(agentDid: string): Promise<ProvenanceChain[]> {
    return this.storage.getProvenanceChains(agentDid);
  }

  /** Export provenance as PROV-O JSON-LD */
  async exportAsJsonLd(agentDid: string): Promise<object> {
    const chains = await this.storage.getProvenanceChains(agentDid);

    return {
      "@context": [
        "http://www.w3.org/ns/prov#",
        "https://w3id.org/hyprcat/v1",
      ],
      "@type": "prov:Bundle",
      "prov:wasGeneratedBy": { "@type": "prov:Agent", "@id": agentDid },
      "prov:hadMember": chains.flatMap((chain) =>
        chain.items.map((item) => {
          if (item.type === "activity") {
            const activity = item as ProvActivityRecord;
            return {
              "@type": "prov:Activity",
              "@id": activity.id,
              "prov:startedAtTime": new Date(activity.timestamp).toISOString(),
              "rdfs:label": activity.label,
              "hypr:operationType": activity.details.actionType,
              "hypr:targetResource": activity.details.targetUrl,
            };
          }
          const entity = item as ProvEntitySnapshot;
          return {
            "@type": "prov:Entity",
            "@id": entity.id,
            "prov:generatedAtTime": new Date(entity.timestamp).toISOString(),
            "rdfs:label": entity.label,
          };
        })
      ),
    };
  }
}
