import React from 'react';
import { JsonLdNode, VerifiableCredential } from '../types';
import { ShieldCheck, Bot, Lock, Bitcoin, Key, Hexagon, CheckCircle, Database, FileText, Globe, Box, Network, Layers, Zap } from 'lucide-react';

interface HumanViewProps {
  data: JsonLdNode | null;
  isLoading: boolean;
}

export const HumanView: React.FC<HumanViewProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-400">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-accent-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Rendering HyprCAT Node...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-gray-500 bg-white h-full">No content loaded</div>;

  const credentials = (data['verifiableCredential'] as VerifiableCredential[]) || [];
  const isAiGenerated = !!data['prov:wasGeneratedBy'];
  
  // Access Control Checks
  const isX402Locked = data['x402:accessStatus'] === 'locked';
  const isErc8004Locked = data['erc8004:accessStatus'] === 'denied';

  const type = Array.isArray(data['@type']) ? data['@type'][0] : data['@type'];

  // -----------------------------------------------------------
  // VIEW: C-ZERO Virtual Graph (Semantic Layer)
  // -----------------------------------------------------------
  if (type.includes('czero:VirtualGraph')) {
     const federatedSources = data['czero:federatedSource'] || [];
     return (
        <div className="max-w-4xl mx-auto p-12 font-sans text-gray-900">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                    <Network size={32} />
                </div>
                <div>
                   <h1 className="text-3xl font-bold mb-1">{data['dct:title']}</h1>
                   <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold font-mono">C-ZERO VIRTUAL GRAPH</span>
                       <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold font-mono flex items-center gap-1">
                          <Zap size={10} /> ZERO-COPY
                       </span>
                   </div>
                </div>
             </div>

             <div className="prose text-gray-600 mb-8 max-w-2xl">
                {data['dct:description']}
                <p className="text-sm mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                   <b>Concept:</b> This resource does not store data. It is a semantic mapping layer. 
                   Queries sent here are decomposed and pushed down to the physical nodes listed below.
                </p>
             </div>

             {/* Federated Topology Visualizer */}
             <div className="mb-8">
                 <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    <Layers size={14} /> Federated Topology
                 </h3>
                 
                 <div className="relative border border-gray-200 rounded-xl p-8 bg-gray-50 overflow-hidden">
                     {/* The Virtual Node (Center) */}
                     <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                           <Network size={20} />
                        </div>
                        <span className="text-xs font-bold mt-2 text-indigo-800 bg-white px-2 py-0.5 rounded shadow-sm">Virtual Layer</span>
                     </div>

                     {/* Physical Nodes */}
                     <div className="flex justify-between items-end mt-16 pt-8 gap-8">
                        {federatedSources.map((source: any, i: number) => (
                           <div key={i} className="flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-colors">
                              {/* Connection Line (CSS Hack) */}
                              <div className="absolute -top-10 left-1/2 w-0.5 h-10 bg-indigo-200 origin-bottom transform group-hover:bg-indigo-400 transition-colors" 
                                   style={{ transform: `rotate(${i === 0 ? '30deg' : '-30deg'}) translateX(-50%)`}}></div>
                              
                              <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500 shrink-0">
                                     <Database size={16} />
                                  </div>
                                  <div>
                                     <div className="font-bold text-sm text-gray-800">{source['dct:title']}</div>
                                     <div className="text-[10px] text-gray-400 font-mono mt-1 break-all">{source['czero:endpoint']}</div>
                                     <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono">
                                           {source['czero:latency']} latency
                                        </span>
                                     </div>
                                  </div>
                              </div>
                           </div>
                        ))}
                     </div>
                 </div>
             </div>
        </div>
     );
  }

  // -----------------------------------------------------------
  // VIEW: ERC-8004 Token Gate
  // -----------------------------------------------------------
  if (isErc8004Locked) {
     const gateway = data['erc8004:gateway'];
     return (
        <div className="max-w-4xl mx-auto p-12 font-sans text-gray-900 relative h-full">
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                 <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 text-center max-w-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                        <Hexagon size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Restricted Data Access</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        Access to this dataset is governed by <span className="font-mono font-bold text-purple-600">ERC-8004</span>.
                        You must hold the required DAO Governance Token.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 text-left">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-xs text-gray-500 uppercase font-bold">Requirement</span>
                           <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono">{gateway['erc8004:tokenStandard']}</span>
                        </div>
                        <div className="font-mono text-xs text-gray-800 break-all bg-gray-200 p-2 rounded mb-2">
                            {gateway['erc8004:requiredToken']}
                        </div>
                        <div className="text-sm font-bold flex items-center gap-2 text-gray-700">
                            <Key size={14} /> Min Balance: {gateway['erc8004:minBalance']}
                        </div>
                    </div>
                    {gateway['rdfs:seeAlso'] && (
                       <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2">
                           Mint Governance Token
                       </button>
                    )}
                 </div>
             </div>

             {/* Blurred Background */}
             <div className="blur-sm select-none opacity-50 pointer-events-none">
                <h1 className="text-4xl font-bold mb-4">{data['dct:title'] || data['name']}</h1>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-8"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-gray-100 rounded"></div>
                    <div className="h-32 bg-gray-100 rounded"></div>
                </div>
             </div>
        </div>
     );
  }

  // -----------------------------------------------------------
  // VIEW: x402 Paywall (Data License)
  // -----------------------------------------------------------
  if (isX402Locked) {
      const paymentInfo = data['x402:paymentGateway'];
      return (
          <div className="max-w-4xl mx-auto p-12 font-sans text-gray-900 relative h-full">
               <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                   <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 text-center max-w-md">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                          <Lock size={32} />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Commercial License Required</h2>
                      <p className="text-gray-600 mb-6 text-sm">
                          This high-frequency data stream is protected by <span className="font-mono font-bold">x402</span>.
                          Purchase a license to unlock the WebSocket port.
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-1">License Fee</div>
                          <div className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
                              {paymentInfo['x402:amount']} <span className="text-lg text-gray-500">{paymentInfo['x402:currency']}</span>
                          </div>
                      </div>
                      <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                          <Bitcoin size={20} /> Purchase License
                      </button>
                   </div>
               </div>

               <div className="blur-sm select-none opacity-50 pointer-events-none">
                  <h1 className="text-4xl font-bold mb-4">{data['dct:title'] || data['name']}</h1>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">Live Stream Hidden</span>
                  </div>
               </div>
          </div>
      );
  }

  // -----------------------------------------------------------
  // VIEW: Data Product / Dataset
  // -----------------------------------------------------------
  if (type === 'dprod:DataProduct' || type === 'dcat:Dataset') {
    const isStream = type === 'dprod:DataProduct';
    return (
      <div className="max-w-4xl mx-auto p-8 font-sans text-gray-900">
        <nav className="text-sm text-gray-500 mb-8 flex items-center gap-2">
           <span>Catalog</span> <span>&gt;</span> <span>{data['dprod:domainInfo'] || 'Datasets'}</span>
        </nav>
        
        <div className="flex items-start gap-8">
          <div className="w-24 h-24 shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 border border-blue-100">
             {isStream ? <ActivityIcon /> : <Database size={40} />}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{data['dct:title'] || data['schema:name']}</h1>
            <div className="flex items-center gap-3 mb-6">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                    {type}
                </span>
                {data['dcat:keyword'] && data['dcat:keyword'].map((k: string) => (
                    <span key={k} className="text-xs text-gray-500">#{k}</span>
                ))}
            </div>
            
            <div className="prose text-gray-600 leading-relaxed mb-8">
              {data['dct:description'] || data['schema:description']}
            </div>

            {/* Ports / Distributions */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                    {isStream ? 'Output Ports' : 'Distributions'}
                </h3>
                
                {data['dcat:distribution']?.map((dist: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-400" />
                            <div>
                                <div className="font-bold text-sm">{dist['dct:title']}</div>
                                <div className="text-xs text-blue-500 font-mono truncate max-w-[200px]">{dist['dcat:downloadURL']}</div>
                            </div>
                        </div>
                        <button className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded">Download</button>
                    </div>
                ))}

                {data['dprod:outputPort']?.map((port: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <ActivityIcon className="text-green-600" />
                            <div>
                                <div className="font-bold text-sm text-green-900">{port['dct:title']}</div>
                                <div className="text-xs text-green-700 font-mono">{port['dcat:accessURL']}</div>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-green-600 uppercase flex items-center gap-1">
                            <CheckCircle size={12} /> Active
                        </span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // VIEW: Catalog
  // -----------------------------------------------------------
  if (type === 'dcat:Catalog' || type === 'hydra:Collection') {
    return (
      <div className="max-w-5xl mx-auto p-8 font-sans text-gray-900">
         <div className="mb-8">
             <h1 className="text-3xl font-bold mb-2">{data['dct:title'] || data['hydra:title']}</h1>
             <p className="text-gray-500">{data['dct:description']}</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {data['hydra:member']?.map((item: any) => (
             <div key={item['@id']} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white relative flex flex-col h-48">
               {item['x402:accessStatus'] === 'locked' && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 flex items-center gap-1">
                      <Lock size={10} /> PAID
                  </div>
               )}
               {item['erc8004:accessStatus'] === 'denied' && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 flex items-center gap-1">
                      <Hexagon size={10} /> DAO
                  </div>
               )}
               
               <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-3 w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                      {(item['@type']?.includes('dprod:DataProduct') || item['@type']?.includes('x402:PaymentRequired')) 
                        ? <ActivityIcon /> 
                        : (item['@type']?.includes('czero:VirtualGraph')) 
                           ? <Network size={16} /> 
                           : <Database size={16} />
                      }
                  </div>
                  <h3 className="font-bold text-base mb-1 leading-tight line-clamp-2">{item['dct:title'] || item['schema:name']}</h3>
                  {item['x402:cost'] && (
                      <p className="text-xs font-mono text-gray-500 mt-auto pt-2 border-t border-gray-100">
                         Cost: {item['x402:cost']}
                      </p>
                  )}
                  {item['@type']?.includes('czero:VirtualGraph') && (
                       <p className="text-[10px] font-bold text-indigo-500 mt-auto pt-2 border-t border-gray-100 flex items-center gap-1">
                          <Zap size={8} /> ZERO-COPY VIEW
                       </p>
                  )}
               </div>
             </div>
           ))}
         </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="max-w-3xl mx-auto p-12 text-center bg-white h-full">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{data['hydra:title'] || data['schema:name'] || 'Resource'}</h1>
      <div className="mt-8 p-4 bg-gray-50 rounded text-left font-mono text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </div>
    </div>
  );
};

const ActivityIcon = ({ className = "" }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);