import { JsonLdNode, HydraOperation, McpPrompt } from '../types';

// This service mimics a decentralized Data Mesh / Marketplace.
// It uses HyprCAT to decorate DCAT and DPROD nodes with Hydra operations.

const DELAY_MS = 300;

// THE HYPRCAT UPPER ONTOLOGY CONTEXT
const commonContext = {
  "hypr": "https://w3id.org/hyprcat#", 
  "prov": "http://www.w3.org/ns/prov#",
  "did": "https://www.w3.org/ns/did#",
  "vc": "https://www.w3.org/2018/credentials#",
  "hydra": "http://www.w3.org/ns/hydra/core#",
  "dcat": "http://www.w3.org/ns/dcat#",
  "odrl": "http://www.w3.org/ns/odrl/2/",
  "schema": "https://schema.org/",
  "dct": "http://purl.org/dc/terms/",
  "dprod": "https://w3id.org/dprod/ns#",
  "czero": "https://w3id.org/czero#",
  "mcp": "https://modelcontextprotocol.io/schema#",
  "x402": "https://w3id.org/x402#",
  "erc8004": "https://eips.ethereum.org/EIPS/eip-8004#",
  "xapi": "https://w3id.org/xapi/ontology#",
  "target": "schema:target"
};

// Internal Server State
let subscriptions: Record<string, boolean> = {
  "premium-stream": false
};

let walletBalance = 5000; 
let walletTokens: Record<string, number> = {
  "0xMedicalResearchDAO": 0
};

export const serverActions = {
  getWalletBalance: () => ({ sats: walletBalance, tokens: walletTokens }),
  getSubscriptionStatus: (id: string) => subscriptions[id],
  resetSimulation: () => { 
    subscriptions["premium-stream"] = false;
    walletBalance = 5000; 
    walletTokens["0xMedicalResearchDAO"] = 0;
  }
};

export const executeHypermediaAction = async (url: string, method: string, body: any): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (method === 'DELETE') {
      if (url.includes('/governance/token')) {
          if (walletTokens["0xMedicalResearchDAO"] > 0) {
              walletTokens["0xMedicalResearchDAO"]--;
              walletBalance += 500;
              return { "@context": commonContext, "@type": "schema:ActionStatus", "schema:name": "Refund Successful", "schema:description": "Token burned. 500 SAT returned." };
          }
          throw new Error("No tokens to burn.");
      }
      return { "@type": "schema:ActionStatus", "schema:name": "Deleted" };
  }

  if (method === 'POST') {
     // Ecommerce Purchase Logic
     if (url.includes('/ecommerce/checkout')) {
        const cost = parseInt(body['schema:price'] || '100');
        if (walletBalance >= cost) {
            walletBalance -= cost;
            return {
                "@context": commonContext,
                "@type": "schema:Order",
                "schema:orderStatus": "schema:OrderProcessing",
                "schema:orderNumber": "RETAIL-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
                "schema:price": cost,
                "schema:description": "Autonomous purchase via HyprCAT Retail Mesh.",
                "prov:wasGeneratedBy": "did:web:retail.market.io"
            };
        }
        throw new Error("Insufficient funds for checkout.");
     }

     // Databricks / Big Data Query Logic
     if (url.includes('/databricks/query')) {
        return {
            "@context": commonContext,
            "@type": "czero:ResultSet",
            "czero:items": [
                { "user_id": 101, "total_spend": 540.20, "last_login": "2024-05-01" },
                { "user_id": 204, "total_spend": 1200.00, "last_login": "2024-04-28" }
            ],
            "prov:wasDerivedFrom": "https://databricks.example/unity-catalog/gold-layer/user_analytics"
        };
     }

     // Standard logic remains...
     if (url.includes('/governance/token')) {
        const cost = 500 * parseInt(body['schema:quantity'] || '1');
        if (walletBalance >= cost) {
            walletBalance -= cost;
            walletTokens["0xMedicalResearchDAO"] += parseInt(body['schema:quantity'] || '1');
            return { "@context": commonContext, "@type": "schema:Order", "schema:orderStatus": "schema:OrderDelivered", "schema:orderNumber": "0x" + Math.random().toString(16).substr(2, 40) };
        }
        throw new Error("Insufficient funds.");
     }
  }
};

// --- ECOMMERCE EXAMPLE ---
const getEcommerceNode = (): JsonLdNode => ({
  "@context": commonContext,
  "@id": "https://retail.market.io/api/v1",
  "@type": ["schema:Store", "hydra:Collection"],
  "dct:title": "Global Hardware Hub",
  "dct:description": "Autonomous retail node. Supports x402 instant settlement for high-demand inventory.",
  "hydra:member": [
    {
      "@id": "https://retail.market.io/products/h100-nv",
      "@type": "schema:Product",
      "schema:name": "NVIDIA H100 Tensor Core GPU",
      "schema:price": 3500,
      "schema:priceCurrency": "SAT",
      "schema:inventoryLevel": 12,
      "hydra:operation": [
        {
          "@type": ["hydra:Operation", "schema:BuyAction"],
          "hydra:method": "POST",
          "hydra:title": "Instant Purchase (3500 SAT)",
          "target": "https://retail.market.io/ecommerce/checkout",
          "hydra:expects": {
            "@type": "schema:Order",
            "hydra:supportedProperty": [
              { "hydra:property": "schema:price", "hydra:required": true }
            ]
          }
        }
      ]
    }
  ]
});

