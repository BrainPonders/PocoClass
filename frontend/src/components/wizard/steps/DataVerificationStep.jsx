import React, { useState, useEffect } from 'react';
import Tooltip from '@/components/Tooltip';

export default function DataVerificationStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const [fieldDisplaySettings, setFieldDisplaySettings] = React.useState({});
  const [customFieldNames, setCustomFieldNames] = React.useState({});

  React.useEffect(() => {
    loadFieldDisplaySettings();
  }, []);

  React.useEffect(() => {
    // Update verification multiplier when enabled fields change
    const enabledCount = getEnabledCount();
    if (enabledCount > 0) {
      const dynamicDefault = 1 / enabledCount;
      // For 1 field, default is 1; for 2+ fields, default is the fraction
      const defaultValue = enabledCount === 1 ? 1 : dynamicDefault;
      // Always update to the new dynamic default when field count changes
      updateRuleData('verificationMultiplier', defaultValue, false);
    } else {
      // Reset to 1 when no fields enabled
      updateRuleData('verificationMultiplier', 1, false);
    }
  }, [ruleData.verification?.enabledFields]);

  const loadFieldDisplaySettings = () => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setFieldDisplaySettings(parsed.fieldDisplaySettings || {});
        setCustomFieldNames(parsed.customFieldNames || {
          customField1: 'Invoice Number',
          customField2: 'Reference ID',
          documentCategory: 'Document Category'
        });
      }
    } catch (e) {
      console.error('Error reading settings:', e);
    }
  };

  const allVerificationFields = [
    { key: 'title', label: 'Title' },
    { key: 'archiveSerialNumber', label: 'Archive Serial Number' },
    { key: 'dateCreated', label: 'Date Created' },
    { key: 'correspondent', label: 'Correspondent' },
    { key: 'documentType', label: 'Document Type' },
    { key: 'storagePath', label: 'Storage Path' },
    { key: 'tags', label: 'Tags' },
    { key: 'documentCategory', label: 'Document Category', isCustom: true },
    { key: 'customField1', label: 'Custom Field 1', isCustom: true },
    { key: 'customField2', label: 'Custom Field 2', isCustom: true }
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
      return `Custom Field: ${fieldName}`;
    }
    return field.label;
  };

  const enabledCount = getEnabledCount();
  const dynamicDefault = enabledCount > 0 ? (enabledCount === 1 ? 1 : 1 / enabledCount) : 1;
  const verificationMultiplier = ruleData.verificationMultiplier !== undefined ? ruleData.verificationMultiplier : dynamicDefault;
  
  // Create array of discrete values: [1/n, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] or [1, 2, 3...10] for n=1
  const sliderValues = enabledCount === 1 
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    : [1 / enabledCount, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  // Find current slider index
  const currentSliderIndex = sliderValues.findIndex(val => Math.abs(val - verificationMultiplier) < 0.01);
  const sliderIndex = currentSliderIndex >= 0 ? currentSliderIndex : 0;
  
  // Format display value
  const formatValue = (value) => {
    if (value < 1) {
      return `1/${enabledCount}`;
    }
    return `${Math.round(value)}`;
  };
  
  const maxVerificationWeight = enabledCount * enabledCount * verificationMultiplier;

  const isStepEnabled = () => {
    return getEnabledCount() > 0;
  };

  const isMultiplierDefault = Math.abs(verificationMultiplier - dynamicDefault) < 0.01;
  const summaryTextColor = isMultiplierDefault ? 'text-blue-700' : 'text-gray-600';

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2 justify-between" style={{minHeight: '32px'}}>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Step 5 of 6: Paperless Verification</h2>
            <Tooltip content="Verify that extracted data matches existing Paperless metadata. This adds confidence to the classification by checking if the document's placeholders align with what was extracted from OCR." />
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isStepEnabled() 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isStepEnabled() ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          Select which Paperless placeholders must be verified and configure verification multiplier.
          <span className="block mt-2 text-sm italic">
            This step is optional. If you don't enable any fields, it will remain disabled and you can proceed to the next step.
          </span>
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-4">Select Placeholders for Verification</h3>
          {verificationFields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No placeholders enabled. Enable placeholders in Settings &gt; Step 3.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {verificationFields.map((field) => {
                const isEnabled = ruleData.verification?.enabledFields?.[field.key] || false;
                const fieldLabel = getFieldLabel(field);
                return (
                  <div 
                    key={field.key} 
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      field.isCustom ? 'bg-purple-50 border-purple-200' : 'border-gray-200'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      field.isCustom ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      {fieldLabel}
                    </span>
                    <button
                      onClick={() => toggleField(field.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {enabledCount > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Verification Multiplier</h3>
            <p className="text-sm text-gray-600 mb-3">
              Controls how much weight Paperless metadata verification has in the final POCO score. 
              {enabledCount === 1 
                ? `Default is 1 for ${enabledCount} enabled field.`
                : `Default is 1/${enabledCount} for ${enabledCount} enabled fields.`
              }
            </p>
            
            {/* Current Value Display */}
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Current Value</div>
                <div className="text-3xl font-bold text-blue-700">
                  {formatValue(verificationMultiplier)}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <input
                type="range"
                min="0"
                max={sliderValues.length - 1}
                step="1"
                value={sliderIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  updateRuleData('verificationMultiplier', sliderValues[newIndex]);
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${(sliderIndex / (sliderValues.length - 1)) * 100}%, #e5e7eb ${(sliderIndex / (sliderValues.length - 1)) * 100}%)`
                }}
              />
              
              {/* Scale markers */}
              <div className="relative mt-2 mb-1">
                <div className="flex justify-between items-center">
                  <div className="text-center relative">
                    <div className="text-sm font-semibold text-green-600 leading-tight">
                      {formatValue(sliderValues[0])}
                    </div>
                    <div className="text-xs text-green-600 font-medium leading-tight">Default</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-700 leading-tight">5</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-700 leading-tight">10</div>
                    <div className="text-xs text-gray-600 font-medium leading-tight">High Weight</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Verification Summary</h4>
        <div className={`text-sm ${summaryTextColor} space-y-1`}>
          <p><strong>Placeholders Enabled for Verification:</strong> {enabledCount} / {verificationFields.length}</p>
          <p><strong>Verification Weight:</strong> {enabledCount} points</p>
          <p><strong>Verification Multiplier:</strong> {verificationMultiplier.toFixed(3)} (= {enabledCount} * 1/{enabledCount})</p>
          <p><strong>Maximum Verification Weight for Poco Score:</strong> {maxVerificationWeight.toFixed(3)} points (= {enabledCount} * {enabledCount} * {verificationMultiplier.toFixed(3)})</p>
        </div>
      </div>
    </div>
  );
}