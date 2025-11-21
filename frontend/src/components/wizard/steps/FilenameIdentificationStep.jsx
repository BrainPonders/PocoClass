
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
  const summaryTextColor = isMultiplierDefault ? 'var(--info-text)' : 'var(--app-text-secondary)';

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
              : ''
          }`} style={!isStepEnabled() ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } : {}}>
            {isStepEnabled() ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>Define patterns that identify this document type by filename</p>
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
                  className="hover:text-red-500 transition-colors ml-auto"
                  style={{ color: 'var(--app-text-muted)' }}
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
          className="w-full p-3 border-2 border-dashed rounded-lg bg-transparent font-medium transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--app-border)', color: 'var(--info-text)' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--info-text)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--app-border)'}
          type="button"
        >
          <Plus className="w-4 h-4" />
          Add Filename Pattern
        </button>
      </div>

      <div>
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
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--app-bg-secondary)' }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 px-2 pb-8">
            <div className="relative" style={{fontSize: '0.7rem', color: 'var(--app-text-muted)'}}>
              <span style={{position: 'absolute', left: '0%', transform: 'translateX(-50%)', color: 'var(--info-text)'}} className="font-semibold">1</span>
              <div style={{position: 'absolute', left: '0%', transform: 'translateX(8px)'}}>
                <Tooltip content="Default: 1× multiplier is recommended because filenames are less reliable than OCR content for classification.">
                  <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--info-text)' }} />
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

      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--info-text)' }}>Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>Total patterns:</span>
            <span className="ml-2 font-medium">{totalPatterns}</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>Current multiplier:</span>
            <span className="ml-2 font-medium">{filenameMultiplier}</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>Pattern weight:</span>
            <span className="ml-2 font-medium">{totalPatterns}</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>Max filename weight:</span>
            <span className="ml-2 font-medium">{maxFilenameWeight}</span>
          </div>
          <div className="col-span-2 mt-1 pt-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <span className="text-xs italic" style={{ color: 'var(--app-text-muted)' }}>Example: With {totalPatterns} pattern{totalPatterns !== 1 ? 's' : ''} defined, max filename weight = {totalPatterns} × {totalPatterns} × {filenameMultiplier} = {maxFilenameWeight} points.</span>
          </div>
        </div>
        {filenameMultiplier > 1 && (
          <div className="mt-2 pt-2 text-amber-700 flex items-center gap-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <AlertTriangle className="w-4 h-4" />
            <span>Filename multiplier increased from default (1×).</span>
          </div>
        )}
        {maxFilenameWeight > maxOcrWeight && totalPatterns > 0 && (
          <div className="mt-2 pt-2 text-amber-700 flex items-center gap-2" style={{ borderTop: '1px solid var(--info-border)' }}>
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
