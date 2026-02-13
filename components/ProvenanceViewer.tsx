import React, { useState } from 'react';
import { ProvenanceItem, ProvEntity, ProvActivity } from '../types';
import { GitCommit, Circle, ArrowDown, Activity, Database, Clock, Code, PlayCircle, Copy, CheckCircle } from 'lucide-react';
import { formatProvIdShort, formatTime } from '../utils';

interface ProvenanceViewerProps {
  trace: ProvenanceItem[];
}

export const ProvenanceViewer: React.FC<ProvenanceViewerProps> = ({ trace }) => {
  const [selectedItem, setSelectedItem] = useState<ProvenanceItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full bg-gray-900 text-gray-300">
      {/* Timeline Column */}
      <div className="w-1/3 border-r border-gray-800 overflow-y-auto p-4 scrollbar-thin">
        <h2 className="text-xs uppercase tracking-widest text-purple-400 font-bold mb-6 flex items-center gap-2">
          <GitCommit size={14} /> Provenance Chain
        </h2>
        
        <div className="relative pl-2">
          {/* Vertical Line */}
          <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-gray-800"></div>

          <div className="space-y-6 relative">
            {trace.map((item, idx) => (
              <div 
                key={item.id} 
                className={`relative pl-8 cursor-pointer transition-all ${selectedItem?.id === item.id ? 'opacity-100 scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => setSelectedItem(item)}
              >
                {/* Node Icon */}
                <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-900 z-10
                  ${item.type === 'entity' ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}
                  ${selectedItem?.id === item.id ? 'ring-2 ring-white/20' : ''}
                `}>
                  {item.type === 'entity' ? <Database size={16} /> : <Activity size={16} />}
                </div>

                {/* Content Card */}
                <div className={`p-3 rounded-lg border text-sm
                   ${item.type === 'entity' 
                     ? 'bg-blue-950/20 border-blue-900/50 hover:bg-blue-900/20' 
                     : 'bg-orange-950/20 border-orange-900/50 hover:bg-orange-900/20'
                   }
                   ${selectedItem?.id === item.id ? 'bg-gray-800 border-gray-600 shadow-lg' : ''}
                `}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded
                      ${item.type === 'entity' ? 'text-blue-400 bg-blue-900/30' : 'text-orange-400 bg-orange-900/30'}
                    `}>
                      {item.type === 'entity' ? 'PROV:Entity' : 'PROV:Activity'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{formatTime(item.timestamp)}</span>
                  </div>
                  
                  <div className="font-medium text-gray-200">{item.label}</div>
                  
                  {item.type === 'activity' && (
                    <div className="mt-2 text-xs text-gray-400 font-mono flex flex-col gap-1">
                       <div className="flex items-center gap-1.5">
                         <PlayCircle size={10} />
                         <span>{item.details.strategy}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-gray-500">
                         <Code size={10} />
                         <span>{item.details.actionType}</span>
                       </div>
                    </div>
                  )}
                  
                  {item.type === 'entity' && (
                     <div className="mt-1 text-[10px] text-gray-500 truncate">
                        {(item as any).value['@id']}
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inspector Column */}
      <div className="w-2/3 bg-gray-950 p-6 overflow-y-auto">
        {selectedItem ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                   {selectedItem.type === 'entity' ? <Database className="text-blue-500" /> : <Activity className="text-orange-500" />}
                   {selectedItem.label}
                </h3>
                <div className="text-xs font-mono text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                  ID: {formatProvIdShort(selectedItem.id)}
                </div>
             </div>

             {selectedItem.type === 'entity' && (
               <div className="space-y-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                     <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs uppercase text-gray-500 font-bold flex items-center gap-2">
                           <Clock size={12} /> State Snapshot
                        </h4>
                        <button 
                             onClick={() => handleCopy(JSON.stringify(selectedItem.value, null, 2))}
                             className="text-xs flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
                         >
                            {copied ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copied ? 'Copied' : 'Copy JSON'}
                         </button>
                     </div>
                     <p className="text-sm text-gray-400 mb-4">
                       This is the exact JSON-LD state of the resource at <b>{formatTime(selectedItem.timestamp)}</b>, before any further actions were taken.
                     </p>
                     <div className="bg-black p-4 rounded-md border border-gray-800 overflow-x-auto">
                       <pre className="text-xs font-mono text-green-400">
                         {JSON.stringify(selectedItem.value, null, 2)}
                       </pre>
                     </div>
                  </div>
               </div>
             )}

             {selectedItem.type === 'activity' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Strategy</div>
                         <div className="text-white font-mono">{selectedItem.details.strategy}</div>
                      </div>
                      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Method</div>
                         <div className="text-white font-mono">{selectedItem.details.actionType}</div>
                      </div>
                   </div>

                   <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                      <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 flex items-center gap-2">
                        <Code size={12} /> Payload / Parameters
                      </h4>
                      <div className="bg-black p-4 rounded-md border border-gray-800 overflow-x-auto">
                        <pre className="text-xs font-mono text-yellow-400">
                          {JSON.stringify(selectedItem.details.payload, null, 2)}
                        </pre>
                      </div>
                   </div>

                   <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                      <div className="text-xs text-blue-400 font-mono mb-1">prov:used (Input Entity)</div>
                      <div className="text-sm text-blue-200">
                        ID: {formatProvIdShort(selectedItem.usedEntityId)}...
                      </div>
                   </div>
                </div>
             )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <GitCommit size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Select a node in the provenance chain<br/>to inspect the recorded state.</p>
          </div>
        )}
      </div>
    </div>
  );
};