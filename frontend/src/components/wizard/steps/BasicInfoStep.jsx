
import React, { useState } from 'react';
import { useTranslation } from '@/components/translations';
import ValidatedInput from '@/components/ValidatedInput';
import ValidatedTextarea from '@/components/ValidatedTextarea';
import Tooltip from '@/components/Tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import { HelpCircle } from 'lucide-react';

export default function BasicInfoStep({ 
  ruleData, 
  updateRuleData,
  currentStep 
}) {
  const { t } = useTranslation();
  const [showThresholdWarning, setShowThresholdWarning] = useState(false);
  const [pendingThreshold, setPendingThreshold] = useState(null);
  const [tempThreshold, setTempThreshold] = useState(ruleData.threshold || 75);

  const generateRuleId = (ruleName) => {
    return ruleName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleRuleNameChange = (e) => {
    const newName = e.target.value;
    const updates = { ruleName: newName };
    
    if (!ruleData.ruleIdManuallyEdited) {
      updates.ruleId = generateRuleId(newName);
    }
    
    updateRuleData('', updates);
  };

  const handleThresholdSliderChange = (e) => {
    setTempThreshold(parseInt(e.target.value));
  };

  const handleThresholdSliderRelease = () => {
    const numValue = tempThreshold;
    if (numValue !== 75 && numValue !== ruleData.threshold) {
      setPendingThreshold(numValue);
      setShowThresholdWarning(true);
    } else if (numValue !== ruleData.threshold) {
      updateRuleData('threshold', numValue);
    }
  };

  const confirmThresholdChange = () => {
    if (pendingThreshold !== null) {
      updateRuleData('threshold', pendingThreshold);
    }
    setShowThresholdWarning(false);
    setPendingThreshold(null);
  };

  const cancelThresholdChange = () => {
    setTempThreshold(ruleData.threshold || 75);
    setShowThresholdWarning(false);
    setPendingThreshold(null);
  };

  const getRuleNameError = () => {
    if (!ruleData.ruleName) return t('step1_rule_name') + ' is required';
    if (ruleData.ruleName.length < 3) return 'Name must be at least 3 characters';
    return '';
  };

  const getRuleIdError = () => {
    if (!ruleData.ruleId) return 'Rule ID is required';
    if (!/^[a-z0-9_]+$/.test(ruleData.ruleId)) return 'Only lowercase letters, numbers, and underscores';
    return '';
  };

  const getDescriptionError = () => {
    if (!ruleData.description) return 'Description is required';
    if (ruleData.description.length < 10) return 'Description should be at least 10 characters';
    return '';
  };

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('step_1_title')}</h2>
          <Tooltip content="Basic information helps identify your rule and control classification behavior. The POCO Score requirement determines how confident the system must be before classifying a document. For more details, see the Guide in the sidebar." />
        </div>
        <p className="text-gray-600 mt-2">Define basic rule information and confidence requirements</p>
      </div>

      <div className="space-y-6">
        <ValidatedInput
          label={t('step1_rule_name')}
          value={ruleData.ruleName}
          onChange={handleRuleNameChange}
          placeholder={t('step1_rule_name_placeholder')}
          error={ruleData.ruleName && getRuleNameError()}
          success={ruleData.ruleName && !getRuleNameError()}
          required
          helpText={t('step1_rule_name_help')}
          tooltip="A descriptive name that helps you identify this rule. This is what you'll see in lists and reports."
        />

        <ValidatedInput
          label={t('step1_rule_id')}
          value={ruleData.ruleId}
          onChange={(e) => updateRuleData('', { 
            ruleId: e.target.value, 
            ruleIdManuallyEdited: true 
          })}
          placeholder={t('step1_rule_id_placeholder')}
          error={ruleData.ruleId && getRuleIdError()}
          success={ruleData.ruleId && !getRuleIdError()}
          required
          helpText={t('step1_rule_id_help')}
          tooltip="Technical identifier used in the system. Use lowercase, numbers, and underscores only."
        />

        <ValidatedTextarea
          label={t('step1_description')}
          value={ruleData.description}
          onChange={(e) => updateRuleData('description', e.target.value)}
          placeholder={t('step1_description_placeholder')}
          error={ruleData.description && getDescriptionError()}
          success={ruleData.description && !getDescriptionError()}
          required
          rows={4}
          tooltip="Explain what documents this rule identifies and any special characteristics or edge cases."
        />

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            POCO Score Requirement
            <Tooltip content="The minimum overall confidence score required for a document to be classified by this rule. The POCO score combines OCR content matching, filename patterns, and metadata verification. 75% is recommended for balanced accuracy." />
          </label>
          
          <div className="space-y-2">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={tempThreshold}
              onChange={handleThresholdSliderChange}
              onMouseUp={handleThresholdSliderRelease}
              onTouchEnd={handleThresholdSliderRelease}
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
                <span>75</span>
                <Tooltip content="Default: 75% is recommended for balanced accuracy between catching valid documents and avoiding false positives.">
                  <HelpCircle className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-help" />
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
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2">
            <span className="text-gray-600">Rule Name:</span>
            <span className="ml-2 font-medium">{ruleData.ruleName || 'Not set'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Rule ID:</span>
            <span className="ml-2 font-medium">{ruleData.ruleId || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-600">POCO Score Requirement:</span>
            <span className="ml-2 font-medium">{ruleData.threshold}%</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showThresholdWarning}
        onClose={cancelThresholdChange}
        onConfirm={confirmThresholdChange}
        title="Change POCO Score Requirement?"
        message={`You're changing the POCO Score requirement from 75% (recommended) to ${pendingThreshold}%. ${pendingThreshold < 75 ? 'Lower values may result in false positives (incorrect classifications).' : 'Higher values may result in missing valid documents that should be classified.'} Are you sure?`}
        confirmText="Yes, Change It"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}
