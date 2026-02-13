import React, { useState } from 'react';
import { HydraOperation, HydraSupportedProperty, ProvActivity } from '../types';
import { Terminal, Send, CheckCircle, AlertCircle, Search, Bitcoin, ArrowRightCircle } from 'lucide-react';
import { executeHypermediaAction } from '../services/mockHypermedia';

interface OperationCardProps {
  operation: HydraOperation;
  targetId: string;
  onSuccess?: () => void;
  onNavigate?: (url: string) => void;
  onResult?: (result: any) => void;
  onRecordActivity?: (label: string, details: ProvActivity['details']) => void;
}

export const OperationCard: React.FC<OperationCardProps> = ({ 
  operation, 
  targetId, 
  onSuccess, 
  onNavigate, 
  onResult,
  onRecordActivity 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');

  // Extract fields from both SHACL (expects) and IRI Template (mapping)
  const supportedProperties = operation['hydra:expects']?.['hydra:supportedProperty'] || [];
  
  // Normalize IRI Template Mappings to match SupportedProperty structure
  const templateMappings = operation['hydra:mapping']?.map((m: any) => ({
    "hydra:property": m['hydra:property'],
    "hydra:title": m['hydra:variable'], // Use variable name (e.g. 'q') as title
    "hydra:description": `Template Variable {${m['hydra:variable']}}`,
    "hydra:required": m['hydra:required'],
    "_variable": m['hydra:variable'] // Internal marker for URL construction
  })) || [];

  const fields = [...supportedProperties, ...templateMappings];
  
  const method = operation['hydra:method'] || 'GET';
  const typeName = Array.isArray(operation['@type']) ? operation['@type'].find(t => t !== 'hydra:Operation') : operation['@type'];
  const returns = operation['hydra:returns'];
  const isSearch = typeName === 'schema:SearchAction';
  const isPayment = typeName === 'schema:PayAction';

  // Helper to determine input type from semantic property
  const getInputType = (property: string) => {
    const p = property.toLowerCase();
    if (p.includes('email')) return 'email';
    if (p.includes('quantity') || p.includes('count') || p.includes('price') || p.includes('level')) return 'number';
    if (p.includes('date') || p.includes('time')) return 'datetime-local';
    if (p.includes('password') || p.includes('secret')) return 'password';
    return 'text';
  };

  const handleExecute = async () => {
    setStatus('executing');
    try {
      
      // Record Provenance for Manual Action
      if (onRecordActivity) {
         onRecordActivity(`Manual: ${operation['hydra:title']}`, {
             actionType: method,
             strategy: 'HUMAN_INTERVENTION',
             payload: formData
         });
      }

      // Handle GET/Search via IRI Template
      if (method === 'GET' && operation['hydra:template']) {
         let url = operation['hydra:template'];
         
         // Basic RFC 6570 Level 1 expansion for demo
         fields.forEach((field: any) => {
             const key = field['hydra:property'];
             const value = formData[key] || '';
             const varName = field['_variable'];
             
             if (varName && value) {
                // Replace {?q} with ?q=val
                if (url.includes(`{?${varName}}`)) {
                   url = url.replace(`{?${varName}}`, `?${varName}=${encodeURIComponent(value)}`);
                } 
                // Replace {q} with val
                else if (url.includes(`{${varName}}`)) {
                   url = url.replace(`{${varName}}`, encodeURIComponent(value));
                }
             }
         });
         
         // Cleanup unused optional variables
         url = url.replace(/\{\?[^}]+\}/g, '');
         
         console.log(`[HyperAgent] Navigating to ${url}`);
         
         setStatus('success');
         if (onNavigate) {
            onNavigate(url);
            // Reset after nav
            setTimeout(() => {
                setStatus('idle');
                setExpanded(false);
            }, 500);
         }
         return;
      }

      // Handle standard POST/PUT actions (including Payments)
      const actionTarget = operation['target'] || targetId;
      const result = await executeHypermediaAction(actionTarget, method, formData);
      
      setStatus('success');
      console.log(`[HyperAgent] Executed ${method} on ${actionTarget}`, formData, "Result:", result);
      
      if (onResult && result) {
         onResult(result);
      }

      // Notify parent to refresh the world state
      setTimeout(() => {
        setStatus('idle');
        setExpanded(false);
        if (onSuccess) onSuccess();
      }, 1000);
      
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className={`bg-gray-850 border rounded-lg overflow-hidden mb-4 transition-all hover:border-gray-600
        ${isPayment ? 'border-yellow-600/50 shadow-yellow-900/20' : 'border-gray-750'}
    `}>
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`
            w-10 h-10 rounded-md flex items-center justify-center font-bold text-xs
            ${isPayment ? 'bg-yellow-500 text-black border border-yellow-400' : ''}
            ${!isPayment && method === 'GET' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : ''}
            ${!isPayment && method === 'POST' ? 'bg-green-900/30 text-green-400 border border-green-800' : ''}
            ${!isPayment && method === 'PUT' ? 'bg-orange-900/30 text-orange-400 border border-orange-800' : ''}
            ${!isPayment && method === 'DELETE' ? 'bg-red-900/30 text-red-400 border border-red-800' : ''}
          `}>
            {isPayment ? <Bitcoin size={20} /> : method}
          </div>
          <div className="flex-1">
            <h3 className={`font-medium font-mono text-sm ${isPayment ? 'text-yellow-400 font-bold' : 'text-gray-200'}`}>
                {operation['hydra:title']}
            </h3>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-900 rounded border border-gray-800 font-mono">
                 {typeName || 'Operation'}
               </span>
               {returns && (
                 <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <ArrowRightCircle size={10} />
                    <span>Returns: <span className="text-accent-400">{returns}</span></span>
                 </div>
               )}
            </div>
          </div>
        </div>
        <div className="text-gray-500">
          {expanded ? '−' : '+'}
        </div>
      </div>

      {/* Expanded Details - The "Tool Definition" */}
      {expanded && (
        <div className="border-t border-gray-800 bg-gray-900/50 p-4">
          
          {/* Mapping Explanation */}
          <div className={`mb-6 p-3 rounded text-xs border mb-4
             ${isPayment ? 'bg-yellow-900/10 border-yellow-700/30 text-yellow-200/80' : 'bg-blue-900/10 border-blue-900/30 text-blue-300/80'}
          `}>
            <span className={`font-bold ${isPayment ? 'text-yellow-400' : 'text-blue-400'}`}>Agent Insight:</span> 
            {isSearch && <span> This <code>hydra:IriTemplate</code> maps inputs to URL query parameters.</span>}
            {isPayment && <span> This is an <b>x402 Payment Trigger</b>. Executing this will transfer funds to the <code>target</code> endpoint.</span>}
            {!isSearch && !isPayment && <span> This <code>hydra:Operation</code> maps to a WebMCP Tool via <code>hydra:expects</code> (SHACL).</span>}
          </div>

          {/* Form Inputs */}
          {fields.length > 0 ? (
            <div className="space-y-4 mb-6">
              {fields.map((field: any) => {
                const inputType = getInputType(field['hydra:property']);
                
                return (
                  <div key={field['hydra:property']} className="group">
                    <label className="block text-xs font-mono text-gray-400 mb-1.5 flex justify-between">
                      <span>{field['hydra:title']} <span className="text-gray-600">({field['hydra:property'].split(':')[1]})</span></span>
                      {field['hydra:required'] && <span className="text-accent-500 text-[10px] uppercase tracking-wider">Required</span>}
                    </label>
                    <input 
                      type={inputType}
                      min={inputType === 'number' ? "0" : undefined}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:border-accent-600 focus:outline-none transition-colors font-mono placeholder:text-gray-700"
                      placeholder={`Enter ${field['hydra:title']}...`}
                      onChange={(e) => setFormData({...formData, [field['hydra:property']]: e.target.value})}
                    />
                    {field['hydra:description'] && (
                      <p className="text-[10px] text-gray-600 mt-1">{field['hydra:description']}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-sm text-gray-500 italic mb-6">No parameters required.</div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
             <div className="text-xs text-gray-600 font-mono">
               Target: {operation['target'] || targetId}
             </div>
             <button 
               onClick={handleExecute}
               disabled={status === 'executing' || status === 'success'}
               className={`
                 flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                 ${status === 'idle' && !isPayment ? 'bg-accent-600 hover:bg-accent-500 text-white shadow-lg shadow-accent-900/20' : ''}
                 ${status === 'idle' && isPayment ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-900/20' : ''}
                 ${status === 'executing' ? 'bg-gray-700 text-gray-300 cursor-wait' : ''}
                 ${status === 'success' ? 'bg-green-600 text-white' : ''}
                 ${status === 'error' ? 'bg-red-600 text-white' : ''}
               `}
             >
               {status === 'idle' && (
                  isSearch ? <><Search size={12} /> Search</> :
                  isPayment ? <><Bitcoin size={14} /> Pay Now</> :
                  <><Terminal size={12} /> Execute Tool</>
               )}
               {status === 'executing' && <>Running...</>}
               {status === 'success' && <><CheckCircle size={12} /> Executed</>}
               {status === 'error' && <><AlertCircle size={12} /> Failed</>}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};