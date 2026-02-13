import React, { useState } from 'react';
import { JsonLdNode, HydraOperation, VerifiableCredential, LogEntry, ProvenanceItem, ProvActivity, McpPrompt } from '../types';
import { OperationCard } from './OperationCard';
import { AutoPilot } from './AutoPilot';
import { ProvenanceViewer } from './ProvenanceViewer';
import { Database, Share2, Layers, Terminal, ShieldCheck, Fingerprint, GitCommit, Network, GitGraph, FileText, Scroll, Wallet, Bitcoin, Hexagon, Play, Box, Zap, XCircle, Key, FileCheck, CheckCircle, Code, Copy } from 'lucide-react';
import { serverActions } from '../services/mockHypermedia';

interface AgentViewProps {
  data: JsonLdNode | null;
  isLoading: boolean;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  agentLogs: LogEntry[];
  onAddLog: (entry: LogEntry) => void;
  onClearLogs: () => void;
  isEngaged: boolean;
  onToggleEngagement: (engaged: boolean) => void;
  provenanceTrace: ProvenanceItem[];
  onRecordActivity: (label: string, details: ProvActivity['details']) => void;
  availablePrompts: McpPrompt[];
}

export const AgentView: React.FC<AgentViewProps> = ({ 
  data, 
  isLoading, 
  onNavigate, 
  onRefresh,
  agentLogs,
  onAddLog,
  onClearLogs,
  isEngaged,
  onToggleEngagement,
  provenanceTrace,
  onRecordActivity,
  availablePrompts
}) => {
  const [showProvenance, setShowProvenance] = useState(false);
  const [activePrompt, setActivePrompt] = useState<McpPrompt | null>(null);
  
  // Output Buffer State
  const [operationResult, setOperationResult] = useState<any | null>(null);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const operations = (data?.['hydra:operation'] as HydraOperation[]) || [];
  const members = (data?.['hydra:member'] as JsonLdNode[]) || [];
  const credentials = (data?.['verifiableCredential'] as VerifiableCredential[]) || [];
  const provenance = data?.['prov:wasGeneratedBy'];
  
  const type = data?.['@type'] ? (Array.isArray(data['@type']) ? data['@type'].join(', ') : data['@type']) : 'Unknown';
  const isDid = data?.['@id']?.startsWith('did:');

  const attachedContext = (data?.['rdfs:seeAlso'] as JsonLdNode[]) || [];
  
  const handlePromptSelect = (prompt: McpPrompt) => {
    setActivePrompt(prompt);
    if (!isEngaged) {
      onToggleEngagement(true);
    }
  };

  const handleOpResult = (result: any) => {
    setOperationResult(result);
    setShowRawOutput(false); // Default to clean view for new results
    // Automatically switch to Semantic View if we were in Provenance View, to show the result
    setShowProvenance(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { sats: walletBalance, tokens: walletTokens } = serverActions.getWalletBalance();
  const tokenCount = Object.values(walletTokens).reduce((a, b) => a + b, 0);

  // Helper to check if we have a rich view for this type
  const isKnownType = operationResult && ['czero:ResultSet', 'odrl:Ticket', 'schema:Order', 'schema:JoinAction'].includes(operationResult['@type']);

  // Extract nested affordances from the result
  const resultOperations = operationResult ? (operationResult['hydra:operation'] as HydraOperation[]) || [] : [];

  return (
    <div className="h-full bg-gray-900 text-gray-300 flex overflow-hidden">
      
      {/* LEFT PANEL: Semantic Structure OR Provenance Viewer */}
      <div className="w-2/3 border-r border-gray-800 flex flex-col relative">
        
        {/* Toggle Header */}
        <div className="h-10 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-4">
           <button 
             onClick={() => setShowProvenance(false)}
             className={`h-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors
               ${!showProvenance ? 'border-accent-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}
             `}
           >
             <Network size={14} /> HyprCAT Semantic View
           </button>
           <button 
             onClick={() => setShowProvenance(true)}
             className={`h-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors
               ${showProvenance ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}
             `}
           >
             <GitGraph size={14} /> Provenance Trace <span className="px-1.5 py-0.5 rounded-full bg-gray-800 text-[10px]">{provenanceTrace.length}</span>
           </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-hidden relative">
          
          {showProvenance ? (
             <ProvenanceViewer trace={provenanceTrace} />
          ) : (
            <div className="h-full overflow-y-auto p-6 scrollbar-thin">
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-20 bg-gray-900/90 backdrop-blur-[2px] flex flex-col items-center justify-center text-accent-500 font-mono">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-sm uppercase tracking-[0.2em] animate-pulse">Navigating Data Mesh</div>
                    <div className="w-64 h-1 bg-gray-900 rounded overflow-hidden">
                      <div className="h-full bg-accent-600 animate-progress"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* OPERATION RESULT BUFFER (Important for Zero-Copy Inspection) */}
              {operationResult && (
                  <div className="mb-6 bg-indigo-950/30 border border-indigo-500/50 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="bg-indigo-900/50 px-4 py-2 border-b border-indigo-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                              <Box size={14} /> Output Buffer
                              <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-mono">
                                  {operationResult['@type'] || 'Unknown Type'}
                              </span>
                          </div>
                          <div className="flex items-center gap-1">
                             <button 
                                onClick={() => setShowRawOutput(!showRawOutput)}
                                title="Toggle Raw JSON-LD"
                                className={`p-1.5 rounded transition-colors ${showRawOutput ? 'bg-indigo-800 text-white' : 'text-indigo-400 hover:bg-indigo-900/50'}`}
                             >
                                <Code size={14} />
                             </button>
                             <button onClick={() => setOperationResult(null)} className="p-1.5 text-indigo-400 hover:text-indigo-200">
                                <XCircle size={14} />
                             </button>
                          </div>
                      </div>
                      <div className="p-4 bg-black/20">
                          
                          {/* 1. C-ZERO FEDERATED RESULT */}
                          {operationResult['@type'] === 'czero:ResultSet' && (
                             <div className="space-y-4">
                                <div className="text-xs text-indigo-200 mb-2 flex items-center gap-2">
                                    <Zap size={12} className="text-yellow-400" />
                                    Zero-Copy Federated Result. Data materialized from distributed nodes.
                                </div>
                                {operationResult['czero:items']?.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-gray-900 border border-indigo-900/50 rounded p-3 flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-1">
                                            {Object.keys(item).filter(k => !k.startsWith('czero:')).map(key => (
                                                <div key={key} className="text-xs font-mono">
                                                    <span className="text-gray-500">{key}:</span> <span className="text-white">{item[key]}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {item['czero:provenance'] && (
                                            <div className="text-[10px] font-mono text-right text-gray-500 bg-gray-950 p-2 rounded border border-gray-800">
                                                <div className="text-green-500 mb-1">Source: {item['czero:provenance'].sourceNode.split('//')[1].split('/')[0]}</div>
                                                <div>Latency: {item['czero:provenance'].executionTime}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                             </div>
                          )}
                          
                          {/* 2. ODRL DIGITAL TICKET (LICENSE) */}
                          {operationResult['@type'] === 'odrl:Ticket' && (
                             <div className="flex gap-4">
                                 <div className="w-16 bg-yellow-900/20 border border-yellow-700/50 rounded flex flex-col items-center justify-center text-yellow-500">
                                     <Key size={24} />
                                     <div className="text-[10px] font-bold mt-1">ACCESS</div>
                                 </div>
                                 <div className="flex-1 space-y-2">
                                     <h3 className="text-sm font-bold text-white">Digital Access Ticket Issued</h3>
                                     <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                         <div className="bg-gray-900 p-2 rounded border border-gray-800">
                                             <div className="text-gray-500">Ticket UID</div>
                                             <div className="text-yellow-400 font-bold">{operationResult['odrl:uid']}</div>
                                         </div>
                                         <div className="bg-gray-900 p-2 rounded border border-gray-800">
                                             <div className="text-gray-500">Validity</div>
                                             <div className="text-green-400">{operationResult['odrl:validity']}</div>
                                         </div>
                                     </div>
                                     <div className="text-[10px] text-gray-500 bg-black/40 p-1.5 rounded truncate">
                                         Target: {operationResult['odrl:target']}
                                     </div>
                                 </div>
                             </div>
                          )}

                          {/* 3. SCHEMA ORDER (MINT RECEIPT) */}
                          {operationResult['@type'] === 'schema:Order' && (
                            <div className="flex gap-4">
                                <div className="w-16 bg-purple-900/20 border border-purple-700/50 rounded flex flex-col items-center justify-center text-purple-500">
                                    <Hexagon size={24} />
                                    <div className="text-[10px] font-bold mt-1">MINTED</div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-sm font-bold text-white">Blockchain Transaction Confirmed</h3>
                                    <div className="bg-gray-900 p-2 rounded border border-gray-800 text-xs font-mono mb-2">
                                        <div className="text-gray-500">Tx Hash</div>
                                        <div className="text-purple-400 break-all">{operationResult['schema:orderNumber']}</div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-gray-800 pt-2">
                                        <span className="text-gray-500">{operationResult['schema:orderedItem']['schema:name']}</span>
                                        <span className="font-bold text-white">Qty: {operationResult['schema:orderedItem']['erc8004:amount']}</span>
                                    </div>
                                </div>
                            </div>
                         )}

                          {/* 4. SUBSCRIPTION AGREEMENT */}
                          {operationResult['@type'] === 'schema:JoinAction' && (
                            <div className="flex gap-4">
                                <div className="w-16 bg-green-900/20 border border-green-700/50 rounded flex flex-col items-center justify-center text-green-500">
                                    <FileCheck size={24} />
                                    <div className="text-[10px] font-bold mt-1">ACTIVE</div>
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-sm font-bold text-white">Subscription Agreement</h3>
                                    <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-900 p-2 rounded border border-gray-800">
                                        <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                                        <div>"{operationResult['schema:result']['schema:text']}"</div>
                                    </div>
                                    <div className="text-[10px] text-gray-600 text-right">
                                        Signed: {operationResult['dct:date']}
                                    </div>
                                </div>
                            </div>
                         )}

                         {/* 5. SUCCESS ACTION */}
                         {operationResult['@type'] === 'schema:ActionStatus' && (
                             <div className="bg-green-900/20 border border-green-900/50 p-4 rounded text-center">
                                 <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
                                 <div className="text-sm font-bold text-white">{operationResult['schema:name']}</div>
                                 <div className="text-xs text-gray-400 mt-1">{operationResult['schema:description']}</div>
                             </div>
                         )}
                         
                         {/* NESTED AFFORDANCES (Recursive HATEOAS) */}
                         {resultOperations.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-indigo-900/30">
                                 <h4 className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-3 flex items-center gap-2">
                                     <Terminal size={12} /> Next Actions (HATEOAS)
                                 </h4>
                                 <div className="space-y-2">
                                     {resultOperations.map((op, idx) => (
                                         <OperationCard
                                             key={idx}
                                             operation={op}
                                             targetId={operationResult['@id'] || 'output-node'}
                                             onRecordActivity={onRecordActivity}
                                             onSuccess={onRefresh}
                                             onResult={(res) => {
                                                 // Update the buffer with the *new* result (e.g. status)
                                                 setOperationResult(res);
                                             }}
                                         />
                                     ))}
                                 </div>
                             </div>
                         )}

                          {/* RAW JSON VIEW (Shown if toggled OR if type is unknown/fallback) */}
                          {(showRawOutput || !isKnownType) && (
                             <div className={`
                                ${isKnownType ? 'mt-4 pt-4 border-t border-indigo-900/30' : ''} 
                                animate-in fade-in slide-in-from-top-2 relative group
                             `}>
                                 {isKnownType && (
                                     <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold mb-2 flex items-center gap-2">
                                         <Code size={12} /> Raw JSON-LD Source
                                     </div>
                                 )}
                                 <button 
                                     onClick={() => handleCopy(JSON.stringify(operationResult, null, 2))}
                                     className="absolute top-2 right-2 p-1.5 bg-gray-800 text-gray-400 rounded hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-10"
                                     title="Copy JSON"
                                 >
                                    {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                                 </button>
                                 <pre className="text-xs font-mono text-indigo-300 overflow-x-auto bg-black/40 p-3 rounded border border-indigo-900/50">
                                     {JSON.stringify(operationResult, null, 2)}
                                 </pre>
                             </div>
                          )}
                      </div>
                  </div>
              )}

              {/* Data Content */}
              {data && (
                <>
                  {/* Header Metadata */}
                  <div className="mb-8 flex justify-between items-start">
                    <div>
                        <div className="flex gap-2 mb-2">
                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-accent-900/20 border border-accent-900/50 rounded text-accent-400 text-xs font-mono">
                                <Database size={12} />
                                HyprCAT/JSON-LD
                            </div>
                            {isDid && (
                                <div className="inline-flex items-center gap-2 px-2 py-1 bg-purple-900/20 border border-purple-900/50 rounded text-purple-400 text-xs font-mono">
                                    <Fingerprint size={12} />
                                    DID Resolved
                                </div>
                            )}
                        </div>
                        
                        <h1 className="text-2xl font-bold text-white mb-1 font-mono break-all">{data['dct:title'] || data['schema:name'] || data['name']}</h1>
                        
                        <div className="text-sm text-gray-500 font-mono flex flex-col gap-1">
                            <span className="truncate">@id: <span className="text-gray-400 underline decoration-gray-700">{data['@id']}</span></span>
                            <span>@type: <span className="text-orange-400">{type}</span></span>
                        </div>
                    </div>
                    {/* Wallet Indicator */}
                    <div className="flex flex-col items-end gap-1">
                       <div className="px-3 py-1.5 bg-yellow-900/20 border border-yellow-700/30 rounded text-yellow-500 text-xs font-mono flex items-center gap-2">
                           <Wallet size={14} />
                           <span>Simulated Wallet</span>
                       </div>
                       <div className="text-right">
                          <div className="font-bold text-yellow-400 text-sm flex items-center justify-end gap-1"><Bitcoin size={12}/> {walletBalance} SAT</div>
                          {tokenCount > 0 && (
                             <div className="text-[10px] text-purple-400 flex items-center justify-end gap-1 mt-0.5"><Hexagon size={10}/> {tokenCount} TOKENS</div>
                          )}
                       </div>
                    </div>
                  </div>

                  {/* TRUST & PROVENANCE LAYER */}
                  {(credentials.length > 0 || provenance) && (
                      <div className="mb-8 bg-gray-950/40 border border-gray-800 rounded-lg p-4">
                          <h2 className="text-xs uppercase tracking-widest text-green-500 font-bold mb-4 flex items-center gap-2">
                            <ShieldCheck size={12} /> Trust & Provenance Layer
                          </h2>
                          
                          <div className="space-y-3">
                              {credentials.map((vc, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-900 border border-green-900/30 rounded">
                                      <ShieldCheck size={16} className="text-green-500 mt-1" />
                                      <div>
                                          <div className="text-sm text-green-100 font-medium">Verifiable Credential Found</div>
                                          <div className="text-xs text-gray-500 font-mono mt-1">Type: {vc.type.slice(1).join(', ')}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* MEMBERS / CHILDREN */}
                  {members.length > 0 && !type.includes('mcp:PromptCollection') && (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2">
                        <Share2 size={12} /> Catalog Items ({members.length})
                      </h2>
                      <div className="grid gap-3">
                        {members.map(member => (
                          <div 
                              key={member['@id']} 
                              onClick={() => onNavigate(member['@id'])}
                              className="p-3 bg-gray-850 border border-gray-800 hover:border-accent-500/50 hover:bg-gray-800 cursor-pointer rounded flex justify-between items-center group transition-all"
                          >
                              <div className="overflow-hidden">
                                <div className="font-mono text-sm text-accent-300 mb-0.5 group-hover:text-accent-400 truncate flex items-center gap-2">
                                    {member['dct:title'] || member['schema:name']}
                                    {member['x402:accessStatus'] === 'locked' && (
                                        <span className="text-[10px] bg-yellow-500 text-black px-1 rounded font-bold">LOCKED</span>
                                    )}
                                    {member['erc8004:accessStatus'] === 'denied' && (
                                        <span className="text-[10px] bg-purple-600 text-white px-1 rounded font-bold">RESTRICTED</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-600">{member['@type']}</div>
                              </div>
                              <div className="text-xs font-mono text-gray-600 group-hover:text-gray-400 whitespace-nowrap ml-2">
                                ID: {member['@id'].split('/').pop()} →
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Data Preview */}
                  <div className="mt-8 pt-8 border-t border-gray-800 relative group">
                    <h2 className="text-xs uppercase tracking-widest text-gray-600 font-bold mb-4 flex items-center gap-2">
                      <Layers size={12} /> Raw Representation
                    </h2>
                    <button 
                         onClick={() => handleCopy(JSON.stringify(data, null, 2))}
                         className="absolute top-0 right-0 p-1.5 bg-gray-800 text-gray-400 rounded hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                         title="Copy JSON"
                     >
                        {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                     </button>
                    <pre className="text-xs font-mono text-gray-500 bg-black/50 p-4 rounded-lg overflow-x-auto border border-gray-800">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: MCP CAPABILITIES */}
      <div className="w-1/3 bg-gray-950/50 p-6 border-l border-gray-800 overflow-y-auto flex flex-col gap-6">
        
        {/* Auto Pilot */}
        <div>
           <AutoPilot 
             operations={operations} 
             members={members}
             currentResource={data}
             targetId={data ? data['@id'] : 'Unknown'} 
             onRefresh={onRefresh} 
             onNavigate={onNavigate}
             logs={agentLogs}
             onAddLog={onAddLog}
             onClearLogs={onClearLogs}
             isEngaged={isEngaged}
             onToggleEngagement={onToggleEngagement}
             onRecordActivity={onRecordActivity}
             activePrompt={activePrompt}
             onResult={handleOpResult}
           />
        </div>

        {/* Available Protocols (Prompts) */}
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-sm">
           <div className="text-gray-300 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
             <Scroll size={12} className="text-pink-500" /> Agent Protocols
           </div>
           <div className="space-y-2">
              {availablePrompts.map(prompt => (
                  <button 
                     key={prompt['@id']}
                     onClick={() => handlePromptSelect(prompt)}
                     className={`w-full text-left p-2.5 rounded border text-xs transition-all flex items-start gap-2 group
                        ${activePrompt?.['@id'] === prompt['@id'] 
                           ? 'bg-pink-900/30 border-pink-500 text-pink-200 shadow-md shadow-pink-900/10' 
                           : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                        }
                     `}
                  >
                     <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 
                         ${activePrompt?.['@id'] === prompt['@id'] ? 'bg-pink-500 text-white' : 'bg-gray-700 text-gray-500 group-hover:bg-gray-600'}
                     `}>
                        <Play size={8} fill="currentColor" />
                     </div>
                     <div>
                        <div className={`font-bold ${activePrompt?.['@id'] === prompt['@id'] ? 'text-pink-300' : 'text-gray-300'}`}>
                           {prompt['schema:name']}
                        </div>
                        <div className="opacity-70 leading-tight mt-0.5">{prompt['schema:description']}</div>
                     </div>
                  </button>
              ))}
           </div>
        </div>

        {/* TOOLS */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-accent-500 font-bold flex items-center gap-2">
              <Terminal size={14} /> HyprCAT Affordances
            </h2>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{isLoading ? '...' : operations.length}</span>
          </div>

          {isLoading ? (
             <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-900 border border-gray-800 rounded-lg animate-pulse"></div>
                ))}
             </div>
          ) : (
            <>
              {operations.length > 0 ? (
                <div className="space-y-4">
                  {operations.map((op, idx) => (
                    <OperationCard 
                      key={idx} 
                      operation={op} 
                      targetId={data!['@id']} 
                      onSuccess={onRefresh} 
                      onNavigate={onNavigate}
                      onResult={handleOpResult}
                      onRecordActivity={onRecordActivity}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-gray-800 rounded-lg">
                  <div className="text-gray-600 mb-2">No Controls</div>
                  <p className="text-[10px] text-gray-700 px-4">
                    No <code>hydra:Operation</code> found on this node.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};