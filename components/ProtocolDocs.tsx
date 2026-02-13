import React from 'react';
import { Network, Layers, Terminal, ShieldCheck, Zap, Database, ArrowRight, Bot, Cpu, GitCommit, Search, Code2, Globe, Box, Server, Cloud, Wallet, Link } from 'lucide-react';

export const ProtocolDocs: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="h-full bg-gray-900 overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto p-12">
        
        {/* Header */}
        <div className="mb-12 border-b border-gray-800 pb-8 flex flex-col md:flex-row gap-8 items-start justify-between">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-accent-900/20 border border-accent-500/30 rounded-lg text-accent-500">
                        <Network size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">HyprCAT Protocol</h1>
                        <p className="text-accent-400 font-mono text-sm mt-1">v0.1.0-alpha // Hypermedia Context & Action Transfer</p>
                    </div>
                </div>
                <p className="text-xl text-gray-400 leading-relaxed max-w-2xl">
                    The <strong>HyprCAT Protocol</strong> defines the "Physics" of the Data Mesh—how resources are structured, discovered, and gated. 
                    The <strong>HyprAgent</strong> is the "Player"—the autonomous actor that navigates this mesh.
                </p>
            </div>
            
            {/* Quick Definition Card */}
            <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl max-w-sm">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Architecture Topology</div>
                <div className="flex items-center gap-4 text-sm font-mono">
                    <div className="text-pink-400 font-bold">HyprAgent<br/><span className="text-[10px] text-gray-500 font-normal opacity-70">(Consumer)</span></div>
                    <div className="flex-1 h-px bg-gray-600 relative">
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] bg-gray-900 px-1 text-gray-400">JSON-LD</div>
                    </div>
                    <div className="text-accent-400 font-bold">HyprCAT<br/><span className="text-[10px] text-gray-500 font-normal opacity-70">(Provider)</span></div>
                </div>
            </div>
        </div>

        {/* Navigation / TOC */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-16">
            <DocCard icon={<Code2 />} title="0. Ontology" desc="Upper Context" highlight />
            <DocCard icon={<Layers />} title="1. Structure" desc="DCAT & DPROD" />
            <DocCard icon={<Terminal />} title="2. Affordance" desc="Hydra Ops" />
            <DocCard icon={<ShieldCheck />} title="3. Governance" desc="x402 & 8004" />
            <DocCard icon={<Globe />} title="4. Federation" desc="C-ZERO" />
            <DocCard icon={<Bot />} title="5. The Agent" desc="Spec" highlight />
            <DocCard icon={<Box />} title="6. Deploy" desc="Infra" />
            <DocCard icon={<Link />} title="7. Ecosystem" desc="AgentKit & MCP" highlight />
        </div>

        {/* CONTENT */}
        <div className="space-y-20 text-gray-300">

            {/* SECTION 0: UPPER ONTOLOGY */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">00.</span> The HyprCAT Upper Ontology
                </h2>
                <p className="mb-6">
                    HyprCAT does not reinvent the wheel. It acts as a <strong>Meta-Ontology</strong> that binds together existing W3C Semantic Web standards into a unified context for autonomous agents.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <ContextCard 
                        prefix="hydra" 
                        url="http://www.w3.org/ns/hydra/core#" 
                        desc="Hypermedia Controls. Defines 'Operations', 'Expects' (Inputs), and 'Returns' (Outputs)."
                    />
                    <ContextCard 
                        prefix="prov" 
                        url="http://www.w3.org/ns/prov#" 
                        desc="Provenance. Defines 'Entities', 'Activities', and 'Agents' to track history and attribution."
                    />
                    <ContextCard 
                        prefix="did" 
                        url="https://www.w3.org/ns/did#" 
                        desc="Decentralized Identity. Provides cryptographically verifiable identifiers for Agents and Nodes."
                    />
                    <ContextCard 
                        prefix="vc" 
                        url="https://www.w3.org/2018/credentials#" 
                        desc="Verifiable Credentials. Used for asserting claims (e.g., 'Is Accredited Researcher')."
                    />
                    <ContextCard 
                        prefix="dcat" 
                        url="http://www.w3.org/ns/dcat#" 
                        desc="Data Catalog. Structure for Datasets, Distributions, and Data Services."
                    />
                     <ContextCard 
                        prefix="odrl" 
                        url="http://www.w3.org/ns/odrl/2/" 
                        desc="Rights & Licensing. Digital 'Tickets' and 'Policies' for access control."
                    />
                </div>
            </section>

            {/* SECTION 1 */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">01.</span> Resource Discovery
                </h2>
                <p className="mb-4">
                    Nodes in the network <strong>MUST</strong> be represented as valid JSON-LD. 
                    The structural backbone relies on <code className="text-pink-400">dcat:Dataset</code> for static data and <code className="text-pink-400">dprod:DataProduct</code> for live streams/services.
                </p>
                <CodeBlock label="Node Definition Example">
{`{
  "@context": { ... },
  "@id": "https://node.example/weather/live",
  "@type": "dprod:DataProduct",
  "dct:title": "Live Weather Stream",
  "dprod:domainInfo": "Meteorology",
  "dprod:outputPort": [
    {
      "@type": "dprod:Port",
      "dcat:accessURL": "wss://stream.weather.io/v1"
    }
  ]
}`}
                </CodeBlock>
            </section>

            {/* SECTION 2 */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">02.</span> HATEOAS & Affordances
                </h2>
                <p className="mb-4">
                    Agents do not hardcode API endpoints. They discover <strong>Affordances</strong> dynamically. 
                    HyprCAT uses <code className="text-pink-400">hydra:Operation</code> to describe state transitions.
                </p>
                <CodeBlock label="Action Definition Example">
{`"hydra:operation": [
  {
    "@type": ["hydra:Operation", "schema:BuyAction"],
    "hydra:method": "POST",
    "hydra:title": "Purchase Dataset",
    "target": "https://api.example.com/checkout",
    "hydra:expects": {
        "@id": "schema:Order",
        "hydra:supportedProperty": [
            { "hydra:property": "schema:sku", "hydra:required": true }
        ]
    }
  }
]`}
                </CodeBlock>
            </section>

            {/* SECTION 3 */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">03.</span> Programmable Governance
                </h2>
                <p className="mb-6">
                    Unlike standard APIs, HyprCAT nodes self-describe their access requirements. Agents must satisfy these constraints 
                    <em>before</em> accessing the underlying resource.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500" /> x402 (Lightning Payments)
                        </h3>
                        <p className="text-sm mb-4">
                            Resources requiring micropayments use the <code className="text-pink-400">x402:PaymentRequired</code> type. 
                            The agent must locate the associated <code className="text-pink-400">hydra:Operation</code> to exchange a payment preimage for an Access Ticket.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <ShieldCheck size={18} className="text-purple-500" /> ERC-8004 (Token Gating)
                        </h3>
                        <p className="text-sm mb-4">
                             Resources restricted to DAO members or NFT holders use <code className="text-pink-400">erc8004:SmartAccessRequired</code>.
                             The Agent resolves the <code className="text-pink-400">erc8004:gateway</code> to verify wallet holdings on-chain.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION 4: FEDERATION */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">04.</span> Zero-Copy Federation (C-ZERO)
                </h2>
                <p className="mb-4">
                    <strong>Concept:</strong> Move the query, not the data. 
                </p>
                <p className="mb-4">
                    In a HyprCAT mesh, a <code className="text-pink-400">czero:VirtualGraph</code> node does not contain data itself. 
                    It acts as a semantic router, containing a map of <code className="text-pink-400">czero:federatedSource</code> nodes. 
                    Agents utilize specific <code className="text-pink-400">czero:QueryAction</code> operations to push compute to these edges.
                </p>
                <CodeBlock label="Virtual Graph Example">
{`{
  "@type": "czero:VirtualGraph",
  "czero:federatedSource": [
      { "czero:endpoint": "https://node-a.com/graphql", "czero:latency": "20ms" },
      { "czero:endpoint": "https://node-b.com/sparql", "czero:latency": "150ms" }
  ],
  "hydra:operation": [
      {
          "@type": "czero:QueryAction",
          "hydra:expects": "schema:Query"
      }
  ]
}`}
                </CodeBlock>
            </section>
            
            {/* SECTION 5: THE HYPRAGENT SPEC */}
            <section className="bg-gray-950/50 border border-gray-800 rounded-2xl p-8 relative overflow-hidden mt-12">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Bot size={200} />
                </div>

                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                    <span className="text-pink-500">05.</span> The HyprAgent Standard
                </h2>
                
                <p className="mb-8 max-w-3xl relative z-10">
                    To interact with the HyprCAT mesh, a client must be more than a HTTP library. It must be a 
                    <strong> HyprAgent</strong>. A HyprAgent is defined by its ability to perform the 
                    <span className="text-pink-400 font-mono"> O.N.A. Loop</span> (Observe, Negotiate, Act) autonomously.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                        <div className="w-10 h-10 bg-blue-900/30 text-blue-400 rounded-lg flex items-center justify-center mb-4 border border-blue-900/50">
                            <Search size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">1. Observe (Parsing)</h3>
                        <p className="text-sm text-gray-400">
                            The Agent must parse <strong>JSON-LD</strong> graphs. It does not hardcode URLs. 
                            It looks for <code className="text-blue-300">hydra:Operation</code> nodes to understand what <em>can</em> be done.
                        </p>
                    </div>

                    <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                        <div className="w-10 h-10 bg-yellow-900/30 text-yellow-400 rounded-lg flex items-center justify-center mb-4 border border-yellow-900/50">
                            <Zap size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">2. Negotiate (Wallet)</h3>
                        <p className="text-sm text-gray-400">
                            The Agent must hold a <strong>Wallet State</strong>. When it encounters <code className="text-yellow-300">x402</code> or <code className="text-purple-300">erc8004</code> constraints, it must autonomously sign, pay, or prove ownership to acquire access tickets.
                        </p>
                    </div>

                    <div className="bg-gray-900/80 p-6 rounded-xl border border-gray-800">
                        <div className="w-10 h-10 bg-green-900/30 text-green-400 rounded-lg flex items-center justify-center mb-4 border border-green-900/50">
                            <GitCommit size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">3. Attest (Provenance)</h3>
                        <p className="text-sm text-gray-400">
                            Every state change must be logged. The Agent must generate a <strong>PROV-O</strong> trace, creating a verifiable history of <code className="text-green-300">prov:Activity</code> linked to the <code className="text-green-300">prov:Entity</code> it modified.
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-800 relative z-10">
                     <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Reference Implementation (TypeScript Interface)</h4>
                     <CodeBlock label="IHyprAgent.ts">
{`interface IHyprAgent {
  // The Identity (DID)
  id: string; 
  
  // The Inventory (Keys & Tokens)
  wallet: {
     sign(payload: string): Promise<string>;
     payLightning(invoice: string): Promise<Preimage>;
     getTokens(chainId: number): TokenBalance[];
  };

  // The Loop
  navigate(url: string): Promise<JsonLdNode>;
  decide(resource: JsonLdNode, goal: string): HydraOperation | null;
  execute(operation: HydraOperation, inputs: any): Promise<ProvActivity>;
}`}
                     </CodeBlock>
                </div>
            </section>

            {/* SECTION 6: INFRASTRUCTURE & DEPLOYMENT */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">06.</span> Infrastructure & Deployment
                </h2>
                <p className="mb-8">
                    HyprCAT is designed for <strong>Containerized Deployment</strong>. You do not re-engineer your backend; you simply deploy a "Sidecar" to make it Hypr-compliant. 
                    Agents are deployed as autonomous "Swarms" using standard orchestration (K8s).
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* LEFT: PROVIDER SIDE */}
                    <div className="border border-gray-700 bg-gray-900/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4 text-accent-400">
                            <Server size={24} />
                            <h3 className="text-lg font-bold text-white">1. The Node (Sidecar Pattern)</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 h-12">
                            Deploy a lightweight reverse-proxy alongside your legacy API (SQL, REST, GraphQL). This sidecar maps internal data to JSON-LD on the fly.
                        </p>
                        <CodeBlock label="docker-compose.yml (Provider)">
{`services:
  # Your existing Legacy Backend
  legacy-api:
    image: my-company/rest-api:v2
    ports: ["8080:80"]

  # The HyprCAT Sidecar
  hypr-gateway:
    image: hyprcat/gateway:latest
    environment:
      - UPSTREAM_URL=http://legacy-api:80
      - MAPPING_CONFIG=./mappings/dcat.yml
      - DID_KEY=did:web:data.market.example
    ports: ["80:8000"] # Exposes port 80 as JSON-LD`}
                        </CodeBlock>
                    </div>

                    {/* RIGHT: CONSUMER SIDE */}
                    <div className="border border-gray-700 bg-gray-900/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4 text-pink-400">
                            <Box size={24} />
                            <h3 className="text-lg font-bold text-white">2. The Agent Fleet (Swarm)</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 h-12">
                            Deploy fleets of stateless agents. Inject Identity (Wallet Keys) and Goals (Prompts) via environment variables.
                        </p>
                        <CodeBlock label="k8s-deployment.yaml (Consumer)">
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: analyst-swarm
spec:
  replicas: 5 # Fleet Size
  template:
    spec:
      containers:
      - name: hypr-agent
        image: hyprcat/agent-core:v1
        env:
        - name: WALLET_SEED
          valueFrom: { secretKeyRef: { name: agent-wallet } }
        - name: MISSION_PROMPT
          value: "Monitor 'Weather Stream' for anomalies."`}
                        </CodeBlock>
                    </div>
                </div>
            </section>

            {/* SECTION 7: ECOSYSTEM RECONCILIATION */}
            <section className="mt-20 pt-12 border-t border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="text-accent-500">07.</span> Reconciliation with the Ecosystem
                </h2>
                <p className="mb-8 max-w-3xl text-gray-400">
                    HyprCAT is not a competitor to agent-wallets or LLM protocols; it is the <strong>Semantic Road</strong> they drive on. 
                    Here is how HyprCAT layers on top of existing industry standards like <strong>Coinbase AgentKit</strong> and <strong>OpenAI MCP</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coinbase AgentKit */}
                    <div className="bg-gray-800/40 p-6 rounded-xl border border-blue-900/30">
                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                            <Wallet size={24} />
                            <h3 className="text-lg font-bold text-white">Coinbase AgentKit (The Wallet)</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 min-h-[60px]">
                            <strong>AgentKit</strong> provides the MPC wallets, on-chain hooks, and USDC/ETH management. It handles <em>"How do I sign this?"</em>.
                            <br/><br/>
                            <strong>HyprCAT</strong> provides the resource definition and price tags. It handles <em>"Who do I pay, and how much?"</em>. 
                        </p>
                        <div className="bg-black/30 p-3 rounded text-xs font-mono text-gray-300 border border-gray-700">
                            <span className="text-purple-400">AgentKit</span>.signTransaction(<br/>
                            &nbsp;&nbsp;to: <span className="text-accent-400">HyprCAT_Resource</span>['x402:recipient'],<br/>
                            &nbsp;&nbsp;amount: <span className="text-accent-400">HyprCAT_Resource</span>['x402:amount']<br/>
                            )
                        </div>
                    </div>

                    {/* Model Context Protocol */}
                    <div className="bg-gray-800/40 p-6 rounded-xl border border-green-900/30">
                        <div className="flex items-center gap-3 mb-4 text-green-400">
                            <Cpu size={24} />
                            <h3 className="text-lg font-bold text-white">Model Context Protocol (The Brain)</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 min-h-[60px]">
                            <strong>MCP</strong> connects LLMs to local tools and prompts. It handles <em>"What capabilities do I have locally?"</em>.
                            <br/><br/>
                            <strong>HyprCAT</strong> connects Agents to <em>remote</em> autonomous markets. It acts as the "Server Side" for MCP agents to browse.
                        </p>
                        <div className="bg-black/30 p-3 rounded text-xs font-mono text-gray-300 border border-gray-700">
                            <span className="text-green-400">MCP_Server</span>.listTools() returns:<br/>
                            [ "hypr_navigate", "hypr_negotiate" ]<br/>
                            <span className="text-gray-500">// The Agent uses MCP tools to browse HyprCAT</span>
                        </div>
                    </div>
                </div>
            </section>

        </div>

        {/* Footer */}
        <div className="mt-20 pt-10 border-t border-gray-800 text-center">
            <button 
                onClick={onClose}
                className="bg-accent-600 hover:bg-accent-500 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
            >
                Return to Agent Explorer <ArrowRight size={18} />
            </button>
        </div>

      </div>
    </div>
  );
};

const DocCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, highlight?: boolean }> = ({ icon, title, desc, highlight }) => (
    <div className={`
        border p-4 rounded-xl transition-colors group
        ${highlight 
            ? 'bg-pink-900/10 border-pink-500/50 hover:border-pink-400' 
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
        }
    `}>
        <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-colors
            ${highlight ? 'bg-pink-900/30 text-pink-400' : 'bg-gray-900 text-gray-400 group-hover:text-accent-400'}
        `}>
            {icon}
        </div>
        <h3 className={`text-base font-bold mb-1 ${highlight ? 'text-pink-400' : 'text-white'}`}>{title}</h3>
        <p className={`text-xs ${highlight ? 'text-pink-200/70' : 'text-gray-400'}`}>{desc}</p>
    </div>
);

const ContextCard: React.FC<{ prefix: string, url: string, desc: string }> = ({ prefix, url, desc }) => (
    <div className="bg-gray-800/30 border border-gray-700 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-accent-400 font-bold font-mono text-sm">{prefix}:</span>
            <span className="text-[10px] text-gray-500 font-mono truncate bg-black/30 px-1 py-0.5 rounded">{url}</span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
);

const CodeBlock: React.FC<{ label: string, children: string }> = ({ label, children }) => (
    <div className="mt-6 rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
        <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700 text-xs font-mono text-gray-400 flex items-center gap-2">
            <Database size={12} /> {label}
        </div>
        <pre className="p-4 text-xs md:text-sm font-mono text-gray-300 overflow-x-auto">
            {children}
        </pre>
    </div>
);