
import React, { useEffect, useRef, useState } from 'react';
import { Plus, FileText, Eye, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import LogicGroupEditor from '../LogicGroupEditor';
import Tooltip from '@/components/Tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function OcrIdentifiersStep({ 
  ruleData, 
  updateRuleData,
  selectedDocumentId,
  selectedDocumentName,
  onViewOcr,
  onViewPdf
}) {
  const { t } = useTranslation();
  const isInitialized = useRef(false);
  const [showOcrThresholdWarning, setShowOcrThresholdWarning] = useState(false);
  const [pendingOcrThreshold, setPendingOcrThreshold] = useState(null);
  const [showMultiplierWarning, setShowMultiplierWarning] = useState(false);
  const [pendingMultiplier, setPendingMultiplier] = useState(null);

  // Temporary state for slider values to allow for confirmation dialog before committing
  const [tempOcrThreshold, setTempOcrThreshold] = useState(ruleData.ocrThreshold || 75);
  const [tempMultiplier, setTempMultiplier] = useState(ruleData.ocrMultiplier || 3);

  // Effect to sync temp states if ruleData changes from outside this component
  useEffect(() => {
    setTempOcrThreshold(ruleData.ocrThreshold || 75);
  }, [ruleData.ocrThreshold]);

  useEffect(() => {
    setTempMultiplier(ruleData.ocrMultiplier || 3);
  }, [ruleData.ocrMultiplier]);

  const addOcrLogicGroup = () => {
    const currentGroups = ruleData.ocrIdentifiers || [];
    const newGroup = {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: '', range: '0-1600' }]
    };
    const updatedGroups = [...currentGroups, newGroup];
    updateRuleData('ocrIdentifiers', updatedGroups);
  };

  const updateOcrLogicGroup = (index, updatedGroup) => {
    const newGroups = [...(ruleData.ocrIdentifiers || [])];
    newGroups[index] = updatedGroup;
    updateRuleData('ocrIdentifiers', newGroups);
  };

  const removeOcrLogicGroup = (index) => {
    const currentGroups = ruleData.ocrIdentifiers || [];
    if (currentGroups.length <= 3) return;
    
    const newGroups = currentGroups.filter((_, i) => i !== index);
    updateRuleData('ocrIdentifiers', newGroups);
  };

  useEffect(() => {
    if (!isInitialized.current && (!ruleData.ocrIdentifiers || ruleData.ocrIdentifiers.length === 0)) {
      const initialGroups = [
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] },
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] },
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] }
      ];
      updateRuleData('ocrIdentifiers', initialGroups, false); // false = initialization, not a user change
      isInitialized.current = true;
    }
  }, [ruleData.ocrIdentifiers, updateRuleData]);

  const handleOcrThresholdSliderChange = (e) => {
    setTempOcrThreshold(parseInt(e.target.value));
  };

  const handleOcrThresholdSliderRelease = () => {
    const numValue = tempOcrThreshold;
    if (numValue !== 75 && numValue !== ruleData.ocrThreshold) {
      const hideWarning = sessionStorage.getItem('hideWarning_ocrThreshold') === 'true';
      if (hideWarning) {
        updateRuleData('ocrThreshold', numValue);
        setTempOcrThreshold(numValue);
      } else {
        setPendingOcrThreshold(numValue);
        setShowOcrThresholdWarning(true);
      }
    } else if (numValue !== ruleData.ocrThreshold) {
      updateRuleData('ocrThreshold', numValue);
    }
  };

  const handleMultiplierSliderChange = (e) => {
    setTempMultiplier(parseInt(e.target.value));
  };

  const handleMultiplierSliderRelease = () => {
    const numValue = tempMultiplier;
    if (numValue !== 3 && numValue !== ruleData.ocrMultiplier) {
      const hideWarning = sessionStorage.getItem('hideWarning_ocrMultiplier') === 'true';
      if (hideWarning) {
        updateRuleData('ocrMultiplier', numValue);
        setTempMultiplier(numValue);
      } else {
        setPendingMultiplier(numValue);
        setShowMultiplierWarning(true);
      }
    } else if (numValue !== ruleData.ocrMultiplier) {
      updateRuleData('ocrMultiplier', numValue);
    }
  };

  const confirmOcrThresholdChange = () => {
    if (pendingOcrThreshold !== null) {
      updateRuleData('ocrThreshold', pendingOcrThreshold);
      setTempOcrThreshold(pendingOcrThreshold); // Update temp state to reflect confirmed value
    }
    setShowOcrThresholdWarning(false);
    setPendingOcrThreshold(null);
  };

  const cancelOcrThresholdChange = () => {
    setTempOcrThreshold(ruleData.ocrThreshold || 75); // Reset temp to actual ruleData value
    setShowOcrThresholdWarning(false);
    setPendingOcrThreshold(null);
  };

  const confirmMultiplierChange = () => {
    if (pendingMultiplier !== null) {
      updateRuleData('ocrMultiplier', pendingMultiplier);
      setTempMultiplier(pendingMultiplier); // Update temp state to reflect confirmed value
    }
    setShowMultiplierWarning(false);
    setPendingMultiplier(null);
  };

  const cancelMultiplierChange = () => {
    setTempMultiplier(ruleData.ocrMultiplier || 3); // Reset temp to actual ruleData value
    setShowMultiplierWarning(false);
    setPendingMultiplier(null);
  };

  // These `ocrMultiplier` and `ocrThreshold` refer to the actual `ruleData` values, not the temporary slider values.
  const ocrMultiplier = ruleData.ocrMultiplier || 3; 
  const ocrThreshold = ruleData.ocrThreshold || 75;
  
  // Calculate total identifiers based on logic:
  // - OR groups (type: 'match') count as 1
  // - AND groups (type: 'match_all') count each condition
  const totalIdentifiers = ruleData.ocrIdentifiers?.reduce((sum, group) => {
    if (group.type === 'match_all') {
      return sum + (group.conditions?.length || 0);
    } else {
      return sum + 1;
    }
  }, 0) || 0;
  
  // Changed calculation based on outline: totalIdentifiers * totalIdentifiers * ocrMultiplier
  const maxOcrWeight = totalIdentifiers * totalIdentifiers * ocrMultiplier;

  const filledGroups = ruleData.ocrIdentifiers?.filter(group => 
    group.conditions?.some(c => c.pattern && c.pattern.trim() !== '')
  ).length || 0;

  // Check if values are at default/recommended
  const isOcrThresholdDefault = ocrThreshold === 75;
  const isMultiplierDefault = ocrMultiplier === 3;
  const summaryTextColor = (isOcrThresholdDefault && isMultiplierDefault) ? 'text-blue-700' : 'text-gray-600';

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('step_2_title')}</h2>
          <Tooltip content={t('ocr_identifiers_tooltip')} />
        </div>
        <p className="text-gray-600 mt-2">{t('ocr_identifiers_description')}</p>
        {selectedDocumentId && selectedDocumentName && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            📄 Working with: <span className="font-medium">{selectedDocumentName}</span>
          </div>
        )}
        {filledGroups < 3 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {t('ocr_identifiers_warning', { filledGroups })}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {ruleData.ocrIdentifiers?.map((group, index) => (
          <LogicGroupEditor
            key={index}
            group={group}
            index={index}
            onUpdate={(updatedGroup) => updateOcrLogicGroup(index, updatedGroup)}
            onDelete={() => removeOcrLogicGroup(index)}
            type="ocr"
            canDelete={ruleData.ocrIdentifiers.length > 3}
          />
        ))}
        <button 
          onClick={addOcrLogicGroup}
          className="btn btn-outline w-full"
        >
          <Plus className="w-4 h-4" />
          {t('add_logic_group')}
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">OCR Score Requirement</h3>
          <Tooltip content={t('ocr_score_requirement_tooltip')} />
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={tempOcrThreshold}
            onChange={handleOcrThresholdSliderChange}
            onMouseUp={handleOcrThresholdSliderRelease}
            onTouchEnd={handleOcrThresholdSliderRelease}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          
          {/* Scale markers */}
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>50</span>
            <span>55</span>
            <span>60</span>
            <span>65</span>
            <span>70</span>
            <div className="flex items-center gap-1">
              <span className="text-blue-600 font-semibold">75</span>
              <Tooltip content="Default: 75% is recommended as the minimum OCR confidence score for accurate pattern matching.">
                <HelpCircle className="w-3 h-3 text-blue-400 hover:text-blue-600 cursor-help" />
              </Tooltip>
            </div>
            <span>80</span>
            <span>85</span>
            <span>90</span>
            <span>95</span>
            <span>100</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">OCR Weight Multiplier</h3>
          <Tooltip content={t('ocr_weight_multiplier_tooltip')} />
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={tempMultiplier}
            onChange={handleMultiplierSliderChange}
            onMouseUp={handleMultiplierSliderRelease}
            onTouchEnd={handleMultiplierSliderRelease}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          
          {/* Scale markers */}
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>1</span>
            <span>2</span>
            <div className="flex items-center gap-1">
              <span className="text-purple-600 font-semibold">3</span>
              <Tooltip content="Default: 3× multiplier gives OCR patterns strong weight in the final POCO score calculation.">
                <HelpCircle className="w-3 h-3 text-purple-400 hover:text-purple-600 cursor-help" />
              </Tooltip>
            </div>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Logic groups:</span>
            <span className="ml-2 font-medium">{ruleData.ocrIdentifiers?.length || 0}</span>
          </div>
          <div>
            <span className="text-gray-600">Total identifiers:</span>
            <span className="ml-2 font-medium">{totalIdentifiers} <span className="text-gray-500 text-xs">(including AND)</span></span>
          </div>
          <div>
            <span className="text-gray-600">OCR score requirement:</span>
            <span className="ml-2 font-medium">{ocrThreshold}%</span>
          </div>
          <div>
            <span className="text-gray-600">OCR multiplier:</span>
            <span className="ml-2 font-medium">{ocrMultiplier}×</span>
          </div>
          <div>
            <span className="text-gray-600">Pattern weight:</span>
            <span className="ml-2 font-medium">{totalIdentifiers}</span>
          </div>
          <div>
            <span className="text-gray-600">Max OCR weight:</span>
            <span className="ml-2 font-medium">{maxOcrWeight}</span>
          </div>
          {totalIdentifiers > 0 && (
            <div className="col-span-2 mt-1 pt-2 border-t border-blue-200">
              <span className="text-gray-500 text-xs italic">Example: If all {totalIdentifiers} pattern{totalIdentifiers !== 1 ? 's' : ''} match, OCR Score = ({totalIdentifiers}/{totalIdentifiers}) × 100 = 100%. Max OCR weight = {maxOcrWeight} points.</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showOcrThresholdWarning}
        onClose={cancelOcrThresholdChange}
        onConfirm={confirmOcrThresholdChange}
        title={t('change_ocr_score_requirement_title')}
        message={t('change_ocr_score_requirement_message', { pendingOcrThreshold })}
        confirmText={t('yes_change_it')}
        cancelText={t('cancel')}
        variant="warning"
        showDontShowAgain={true}
        warningKey="ocrThreshold"
      />

      <ConfirmDialog
        isOpen={showMultiplierWarning}
        onClose={cancelMultiplierChange}
        onConfirm={confirmMultiplierChange}
        title={t('change_ocr_weight_multiplier_title')}
        message={t('change_ocr_weight_multiplier_message', { pendingMultiplier })}
        confirmText={t('yes_change_it')}
        cancelText={t('cancel')}
        variant="warning"
        showDontShowAgain={true}
        warningKey="ocrMultiplier"
      />
    </div>
  );
}
