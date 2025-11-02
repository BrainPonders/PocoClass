
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Wand2, Trash2 } from 'lucide-react'; // Import Trash2 icon
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
        <p className="text-sm text-gray-600 mb-3">
          Controls how much weight filename patterns have in the final POCO score. Default is 1× because filenames are less reliable than OCR content.
        </p>
        
        {/* Current Value Display */}
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Current Value</div>
            <div className="text-3xl font-bold text-blue-700">{filenameMultiplier}×</div>
          </div>
        </div>

        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={filenameMultiplier}
            onChange={(e) => updateRuleData('filenameMultiplier', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((filenameMultiplier - 1) / 9) * 100}%, #e5e7eb ${((filenameMultiplier - 1) / 9) * 100}%, #e5e7eb 100%)`
            }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 mb-1">
            <div className="flex justify-between items-center">
              <div className="text-center relative">
                <div className="text-sm font-semibold text-green-600">1×</div>
                <div className="text-xs text-green-600 font-medium">Default</div>
                <div className="w-0.5 h-2 bg-green-500 mx-auto mt-1"></div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">10×</div>
                <div className="w-0.5 h-2 bg-gray-400 mx-auto"></div>
              </div>
            </div>
          </div>
          
          {/* Text labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-6">
            <span className="font-medium">Low Weight</span>
            <span className="font-medium">High Weight</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Configuration Summary</h4>
        <div className={`text-sm ${summaryTextColor} space-y-1`}>
          <p><strong>Total Patterns:</strong> {totalPatterns} patterns</p>
          <p><strong>Filename Pattern Weight:</strong> {totalPatterns} points</p>
          <p><strong>Filename Multiplier:</strong> {filenameMultiplier}×</p>
          <p><strong>Maximum Filename Weight for Poco Score:</strong> {maxFilenameWeight} points (= {totalPatterns} * {totalPatterns} * {filenameMultiplier})</p>
        </div>
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
