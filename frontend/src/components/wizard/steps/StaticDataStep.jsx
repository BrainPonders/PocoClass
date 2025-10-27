import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import InfoBox from '../InfoBox';
import { Paperless } from '@/api/entities';

export default function StaticDataStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const [correspondents, setCorrespondents] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaperlessData();
  }, []);

  const loadPaperlessData = async () => {
    try {
      const [corr, docTypes, tags] = await Promise.all([
        Paperless.getCorrespondents(),
        Paperless.getDocumentTypes(),
        Paperless.getTags()
      ]);
      setCorrespondents(corr.map(c => c.name).sort());
      setDocumentTypes(docTypes.map(dt => dt.name).sort());
      setAvailableTags(tags.map(t => t.name).sort());
    } catch (error) {
      console.error('Error loading Paperless data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const addTag = (tag) => {
    const currentTags = ruleData.predefinedData?.tags || [];
    if (tag && !currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      updateRuleData('predefinedData', { tags: newTags });
    }
  };

  const removeTag = (index) => {
    const currentTags = ruleData.predefinedData?.tags || [];
    const newTags = currentTags.filter((_, i) => i !== index);
    updateRuleData('predefinedData', { tags: newTags });
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
          {isLoading ? (
            <div className="form-input bg-gray-100">Loading...</div>
          ) : (
            <select
              value={ruleData.predefinedData?.correspondent || ''}
              onChange={(e) => updateRuleData('predefinedData', { correspondent: e.target.value })}
              className="form-input"
            >
              <option value="">-- Select Correspondent --</option>
              {correspondents.map(corr => (
                <option key={corr} value={corr}>{corr}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {correspondents.length > 0 ? `${correspondents.length} correspondents available` : 'No correspondents found. Run sync in Settings.'}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Document Type</label>
          {isLoading ? (
            <div className="form-input bg-gray-100">Loading...</div>
          ) : (
            <select
              value={ruleData.predefinedData?.documentType || ''}
              onChange={(e) => updateRuleData('predefinedData', { documentType: e.target.value })}
              className="form-input"
            >
              <option value="">-- Select Document Type --</option>
              {documentTypes.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {documentTypes.length > 0 ? `${documentTypes.length} document types available` : 'No document types found. Run sync in Settings.'}
          </p>
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
          {availableTags.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
              <div className="flex flex-wrap gap-1">
                {availableTags.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    type="button"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(ruleData.predefinedData?.tags || []).map((tag, index) => (
              <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                {tag}
                <button 
                  onClick={() => removeTag(index)}
                  className="text-gray-500 hover:text-red-500"
                  type="button"
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
            value={ruleData.predefinedData?.documentCategory || ''}
            onChange={(e) => updateRuleData('predefinedData', { documentCategory: e.target.value })}
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