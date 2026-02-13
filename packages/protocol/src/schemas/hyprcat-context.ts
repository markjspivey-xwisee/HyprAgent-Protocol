/**
 * Canonical HyprCAT JSON-LD Context.
 * This is the official context document for the HyprCAT Protocol v1.0.
 */

/** The canonical context URI */
export const HYPRCAT_CONTEXT_URI = "https://w3id.org/hyprcat/v1";

/** Full JSON-LD context object */
export const HYPRCAT_CONTEXT = {
  "@context": {
    "@version": 1.1,

    // HyprCAT namespace
    hypr: "https://w3id.org/hyprcat#",

    // W3C Standards
    hydra: "http://www.w3.org/ns/hydra/core#",
    dcat: "http://www.w3.org/ns/dcat#",
    dct: "http://purl.org/dc/terms/",
    prov: "http://www.w3.org/ns/prov#",
    did: "https://www.w3.org/ns/did#",
    vc: "https://www.w3.org/2018/credentials#",
    odrl: "http://www.w3.org/ns/odrl/2/",
    sh: "http://www.w3.org/ns/shacl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",

    // Schema.org
    schema: "https://schema.org/",

    // Domain-specific
    dprod: "https://w3id.org/dprod/ns#",
    czero: "https://w3id.org/czero#",
    mcp: "https://modelcontextprotocol.io/schema#",
    x402: "https://w3id.org/x402#",
    erc8004: "https://eips.ethereum.org/EIPS/eip-8004#",
    xapi: "https://w3id.org/xapi/ontology#",

    // Convenience aliases
    target: "schema:target",
    title: "dct:title",
    description: "dct:description",
  },
} as const;

/** Inline context object (without the @context wrapper) */
export const HYPRCAT_INLINE_CONTEXT = HYPRCAT_CONTEXT["@context"];

/** All namespace prefixes */
export const NAMESPACES = {
  hypr: "https://w3id.org/hyprcat#",
  hydra: "http://www.w3.org/ns/hydra/core#",
  dcat: "http://www.w3.org/ns/dcat#",
  dct: "http://purl.org/dc/terms/",
  dprod: "https://w3id.org/dprod/ns#",
  czero: "https://w3id.org/czero#",
  prov: "http://www.w3.org/ns/prov#",
  did: "https://www.w3.org/ns/did#",
  vc: "https://www.w3.org/2018/credentials#",
  odrl: "http://www.w3.org/ns/odrl/2/",
  schema: "https://schema.org/",
  x402: "https://w3id.org/x402#",
  erc8004: "https://eips.ethereum.org/EIPS/eip-8004#",
  xapi: "https://w3id.org/xapi/ontology#",
  mcp: "https://modelcontextprotocol.io/schema#",
  sh: "http://www.w3.org/ns/shacl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
} as const;

/** Expand a prefixed name (e.g. "hydra:Collection") to full IRI */
export function expandIRI(prefixed: string): string {
  const colonIndex = prefixed.indexOf(":");
  if (colonIndex === -1) return prefixed;

  const prefix = prefixed.substring(0, colonIndex);
  const localName = prefixed.substring(colonIndex + 1);

  if (prefix in NAMESPACES) {
    return NAMESPACES[prefix as keyof typeof NAMESPACES] + localName;
  }

  return prefixed;
}

/** Compact a full IRI to prefixed form */
export function compactIRI(iri: string): string {
  for (const [prefix, namespace] of Object.entries(NAMESPACES)) {
    if (iri.startsWith(namespace)) {
      return `${prefix}:${iri.substring(namespace.length)}`;
    }
  }
  return iri;
}
