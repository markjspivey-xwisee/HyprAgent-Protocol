import React, { useState, useEffect, useRef } from 'react';
import { BrowserBar } from './components/BrowserBar';
import { HumanView } from './components/HumanView';
import { AgentView } from './components/AgentView';
import { ProtocolDocs } from './components/ProtocolDocs';
import { SimulationPanel } from './components/SimulationPanel';
import { fetchHypermedia, MOCK_URLS, demoPrompts } from './services/mockHypermedia';
import { JsonLdNode, ViewMode, LogEntry, ProvenanceItem, ProvEntity, ProvActivity } from './types';
import { generateProvId } from './utils';

const App: React.FC = () => {
  // History Stack Management
  const [history, setHistory] = useState<string[]>(['https://data.market.example/catalog']);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [data, setData] = useState<JsonLdNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('agent');
  const [showDocs, setShowDocs] = useState(false);

  // Agent & Provenance State
  const [agentLogs, setAgentLogs] = useState<LogEntry[]>([]);
  const [isAgentEngaged, setIsAgentEngaged] = useState(false);
  
  // PROV Trace
  const [provenanceTrace, setProvenanceTrace] = useState<ProvenanceItem[]>([]);
  const [currentEntityId, setCurrentEntityId] = useState<string>('');

  const currentUrl = history[currentIndex];

  const addAgentLog = (entry: LogEntry) => {
    setAgentLogs(prev => [...prev, entry]);
  };

  const clearAgentLogs = () => {
    setAgentLogs([]);
    setProvenanceTrace([]); // Clear trace when logs are cleared for a fresh start
  };

  // Called by AutoPilot to record an Activity
  const recordProvActivity = (
    label: string, 
    details: ProvActivity['details']
  ) => {
    const activity: ProvActivity = {
      id: generateProvId(),
      type: 'activity',
      label,
      details,
      usedEntityId: currentEntityId,
      timestamp: Date.now()
    };
    setProvenanceTrace(prev => [...prev, activity]);
  };

  const fetchData = async (url: string) => {
    setIsLoading(true);
    // Note: We don't clear data immediately to allow AgentView to show "scanning" over previous content if desired, 
    // but standard pattern is to clear or show loading.
    setData(null); 
    
    try {
      const result = await fetchHypermedia(url);
      setData(result);

      // Record PROV:Entity (Snapshot of the State)
      const entityId = generateProvId();
      setCurrentEntityId(entityId);
      
      const entity: ProvEntity = {
        id: entityId,
        type: 'entity',
        label: result['dct:title'] || result['schema:name'] || 'Resource State',
        value: result, // Full Snapshot
        timestamp: Date.now()
      };
      
      setProvenanceTrace(prev => [...prev, entity]);

    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data whenever the current URL changes via history navigation
  useEffect(() => {
    fetchData(currentUrl);
  }, [currentUrl]);

  const handleNavigate = (url: string) => {
    if (showDocs) setShowDocs(false); // Close docs if navigating from URL bar
    
    if (url === currentUrl) {
      fetchData(url); // Just refresh if same URL
      return;
    }
    
    // Truncate forward history if we navigate from the middle of the stack
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(url);
    
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleForward = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans">
      
      {/* Top Navigation */}
      <BrowserBar 
        currentUrl={currentUrl} 
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        canGoBack={currentIndex > 0}
        canGoForward={currentIndex < history.length - 1}
        isLoading={isLoading}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showDocs={showDocs}
        onToggleDocs={() => setShowDocs(!showDocs)}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {showDocs ? (
          <ProtocolDocs onClose={() => setShowDocs(false)} />
        ) : viewMode === 'human' ? (
          <HumanView data={data} isLoading={isLoading} />
        ) : (
          <AgentView 
            data={data} 
            isLoading={isLoading} 
            onNavigate={handleNavigate} 
            onRefresh={() => fetchData(currentUrl)}
            agentLogs={agentLogs}
            onAddLog={addAgentLog}
            onClearLogs={clearAgentLogs}
            isEngaged={isAgentEngaged}
            onToggleEngagement={setIsAgentEngaged}
            provenanceTrace={provenanceTrace}
            onRecordActivity={recordProvActivity}
            availablePrompts={demoPrompts}
          />
        )}
      </div>

      {/* Dynamic Server Simulation Control (Hide when in Docs) */}
      {!showDocs && (
        <SimulationPanel 
            currentUrl={currentUrl} 
            onRefresh={() => fetchData(currentUrl)} 
        />
      )}

      {/* Footer / Quick Links */}
      <div className="h-8 bg-gray-950 border-t border-gray-800 flex items-center px-4 text-xs font-mono text-gray-600 gap-4 z-40 relative">
        <span>Quick Jump:</span>
        {MOCK_URLS.map(url => (
          <button 
            key={url}
            onClick={() => handleNavigate(url)} 
            className={`truncate max-w-[150px] transition-colors ${url === currentUrl ? 'text-accent-500' : 'hover:text-accent-500'}`}
          >
            {url.replace('https://data.market.example', '...')}
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;