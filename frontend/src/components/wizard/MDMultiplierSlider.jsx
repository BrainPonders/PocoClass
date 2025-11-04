import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
  
  // Get tooltip text
  const getTooltip = () => {
    if (mode === 'auto') {
      return `Weight is automatically adjusted to neutralize the number of placeholders (1 / ${enabledFieldCount}). Paperless data contributes a maximum of ${enabledFieldCount} point${enabledFieldCount !== 1 ? 's' : ''}.`;
    }
    return 'Manual trust weight. Paperless data influence increases linearly. Higher values may override OCR weighting.';
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Metadata Trust Multiplier
        </label>
        <Tooltip content="Controls how strongly Paperless metadata influences the final POCO Score. Use Auto for balanced scoring, or set manually to increase metadata influence." />
        {showWarning && (
          <div className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <Tooltip content="Warning: Paperless verification weight (MD) exceeds OCR weight. This may cause metadata to dominate classification results." />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max={positions.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
              showWarning ? 'bg-red-200' : 'bg-gray-200'
            }`}
            style={{
              background: showWarning 
                ? 'linear-gradient(to right, #3b82f6 0%, #3b82f6 50%, #ef4444 50%, #ef4444 100%)'
                : undefined
            }}
          />
          <div className="w-32 text-center">
            <div className="text-sm font-semibold text-blue-600">
              {getLabel()}
            </div>
            <div className="text-xs text-gray-500">
              {getTooltip()}
            </div>
          </div>
        </div>
        
        {/* Scale labels */}
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Auto</span>
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
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600">Evaluated fields:</span>
            <span className="ml-2 font-medium">{enabledFieldCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Current multiplier:</span>
            <span className="ml-2 font-medium">{effectiveMultiplier.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Potential MD weight:</span>
            <span className="ml-2 font-medium">{mdMaxWeight.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-600">OCR weight:</span>
            <span className="ml-2 font-medium">{ocrMaxWeight.toFixed(1)}</span>
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
