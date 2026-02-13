# HyprCAT Protocol Specification v1.0

## Hypermedia Context & Action Transfer Protocol

**Status:** Draft Specification
**Version:** 1.0.0
**Date:** 2026-02-13
**Authors:** HyprAgent Protocol Contributors
**License:** Apache-2.0

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model](#4-data-model)
5. [Upper Ontology](#5-upper-ontology)
6. [Resource Discovery](#6-resource-discovery)
7. [HATEOAS Affordances](#7-hateoas-affordances)
8. [Governance Layer](#8-governance-layer)
9. [Identity & Authentication](#9-identity--authentication)
10. [Federation (C-ZERO)](#10-federation-c-zero)
11. [Agent Execution Model](#11-agent-execution-model)
12. [Provenance](#12-provenance)
13. [Payment Protocols](#13-payment-protocols)
14. [Transport & Security](#14-transport--security)
15. [Conformance](#15-conformance)
16. [Appendix A: JSON-LD Context](#appendix-a-json-ld-context)
17. [Appendix B: Error Codes](#appendix-b-error-codes)
18. [Appendix C: Media Types](#appendix-c-media-types)

---

## 1. Introduction

### 1.1 Purpose

The HyprCAT Protocol (Hypermedia Context & Action Transfer) defines a standard for autonomous software agents to discover, negotiate, and transact within decentralized data marketplaces. It provides a machine-readable, self-describing API surface built on W3C Linked Data standards, enabling agents to navigate resources without prior knowledge of API structure.

### 1.2 Design Principles

1. **Hypermedia-Driven:** Resources advertise their own affordances. Agents discover URLs and operations at runtime via HATEOAS controls. No hardcoded endpoints.
2. **Semantic Interoperability:** All resources are described using JSON-LD with standardized vocabularies (Hydra, DCAT, PROV-O, Schema.org).
3. **Governance-First:** Access control is embedded in resource descriptions via x402 payment constraints, ERC-8004 token gates, and ODRL policies.
4. **Provenance by Default:** Every state mutation is recorded as a W3C PROV-O activity, creating an auditable execution trace.
5. **Agent Autonomy:** The protocol supports fully autonomous agent execution through the O.N.A. (Observe, Negotiate, Attest) loop.
6. **Zero-Copy Federation:** Data products can be federated across heterogeneous sources without data movement.

### 1.3 Scope

This specification covers:
- The JSON-LD data model for describing data products and their affordances
- The discovery and navigation protocol for autonomous agents
- Payment and governance mechanisms for access control
- The agent execution model (O.N.A. loop)
- Provenance recording and verification
- Federation semantics for zero-copy data access

### 1.4 Relationship to Other Standards

| Standard | Role in HyprCAT |
|----------|-----------------|
| JSON-LD 1.1 (W3C) | Serialization format for all resource descriptions |
| Hydra Core (W3C CG) | Hypermedia controls and operation descriptions |
| DCAT 3 (W3C) | Dataset and catalog vocabulary |
| DPROD (CDMC) | Data product descriptions |
| PROV-O (W3C) | Provenance ontology |
| DID Core (W3C) | Decentralized identifiers for agents and resources |
| VC Data Model (W3C) | Verifiable credentials for authorization |
| ODRL 2.2 (W3C) | Digital rights and policy expression |
| Schema.org | General-purpose vocabulary |
| x402 | HTTP-native payment protocol |
| ERC-8004 | Smart content token gating |
| MCP (Anthropic) | Model Context Protocol for LLM coordination |
| xAPI (ADL) | Learning activity telemetry |

---

## 2. Terminology

**Agent:** An autonomous software entity that navigates the HyprCAT mesh, discovers resources, and executes operations on behalf of a principal.

**Affordance:** A machine-readable description of an action that can be performed on a resource (Hydra Operation).

**Catalog:** A DCAT-compliant collection of datasets and data products, serving as the entry point to a data mesh.

**Data Product:** A DPROD-compliant resource that encapsulates a curated dataset with defined input/output ports, ownership, and domain metadata.

**Governance Constraint:** An access control mechanism (x402 payment, ERC-8004 token gate, or ODRL policy) that must be satisfied before an operation can be executed.

**HyprCAT Node:** Any resource in the mesh that implements the HyprCAT protocol, serving JSON-LD with Hydra affordances.

**Mesh:** The interconnected graph of HyprCAT nodes forming a decentralized data marketplace.

**O.N.A. Loop:** The agent execution cycle: Observe (discover resources), Negotiate (satisfy constraints), Attest (record provenance).

**Principal:** The human or organization on whose behalf an agent operates.

**Virtual Graph (C-ZERO):** A federated view over multiple data sources that routes queries without copying data.

---

## 3. Architecture Overview

### 3.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        HyprCAT Mesh                              │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │   Catalog     │──▶│  Data Product │──▶│   Operation  │         │
│  │  (DCAT)       │   │  (DPROD)      │   │  (Hydra)     │         │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘         │
│         │                  │                   │                  │
│         ▼                  ▼                   ▼                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │  Governance   │   │  Federation  │   │  Provenance  │         │
│  │  (x402/ODRL)  │   │  (C-ZERO)    │   │  (PROV-O)    │         │
│  └──────────────┘   └──────────────┘   └──────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
          ▲                                         │
          │            HTTPS + JSON-LD              │
          ▼                                         ▼
┌──────────────────┐                    ┌──────────────────┐
│   HyprAgent      │                    │   HyprCAT        │
│   (Autonomous     │                    │   Gateway         │
│    Client)        │                    │   (Server)        │
│                   │                    │                   │
│  ┌─────────────┐  │                    │  ┌─────────────┐  │
│  │ O.N.A. Loop │  │                    │  │ Auth / DID  │  │
│  │ Wallet      │  │                    │  │ Rate Limit  │  │
│  │ Provenance  │  │                    │  │ Federation  │  │
│  │ Strategy    │  │                    │  │ Storage     │  │
│  └─────────────┘  │                    │  └─────────────┘  │
└──────────────────┘                    └──────────────────┘
```

### 3.2 Layer Model

| Layer | Responsibility | Standards |
|-------|---------------|-----------|
| **Transport** | HTTPS, content negotiation, caching | HTTP/2, TLS 1.3 |
| **Serialization** | JSON-LD encoding/decoding | JSON-LD 1.1 |
| **Semantic** | Resource typing and relationships | DCAT, DPROD, Schema.org |
| **Hypermedia** | Operation discovery and execution | Hydra Core |
| **Governance** | Access control and rights management | x402, ERC-8004, ODRL |
| **Identity** | Agent and resource identification | DID Core, VC Data Model |
| **Provenance** | Execution audit trail | PROV-O |
| **Federation** | Cross-source data access | C-ZERO |
| **Agent** | Autonomous execution logic | O.N.A. Loop, MCP |

---

## 4. Data Model

### 4.1 Base Resource

All HyprCAT resources MUST be valid JSON-LD documents with at minimum:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://example.com/resource/1",
  "@type": "dcat:Dataset"
}
```

**Requirements:**
- `@context` MUST reference the HyprCAT context or include equivalent namespace bindings.
- `@id` MUST be a dereferenceable IRI (HTTP/HTTPS URL) or a DID.
- `@type` MUST include at least one type from the HyprCAT upper ontology.

### 4.2 Resource Types

#### 4.2.1 Catalog

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://data.market.example/catalog",
  "@type": ["dcat:Catalog", "hydra:ApiDocumentation"],
  "dct:title": "Global Data Marketplace",
  "dct:description": "A HyprCAT-compliant decentralized data exchange.",
  "hydra:entrypoint": "https://data.market.example/catalog",
  "dcat:dataset": [],
  "dcat:service": [],
  "mcp:prompts": { "@id": "https://data.market.example/prompts" }
}
```

#### 4.2.2 Collection

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://data.market.example/catalog",
  "@type": "hydra:Collection",
  "hydra:member": [ ... ],
  "hydra:totalItems": 42,
  "hydra:view": {
    "@id": "https://data.market.example/catalog?page=1",
    "hydra:first": "https://data.market.example/catalog?page=1",
    "hydra:next": "https://data.market.example/catalog?page=2",
    "hydra:last": "https://data.market.example/catalog?page=5"
  }
}
```

#### 4.2.3 Dataset

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://data.market.example/datasets/sales",
  "@type": "dcat:Dataset",
  "dct:title": "Sales Analytics Dataset",
  "dct:description": "Curated sales data with daily aggregation.",
  "dcat:keyword": ["sales", "analytics", "revenue"],
  "dcat:distribution": [
    {
      "@type": "dcat:Distribution",
      "dcat:mediaType": "application/json",
      "dcat:accessURL": "https://data.market.example/datasets/sales/data"
    }
  ]
}
```

#### 4.2.4 Data Product

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://data.market.example/products/user-analytics",
  "@type": "dprod:DataProduct",
  "dct:title": "User Analytics Product",
  "dprod:domainInfo": "Business Intelligence",
  "dprod:dataProductOwner": "did:web:analytics-team.example",
  "dprod:inputPort": [],
  "dprod:outputPort": [
    {
      "@type": "dprod:Port",
      "dct:title": "REST API Output",
      "dcat:accessURL": "https://data.market.example/products/user-analytics/api"
    }
  ]
}
```

### 4.3 JSON-LD Processing

Conformant implementations:
- MUST support JSON-LD 1.1 Compacted form
- MUST support `@context` as a string URI or inline object
- SHOULD support JSON-LD Framing for response shaping
- SHOULD support content negotiation via `Accept: application/ld+json`

---

## 5. Upper Ontology

### 5.1 Namespace Bindings

The HyprCAT upper ontology unifies the following namespace prefixes:

```json
{
  "hypr": "https://w3id.org/hyprcat#",
  "hydra": "http://www.w3.org/ns/hydra/core#",
  "dcat": "http://www.w3.org/ns/dcat#",
  "dct": "http://purl.org/dc/terms/",
  "dprod": "https://w3id.org/dprod/ns#",
  "czero": "https://w3id.org/czero#",
  "prov": "http://www.w3.org/ns/prov#",
  "did": "https://www.w3.org/ns/did#",
  "vc": "https://www.w3.org/2018/credentials#",
  "odrl": "http://www.w3.org/ns/odrl/2/",
  "schema": "https://schema.org/",
  "x402": "https://w3id.org/x402#",
  "erc8004": "https://eips.ethereum.org/EIPS/eip-8004#",
  "xapi": "https://w3id.org/xapi/ontology#",
  "mcp": "https://modelcontextprotocol.io/schema#"
}
```

### 5.2 Ontology Hierarchy

```
hypr:Resource
├── dcat:Catalog
│   └── hydra:ApiDocumentation
├── dcat:Dataset
│   └── dprod:DataProduct
├── hydra:Collection
├── czero:VirtualGraph
├── schema:Product
├── schema:Service
└── xapi:LRS
```

### 5.3 Property Domains

| Property | Domain | Range | Description |
|----------|--------|-------|-------------|
| `hydra:operation` | Any Resource | `hydra:Operation[]` | Available actions |
| `hydra:member` | `hydra:Collection` | `JsonLdNode[]` | Collection items |
| `dcat:distribution` | `dcat:Dataset` | `dcat:Distribution[]` | Data access points |
| `dprod:inputPort` | `dprod:DataProduct` | `dprod:Port[]` | Data ingestion points |
| `dprod:outputPort` | `dprod:DataProduct` | `dprod:Port[]` | Data serving points |
| `hypr:constraint` | `hydra:Operation` | `x402:Payment \| erc8004:Gate \| odrl:Policy` | Access control |
| `czero:federatedSource` | `czero:VirtualGraph` | `czero:SourceNode[]` | Federated endpoints |
| `prov:wasGeneratedBy` | Any | `prov:Activity` | Provenance link |

---

## 6. Resource Discovery

### 6.1 Entry Point Discovery

Agents MUST begin navigation at a known entry point (catalog URL). The entry point is discovered through one of:

1. **Well-Known URI:** `https://example.com/.well-known/hyprcat`
2. **HTTP Link Header:** `Link: <https://example.com/catalog>; rel="https://w3id.org/hyprcat#entrypoint"`
3. **Explicit Configuration:** Agent is configured with a starting URL

### 6.2 Well-Known Document

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "hypr:ServiceDescription",
  "hypr:entrypoint": "https://example.com/catalog",
  "hypr:version": "1.0",
  "hypr:capabilities": [
    "hypr:HATEOASNavigation",
    "hypr:x402Payments",
    "hypr:ERC8004TokenGating",
    "hypr:CZEROFederation",
    "hypr:PROVOProvenance"
  ]
}
```

### 6.3 Catalog Navigation

Once at a catalog, agents traverse the mesh by following `hydra:member` links:

```
Agent → GET catalog → discover members → GET member → discover operations → execute operation
```

**Navigation Rules:**
1. Agents MUST NOT hardcode resource URLs.
2. Agents MUST discover operations from the `hydra:operation` array on each resource.
3. Agents SHOULD follow `hydra:view` pagination links to enumerate large collections.
4. Agents MUST respect `Cache-Control` headers on resource responses.

### 6.4 Search and Filtering

Catalogs MAY support search through Hydra's `IriTemplate`:

```json
{
  "@type": "hydra:IriTemplate",
  "hydra:template": "https://example.com/catalog{?q,type,domain}",
  "hydra:variableRepresentation": "hydra:BasicRepresentation",
  "hydra:mapping": [
    { "hydra:variable": "q", "hydra:property": "schema:query" },
    { "hydra:variable": "type", "hydra:property": "@type" },
    { "hydra:variable": "domain", "hydra:property": "dprod:domainInfo" }
  ]
}
```

---

## 7. HATEOAS Affordances

### 7.1 Operation Structure

Every actionable resource advertises its affordances through `hydra:Operation`:

```json
{
  "@type": "hydra:Operation",
  "hydra:method": "POST",
  "hydra:title": "Execute SQL Query",
  "hydra:description": "Run a SQL statement against the data product.",
  "target": "https://example.com/query",
  "hydra:expects": {
    "@type": "schema:SearchAction",
    "hydra:supportedProperty": [
      {
        "hydra:property": "schema:query",
        "hydra:title": "SQL Statement",
        "hydra:description": "A valid SQL SELECT statement",
        "hydra:required": true,
        "hydra:writeable": true
      }
    ]
  },
  "hydra:returns": "czero:ResultSet",
  "hypr:constraint": { ... }
}
```

### 7.2 Supported Methods

| Method | Semantics | Idempotent |
|--------|-----------|------------|
| GET | Retrieve resource representation | Yes |
| POST | Create new resource or execute action | No |
| PUT | Replace resource representation | Yes |
| PATCH | Partially update resource | No |
| DELETE | Remove resource | Yes |

### 7.3 Input Specification (SHACL-lite)

Operation inputs are described using `hydra:supportedProperty`:

```json
{
  "hydra:supportedProperty": [
    {
      "hydra:property": "schema:name",
      "hydra:title": "Product Name",
      "hydra:required": true,
      "hydra:writeable": true,
      "sh:datatype": "xsd:string",
      "sh:minLength": 1,
      "sh:maxLength": 256
    },
    {
      "hydra:property": "schema:price",
      "hydra:title": "Price (SAT)",
      "hydra:required": true,
      "sh:datatype": "xsd:integer",
      "sh:minInclusive": 0
    }
  ]
}
```

### 7.4 IRI Templates (RFC 6570)

Operations MAY use IRI Templates for URL construction:

```json
{
  "@type": "hydra:IriTemplate",
  "hydra:template": "https://example.com/products/{productId}/reviews{?rating,limit}",
  "hydra:mapping": [
    { "hydra:variable": "productId", "hydra:property": "schema:identifier", "hydra:required": true },
    { "hydra:variable": "rating", "hydra:property": "schema:ratingValue", "hydra:required": false },
    { "hydra:variable": "limit", "hydra:property": "hydra:limit", "hydra:required": false }
  ]
}
```

### 7.5 Operation Execution

**Request:**
```http
POST /query HTTP/2
Host: example.com
Content-Type: application/ld+json
Accept: application/ld+json
Authorization: Bearer <DID-Auth-Token>
X-HyprCAT-Version: 1.0

{
  "@context": "https://w3id.org/hyprcat/v1",
  "schema:query": "SELECT user_id, total_spend FROM gold.user_analytics LIMIT 10"
}
```

**Response:**
```http
HTTP/2 200 OK
Content-Type: application/ld+json
X-Provenance-Id: urn:uuid:abc123
Link: <https://example.com/provenance/abc123>; rel="http://www.w3.org/ns/prov#has_provenance"

{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "czero:ResultSet",
  "czero:items": [ ... ],
  "prov:wasGeneratedBy": {
    "@id": "urn:uuid:abc123",
    "@type": "prov:Activity",
    "prov:startedAtTime": "2026-02-13T10:00:00Z"
  }
}
```

---

## 8. Governance Layer

### 8.1 Overview

The governance layer controls access to resources through three mechanisms that can be combined:

1. **x402 Payment:** Micropayments via HTTP 402 responses
2. **ERC-8004 Token Gate:** Blockchain-based access via token ownership
3. **ODRL Policy:** Rights management via policy enforcement

### 8.2 x402 Payment Protocol

When a resource requires payment, the server responds with HTTP 402:

**Flow:**
```
Agent → GET /resource → 402 Payment Required (with payment details)
Agent → signs Lightning invoice → POST /resource (with payment proof)
Server → verifies payment → 200 OK (with resource)
```

**402 Response:**
```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "x402:PaymentRequired",
  "x402:amount": 100,
  "x402:currency": "SAT",
  "x402:recipient": "lnbc:merchant@example.com",
  "x402:network": "lightning",
  "x402:invoice": "lnbc100n1...",
  "x402:expiresAt": "2026-02-13T10:05:00Z",
  "x402:description": "Access to Premium Analytics Dataset"
}
```

**Payment Proof Header:**
```http
X-Payment-Proof: <base64-encoded-preimage>
X-Payment-Invoice: lnbc100n1...
```

### 8.3 ERC-8004 Token Gating

Resources MAY require token ownership for access:

```json
{
  "@type": "erc8004:TokenGate",
  "erc8004:requiredToken": "0xMedicalResearchDAO",
  "erc8004:tokenStandard": "ERC-20",
  "erc8004:minBalance": 1,
  "erc8004:chainId": 1,
  "erc8004:verificationMethod": "erc8004:OnChainVerification"
}
```

**Verification Flow:**
```
Agent → GET /resource → 403 Forbidden (with token gate details)
Agent → signs EIP-712 message proving ownership → GET /resource (with signature)
Server → verifies on-chain balance → 200 OK
```

### 8.4 ODRL Policies

Complex access rules use ODRL:

```json
{
  "@type": "odrl:Policy",
  "odrl:permission": [
    {
      "odrl:target": "https://example.com/dataset/1",
      "odrl:action": "odrl:read",
      "odrl:constraint": {
        "odrl:leftOperand": "odrl:dateTime",
        "odrl:operator": "odrl:lt",
        "odrl:rightOperand": "2026-12-31T23:59:59Z"
      }
    }
  ],
  "odrl:prohibition": [
    {
      "odrl:target": "https://example.com/dataset/1",
      "odrl:action": "odrl:distribute"
    }
  ]
}
```

### 8.5 Constraint Composition

Multiple governance constraints can be combined:

```json
{
  "@type": "hydra:Operation",
  "hydra:title": "Access Premium Data",
  "hypr:constraint": {
    "@type": "hypr:CompositeConstraint",
    "hypr:operator": "AND",
    "hypr:constraints": [
      { "@type": "x402:PaymentRequired", "x402:amount": 50 },
      { "@type": "erc8004:TokenGate", "erc8004:minBalance": 1 }
    ]
  }
}
```

---

## 9. Identity & Authentication

### 9.1 Decentralized Identifiers (DIDs)

All agents and resources in the HyprCAT mesh are identified using W3C DIDs:

**Supported DID Methods:**
- `did:web` - Web-based resolution (RECOMMENDED for servers)
- `did:key` - Cryptographic key-based (RECOMMENDED for agents)
- `did:pkh` - Blockchain account-based (for token gating)

**Agent DID Document:**
```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "authentication": [
    {
      "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#keys-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
    }
  ],
  "service": [
    {
      "id": "#wallet",
      "type": "x402:WalletService",
      "serviceEndpoint": "https://agent.example/wallet"
    }
  ]
}
```

### 9.2 Authentication Flow

HyprCAT uses DID-Auth (challenge-response):

```
Agent → GET /resource → 401 Unauthorized (with challenge nonce)
Agent → signs nonce with DID key → GET /resource (with DID-Auth header)
Server → resolves DID document → verifies signature → 200 OK
```

**DID-Auth Header:**
```http
Authorization: DID-Auth did:key:z6Mk...;sig=<base64-signature>;nonce=<challenge>
```

### 9.3 Verifiable Credentials

Agents MAY present VCs to prove authorization:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/hyprcat/v1"
  ],
  "id": "urn:uuid:credential-1",
  "type": ["VerifiableCredential", "HyprCATAccessCredential"],
  "issuer": "did:web:marketplace.example",
  "issuanceDate": "2026-02-13T00:00:00Z",
  "expirationDate": "2027-02-13T00:00:00Z",
  "credentialSubject": {
    "id": "did:key:z6Mk...",
    "hypr:accessLevel": "premium",
    "hypr:allowedDomains": ["retail", "analytics"]
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-13T00:00:00Z",
    "verificationMethod": "did:web:marketplace.example#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "..."
  }
}
```

---

## 10. Federation (C-ZERO)

### 10.1 Zero-Copy Principle

C-ZERO (Conceptual Zero-Copy) enables agents to query across heterogeneous data sources without data movement. Virtual graphs describe federated topologies:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@id": "https://example.com/virtual/sales",
  "@type": ["dprod:DataProduct", "czero:VirtualGraph"],
  "dct:title": "Federated Sales Analytics",
  "czero:queryInterface": "GraphQL-Federation",
  "czero:ontologySchema": "https://example.com/schemas/sales.graphql",
  "czero:federatedSource": [
    {
      "@id": "https://crm.example/api",
      "@type": "czero:SourceNode",
      "czero:endpoint": "https://crm.example/graphql",
      "czero:mappingType": "GraphQL-Mesh",
      "czero:latency": "120ms"
    },
    {
      "@id": "https://warehouse.example/sql",
      "@type": "czero:SourceNode",
      "czero:endpoint": "jdbc:postgresql://warehouse.example/analytics",
      "czero:mappingType": "R2RML",
      "czero:latency": "450ms"
    }
  ]
}
```

### 10.2 Query Execution

Federated queries are submitted to the virtual graph's query interface:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "czero:QueryAction",
  "schema:query": "SELECT customer_id, revenue FROM sales WHERE region = 'EMEA'"
}
```

### 10.3 Result Set

Federated results include per-item provenance:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "czero:ResultSet",
  "czero:items": [
    {
      "customer_id": 101,
      "revenue": 54000,
      "czero:provenance": {
        "sourceNode": "https://warehouse.example/sql",
        "executionTime": "320ms"
      }
    }
  ],
  "czero:totalExecutionTime": "450ms",
  "czero:sourcesQueried": 2,
  "prov:wasGeneratedBy": { "@id": "urn:uuid:query-001" }
}
```

---

## 11. Agent Execution Model

### 11.1 O.N.A. Loop

The HyprAgent operates in a continuous Observe-Negotiate-Attest cycle:

```
┌─────────────────────────────────────────┐
│                O.N.A. Loop               │
│                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐
│  │ OBSERVE  │───▶│ NEGOTIATE │───▶│  ATTEST  │
│  │          │    │           │    │          │
│  │ Discover │    │ Evaluate  │    │ Record   │
│  │ resources│    │ constraints│   │ provenance│
│  │ Parse    │    │ Satisfy   │    │ Verify   │
│  │ affordances│  │ payments  │    │ results  │
│  └──────────┘    └───────────┘    └──────┬───┘
│       ▲                                  │
│       └──────────────────────────────────┘
└─────────────────────────────────────────┘
```

### 11.2 Observe Phase

1. **Fetch Resource:** HTTP GET on current URL
2. **Parse JSON-LD:** Extract types, properties, affordances
3. **Discover Operations:** Enumerate `hydra:operation` array
4. **Identify Constraints:** Check for `hypr:constraint` on operations
5. **Classify Resource:** Map to strategy based on `@type`

### 11.3 Negotiate Phase

1. **Evaluate Constraints:** Check wallet balance, token holdings, credentials
2. **Satisfy Payments:** Sign Lightning invoices for x402 constraints
3. **Present Tokens:** Submit EIP-712 proofs for ERC-8004 gates
4. **Submit Credentials:** Present VCs for ODRL policy evaluation
5. **Execute Operation:** Submit HTTP request with appropriate headers

### 11.4 Attest Phase

1. **Record Entity:** Snapshot the result as `prov:Entity`
2. **Record Activity:** Log the operation as `prov:Activity`
3. **Link Provenance:** Connect activity to input entity via `prov:used`
4. **Verify Result:** Check response type matches `hydra:returns`
5. **Update Strategy:** Adjust decision parameters based on outcome

### 11.5 Strategy System

Agents select strategies based on resource types:

```json
{
  "@type": "hypr:AgentStrategy",
  "hypr:name": "RETAIL_INSPECTION",
  "hypr:triggerTypes": ["schema:Store", "schema:Product"],
  "hypr:actions": [
    {
      "hypr:condition": "schema:inventoryLevel > 0 AND x402:amount <= wallet.balance",
      "hypr:action": "schema:BuyAction",
      "hypr:priority": 1
    }
  ]
}
```

### 11.6 MCP Integration

Agents MAY receive instructions via MCP Prompts:

```json
{
  "@type": "mcp:Prompt",
  "schema:name": "Retail Arbitrage Agent",
  "mcp:instruction": "Browse hardware catalogs. Purchase NVIDIA GPUs when price < 4000 SAT.",
  "mcp:arguments": [
    {
      "name": "maxPrice",
      "description": "Maximum price in SAT",
      "required": false
    }
  ]
}
```

---

## 12. Provenance

### 12.1 PROV-O Model

Every operation execution produces a provenance record:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "prov:Activity",
  "@id": "urn:uuid:activity-001",
  "prov:startedAtTime": "2026-02-13T10:00:00Z",
  "prov:endedAtTime": "2026-02-13T10:00:01Z",
  "prov:wasAssociatedWith": "did:key:z6Mk...",
  "prov:used": { "@id": "urn:uuid:entity-input" },
  "prov:generated": { "@id": "urn:uuid:entity-output" },
  "hypr:operationType": "schema:BuyAction",
  "hypr:targetResource": "https://retail.market.io/products/h100-nv",
  "hypr:payload": { "schema:price": 3500 },
  "hypr:strategy": "RETAIL_INSPECTION"
}
```

### 12.2 Provenance Chain

Activities link to form an auditable chain:

```
Entity(catalog) ← Activity(navigate) → Entity(product)
                                         ← Activity(purchase) → Entity(order)
                                                                  ← Activity(verify) → Entity(receipt)
```

### 12.3 Provenance Verification

Provenance records MAY be signed for non-repudiation:

```json
{
  "@type": "prov:Activity",
  "@id": "urn:uuid:activity-001",
  "prov:startedAtTime": "2026-02-13T10:00:00Z",
  "hypr:proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-13T10:00:01Z",
    "verificationMethod": "did:key:z6Mk...#keys-1",
    "proofValue": "..."
  }
}
```

---

## 13. Payment Protocols

### 13.1 x402 (HTTP Native Payments)

The x402 protocol extends HTTP with payment semantics:

**Payment Flow:**

| Step | Agent | Server |
|------|-------|--------|
| 1 | `GET /resource` | Returns `402` with invoice |
| 2 | Signs invoice | - |
| 3 | `GET /resource` + payment proof | Verifies payment |
| 4 | - | Returns `200` with resource |

**Supported Networks:**
- Lightning Network (Bitcoin L2)
- Base (Ethereum L2)

### 13.2 Subscription Model

Resources MAY offer subscription-based access:

```json
{
  "@type": "x402:Subscription",
  "x402:amount": 1000,
  "x402:currency": "SAT",
  "x402:interval": "P30D",
  "x402:autoRenew": true,
  "x402:cancelURL": "https://example.com/subscriptions/cancel"
}
```

### 13.3 Wallet Interface

Agents MUST implement the HyprCAT Wallet interface:

```typescript
interface HyprWallet {
  // Identity
  getDID(): string;
  getBalance(currency: string): Promise<number>;

  // Payments
  signInvoice(invoice: string): Promise<string>;
  verifyPayment(proof: string): Promise<boolean>;

  // Tokens
  getTokenBalance(contract: string, chainId: number): Promise<number>;
  signEIP712(message: object): Promise<string>;

  // Credentials
  presentCredential(type: string): Promise<VerifiableCredential>;
}
```

---

## 14. Transport & Security

### 14.1 Protocol Requirements

- All communication MUST use HTTPS (TLS 1.3 minimum)
- Servers MUST support HTTP/2
- Servers MUST support `application/ld+json` content type
- Servers SHOULD support `application/json` as fallback
- Servers MUST set appropriate CORS headers for browser agents

### 14.2 Content Negotiation

```http
Accept: application/ld+json;profile="https://w3id.org/hyprcat/v1", application/json;q=0.9
```

### 14.3 Rate Limiting

Servers SHOULD implement rate limiting with standard headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1707811200
Retry-After: 60
```

### 14.4 Caching

Resources SHOULD include cache control headers:

```http
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Thu, 13 Feb 2026 10:00:00 GMT
```

### 14.5 Error Responses

Error responses MUST be JSON-LD:

```json
{
  "@context": "https://w3id.org/hyprcat/v1",
  "@type": "hypr:Error",
  "hypr:statusCode": 404,
  "hypr:title": "Resource Not Found",
  "hypr:detail": "The requested resource does not exist at this IRI.",
  "hypr:instance": "https://example.com/resource/missing"
}
```

---

## 15. Conformance

### 15.1 Conformance Levels

**Level 1 - Basic:**
- Serve valid JSON-LD with HyprCAT context
- Include `@id` and `@type` on all resources
- Support `hydra:Collection` for listings
- Return proper HTTP status codes

**Level 2 - Interactive:**
- Level 1 requirements
- Include `hydra:Operation` affordances
- Support `hydra:expects` input descriptions
- Implement x402 payment protocol

**Level 3 - Autonomous:**
- Level 2 requirements
- Support DID-Auth authentication
- Implement PROV-O provenance recording
- Support C-ZERO federation
- Implement the full O.N.A. agent loop

### 15.2 Compliance Testing

Implementations can verify conformance using the HyprCAT Compliance Test Suite:

```bash
npx @hyprcat/compliance-test https://your-server.example
```

---

## Appendix A: JSON-LD Context

The canonical HyprCAT context is available at:

```
https://w3id.org/hyprcat/v1
```

Full context document:

```json
{
  "@context": {
    "@version": 1.1,
    "hypr": "https://w3id.org/hyprcat#",
    "hydra": "http://www.w3.org/ns/hydra/core#",
    "dcat": "http://www.w3.org/ns/dcat#",
    "dct": "http://purl.org/dc/terms/",
    "dprod": "https://w3id.org/dprod/ns#",
    "czero": "https://w3id.org/czero#",
    "prov": "http://www.w3.org/ns/prov#",
    "did": "https://www.w3.org/ns/did#",
    "vc": "https://www.w3.org/2018/credentials#",
    "odrl": "http://www.w3.org/ns/odrl/2/",
    "schema": "https://schema.org/",
    "x402": "https://w3id.org/x402#",
    "erc8004": "https://eips.ethereum.org/EIPS/eip-8004#",
    "xapi": "https://w3id.org/xapi/ontology#",
    "mcp": "https://modelcontextprotocol.io/schema#",
    "sh": "http://www.w3.org/ns/shacl#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "target": "schema:target",
    "title": "dct:title",
    "description": "dct:description"
  }
}
```

---

## Appendix B: Error Codes

| HTTP Status | HyprCAT Error Type | Description |
|-------------|-------------------|-------------|
| 400 | `hypr:InvalidRequest` | Malformed JSON-LD or missing required properties |
| 401 | `hypr:AuthenticationRequired` | DID-Auth required |
| 402 | `x402:PaymentRequired` | Payment required for access |
| 403 | `hypr:AccessDenied` | Insufficient tokens or policy violation |
| 404 | `hypr:NotFound` | Resource not found at IRI |
| 405 | `hypr:MethodNotAllowed` | HTTP method not in hydra:operation |
| 409 | `hypr:Conflict` | State conflict (e.g., already purchased) |
| 422 | `hypr:ValidationError` | Input fails SHACL validation |
| 429 | `hypr:RateLimited` | Rate limit exceeded |
| 500 | `hypr:InternalError` | Server error |
| 502 | `czero:FederationError` | Federated source unavailable |
| 503 | `hypr:ServiceUnavailable` | Server temporarily unavailable |

---

## Appendix C: Media Types

| Media Type | Usage |
|-----------|-------|
| `application/ld+json` | Primary content type for all HyprCAT resources |
| `application/ld+json;profile="https://w3id.org/hyprcat/v1"` | HyprCAT-specific profile |
| `application/json` | Fallback without JSON-LD processing |
| `text/turtle` | Alternative RDF serialization |
| `application/n-quads` | Provenance export format |

---

*End of HyprCAT Protocol Specification v1.0*
