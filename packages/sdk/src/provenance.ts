/**
 * Provenance Tracking for the HyprCAT SDK.
 * Records and manages W3C PROV-O audit trails for agent operations.
 */

import type {
  JsonLdNode,
  DID,
  IRI,
  URN,
  ISO8601DateTime,
  Payload,
  ProvEntity,
  ProvActivity,
  ProvEntitySnapshot,
  ProvActivityRecord,
  ProvenanceItem,
  ProvenanceChain,
  ProvenanceExportFormat,
} from "@hyprcat/protocol";

/**
 * Provenance Tracker
 *
 * Records every operation as a PROV-O activity with linked entities,
 * forming an auditable chain of agent actions.
 */
export class ProvenanceTracker {
  private chain: ProvenanceChain;
  private currentEntityId: URN | null = null;

  constructor(agentDid: DID) {
    this.chain = {
      id: this.generateId(),
      agentDid,
      startedAt: new Date().toISOString(),
      items: [],
      sealed: false,
    };
  }

  // ─── Entity Recording ─────────────────────────────────────────

  /** Record a resource state snapshot as a PROV Entity */
  recordEntity(resource: JsonLdNode, label?: string): URN {
    const entity: ProvEntitySnapshot = {
      id: this.generateId(),
      type: "entity",
      label: label || extractLabel(resource) || "Resource State",
      value: resource,
      timestamp: Date.now(),
      url: resource["@id"],
    };

    this.chain.items.push(entity);
    this.currentEntityId = entity.id;
    return entity.id;
  }

  // ─── Activity Recording ───────────────────────────────────────

  /** Record an operation execution as a PROV Activity */
  recordActivity(
    label: string,
    details: {
      actionType: string;
      payload: Payload;
      strategy: string;
      method?: string;
      targetUrl?: string;
      statusCode?: number;
      duration?: number;
    }
  ): URN {
    if (!this.currentEntityId) {
      throw new Error("Cannot record activity without a prior entity. Call recordEntity first.");
    }

    const activity: ProvActivityRecord = {
      id: this.generateId(),
      type: "activity",
      label,
      details,
      usedEntityId: this.currentEntityId,
      timestamp: Date.now(),
      agentDid: this.chain.agentDid as DID,
    };

    this.chain.items.push(activity);
    return activity.id;
  }

  /** Record an activity with automatic timing */
  async recordTimedActivity<T>(
    label: string,
    actionType: string,
    strategy: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; activityId: URN }> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      const activityId = this.recordActivity(label, {
        actionType,
        payload: {},
        strategy,
        duration,
        statusCode: 200,
      });

      // If the result is a JsonLdNode, record it as a generated entity
      if (result && typeof result === "object" && "@id" in (result as Record<string, unknown>)) {
        this.recordEntity(result as JsonLdNode, `Result of ${label}`);
      }

      return { result, activityId };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordActivity(`Failed: ${label}`, {
        actionType,
        payload: { error: (error as Error).message },
        strategy,
        duration,
        statusCode: 500,
      });
      throw error;
    }
  }

  // ─── Chain Management ─────────────────────────────────────────

  /** Get the current provenance chain */
  getChain(): ProvenanceChain {
    return { ...this.chain, items: [...this.chain.items] };
  }

  /** Get all items in the chain */
  getItems(): ProvenanceItem[] {
    return [...this.chain.items];
  }

  /** Get only entities */
  getEntities(): ProvEntitySnapshot[] {
    return this.chain.items.filter((i): i is ProvEntitySnapshot => i.type === "entity");
  }

  /** Get only activities */
  getActivities(): ProvActivityRecord[] {
    return this.chain.items.filter((i): i is ProvActivityRecord => i.type === "activity");
  }

  /** Get the current entity ID */
  getCurrentEntityId(): URN | null {
    return this.currentEntityId;
  }

  /** Get the chain length */
  getLength(): number {
    return this.chain.items.length;
  }

  /** Clear the chain and start fresh */
  reset(): void {
    this.chain.items = [];
    this.chain.startedAt = new Date().toISOString();
    this.currentEntityId = null;
    this.chain.sealed = false;
  }

  /** Seal the chain (prevent further modifications) */
  seal(): void {
    this.chain.sealed = true;
  }

  /** Check if the chain is sealed */
  isSealed(): boolean {
    return this.chain.sealed ?? false;
  }

  // ─── Export ────────────────────────────────────────────────────

  /** Export the chain as W3C PROV-O JSON-LD */
  exportAsJsonLd(): object {
    return {
      "@context": [
        "http://www.w3.org/ns/prov#",
        "https://w3id.org/hyprcat/v1",
      ],
      "@type": "prov:Bundle",
      "@id": this.chain.id,
      "prov:wasGeneratedBy": {
        "@type": "prov:Agent",
        "@id": this.chain.agentDid,
      },
      "prov:generatedAtTime": this.chain.startedAt,
      "prov:hadMember": this.chain.items.map((item) => {
        if (item.type === "entity") {
          const entity = item as ProvEntitySnapshot;
          return {
            "@type": "prov:Entity",
            "@id": entity.id,
            "prov:generatedAtTime": new Date(entity.timestamp).toISOString(),
            "rdfs:label": entity.label,
            "prov:value": entity.url || entity.value["@id"],
          };
        } else {
          const activity = item as ProvActivityRecord;
          return {
            "@type": "prov:Activity",
            "@id": activity.id,
            "prov:startedAtTime": new Date(activity.timestamp).toISOString(),
            "prov:used": { "@id": activity.usedEntityId },
            "prov:wasAssociatedWith": { "@id": activity.agentDid || this.chain.agentDid },
            "rdfs:label": activity.label,
            "hypr:operationType": activity.details.actionType,
            "hypr:strategy": activity.details.strategy,
          };
        }
      }),
    };
  }

  /** Export as a flat JSON summary */
  exportAsSummary(): object {
    return {
      chainId: this.chain.id,
      agentDid: this.chain.agentDid,
      startedAt: this.chain.startedAt,
      totalItems: this.chain.items.length,
      entities: this.getEntities().length,
      activities: this.getActivities().length,
      sealed: this.chain.sealed,
      items: this.chain.items.map((item) => ({
        id: item.id,
        type: item.type,
        label: item.type === "entity"
          ? (item as ProvEntitySnapshot).label
          : (item as ProvActivityRecord).label,
        timestamp: new Date(item.timestamp).toISOString(),
      })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private generateId(): URN {
    return `urn:uuid:${crypto.randomUUID()}` as URN;
  }
}

function extractLabel(resource: JsonLdNode): string | undefined {
  const r = resource as Record<string, unknown>;
  return (r["dct:title"] || r["schema:name"] || r["hydra:title"] || r["rdfs:label"]) as string | undefined;
}
