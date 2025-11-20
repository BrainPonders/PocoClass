import React from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import InfoBox from '../InfoBox';

export default function StaticMetadataStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
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
        <h2 className="text-2xl font-bold">Step 4 of 7: Static Metadata</h2>
        {!showInfoBoxes[4] && (
          <button 
            onClick={() => setShowInfoBoxes(prev => ({ ...prev, 4: true }))}
            className="btn btn-ghost btn-sm text-gray-400 hover:text-gray-600 p-1"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-6">
        Configure fixed information that applies to all documents matching this rule. 
        This is constant data assigned once a document is recognized.
      </p>

      <InfoBox 
        stepNumber={4}
        showInfoBoxes={showInfoBoxes}
        setShowInfoBoxes={setShowInfoBoxes}
      >
        <div>
          <h4 className="font-semibold text-sm mb-1">Static Metadata</h4>
          <p className="text-sm">
            This is constant data you want to assign to a document once it's recognized. 
            For example, every statement of a certain type will always have the same correspondent assigned.
          </p>
        </div>
      </InfoBox>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Correspondent</label>
            <input
              type="text"
              value={ruleData.staticMetadata.correspondent}
              onChange={(e) => updateRuleData('staticMetadata', { correspondent: e.target.value })}
              placeholder="e.g., Organization Name"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown from your system.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Document Type</label>
            <input
              type="text"
              value={ruleData.staticMetadata.documentType}
              onChange={(e) => updateRuleData('staticMetadata', { documentType: e.target.value })}
              placeholder="e.g., Year Statement"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown.</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add a tag and press Enter"
              className="form-input flex-1"
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
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ruleData.staticMetadata?.tags?.map((tag, index) => (
              <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {tag}
                <button 
                  onClick={() => removeTag(index)}
                  className="text-gray-500 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Custom Fields</label>
            <button 
              onClick={addCustomField}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="w-4 h-4" />
              Add Custom Field
            </button>
          </div>
          {ruleData.staticMetadata?.customFields?.map((field, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateCustomField(index, 'name', e.target.value)}
                placeholder="Field name"
                className="form-input flex-1"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                placeholder="Field value"
                className="form-input flex-1"
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