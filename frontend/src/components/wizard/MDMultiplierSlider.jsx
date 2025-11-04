import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Tooltip from '@/components/Tooltip';

export default function MDMultiplierSlider({ 
  mode = 'auto',
  value = 1,
  enabledFieldCount = 0,
  ocrMaxWeight = 0,
  onChange
}) {
  // Calculate slider positions: Auto | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  const positions = ['auto', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  // Get current position index
  const getCurrentPositionIndex = () => {
    if (mode === 'auto') return 0;
    const manualIndex = positions.findIndex(p => p === value);
    return manualIndex >= 0 ? manualIndex : 1; // Default to 1 if not found
  };
  
  const currentIndex = getCurrentPositionIndex();
  
  // Calculate effective multiplier for display
  const getEffectiveMultiplier = () => {
    if (mode === 'auto') {
      return enabledFieldCount > 0 ? (1 / enabledFieldCount) : 1;
    }
    return value;
  };
  
  const effectiveMultiplier = getEffectiveMultiplier();
  
  // Calculate MD max weight
  const mdMaxWeight = enabledFieldCount * enabledFieldCount * effectiveMultiplier;
  
  // Check if warning should be shown
  const showWarning = mdMaxWeight > ocrMaxWeight && ocrMaxWeight > 0;
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value);
    const newPosition = positions[newIndex];
    
    if (newPosition === 'auto') {
      onChange({ mode: 'auto', value: 1 / enabledFieldCount });
    } else {
      onChange({ mode: 'manual', value: newPosition });
    }
  };
  
  // Format label for current position
  const getLabel = () => {
    if (mode === 'auto') {
      return 'Auto (Neutraliser)';
    }
    return `${value}×`;
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Metadata Trust Multiplier
        </label>
        <Tooltip content="Controls how strongly Paperless metadata influences the final POCO Score. Use Auto for balanced scoring, or set manually to increase metadata influence." />
      </div>
      
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={positions.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
        />
        
        {/* Scale labels */}
        <div className="relative mt-2 px-2 pb-8">
          <div className="relative text-gray-500" style={{fontSize: '0.7rem'}}>
            <span style={{position: 'absolute', left: '0%', transform: 'translateX(-50%)'}} className="text-blue-600 font-semibold">Auto</span>
            <div style={{position: 'absolute', left: '0%', transform: 'translateX(22px)'}}>
              <Tooltip content={`Auto Mode (Neutraliser): Weight is automatically adjusted to 1 ÷ ${enabledFieldCount}, ensuring Paperless verification contributes exactly ${enabledFieldCount} point${enabledFieldCount !== 1 ? 's' : ''} to the max weight. This prevents metadata from dominating OCR scoring.`}>
                <HelpCircle className="w-3 h-3 text-blue-400 hover:text-blue-600 cursor-help" />
              </Tooltip>
            </div>
            <span style={{position: 'absolute', left: '10%', transform: 'translateX(-50%)'}}>1</span>
            <span style={{position: 'absolute', left: '20%', transform: 'translateX(-50%)'}}>2</span>
            <span style={{position: 'absolute', left: '30%', transform: 'translateX(-50%)'}}>3</span>
            <span style={{position: 'absolute', left: '40%', transform: 'translateX(-50%)'}}>4</span>
            <span style={{position: 'absolute', left: '50%', transform: 'translateX(-50%)'}}>5</span>
            <span style={{position: 'absolute', left: '60%', transform: 'translateX(-50%)'}}>6</span>
            <span style={{position: 'absolute', left: '70%', transform: 'translateX(-50%)'}}>7</span>
            <span style={{position: 'absolute', left: '80%', transform: 'translateX(-50%)'}}>8</span>
            <span style={{position: 'absolute', left: '90%', transform: 'translateX(-50%)'}}>9</span>
            <span style={{position: 'absolute', left: '100%', transform: 'translateX(-50%)'}}>10</span>
          </div>
        </div>
      </div>
      
      {/* Dynamic info display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600">Evaluated fields:</span>
            <span className="ml-2 font-medium">{enabledFieldCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Current multiplier:</span>
            <span className="ml-2 font-medium">{effectiveMultiplier < 1 ? effectiveMultiplier.toFixed(2) : Math.round(effectiveMultiplier)}</span>
          </div>
          <div>
            <span className="text-gray-600">Verification weight:</span>
            <span className="ml-2 font-medium">{enabledFieldCount * enabledFieldCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Potential MD weight:</span>
            <span className="ml-2 font-medium">{mdMaxWeight < 1 ? mdMaxWeight.toFixed(2) : Math.round(mdMaxWeight)}</span>
          </div>
          <div className="col-span-2 mt-1 pt-2 border-t border-blue-200">
            <span className="text-gray-500 text-xs italic">Example: With {enabledFieldCount} field{enabledFieldCount !== 1 ? 's' : ''} verified, max MD weight = {enabledFieldCount} × {enabledFieldCount} × {effectiveMultiplier < 1 ? effectiveMultiplier.toFixed(2) : Math.round(effectiveMultiplier)} = {mdMaxWeight < 1 ? mdMaxWeight.toFixed(2) : Math.round(mdMaxWeight)} points.</span>
          </div>
        </div>
        {mode !== 'auto' && (
          <div className="mt-2 pt-2 border-t border-blue-300 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Metadata multiplier changed from default (Auto).</span>
          </div>
        )}
        {showWarning && (
          <div className="mt-2 pt-2 border-t border-blue-300 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Paperless verification weight exceeds OCR.</span>
          </div>
        )}
      </div>
    </div>
  );
}
