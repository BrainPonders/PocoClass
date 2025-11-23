import React from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import InfoBox from '../InfoBox';
import { useLanguage } from '@/contexts/LanguageContext';
import FormInput from '@/components/FormInput';

export default function StaticMetadataStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const { t } = useLanguage();
  
  const addCustomField = () => {
    const newFields = [...ruleData.staticMetadata.customFields, { name: '', value: '' }];
    updateRuleData('staticMetadata', { customFields: newFields });
  };

  const updateCustomField = (index, field, value) => {
    const newFields = [...ruleData.staticMetadata.customFields];
    newFields[index] = { ...newFields[index], [field]: value };
    updateRuleData('staticMetadata', { customFields: newFields });
  };

  const removeCustomField = (index) => {
    const newFields = ruleData.staticMetadata.customFields.filter((_, i) => i !== index);
    updateRuleData('staticMetadata', { customFields: newFields });
  };

  const addTag = (tag) => {
    if (tag && !ruleData.staticMetadata.tags.includes(tag)) {
      const newTags = [...ruleData.staticMetadata.tags, tag];
      updateRuleData('staticMetadata', { tags: newTags });
    }
  };

  const removeTag = (index) => {
    const newTags = ruleData.staticMetadata.tags.filter((_, i) => i !== index);
    updateRuleData('staticMetadata', { tags: newTags });
  };

  return (
    <div className="wizard-container">
      <div className="flex items-center gap-2 mb-6" style={{minHeight: '32px'}}>
        <h2 className="text-2xl font-bold">{t('wizard.step4Of7Title')}</h2>
        {!showInfoBoxes[4] && (
          <button 
            onClick={() => setShowInfoBoxes(prev => ({ ...prev, 4: true }))}
            className="btn btn-ghost btn-sm p-1"
            style={{ color: 'var(--app-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--app-text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--app-text-muted)'}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="mb-6" style={{ color: 'var(--app-text-secondary)' }}>
        {t('wizard.staticMetadataDescription')}
      </p>

      <InfoBox 
        stepNumber={4}
        showInfoBoxes={showInfoBoxes}
        setShowInfoBoxes={setShowInfoBoxes}
      >
        <div>
          <h4 className="font-semibold text-sm mb-1">{t('wizard.staticMetadataInfoTitle')}</h4>
          <p className="text-sm">
            {t('wizard.staticMetadataInfoText')}
          </p>
        </div>
      </InfoBox>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">{t('fields.correspondent')}</label>
            <FormInput
              type="text"
              value={ruleData.staticMetadata.correspondent}
              onChange={(e) => updateRuleData('staticMetadata', { correspondent: e.target.value })}
              placeholder={t('placeholders.organizationName')}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>{t('fields.ideallyDropdownFromSystem')}</p>
          </div>

          <div className="form-group">
            <label className="form-label">{t('fields.documentType')}</label>
            <FormInput
              type="text"
              value={ruleData.staticMetadata.documentType}
              onChange={(e) => updateRuleData('staticMetadata', { documentType: e.target.value })}
              placeholder={t('placeholders.yearStatement')}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>{t('fields.ideallyDropdown')}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('fields.tags')}</label>
          <div className="flex gap-2 mb-2">
            <FormInput
              type="text"
              placeholder={t('placeholders.addTag')}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault();
                  addTag(e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
            <button 
              onClick={(e) => {
                const input = e.target.parentElement.querySelector('input');
                if (input.value.trim()) {
                  addTag(input.value.trim());
                  input.value = '';
                }
              }}
              className="btn btn-secondary"
            >
              {t('common.add')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ruleData.staticMetadata?.tags?.map((tag, index) => (
              <span key={index} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>
                {tag}
                <button 
                  onClick={() => removeTag(index)}
                  className="hover:text-red-500"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">{t('fields.customFields')}</label>
            <button 
              onClick={addCustomField}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="w-4 h-4" />
              {t('fields.addCustomField')}
            </button>
          </div>
          {ruleData.staticMetadata?.customFields?.map((field, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <FormInput
                type="text"
                value={field.name}
                onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                placeholder={t('placeholders.fieldName')}
                className="flex-1"
              />
              <FormInput
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                placeholder={t('placeholders.fieldValue')}
                className="flex-1"
              />
              <button 
                onClick={() => removeCustomField(index)}
                className="btn btn-ghost text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}