/**
 * Provenance types implementing W3C PROV-O for the HyprCAT Protocol.
 * Every operation execution produces an auditable provenance record.
 */

import type { JsonLdNode, IRI, DID, ISO8601DateTime, URN, Payload } from "./core.js";
import type { CredentialProof } from "./identity.js";

// ─── PROV-O Core Types ──────────────────────────────────────────

/** PROV Entity - a snapshot of a resource state */
export interface ProvEntity extends JsonLdNode {
  "@type": "prov:Entity";
  "prov:wasGeneratedBy"?: IRI | ProvActivity;
  "prov:wasAttributedTo"?: DID | { "@id": string; name?: string };
  "prov:generatedAtTime"?: ISO8601DateTime;
  "prov:wasDerivedFrom"?: IRI | ProvEntity;
  "prov:value"?: unknown;
}

/** PROV Activity - an action that was performed */
export interface ProvActivity extends JsonLdNode {
  "@type": "prov:Activity";
  "prov:startedAtTime": ISO8601DateTime;
  "prov:endedAtTime"?: ISO8601DateTime;
  "prov:wasAssociatedWith"?: DID | ProvAgent;
  "prov:used"?: IRI | ProvEntity;
  "prov:generated"?: IRI | ProvEntity;
  "hypr:operationType"?: string;
  "hypr:targetResource"?: IRI;
  "hypr:payload"?: Payload;
  "hypr:strategy"?: string;
  "hypr:proof"?: CredentialProof;
}

/** PROV Agent - the entity responsible for an activity */
export interface ProvAgent extends JsonLdNode {
  "@type": "prov:Agent";
  "prov:actedOnBehalfOf"?: DID | ProvAgent;
}

// ─── Internal Provenance Tracking ───────────────────────────────

/** Provenance event types */
export type ProvEventType = "entity" | "activity";

/** Internal entity snapshot (for UI/agent tracking) */
export interface ProvEntitySnapshot {
  id: URN;
  type: "entity";
  label: string;
  value: JsonLdNode;
  timestamp: number;
  url?: string;
}

/** Internal activity record (for UI/agent tracking) */
export interface ProvActivityRecord {
  id: URN;
  type: "activity";
  label: string;
  details: {
    actionType: string;
    payload: Payload;
    strategy: string;
    method?: string;
    targetUrl?: string;
    statusCode?: number;
    duration?: number;
  };
  usedEntityId: URN;
  generatedEntityId?: URN;
  timestamp: number;
  agentDid?: DID;
}

/** Union type for provenance items */
export type ProvenanceItem = ProvEntitySnapshot | ProvActivityRecord;

/** Provenance chain - ordered list of entities and activities */
export interface ProvenanceChain {
  id: URN;
  agentDid: DID;
  startedAt: ISO8601DateTime;
  items: ProvenanceItem[];
  sealed?: boolean;
  sealProof?: CredentialProof;
}

/** Provenance query parameters */
export interface ProvenanceQuery {
  agentDid?: DID;
  startTime?: ISO8601DateTime;
  endTime?: ISO8601DateTime;
  operationType?: string;
  targetResource?: IRI;
  limit?: number;
  offset?: number;
}

/** Provenance export formats */
export type ProvenanceExportFormat = "json-ld" | "n-quads" | "turtle" | "json";
