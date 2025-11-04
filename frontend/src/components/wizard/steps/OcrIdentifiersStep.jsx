
import React, { useEffect, useRef, useState } from 'react';
import { Plus, FileText, Eye } from 'lucide-react';
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
      setPendingOcrThreshold(numValue);
      setShowOcrThresholdWarning(true);
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
      setPendingMultiplier(numValue);
      setShowMultiplierWarning(true);
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
        <p className="text-sm text-gray-600 mb-3">
          {t('ocr_score_requirement_description')}
        </p>
        
        {/* Current Value Display */}
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Current Value</div>
            <div className="text-3xl font-bold text-blue-700">{tempOcrThreshold}%</div>
          </div>
        </div>

        <div className="mt-2">
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={tempOcrThreshold}
            onChange={handleOcrThresholdSliderChange}
            onMouseUp={handleOcrThresholdSliderRelease}
            onTouchEnd={handleOcrThresholdSliderRelease}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${((tempOcrThreshold - 50) / 50) * 100}%, #e5e7eb ${((tempOcrThreshold - 50) / 50) * 100}%)`
            }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 mb-1">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700 leading-tight">50%</div>
                <div className="text-xs text-gray-600 font-medium leading-tight">{t('permissive')}</div>
              </div>
              <div className="text-center relative">
                <div className="text-sm font-semibold text-green-600 leading-tight">75%</div>
                <div className="text-xs text-green-600 font-medium leading-tight">Default</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700 leading-tight">100%</div>
                <div className="text-xs text-gray-600 font-medium leading-tight">{t('very_strict')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">OCR Weight Multiplier</h3>
          <Tooltip content={t('ocr_weight_multiplier_tooltip')} />
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {t('ocr_weight_multiplier_description')}
        </p>
        
        {/* Current Value Display */}
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Current Value</div>
            <div className="text-3xl font-bold text-blue-700">{tempMultiplier}×</div>
          </div>
        </div>

        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={tempMultiplier}
            onChange={handleMultiplierSliderChange}
            onMouseUp={handleMultiplierSliderRelease}
            onTouchEnd={handleMultiplierSliderRelease}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${((tempMultiplier - 1) / 9) * 100}%, #e5e7eb ${((tempMultiplier - 1) / 9) * 100}%)`
            }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 mb-1">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700 leading-tight">1×</div>
                <div className="text-xs text-gray-600 font-medium leading-tight">{t('low_weight')}</div>
              </div>
              <div className="absolute left-[22.2%] -translate-x-1/2 text-center">
                <div className="text-sm font-semibold text-green-600 leading-tight">3×</div>
                <div className="text-xs text-green-600 font-medium leading-tight">Default</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700 leading-tight">10×</div>
                <div className="text-xs text-gray-600 font-medium leading-tight">{t('high_weight')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">{t('configuration_summary')}</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="col-span-2">
            <span className="text-gray-600">{t('logic_groups_summary')}:</span>
            <span className="ml-2 font-medium">{ruleData.ocrIdentifiers?.length || 0} {t('with_total_identifiers', { totalIdentifiers })}</span>
          </div>
          <div>
            <span className="text-gray-600">{t('ocr_score_requirement_summary')}:</span>
            <span className="ml-2 font-medium">{ocrThreshold}%</span>
          </div>
          <div>
            <span className="text-gray-600">{t('ocr_multiplier_summary')}:</span>
            <span className="ml-2 font-medium">{ocrMultiplier}×</span>
          </div>
          <div>
            <span className="text-gray-600">{t('ocr_pattern_weight_summary')}:</span>
            <span className="ml-2 font-medium">{totalIdentifiers} {t('points')}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">{t('max_ocr_weight_summary')}:</span>
            <span className="ml-2 font-medium">{maxOcrWeight} {t('points')}</span>
            <span className="text-gray-500 text-xs ml-1">(= {totalIdentifiers} * {totalIdentifiers} * {ocrMultiplier})</span>
          </div>
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
      />
    </div>
  );
}
