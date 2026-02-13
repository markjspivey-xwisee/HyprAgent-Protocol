import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Search, Shield, Globe, BookOpen } from 'lucide-react';

interface BrowserBarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  viewMode: 'human' | 'agent';
  setViewMode: (mode: 'human' | 'agent') => void;
  showDocs: boolean;
  onToggleDocs: () => void;
}

export const BrowserBar: React.FC<BrowserBarProps> = ({ 
  currentUrl, 
  onNavigate, 
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  isLoading,
  viewMode,
  setViewMode,
  showDocs,
  onToggleDocs
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);

  useEffect(() => {
    setInputVal(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(inputVal);
  };

  return (
    <div className="bg-gray-850 border-b border-gray-750 p-2 flex items-center gap-3 shadow-md">
      <div className="flex items-center gap-1">
        <button 
          onClick={onBack}
          disabled={!canGoBack}
          className={`p-2 rounded-full transition-colors ${canGoBack ? 'hover:bg-gray-750 text-gray-400' : 'text-gray-700 cursor-not-allowed'}`}
        >
          <ArrowLeft size={16} />
        </button>
        <button 
          onClick={onForward}
          disabled={!canGoForward}
          className={`p-2 rounded-full transition-colors ${canGoForward ? 'hover:bg-gray-750 text-gray-400' : 'text-gray-700 cursor-not-allowed'}`}
        >
          <ArrowRight size={16} />
        </button>
        <button 
          className="p-2 hover:bg-gray-750 text-gray-400 rounded-full transition-colors" 
          onClick={() => onNavigate(currentUrl)}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
            {currentUrl.startsWith('https') ? <Shield size={14} className="text-green-500" /> : <Globe size={14} />}
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-full bg-gray-950 border border-gray-750 text-gray-300 text-sm rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all font-mono"
            placeholder="Enter HyprAGENT URL..."
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
         {/* Spec Button */}
        <button
          onClick={onToggleDocs}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border 
            ${showDocs 
               ? 'bg-purple-900/30 border-purple-500 text-purple-200' 
               : 'bg-gray-900 border-gray-750 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
        >
          <BookOpen size={14} />
          Protocol Spec
        </button>

        {/* View Toggles */}
        <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-750">
            <button
            onClick={() => setViewMode('human')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'human' 
                ? 'bg-gray-750 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            >
            Human
            </button>
            <button
            onClick={() => setViewMode('agent')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'agent' 
                ? 'bg-accent-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Agent
            </button>
        </div>
      </div>
    </div>
  );
};