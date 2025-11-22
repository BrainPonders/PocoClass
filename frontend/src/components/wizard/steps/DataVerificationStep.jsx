import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Tooltip from '@/components/Tooltip';
import MDMultiplierSlider from '../MDMultiplierSlider';
import { calculateOcrMaxWeight } from '@/components/utils/pocoCalculations';

export default function DataVerificationStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const { t } = useLanguage();
  const [fieldDisplaySettings, setFieldDisplaySettings] = React.useState({});
  const [customFieldNames, setCustomFieldNames] = React.useState({});

  React.useEffect(() => {
    loadFieldDisplaySettings();
  }, []);

  React.useEffect(() => {
    // Initialize or update verification multiplier config based on enabled fields
    const enabledCount = getEnabledCount();
    const currentConfig = ruleData.verificationMultiplierConfig;
    
    if (enabledCount > 0) {
      if (!currentConfig) {
        // Initialize with auto mode
        const newConfig = { 
          mode: 'auto', 
          value: 1 / enabledCount 
        };
        updateRuleData('verificationMultiplierConfig', newConfig, false);
        updateRuleData('verificationMultiplier', newConfig.value, false);
      } else if (currentConfig.mode === 'auto') {
        // Auto mode: Dynamically recalculate when field count changes
        const newValue = 1 / enabledCount;
        if (Math.abs(currentConfig.value - newValue) > 0.001) {
          const newConfig = { mode: 'auto', value: newValue };
          updateRuleData('verificationMultiplierConfig', newConfig, false);
          updateRuleData('verificationMultiplier', newValue, false);
        }
      }
      // Manual mode: Keep existing value (no recalculation)
    } else {
      // No fields enabled: reset to default
      if (currentConfig) {
        const newConfig = { mode: 'auto', value: 1 };
        updateRuleData('verificationMultiplierConfig', newConfig, false);
        updateRuleData('verificationMultiplier', 1, false);
      }
    }
  }, [ruleData.verification?.enabledFields]);

  const loadFieldDisplaySettings = () => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setFieldDisplaySettings(parsed.fieldDisplaySettings || {});
        setCustomFieldNames(parsed.customFieldNames || {
          customField1: t('documentClassifications.invoiceNumberDefault'),
          customField2: t('documentClassifications.referenceIdDefault'),
          documentCategory: t('documentClassifications.documentCategoryDefault')
        });
      }
    } catch (e) {
      console.error('Error reading settings:', e);
    }
  };

  const allVerificationFields = [
    { key: 'title', label: t('fields.title') },
    { key: 'archiveSerialNumber', label: t('fields.archiveSerialNumber') },
    { key: 'dateCreated', label: t('fields.dateCreated') },
    { key: 'correspondent', label: t('fields.correspondent') },
    { key: 'documentType', label: t('fields.documentType') },
    { key: 'storagePath', label: t('fields.storagePath') },
    { key: 'tags', label: t('fields.tags') },
    { key: 'documentCategory', label: t('fields.documentCategory'), isCustom: true },
    { key: 'customField1', label: t('fields.customField') + ' 1', isCustom: true },
    { key: 'customField2', label: t('fields.customField') + ' 2', isCustom: true }
  ];

  const verificationFields = allVerificationFields.filter(field => 
    fieldDisplaySettings[field.key] && fieldDisplaySettings[field.key] !== 'disabled'
  );

  const toggleField = (fieldKey) => {
    const currentFields = ruleData.verification?.enabledFields || {};
    const newFields = {
      ...currentFields,
      [fieldKey]: !currentFields[fieldKey]
    };
    updateRuleData('verification', { enabledFields: newFields });
  };

  const getEnabledCount = () => {
    const enabledFieldsForVerif = ruleData.verification?.enabledFields || {};
    return Object.values(enabledFieldsForVerif).filter(Boolean).length;
  };

  const getFieldLabel = (field) => {
    if (field.isCustom) {
      const rawName = customFieldNames[field.key];
      const fieldName = typeof rawName === 'string' ? rawName : (rawName?.label || rawName?.name || field.label);
      return t('fields.customFieldLabel', { name: fieldName });
    }
    return field.label;
  };

  const enabledCount = getEnabledCount();
  
  // Get multiplier config or use defaults
  const multiplierConfig = ruleData.verificationMultiplierConfig || { 
    mode: 'auto', 
    value: enabledCount > 0 ? (1 / enabledCount) : 1 
  };
  
  // Calculate OCR max weight for warning system
  const ocrMaxWeight = calculateOcrMaxWeight(
    ruleData.ocrIdentifiers,
    ruleData.ocrMultiplier || 3
  );
  
  // Handle multiplier change from slider
  const handleMultiplierChange = (newConfig) => {
    updateRuleData('verificationMultiplierConfig', newConfig);
    // Also update legacy verificationMultiplier for backward compatibility
    updateRuleData('verificationMultiplier', newConfig.value, false);
  };

  const isStepEnabled = () => {
    return getEnabledCount() > 0;
  };

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2 justify-between" style={{minHeight: '32px'}}>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{t('wizard.step4')}</h2>
            <Tooltip content={t('tooltips.verificationHelp')} />
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isStepEnabled() 
              ? 'bg-green-100 text-green-700' 
              : ''
          }`}
            style={!isStepEnabled() ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } : {}}>
            {isStepEnabled() ? t('status.enabled') : t('status.disabled')}
          </div>
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>
          {t('wizard.verificationDescription')}
          <span className="block mt-2 text-sm italic">
            {t('wizard.verificationOptionalNote')}
          </span>
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-4">{t('wizard.selectPlaceholdersLabel')}</h3>
          {verificationFields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--app-border)' }}>
              <p style={{ color: 'var(--app-text-muted)' }}>{t('wizard.noPlaceholdersEnabled')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {verificationFields.map((field) => {
                const isEnabled = ruleData.verification?.enabledFields?.[field.key] || false;
                const fieldLabel = getFieldLabel(field);
                return (
                  <div 
                    key={field.key} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      field.isCustom ? 'bg-purple-50 border-purple-200' : ''
                    }`}
                    style={!field.isCustom ? { borderColor: 'var(--app-border)' } : {}}
                    onMouseEnter={(e) => !field.isCustom && (e.currentTarget.style.backgroundColor = 'var(--app-surface)')}
                    onMouseLeave={(e) => !field.isCustom && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span className={`text-sm font-medium ${
                      field.isCustom ? 'text-purple-900' : ''
                    }`}
                      style={!field.isCustom ? { color: 'var(--app-text)' } : {}}>
                      {fieldLabel}
                    </span>
                    <button
                      onClick={() => toggleField(field.key)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{ backgroundColor: isEnabled ? 'var(--app-primary)' : 'var(--app-border)' }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                        style={{ backgroundColor: 'var(--app-surface)' }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {enabledCount > 0 && (
          <MDMultiplierSlider
            mode={multiplierConfig.mode}
            value={multiplierConfig.value}
            enabledFieldCount={enabledCount}
            ocrMaxWeight={ocrMaxWeight}
            onChange={handleMultiplierChange}
          />
        )}
      </div>
    </div>
  );
}