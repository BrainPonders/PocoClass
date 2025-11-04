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
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <div className="flex items-center gap-1">
            <span className="text-orange-600 font-semibold">Auto</span>
            <Tooltip content={`Auto Mode (Neutraliser): Weight is automatically adjusted to 1 ÷ ${enabledFieldCount}, ensuring Paperless verification contributes exactly ${enabledFieldCount} point${enabledFieldCount !== 1 ? 's' : ''} to the max weight. This prevents metadata from dominating OCR scoring.`}>
              <HelpCircle className="w-3 h-3 text-orange-400 hover:text-orange-600 cursor-help" />
            </Tooltip>
          </div>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
          <span>7</span>
          <span>8</span>
          <span>9</span>
          <span>10</span>
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
            <span className="text-gray-600">Potential MD weight:</span>
            <span className="ml-2 font-medium">{mdMaxWeight < 1 ? mdMaxWeight.toFixed(2) : Math.round(mdMaxWeight)}</span>
          </div>
          <div>
            <span className="text-gray-600">OCR weight:</span>
            <span className="ml-2 font-medium">{ocrMaxWeight < 1 ? ocrMaxWeight.toFixed(2) : Math.round(ocrMaxWeight)}</span>
          </div>
          <div className="col-span-2 mt-1 pt-2 border-t border-blue-200">
            <span className="text-gray-500 text-xs italic">Example: With {enabledFieldCount} field{enabledFieldCount !== 1 ? 's' : ''} verified, max MD weight = {enabledFieldCount} × {enabledFieldCount} × {effectiveMultiplier < 1 ? effectiveMultiplier.toFixed(2) : Math.round(effectiveMultiplier)} = {mdMaxWeight < 1 ? mdMaxWeight.toFixed(2) : Math.round(mdMaxWeight)} points.</span>
          </div>
        </div>
        {showWarning && (
          <div className="mt-2 pt-2 border-t border-blue-300 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>⚠️ Paperless verification weight exceeds OCR.</span>
          </div>
        )}
      </div>
    </div>
  );
}
