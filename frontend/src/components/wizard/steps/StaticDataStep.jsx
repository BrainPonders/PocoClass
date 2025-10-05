import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import InfoBox from '../InfoBox';

export default function StaticDataStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const addTag = (tag) => {
    if (tag && !ruleData.staticData.tags.includes(tag)) {
      const newTags = [...ruleData.staticData.tags, tag];
      updateRuleData('staticData', { tags: newTags });
    }
  };

  const removeTag = (index) => {
    const newTags = ruleData.staticData.tags.filter((_, i) => i !== index);
    updateRuleData('staticData', { tags: newTags });
  };

  return (
    <div className="wizard-container">
      <div className="flex items-center gap-2 mb-6" style={{minHeight: '32px'}}>
        <h2 className="text-2xl font-bold">Step 3 of 6: Defining Static Classification Data</h2>
        {!showInfoBoxes[3] && (
          <button 
            onClick={() => setShowInfoBoxes(prev => ({ ...prev, 3: true }))}
            className="btn btn-ghost btn-sm text-gray-400 hover:text-gray-600 p-1"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-6">
        Configure fixed classification data that applies to all documents matching this rule.
      </p>

      <InfoBox 
        stepNumber={3}
        showInfoBoxes={showInfoBoxes}
        setShowInfoBoxes={setShowInfoBoxes}
      >
        <div>
          <h4 className="font-semibold text-sm mb-1">Static Classification Data</h4>
          <p className="text-sm">
            This is constant data you want to assign to a document once it's recognized. 
            Greyed out fields are automatically populated by the system.
          </p>
        </div>
      </InfoBox>

      <div className="space-y-6">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            type="text"
            disabled
            placeholder="Auto-generated from document"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Archive Serial Number</label>
          <input
            type="text"
            disabled
            placeholder="Auto-generated"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date Created</label>
          <input
            type="text"
            disabled
            placeholder="Auto-generated"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Correspondent</label>
          <input
            type="text"
            value={ruleData.staticData?.correspondent || ''}
            onChange={(e) => updateRuleData('staticData', { correspondent: e.target.value })}
            placeholder="e.g., Rabobank"
            className="form-input"
          />
          <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown from your system.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Document Type</label>
          <input
            type="text"
            value={ruleData.staticData?.documentType || ''}
            onChange={(e) => updateRuleData('staticData', { documentType: e.target.value })}
            placeholder="e.g., Year Statement"
            className="form-input"
          />
          <p className="text-xs text-gray-500 mt-1">Ideally, this would be a dropdown.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Storage Path</label>
          <input
            type="text"
            disabled
            placeholder="Auto-generated based on rules"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
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
            {ruleData.staticData?.tags?.map((tag, index) => (
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
          <label className="form-label">Custom Field</label>
          <input
            type="text"
            placeholder="Defined in Paperless"
            className="form-input"
          />
          <p className="text-xs text-gray-500 mt-1">Custom fields are predefined in Paperless.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Document Category</label>
          <input
            type="text"
            value={ruleData.staticData?.documentCategory || ''}
            onChange={(e) => updateRuleData('staticData', { documentCategory: e.target.value })}
            placeholder="e.g., Financial"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">POCO Score</label>
          <input
            type="text"
            disabled
            placeholder="Auto-calculated"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="form-group">
          <label className="form-label">POCO OCR</label>
          <input
            type="text"
            disabled
            placeholder="Auto-populated from OCR"
            className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}