// Core JSON-LD types
export interface JsonLdNode {
  "@id": string;
  "@type": string | string[];
  [key: string]: any;
}

// Hydra Core Vocabulary Types
export interface HydraOperation extends JsonLdNode {
  "hydra:method": string;
  "hydra:title": string;
  "hydra:description"?: string;
  "hydra:expects"?: HydraClass;
  "hydra:returns"?: string;
  "target"?: string; 
}

export interface HydraClass extends JsonLdNode {
  "hydra:supportedProperty": HydraSupportedProperty[];
}

export interface HydraSupportedProperty {
  "hydra:property": string; 
  "hydra:title"?: string;
  "hydra:description"?: string;
  "hydra:required"?: boolean;
  "hydra:readable"?: boolean;
  "hydra:writeable"?: boolean;
}

export interface HydraCollection extends JsonLdNode {
  "hydra:member": JsonLdNode[];
  "hydra:totalItems"?: number;
  "hydra:view"?: {
    "@id": string;
    "hydra:first"?: string;
    "hydra:next"?: string;
    "hydra:last"?: string;
  };
}

// --- HyprCAT / DCAT / DPROD Vocabulary ---

export interface DcatCatalog extends JsonLdNode {
  "dcat:dataset": JsonLdNode[];
  "dcat:service": JsonLdNode[];
  "dct:title": string;
  "dct:description": string;
}

export interface DcatDataset extends JsonLdNode {
  "dcat:distribution": JsonLdNode[];
  "dct:title": string;
  "dct:description": string;
  "dcat:keyword"?: string[];
}

// Data Product (DPROD)
export interface DprodDataProduct extends DcatDataset {
  "dprod:domainInfo": string;
  "dprod:dataProductOwner": string;
  "dprod:inputPort"?: JsonLdNode[];
  "dprod:outputPort"?: JsonLdNode[];
}

// HyprCAT Affordances
export interface HyprControl extends JsonLdNode {
  "hypr:action": HydraOperation[];
  "hypr:constraint"?: JsonLdNode; // x402 or ODRL
}

// --- C-ZERO (Conceptual Zero-Copy) Vocabulary ---
export interface CzeroVirtualGraph extends JsonLdNode {
  "czero:federatedSource": CzeroSourceNode[];
  "czero:ontologySchema": string;
  "czero:queryInterface": string; // e.g., "GraphQL-Federation"
}

export interface CzeroSourceNode extends JsonLdNode {
  "czero:endpoint": string;
  "czero:mappingType": "R2RML" | "GraphQL-Mesh" | "Direct";
  "czero:latency"?: string;
}

export interface CzeroResultSet extends JsonLdNode {
    "czero:items": Array<{
        [key: string]: any;
        "czero:provenance": {
            "sourceNode": string;
            "executionTime": string;
        };
    }>;
}

// ODRL (Rights Markup)
export interface OdrlPolicy extends JsonLdNode {
  "odrl:permission": {
    "odrl:target": string;
    "odrl:action": string;
    "odrl:constraint"?: any;
  }[];
}


// MCP Specific Concepts
export interface McpPrompt extends JsonLdNode {
  "schema:name": string;
  "schema:description": string;
  "mcp:instruction": string; 
  "mcp:arguments"?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

// x402 Payment Types
export interface PaymentConstraint extends JsonLdNode {
  "x402:required": boolean;
  "x402:amount": number;
  "x402:currency": string; 
  "x402:recipient": string; 
}

// ERC-8004 Smart Content Gateway Types
export interface Erc8004Constraint extends JsonLdNode {
  "erc8004:requiredToken": string; 
  "erc8004:tokenStandard": 'ERC-721' | 'ERC-20' | 'ERC-1155';
  "erc8004:minBalance": number;
  "erc8004:chainId": number;
}

// W3C Verifiable Credentials
export interface VerifiableCredential {
  "@context": string[];
  "id": string;
  "type": string[];
  "issuer": string | { id: string; name?: string };
  "issuanceDate": string;
  "credentialSubject": Record<string, any>;
  "proof": {
    "type": string;
    "created": string;
    "verificationMethod": string;
    "jws": string;
  };
}

// W3C Provenance
export type ProvEventType = 'entity' | 'activity';

export interface ProvEntity {
  id: string; 
  type: 'entity';
  label: string; 
  value: JsonLdNode;
  timestamp: number;
}

export interface ProvActivity {
  id: string;
  type: 'activity';
  label: string; 
  details: {
    actionType: string;
    payload: any;
    strategy: string;
  };
  usedEntityId: string;
  timestamp: number;
}

export type ProvenanceItem = ProvEntity | ProvActivity;

export interface ProvenanceEntity {
  "prov:wasGeneratedBy"?: {
    "@id": string;
    "name"?: string;
    "@type"?: string;
  };
  "prov:generatedAtTime"?: string;
  "prov:wasAttributedTo"?: string | { "@id": string; "name": string };
}

// Internal App State Types
export type ViewMode = 'human' | 'agent';

export interface HistoryItem {
  url: string;
  timestamp: number;
}

export type LogEntry = {
  timestamp: string;
  type: 'info' | 'decision' | 'action' | 'error' | 'success' | 'payment';
  message: string;
};