/**
 * MCP (Model Context Protocol) types for LLM agent coordination.
 * Enables autonomous agents to receive instructions and coordinate with LLMs.
 */

import type { JsonLdNode, IRI } from "./core.js";

/** MCP Prompt - a system prompt for agent instruction */
export interface McpPrompt extends JsonLdNode {
  "@type": "mcp:Prompt";
  "schema:name": string;
  "schema:description": string;
  "mcp:instruction": string;
  "mcp:arguments"?: McpArgument[];
  "mcp:version"?: string;
  "mcp:category"?: string;
}

/** MCP Argument - a parameter for a prompt */
export interface McpArgument {
  name: string;
  description: string;
  required: boolean;
  type?: "string" | "number" | "boolean" | "object";
  default?: unknown;
  enum?: unknown[];
}

/** MCP Prompt Collection - a set of available prompts */
export interface McpPromptCollection extends JsonLdNode {
  "@type": ["hydra:Collection", "mcp:PromptCollection"];
  "hydra:member": McpPrompt[];
  "hydra:totalItems"?: number;
}

/** MCP Tool - a capability that an agent can use */
export interface McpTool extends JsonLdNode {
  "@type": "mcp:Tool";
  "schema:name": string;
  "schema:description": string;
  "mcp:inputSchema": McpToolSchema;
  "mcp:endpoint"?: IRI;
}

/** MCP Tool Schema - JSON Schema for tool inputs */
export interface McpToolSchema {
  type: "object";
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: unknown[];
    default?: unknown;
  }>;
  required?: string[];
}

/** MCP Resource - a context resource for LLM consumption */
export interface McpResource extends JsonLdNode {
  "@type": "mcp:Resource";
  "schema:name": string;
  "mcp:uri": string;
  "mcp:mimeType"?: string;
  "mcp:description"?: string;
}

/** xAPI Statement - learning record for telemetry */
export interface XapiStatement {
  id?: string;
  actor: {
    mbox?: string;
    name?: string;
    account?: { homePage: string; name: string };
  };
  verb: {
    id: IRI;
    display: Record<string, string>;
  };
  object: {
    id: IRI;
    definition?: {
      name?: Record<string, string>;
      description?: Record<string, string>;
      type?: IRI;
    };
  };
  result?: {
    score?: { scaled?: number; raw?: number; min?: number; max?: number };
    success?: boolean;
    completion?: boolean;
    duration?: string;
  };
  timestamp?: string;
  stored?: string;
}

/** xAPI LRS Node - Learning Record Store */
export interface XapiLRS extends JsonLdNode {
  "@type": ["dprod:DataProduct", "xapi:LRS"];
  "dct:title": string;
  "dct:description": string;
  "dprod:outputPort"?: Array<{
    "@type": "dprod:Port";
    "dct:title": string;
    "dcat:accessURL": string;
  }>;
}
