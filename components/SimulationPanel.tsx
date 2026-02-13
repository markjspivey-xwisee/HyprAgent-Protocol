import React from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { serverActions } from '../services/mockHypermedia';

interface SimulationPanelProps {
  currentUrl: string;
  onRefresh: () => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ currentUrl, onRefresh }) => {
  // Only show simulation controls if we are deep in the flow
  const isPremium = currentUrl.includes('/products/nasdaq') || currentUrl.includes('/datasets/medical');
  
  if (!isPremium) return null;

  const handleReset = () => {
    serverActions.resetSimulation();
    onRefresh();
  };

  return (
        <div className="fixed bottom-12 right-6 w-80 bg-gray-900 border border-gray-700 shadow-2xl rounded-lg overflow-hidden z-50 animate-in slide-in-from-right duration-500">
            <div className="bg-gray-800 p-3 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Settings size={12} className="text-accent-500" />
                HyprCAT Simulation
                </h3>
            </div>
             <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-950/50 rounded border border-gray-800">
                     <p className="text-[11px] text-gray-500 leading-tight">
                        Reset wallet state (Tokens and Subscriptions) to demonstrate the negotiation flow again.
                     </p>
                </div>
                <button 
                onClick={handleReset}
                className="w-full py-2 px-3 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                <RotateCcw size={12} /> Reset State
                </button>
             </div>
        </div>
     );
};