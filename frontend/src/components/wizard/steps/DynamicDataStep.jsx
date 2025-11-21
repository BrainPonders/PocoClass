import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import Tooltip from '@/components/Tooltip';
import TagSelector from '@/components/TagSelector';
import PatternHelperModal from '@/components/PatternHelperModal';

export default function DynamicDataStep({ 
  ruleData, 
  updateRuleData
}) {
  const { t } = useTranslation();
  const isInitialized = useRef(false);
  const [showPatternHelper, setShowPatternHelper] = useState(false);
  const [patternHelperContext, setPatternHelperContext] = useState({ ruleIndex: null, field: null });

  useEffect(() => {
    if (!isInitialized.current && (!ruleData.dynamicData || ruleData.dynamicData.length === 0)) {
      updateRuleData('dynamicData', [
        { target_field: '', before_anchor: '', extraction_type: 'text', after_anchor: '' }
      ]);
      isInitialized.current = true;
    }
  }, [ruleData.dynamicData, updateRuleData]);

  const addExtractionRule = () => {
    const currentRules = ruleData.dynamicData || [];
    const newRule = { target_field: '', before_anchor: '', extraction_type: 'text', after_anchor: '' };
    updateRuleData('dynamicData', [...currentRules, newRule]);
  };

  const updateExtractionRule = (index, field, value) => {
    const newRules = [...(ruleData.dynamicData || [])];
    newRules[index] = { ...newRules[index], [field]: value };
    updateRuleData('dynamicData', newRules);
  };

  const removeExtractionRule = (index) => {
    const currentRules = ruleData.dynamicData || [];
    if (currentRules.length <= 1) return;
    const newRules = currentRules.filter((_, i) => i !== index);
    updateRuleData('dynamicData', newRules);
  };

  const openPatternHelper = (ruleIndex, field) => {
    setPatternHelperContext({ ruleIndex, field });
    setShowPatternHelper(true);
  };

  const handleUsePattern = (pattern) => {
    if (patternHelperContext.ruleIndex !== null && patternHelperContext.field) {
      updateExtractionRule(patternHelperContext.ruleIndex, patternHelperContext.field, pattern);
    }
    setShowPatternHelper(false);
    setPatternHelperContext({ ruleIndex: null, field: null });
  };

  const extractionTypes = [
    { value: 'text', label: 'Text (until end of line)' },
    { value: 'amount', label: 'Amount/Number' },
    { value: 'date', label: 'Date' },
    { value: 'multiple_lines', label: 'Multiple Lines' }
  ];

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('step_6_title')}</h2>
          <Tooltip content="Dynamic data extraction allows you to pull specific information from documents using anchor points. Define patterns before and after the data you want to extract." />
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>Configure data extraction rules to capture specific information from documents</p>
      </div>

      <div className="space-y-6">
        {ruleData.dynamicData?.map((rule, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">Extraction Rule {index + 1}</h4>
                <Tooltip content="Each extraction rule identifies and extracts specific data from the document using before and after anchor patterns." />
              </div>
              {ruleData.dynamicData.length > 1 && (
                <button
                  onClick={() => removeExtractionRule(index)}
                  className="hover:text-red-500 transition-colors"
                  style={{ color: 'var(--app-text-muted)' }}
                  title="Remove extraction rule"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Before Anchor */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold" style={{ color: 'var(--info-text)' }}>Before Anchor</h5>
                  <Tooltip content="Text or pattern that appears before the data you want to extract. Can be simple text or regex." />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.before_anchor || ''}
                    onChange={(e) => updateExtractionRule(index, 'before_anchor', e.target.value)}
                    placeholder="Enter text or regex pattern..."
                    className="form-input flex-1"
                  />
                  <button
                    onClick={() => openPatternHelper(index, 'before_anchor')}
                    className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    type="button"
                    title="Open Pattern Helper"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Extraction Type */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold text-green-600">Extraction Type</h5>
                  <Tooltip content="Defines what type of data to extract: simple text, numeric amounts, dates, or multiple lines of text." />
                </div>
                <select
                  value={rule.extraction_type || 'text'}
                  onChange={(e) => updateExtractionRule(index, 'extraction_type', e.target.value)}
                  className="form-input w-full"
                >
                  {extractionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* After Anchor */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold" style={{ color: 'var(--info-text)' }}>After Anchor</h5>
                  <Tooltip content="Text or pattern that appears after the data you want to extract. Can be simple text or regex." />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.after_anchor || ''}
                    onChange={(e) => updateExtractionRule(index, 'after_anchor', e.target.value)}
                    placeholder="Enter text or regex pattern..."
                    className="form-input flex-1"
                  />
                  <button
                    onClick={() => openPatternHelper(index, 'after_anchor')}
                    className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    type="button"
                    title="Open Pattern Helper"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Target Field with Tag Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold">Target Field (Tags)</h5>
                  <Tooltip content="Select one or more tags where the extracted data should be stored in Paperless-ngx." />
                </div>
                <TagSelector
                  selectedTags={rule.target_field ? (Array.isArray(rule.target_field) ? rule.target_field : [rule.target_field]) : []}
                  onChange={(tags) => updateExtractionRule(index, 'target_field', tags.length === 1 ? tags[0] : tags)}
                  paperlessUrl={ruleData.paperless_url}
                  paperlessToken={ruleData.paperless_token}
                  multiple={false}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addExtractionRule}
          className="w-full p-3 border-2 border-dashed rounded-lg bg-transparent text-purple-600 hover:text-purple-700 font-medium transition-colors flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--app-border)' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c084fc'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--app-border)'}
        >
          <Plus className="w-4 h-4" />
          Add Extraction Rule
        </button>
      </div>

      {showPatternHelper && (
        <PatternHelperModal
          isOpen={showPatternHelper}
          onClose={() => {
            setShowPatternHelper(false);
            setPatternHelperContext({ ruleIndex: null, field: null });
          }}
          onUsePattern={handleUsePattern}
          initialValue={
            patternHelperContext.ruleIndex !== null && patternHelperContext.field
              ? ruleData.dynamicData[patternHelperContext.ruleIndex][patternHelperContext.field]
              : ''
          }
        />
      )}
    </div>
  );
}