// --- DATABRICKS / UNITY CATALOG EXAMPLE ---
const getDatabricksNode = (): JsonLdNode => ({
  "@context": commonContext,
  "@id": "https://databricks.example/unity-catalog/sales-analytics",
  "@type": ["dprod:DataProduct", "czero:VirtualGraph"],
  "dct:title": "Databricks: Sales Analytics (Gold Layer)",
  "dct:description": "Unity Catalog curated dataset. High-performance SQL endpoint for autonomous analysis.",
  "dprod:domainInfo": "Business Intelligence",
  "czero:queryInterface": "Databricks-SQL-Warehouse",
  "hydra:operation": [
    {
      "@type": "czero:QueryAction",
      "hydra:method": "POST",
      "hydra:title": "Execute SQL Query",
      "target": "https://databricks.example/databricks/query",
      "hydra:expects": {
        "@type": "schema:SearchAction",
        "hydra:supportedProperty": [
          { "hydra:property": "schema:query", "hydra:required": true, "hydra:title": "SQL Statement" }
        ]
      }
    }
  ]
});

// --- xAPI LRS EXAMPLE ---
const getLrsNode = (): JsonLdNode => ({
  "@context": commonContext,
  "@id": "https://learning.io/lrs/telemetry",
  "@type": ["dprod:DataProduct", "xapi:LRS"],
  "dct:title": "Enterprise Learning Record Store",
  "dct:description": "Streaming xAPI telemetry. Real-time capture of employee skill acquisition events.",
  "dprod:outputPort": [
    {
      "@type": "dprod:Port",
      "dct:title": "xAPI Statement Stream",
      "dcat:accessURL": "wss://learning.io/xapi/live"
    }
  ],
  "hydra:operation": [
    {
      "@type": "schema:DownloadAction",
      "hydra:method": "GET",
      "hydra:title": "Export Activity Statements (JSON)",
      "target": "https://learning.io/lrs/export"
    }
  ]
});

export const demoPrompts: McpPrompt[] = [
    {
      "@id": "https://data.market.example/prompts/retail",
      "@type": "mcp:Prompt",
      "schema:name": "Retail Arbitrage Agent",
      "schema:description": "Locate high-demand hardware and purchase instantly.",
      "mcp:instruction": "Browse 'Hardware Hub'. If NVIDIA GPUs are in stock, execute a BuyAction using the wallet.",
    },
    {
      "@id": "https://data.market.example/prompts/engineer",
      "@type": "mcp:Prompt",
      "schema:name": "Data Engineer (Databricks)",
      "schema:description": "Run analytics on Unity Catalog Gold Tables.",
      "mcp:instruction": "Access 'Sales Analytics'. Execute a SQL query to extract user spend metrics.",
    },
    {
      "@id": "https://data.market.example/prompts/hr",
      "@type": "mcp:Prompt",
      "schema:name": "L&D Analyst (xAPI)",
      "schema:description": "Harvest learning telemetry from LRS.",
      "mcp:instruction": "Locate the LRS telemetry node. Download recent statements to analyze skill gaps.",
    },
    {
      "@id": "https://data.market.example/prompts/trader",
      "@type": "mcp:Prompt",
      "schema:name": "Quant Trader (Finance)",
      "schema:description": "Use AgentKit wallet to pay for streams.",
      "mcp:instruction": "Locate the 'NASDAQ' feed. If locked by x402, use AgentKit Wallet to sign the Lightning payment.",
    }
];

const getPrompts = (): JsonLdNode => ({
  "@context": commonContext,
  "@id": "https://data.market.example/prompts",
  "@type": ["hydra:Collection", "mcp:PromptCollection"],
  "hydra:title": "System Prompts",
  "hydra:totalItems": demoPrompts.length,
  "hydra:member": demoPrompts
});

const getDatabase = () => ({
  "https://data.market.example/": {
    "@context": commonContext,
    "@id": "did:web:data.market.example",
    "@type": ["dcat:Catalog", "hydra:ApiDocumentation"],
    "dct:title": "Global Data Marketplace",
    "dct:description": "A HyprCAT-compliant decentralized data exchange.",
    "hydra:entrypoint": "https://data.market.example/catalog",
    "mcp:prompts": { "@id": "https://data.market.example/prompts" }
  },
  "https://data.market.example/prompts": getPrompts(),
  "https://data.market.example/catalog": {
    "@context": commonContext,
    "@id": "https://data.market.example/catalog",
    "@type": "hydra:Collection",
    "hydra:title": "Cross-Vertical Catalog",
    "hydra:member": [
      { "@id": "https://retail.market.io/api/v1", "@type": "schema:Store", "dct:title": "Hardware Hub (Retail)" },
      { "@id": "https://databricks.example/unity-catalog/sales-analytics", "@type": "dprod:DataProduct", "dct:title": "Databricks: Sales Analytics" },
      { "@id": "https://learning.io/lrs/telemetry", "@type": "xapi:LRS", "dct:title": "Learning Record Store" }
    ]
  },
  "https://retail.market.io/api/v1": getEcommerceNode(),
  "https://databricks.example/unity-catalog/sales-analytics": getDatabricksNode(),
  "https://learning.io/lrs/telemetry": getLrsNode(),
  "https://pod.researcher.me/profile": {
    "@context": commonContext,
    "@id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "@type": "Person",
    "name": "Dr. Agent Smith",
    "x402:wallet": { "balance": walletBalance, "currency": "SAT", "provider": "Coinbase AgentKit (Mock)", "tokens": walletTokens }
  }
});

export const fetchHypermedia = async (url: string): Promise<JsonLdNode> => {
  await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  const db = getDatabase();
  return db[url as keyof typeof db] || (() => { throw new Error("404") })();
};

export const MOCK_URLS = Object.keys(getDatabase()).filter(k => k.startsWith('http'));