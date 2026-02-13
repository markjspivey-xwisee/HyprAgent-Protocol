import React, { useState, useEffect, useRef } from 'react';
import { HydraOperation, LogEntry, JsonLdNode, ProvActivity, McpPrompt } from '../types';
import { executeHypermediaAction, serverActions } from '../services/mockHypermedia';
import { Bot, Play, Trash2, Scroll, Hexagon, Cpu } from 'lucide-react'; 

interface AutoPilotProps {
  operations: HydraOperation[];
  members: JsonLdNode[];
  currentResource: JsonLdNode | null;
  targetId: string;
  onRefresh: () => void;
  onNavigate: (url: string) => void;
  logs: LogEntry[];
  onAddLog: (entry: LogEntry) => void;
  onClearLogs: () => void;
  isEngaged: boolean;
  onToggleEngagement: (engaged: boolean) => void;
  onRecordActivity: (label: string, details: ProvActivity['details']) => void;
  activePrompt: McpPrompt | null;
  onResult?: (result: any) => void;
}

export const AutoPilot: React.FC<AutoPilotProps> = ({ 
  operations, members, currentResource, targetId, onRefresh, onNavigate, logs, onAddLog, onClearLogs, isEngaged, onToggleEngagement, onRecordActivity, activePrompt, onResult
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (isEngaged && !isRunning) {
        const timer = setTimeout(() => runSimulation(), 500);
        return () => clearTimeout(timer);
    }
  }, [isEngaged, isRunning, targetId, operations, currentResource]);

  const addLog = (type: LogEntry['type'], message: string) => {
    const now = new Date();
    onAddLog({ timestamp: `${now.toLocaleTimeString()}.${now.getMilliseconds()}`, type, message });
  };

  const runSimulation = async () => {
    setIsRunning(true);
    try {
      const instruction = activePrompt ? activePrompt['mcp:instruction'] : "";
      
      const isRetail = instruction.includes('Hardware') || instruction.includes('BuyAction');
      const isDataEng = instruction.includes('Databricks') || instruction.includes('SQL');
      const isHR = instruction.includes('LRS') || instruction.includes('HR');

      let selectedOp: HydraOperation | null = null;
      let strategy = '';
      let payload: any = {};
      let actionType: 'POST' | 'GET' | 'NAVIGATE' = 'POST';
      let targetUrl = '';
      let actionLabel = '';

      // --- RETAIL STRATEGY ---
      if (isRetail) {
         const product = members.find(m => m['schema:name']?.includes('NVIDIA'));
         if (product && !operations.length) {
            targetUrl = product['@id'];
            strategy = 'RETAIL_INSPECTION';
            actionType = 'NAVIGATE';
            addLog('decision', 'Product Found: NVIDIA H100. Inspecting affordances...');
         } else if (operations.find(op => op['hydra:title'].includes('Purchase'))) {
            selectedOp = operations.find(op => op['hydra:title'].includes('Purchase'))!;
            strategy = 'RETAIL_SETTLEMENT';
            payload = { 'schema:price': '3500' };
            addLog('payment', 'Executing Retail Purchase via Lightning Network...');
         }
      } 
      // --- DATABRICKS STRATEGY ---
      else if (isDataEng) {
         const dbOp = operations.find(op => op['hydra:title'].includes('SQL'));
         if (dbOp) {
            selectedOp = dbOp;
            strategy = 'DATABRICKS_UNITY_QUERY';
            payload = { 'schema:query': 'SELECT * FROM gold_sales WHERE spend > 500' };
            addLog('decision', 'Unity Catalog Resource Detected. Executing SQL...');
         } else {
            const dbNode = members.find(m => m['dct:title']?.includes('Databricks'));
            if (dbNode) targetUrl = dbNode['@id'], actionType = 'NAVIGATE', addLog('info', 'Connecting to Databricks SQL Warehouse...');
         }
      }
      // --- HR / LRS STRATEGY ---
      else if (isHR) {
          const lrsOp = operations.find(op => op['hydra:title'].includes('Export'));
          if (lrsOp) {
              selectedOp = lrsOp;
              strategy = 'LRS_HARVESTING';
              addLog('decision', 'Harvesting Learning Telemetry from LRS...');
          } else {
              const lrsNode = members.find(m => m['dct:title']?.includes('Learning'));
              if (lrsNode) targetUrl = lrsNode['@id'], actionType = 'NAVIGATE', addLog('info', 'Connecting to xAPI Endpoint...');
          }
      }

      if (!strategy && members.length > 0) {
          targetUrl = members[0]['@id'];
          actionType = 'NAVIGATE';
          strategy = 'EXPLORATION';
      }

      await new Promise(r => setTimeout(r, 1200));
      if (actionType === 'NAVIGATE' && targetUrl) {
         onNavigate(targetUrl);
         setIsRunning(false);
         return;
      }

      if (selectedOp) {
         const res = await executeHypermediaAction(selectedOp['target'] || targetId, selectedOp['hydra:method'], payload);
         addLog('success', 'HyprCAT Affordance Executed Successfully.');
         if (onResult) onResult(res);
         onToggleEngagement(false);
         setIsRunning(false);
      }

    } catch (e: any) {
      addLog('error', `Error: ${e.message}`);
      setIsRunning(false);
      onToggleEngagement(false);
    }
  };

  return (
    <div className={`bg-black/40 border border-gray-800 rounded-lg overflow-hidden flex flex-col h-[300px] transition-colors ${activePrompt ? 'border-pink-900/50' : ''}`}>
      <div className="bg-gray-900/80 p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className={activePrompt ? "text-pink-500" : "text-purple-500"} />
          <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{activePrompt ? 'Active Protocol' : 'Data Broker Agent'}</span>
        </div>
        {!isEngaged ? (
          <button onClick={() => onToggleEngagement(true)} className="flex items-center gap-1.5 px-2 py-1 bg-purple-900/30 text-purple-300 border border-purple-800 rounded text-[10px] font-mono"><Play size={10} /> START BROKER</button>
        ) : (
          <button onClick={() => onToggleEngagement(false)} className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-mono"><span className="w-1.5 h-1.5 rounded-full animate-pulse bg-purple-500"></span> ENGAGED</button>
        )}
      </div>
      <div ref={logContainerRef} className="flex-1 p-3 font-mono text-[10px] overflow-y-auto space-y-1.5 scroll-smooth">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
            <span className={`break-words ${log.type === 'decision' ? 'text-blue-400 font-bold' : log.type === 'action' ? 'text-yellow-400' : log.type === 'payment' ? 'text-yellow-500 font-bold' : log.type === 'success' ? 'text-green-400' : 'text-gray-400'}`}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};