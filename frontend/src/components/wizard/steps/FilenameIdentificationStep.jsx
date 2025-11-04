
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Wand2, Trash2, HelpCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import Tooltip from '@/components/Tooltip';
import PatternHelperModal from '@/components/PatternHelperModal';

export default function FilenameIdentificationStep({ 
  ruleData, 
  updateRuleData
}) {
  const { t } = useTranslation();
  const isInitialized = useRef(false);
  const [showPatternHelper, setShowPatternHelper] = useState(false);
  const [activePatternIndex, setActivePatternIndex] = useState(null);

  useEffect(() => {
    if (!isInitialized.current && (!ruleData.filenamePatterns || !ruleData.filenamePatterns.patterns)) {
      updateRuleData('filenamePatterns', {
        patterns: [''],
        dateFormats: []
      });
      isInitialized.current = true;
    }
  }, [ruleData.filenamePatterns, updateRuleData]);

  const addPattern = () => {
    const currentPatterns = ruleData.filenamePatterns?.patterns || [];
    updateRuleData('filenamePatterns', {
      ...ruleData.filenamePatterns,
      patterns: [...currentPatterns, '']
    });
  };

  const updatePattern = (index, value) => {
    const newPatterns = [...(ruleData.filenamePatterns?.patterns || [])];
    newPatterns[index] = value;
    updateRuleData('filenamePatterns', {
      ...ruleData.filenamePatterns,
      patterns: newPatterns
    });
  };

  const removePattern = (index) => {
    const currentPatterns = ruleData.filenamePatterns?.patterns || [];
    if (currentPatterns.length <= 1) return;
    const newPatterns = currentPatterns.filter((_, i) => i !== index);
    updateRuleData('filenamePatterns', {
      ...ruleData.filenamePatterns,
      patterns: newPatterns
    });
  };

  const openPatternHelper = (index) => {
    setActivePatternIndex(index);
    setShowPatternHelper(true);
  };

  const handleUsePattern = (pattern) => {
    if (activePatternIndex !== null) {
      updatePattern(activePatternIndex, pattern);
    }
    setShowPatternHelper(false);
    setActivePatternIndex(null);
  };

  const filenameWeight = 2; // This variable is no longer used in maxFilenameWeight calculation per outline, but kept for context if needed elsewhere.
  const filenameMultiplier = ruleData.filenameMultiplier || 1;
  const patterns = ruleData.filenamePatterns?.patterns || [];
  const totalPatterns = patterns.filter(p => p && typeof p === 'string' && p.trim()).length;
  const maxFilenameWeight = totalPatterns * totalPatterns * filenameMultiplier;

  // Calculate OCR weight for comparison
  const ocrMultiplier = ruleData.ocrMultiplier || 3;
  const totalIdentifiers = ruleData.ocrIdentifiers?.reduce((sum, group) => {
    if (group.type === 'match_all') {
      return sum + (group.conditions?.length || 0);
    } else {
      return sum + 1;
    }
  }, 0) || 0;
  const maxOcrWeight = totalIdentifiers * totalIdentifiers * ocrMultiplier;

  const isStepEnabled = () => {
    return patterns.filter(p => p && typeof p === 'string' && p.trim()).length > 0;
  };

  const isMultiplierDefault = filenameMultiplier === 1;
  const summaryTextColor = isMultiplierDefault ? 'text-blue-700' : 'text-gray-600';

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2 justify-between" style={{minHeight: '32px'}}>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{t('step_4_title')}</h2>
            <Tooltip content="Filename patterns help identify documents by their file names. Use the Pattern Helper to create flexible patterns that handle variations in naming conventions." />
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isStepEnabled() 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isStepEnabled() ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <p className="text-gray-600 mt-2">Define patterns that identify this document type by filename</p>
      </div>

      <div className="space-y-4 mb-6">
        {patterns.map((pattern, index) => (
          <div key={index}>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-semibold">Filename Pattern {index + 1}</label>
              <Tooltip content="Enter a simple text string to search for in filenames, or use the Pattern Helper to build flexible patterns, or write your own regex for advanced matching." />
              {patterns.length > 1 && (
                <button
                  onClick={() => removePattern(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  type="button"
                  title="Remove pattern"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pattern}
                onChange={(e) => updatePattern(index, e.target.value)}
                placeholder="Enter text or regex pattern..."
                className="form-input flex-1"
              />
              <button
                onClick={() => openPatternHelper(index)}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                type="button"
                title="Open Pattern Helper"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        
        <button 
          onClick={addPattern}
          className="w-full p-3 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg bg-transparent text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add Filename Pattern
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">Filename Weight Multiplier</h3>
          <Tooltip content="Controls how much influence filename patterns have in the final POCO score. Higher values mean filenames are more important." />
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={filenameMultiplier}
            onChange={(e) => updateRuleData('filenameMultiplier', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          
          {/* Scale markers */}
          <div className="relative mt-2">
            <div className="flex justify-between text-xs text-gray-500">
              <div style={{position: 'absolute', left: '0%', transform: 'translateX(-50%)'}} className="flex items-center gap-1">
                <span className="text-blue-600 font-semibold">1</span>
                <Tooltip content="Default: 1× multiplier is recommended because filenames are less reliable than OCR content for classification.">
                  <HelpCircle className="w-3 h-3 text-blue-400 hover:text-blue-600 cursor-help" />
                </Tooltip>
              </div>
              <span style={{position: 'absolute', left: '11.11%', transform: 'translateX(-50%)'}}>2</span>
              <span style={{position: 'absolute', left: '22.22%', transform: 'translateX(-50%)'}}>3</span>
              <span style={{position: 'absolute', left: '33.33%', transform: 'translateX(-50%)'}}>4</span>
              <span style={{position: 'absolute', left: '44.44%', transform: 'translateX(-50%)'}}>5</span>
              <span style={{position: 'absolute', left: '55.56%', transform: 'translateX(-50%)'}}>6</span>
              <span style={{position: 'absolute', left: '66.67%', transform: 'translateX(-50%)'}}>7</span>
              <span style={{position: 'absolute', left: '77.78%', transform: 'translateX(-50%)'}}>8</span>
              <span style={{position: 'absolute', left: '88.89%', transform: 'translateX(-50%)'}}>9</span>
              <span style={{position: 'absolute', left: '100%', transform: 'translateX(-50%)'}}>10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Total patterns:</span>
            <span className="ml-2 font-medium">{totalPatterns}</span>
          </div>
          <div>
            <span className="text-gray-600">Current multiplier:</span>
            <span className="ml-2 font-medium">{filenameMultiplier}</span>
          </div>
          <div>
            <span className="text-gray-600">Pattern weight:</span>
            <span className="ml-2 font-medium">{totalPatterns}</span>
          </div>
          <div>
            <span className="text-gray-600">Max filename weight:</span>
            <span className="ml-2 font-medium">{maxFilenameWeight}</span>
          </div>
          <div className="col-span-2 mt-1 pt-2 border-t border-blue-200">
            <span className="text-gray-500 text-xs italic">Example: With {totalPatterns} pattern{totalPatterns !== 1 ? 's' : ''} defined, max filename weight = {totalPatterns} × {totalPatterns} × {filenameMultiplier} = {maxFilenameWeight} points.</span>
          </div>
        </div>
        {filenameMultiplier > 1 && (
          <div className="mt-2 pt-2 border-t border-blue-300 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Filename multiplier increased from default (1×).</span>
          </div>
        )}
        {maxFilenameWeight > maxOcrWeight && totalPatterns > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-300 text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Filename weight exceeds OCR weight.</span>
          </div>
        )}
      </div>

      {showPatternHelper && (
        <PatternHelperModal
          isOpen={showPatternHelper}
          onClose={() => {
            setShowPatternHelper(false);
            setActivePatternIndex(null);
          }}
          onUsePattern={handleUsePattern}
          initialValue={activePatternIndex !== null ? patterns[activePatternIndex] : ''}
        />
      )}
    </div>
  );
}
