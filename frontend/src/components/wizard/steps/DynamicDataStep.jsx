import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Tooltip from '@/components/Tooltip';
import TagSelector from '@/components/TagSelector';
import PatternHelperModal from '@/components/PatternHelperModal';

export default function DynamicDataStep({ 
  ruleData, 
  updateRuleData
}) {
  const { t } = useLanguage();
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
    { value: 'text', label: t('dynamicData.extractionTypes.text') },
    { value: 'amount', label: t('dynamicData.extractionTypes.amount') },
    { value: 'date', label: t('dynamicData.extractionTypes.date') },
    { value: 'multiple_lines', label: t('dynamicData.extractionTypes.multipleLines') }
  ];

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('step_6_title')}</h2>
          <Tooltip content={t('tooltips.dynamicDataHelp')} />
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>{t('dynamicData.configureDescription')}</p>
      </div>

      <div className="space-y-6">
        {ruleData.dynamicData?.map((rule, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{t('dynamicData.extractionRule')} {index + 1}</h4>
                <Tooltip content={t('tooltips.extractionRuleHelp')} />
              </div>
              {ruleData.dynamicData.length > 1 && (
                <button
                  onClick={() => removeExtractionRule(index)}
                  className="hover:text-red-500 transition-colors"
                  style={{ color: 'var(--app-text-muted)' }}
                  title={t('dynamicData.removeExtractionRule')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Before Anchor */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold" style={{ color: 'var(--info-text)' }}>{t('dynamicData.beforeAnchor')}</h5>
                  <Tooltip content={t('tooltips.beforeAnchorHelp')} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.before_anchor || ''}
                    onChange={(e) => updateExtractionRule(index, 'before_anchor', e.target.value)}
                    placeholder={t('placeholders.enterPattern')}
                    className="form-input flex-1"
                  />
                  <button
                    onClick={() => openPatternHelper(index, 'before_anchor')}
                    className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    type="button"
                    title={t('wizard.openPatternHelper')}
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Extraction Type */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold text-green-600">{t('dynamicData.extractionType')}</h5>
                  <Tooltip content={t('tooltips.extractTypeHelp')} />
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
                  <h5 className="text-sm font-semibold" style={{ color: 'var(--info-text)' }}>{t('dynamicData.afterAnchor')}</h5>
                  <Tooltip content={t('tooltips.afterAnchorHelp')} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rule.after_anchor || ''}
                    onChange={(e) => updateExtractionRule(index, 'after_anchor', e.target.value)}
                    placeholder={t('placeholders.enterPattern')}
                    className="form-input flex-1"
                  />
                  <button
                    onClick={() => openPatternHelper(index, 'after_anchor')}
                    className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                    type="button"
                    title={t('wizard.openPatternHelper')}
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Target Field with Tag Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm font-semibold">{t('dynamicData.targetField')}</h5>
                  <Tooltip content={t('tooltips.targetTagHelp')} />
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
          {t('dynamicData.addExtractionRule')}
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