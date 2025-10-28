
import React from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import Tooltip from '@/components/Tooltip';
import TagSelector from '@/components/TagSelector';
import PatternHelperModal from '@/components/PatternHelperModal';
import FieldSelector from '@/components/FieldSelector';

export default function DocumentClassificationsStep({
  ruleData,
  updateRuleData
}) {
  const { t } = useTranslation();
  const [showPatternHelper, setShowPatternHelper] = React.useState(false);
  const [activeAnchorType, setActiveAnchorType] = React.useState(null);
  const [activeRuleIndex, setActiveRuleIndex] = React.useState(null);
  const [fieldDisplaySettings, setFieldDisplaySettings] = React.useState({});
  const [customFieldNames, setCustomFieldNames] = React.useState({});
  const [customFieldsData, setCustomFieldsData] = React.useState({});
  const [allPlaceholders, setAllPlaceholders] = React.useState([]);
  const [placeholdersLoaded, setPlaceholdersLoaded] = React.useState(false);

  React.useEffect(() => {
    loadFieldDisplaySettings();
    loadCustomFieldsData();
    loadAllPlaceholders();
  }, []);

  // Debug: Log state when it changes
  React.useEffect(() => {
    console.log('Placeholders state changed:', allPlaceholders.length, 'items');
  }, [allPlaceholders]);

  React.useEffect(() => {
    console.log('Placeholders loaded state:', placeholdersLoaded);
  }, [placeholdersLoaded]);

  const loadFieldDisplaySettings = () => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      
      // Always set defaults (whether localStorage exists or not)
      const defaultFieldSettings = {
        title: 'predefined',
        dateCreated: 'dynamic',
        correspondent: 'predefined',
        documentType: 'predefined',
        tags: 'predefined',
        customField1: 'disabled',
        customField2: 'disabled',
        documentCategory: 'predefined'
      };
      
      const defaultCustomNames = {
        customField1: 'Invoice Number',
        customField2: 'Reference ID',
        documentCategory: 'Document Category'
      };
      
      setFieldDisplaySettings(parsed.fieldDisplaySettings || defaultFieldSettings);
      
      // Ensure customFieldNames are always strings, not objects
      const rawNames = parsed.customFieldNames || defaultCustomNames;
      
      // Convert any objects to strings (defensive coding)
      const safeNames = {};
      Object.keys(rawNames).forEach(key => {
        const value = rawNames[key];
        safeNames[key] = typeof value === 'string' ? value : String(value?.label || value?.name || 'Custom Field');
      });
      
      setCustomFieldNames(safeNames);
    } catch (e) {
      console.error('Error reading settings:', e);
      // On error, set safe defaults
      setFieldDisplaySettings({
        title: 'predefined',
        dateCreated: 'dynamic',
        correspondent: 'predefined',
        documentType: 'predefined',
        tags: 'predefined',
        customField1: 'disabled',
        customField2: 'disabled',
        documentCategory: 'predefined'
      });
      setCustomFieldNames({
        customField1: 'Invoice Number',
        customField2: 'Reference ID',
        documentCategory: 'Document Category'
      });
    }
  };

  const loadCustomFieldsData = async () => {
    try {
      const { Paperless } = await import('@/api/entities');
      const customFields = await Paperless.getCustomFields();
      
      const fieldsMap = {};
      customFields.forEach(field => {
        const fieldName = field.name;
        fieldsMap[fieldName] = {
          dataType: field.data_type,
          extraData: field.extra_data,
          id: field.paperless_id
        };
      });
      setCustomFieldsData(fieldsMap);
    } catch (e) {
      console.error('Error loading custom fields:', e);
    }
  };

  const loadAllPlaceholders = async () => {
    try {
      console.log('Starting to load placeholders...');
      const { apiClient } = await import('../../../api/apiClient');
      const data = await apiClient.get('/settings/placeholders');
      console.log('Loaded placeholders:', data.length, 'items:', data);
      setAllPlaceholders(data);
      setPlaceholdersLoaded(true);
    } catch (e) {
      console.error('Error loading placeholders:', e);
    }
  };

  // Helper function to safely get custom field name as string (defensive against objects)
  const getCustomFieldName = (fieldKey, defaultName) => {
    const rawValue = customFieldNames?.[fieldKey];
    if (!rawValue) return defaultName;
    if (typeof rawValue === 'string') return rawValue;
    // Handle object case (defensive coding for malformed localStorage data)
    return rawValue?.label || rawValue?.name || defaultName;
  };

  // Get all custom field placeholders that should be shown in predefined section
  const getCustomFieldPlaceholders = (mode) => {
    console.log('Getting placeholders for mode:', mode, 'Total placeholders:', allPlaceholders.length);
    const filtered = allPlaceholders.filter(p => {
      const matches = p.is_custom_field && 
        !p.is_internal && 
        !p.is_locked &&
        p.visibility_mode &&
        (p.visibility_mode === mode || p.visibility_mode === 'both');
      if (matches) {
        console.log('Matched placeholder:', p.placeholder_name, 'visibility:', p.visibility_mode);
      }
      return matches;
    });
    console.log('Filtered placeholders:', filtered.length);
    return filtered;
  };

  const addExtractionRule = () => {
    const newRules = [...(ruleData.dynamicData?.extractionRules || []), {
      targetField: '',
      beforeAnchor: { pattern: '' },
      afterAnchor: { pattern: '' },
      extractionType: 'dateFormat', // Default for new rules, will be overridden by targetField change
      dateFormat: '',
      regexPattern: '',
      tagValue: ''
    }];
    updateRuleData('dynamicData', { ...ruleData.dynamicData, extractionRules: newRules });
  };

  const updateExtractionRule = (index, field, value) => {
    const newRules = [...(ruleData.dynamicData?.extractionRules || [])];
    if (newRules[index]) {
      newRules[index] = { ...newRules[index], [field]: value };
      
      // Auto-set extraction type based on target field
      if (field === 'targetField') {
        if (value === 'dateCreated') {
          newRules[index].extractionType = 'dateFormat';
          newRules[index].dateFormat = ''; // Reset dateFormat when target field changes
        } else if (value.startsWith('customField') || value === 'documentCategory') {
          newRules[index].extractionType = 'regex';
          newRules[index].regexPattern = ''; // Reset regexPattern when target field changes
        }
      }
      
      updateRuleData('dynamicData', { ...ruleData.dynamicData, extractionRules: newRules });
    }
  };

  const updateAnchor = (index, anchorType, value) => {
    const newRules = [...(ruleData.dynamicData?.extractionRules || [])];
    if (newRules[index]) {
      newRules[index] = {
        ...newRules[index],
        [anchorType]: { pattern: value }
      };
      updateRuleData('dynamicData', { ...ruleData.dynamicData, extractionRules: newRules });
    }
  };

  const removeExtractionRule = (index) => {
    const newRules = (ruleData.dynamicData?.extractionRules || []).filter((_, i) => i !== index);
    updateRuleData('dynamicData', { ...ruleData.dynamicData, extractionRules: newRules });
  };

  const openPatternHelper = (ruleIndex, anchorType) => {
    setActiveRuleIndex(ruleIndex);
    setActiveAnchorType(anchorType);
    setShowPatternHelper(true);
  };

  const handleUsePattern = (pattern) => {
    if (activeRuleIndex !== null && activeAnchorType) {
      if (activeAnchorType === 'beforeAnchor' || activeAnchorType === 'afterAnchor') {
        updateAnchor(activeRuleIndex, activeAnchorType, pattern);
      } else if (activeAnchorType === 'extraction') { // For regexPattern
        updateExtractionRule(activeRuleIndex, 'regexPattern', pattern);
      } else if (activeAnchorType === 'dateFormat') { // For dateFormat
        updateExtractionRule(activeRuleIndex, 'dateFormat', pattern);
      }
    }
    setShowPatternHelper(false);
    setActiveRuleIndex(null);
    setActiveAnchorType(null);
  };

  const getAvailableTargetFields = () => {
    const fields = [];
    
    try {
      // Date Created (only extractable field that makes sense for dynamic)
      if (fieldDisplaySettings.dateCreated === 'dynamic' || fieldDisplaySettings.dateCreated === 'both') {
        fields.push({ value: 'dateCreated', label: 'Date Created', canRepeat: false });
      }
      
      // Dynamically add ALL custom fields that support dynamic extraction (string, integer, float, monetary, date)
      const extractableTypes = ['string', 'integer', 'float', 'monetary', 'date'];
      const dynamicCustomFields = getCustomFieldPlaceholders('dynamic');
      
      dynamicCustomFields.forEach(placeholder => {
        const fieldName = placeholder.placeholder_name;
        const fieldData = customFieldsData[fieldName];
        const fieldKey = `customField_${placeholder.id}`;
        
        // Only include if dataType is extractable (or unknown/null - be permissive)
        if (!fieldData || extractableTypes.includes(fieldData?.dataType)) {
          fields.push({ 
            value: fieldKey, 
            label: `Custom Field: ${fieldName}`, 
            canRepeat: false 
          });
        }
      });
    } catch (error) {
      console.error('Error building target fields:', error);
    }
    
    return fields;
  };

  const isFieldDisabled = (fieldValue, currentIndex) => {
    // All fields can only be extracted once
    const rules = ruleData.dynamicData?.extractionRules || [];
    return rules.some((rule, idx) => idx !== currentIndex && rule.targetField === fieldValue);
  };

  const targetFields = getAvailableTargetFields();

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Step 3 of 6: Document Classifications</h2>
          <Tooltip content="Configure document classification data extracted from OCR. Define predefined static metadata and dynamic extraction rules for variable data. Configure field visibility in Settings > Step 3." />
        </div>
        <p className="text-gray-600 mt-2">
          Configure document classification data extracted from OCR
        </p>
      </div>

      {/* Predefined Data Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 pb-2 border-b">Predefined Data</h3>
        <div className="space-y-6">
          {(fieldDisplaySettings.title === 'predefined' || fieldDisplaySettings.title === 'both') && (
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                disabled
                placeholder="Auto generated from document"
                className="form-input bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          {(fieldDisplaySettings.dateCreated === 'predefined' || fieldDisplaySettings.dateCreated === 'both') && (
            <div className="form-group">
              <label className="form-label">Date Created</label>
              <input
                type="date"
                value={ruleData.predefinedData?.dateCreated || ''}
                onChange={(e) => updateRuleData('predefinedData', { ...ruleData.predefinedData, dateCreated: e.target.value })}
                className="form-input"
              />
            </div>
          )}

          {(fieldDisplaySettings.correspondent === 'predefined' || fieldDisplaySettings.correspondent === 'both') && (
            <div className="form-group">
              <label className="form-label">Correspondent</label>
              <FieldSelector
                type="correspondent"
                value={ruleData.predefinedData?.correspondent || ''}
                onChange={(value) => updateRuleData('predefinedData', { ...ruleData.predefinedData, correspondent: value })}
                placeholder="Select correspondent..."
                allowCustom={false}
              />
            </div>
          )}

          {(fieldDisplaySettings.documentType === 'predefined' || fieldDisplaySettings.documentType === 'both') && (
            <div className="form-group">
              <label className="form-label">Document Type</label>
              <FieldSelector
                type="documentType"
                value={ruleData.predefinedData?.documentType || ''}
                onChange={(value) => updateRuleData('predefinedData', { ...ruleData.predefinedData, documentType: value })}
                placeholder="Select document type..."
                allowCustom={false}
              />
            </div>
          )}

          {(fieldDisplaySettings.tags === 'predefined' || fieldDisplaySettings.tags === 'both') && (
            <div className="form-group">
              <label className="form-label">Tags</label>
              <TagSelector
                selectedTags={ruleData.predefinedData?.tags || []}
                onChange={(tags) => updateRuleData('predefinedData', { ...ruleData.predefinedData, tags })}
                placeholder="Select tags..."
                allowCustom={false}
              />
            </div>
          )}

          {/* Dynamically render ALL custom fields from Settings */}
          {getCustomFieldPlaceholders('predefined').map(placeholder => {
            const fieldName = placeholder.placeholder_name;
            const fieldData = customFieldsData[fieldName];
            const fieldKey = `customField_${placeholder.id}`;
            
            return (
              <div key={placeholder.id} className="form-group">
                <label className="form-label">Custom Field: {fieldName}</label>
                {fieldData?.dataType === 'select' && fieldData?.extraData?.select_options ? (
                  <select
                    value={ruleData.predefinedData?.[fieldKey] || ''}
                    onChange={(e) => updateRuleData('predefinedData', { ...ruleData.predefinedData, [fieldKey]: e.target.value })}
                    className="form-input"
                    style={{ backgroundColor: '#f3e8ff', borderColor: '#a855f7' }}
                  >
                    <option value="">Select an option...</option>
                    {fieldData.extraData.select_options.map((option, idx) => {
                      const optionValue = typeof option === 'string' ? option : (option?.value || option?.label || option?.name || String(option));
                      const optionLabel = typeof option === 'string' ? option : (option?.label || option?.name || option?.value || String(option));
                      return (
                        <option key={idx} value={optionValue}>{optionLabel}</option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={ruleData.predefinedData?.[fieldKey] || ''}
                    onChange={(e) => updateRuleData('predefinedData', { ...ruleData.predefinedData, [fieldKey]: e.target.value })}
                    placeholder={`Enter ${fieldName.toLowerCase()}...`}
                    className="form-input"
                    style={{ backgroundColor: '#f3e8ff', borderColor: '#a855f7' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Data Section */}
      <div>
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">Dynamic Data Extraction</h3>
            <Tooltip content="Define anchor points and patterns to extract variable data from documents dynamically" />
          </div>
        </div>

        <p className="text-gray-600 mb-4">
          Define anchor points and extraction patterns for dynamic field population
        </p>

        {/* Graphic Representation */}
        <div className="flex items-center justify-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="px-4 py-2 bg-blue-100 border-2 border-blue-500 rounded-lg font-mono text-sm text-blue-800">
            Before Anchor
          </div>
          <div className="px-4 py-2 bg-green-100 border-2 border-green-500 rounded-lg font-mono text-sm text-green-800">
            Extracted Data
          </div>
          <div className="px-4 py-2 bg-blue-100 border-2 border-blue-500 rounded-lg font-mono text-sm text-blue-800">
            After Anchor
          </div>
        </div>

        {(ruleData.dynamicData?.extractionRules?.length || 0) === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Dynamic Extraction Rules</h3>
            <p className="text-gray-600 mb-6">Add rules to extract data from OCR content dynamically</p>
            <button onClick={addExtractionRule} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {ruleData.dynamicData?.extractionRules?.map((rule, index) => {
              // Determine if current field is custom field or document category for purple styling
              // Tags should not receive custom field styling, but default green.
              const isCustomFieldOrDocumentCategory = rule.targetField === 'documentCategory' || 
                                                      rule.targetField.startsWith('customField');
              const isTag = rule.targetField === 'tags';
              
              const customFieldStyle = { backgroundColor: '#f3e8ff', borderColor: '#a855f7' };

              return (
                <div key={index} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold">Dynamic Extraction Rule #{index + 1}</h4>
                    <button
                      onClick={() => removeExtractionRule(index)}
                      className="btn btn-ghost text-red-500 btn-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Target Field */}
                    <div className="form-group">
                      <label className="form-label">Target Field</label>
                      <select
                        value={rule.targetField}
                        onChange={(e) => updateExtractionRule(index, 'targetField', e.target.value)}
                        className="form-select"
                        style={isCustomFieldOrDocumentCategory && !isTag ? customFieldStyle : {}}
                      >
                        <option value="">Select target field...</option>
                        {targetFields.map(field => {
                          const safeLabel = typeof field.label === 'string' ? field.label : String(field.label?.label || field.label?.name || 'Field');
                          return (
                            <option 
                              key={field.value} 
                              value={field.value}
                              disabled={isFieldDisabled(field.value, index)}
                            >
                              {safeLabel} {!field.canRepeat && isFieldDisabled(field.value, index) ? '(already used)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Before Anchor */}
                    <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                      <h5 className="font-semibold text-sm mb-2" style={{ color: '#1e40af' }}>Before Anchor</h5>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule.beforeAnchor?.pattern || ''}
                          onChange={(e) => updateAnchor(index, 'beforeAnchor', e.target.value)}
                          placeholder="Enter text or regex pattern..."
                          className="form-input flex-1"
                        />
                        <button
                          onClick={() => openPatternHelper(index, 'beforeAnchor')}
                          className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                          type="button"
                        >
                          <Wand2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Extraction Type */}
                    <div style={{ 
                      background: (isCustomFieldOrDocumentCategory && !isTag) ? '#f3e8ff' : '#d1fae5', 
                      padding: '16px', 
                      borderRadius: '8px', 
                      border: (isCustomFieldOrDocumentCategory && !isTag) ? '2px solid #a855f7' : '2px solid #10b981' 
                    }}>
                      <h5 className="font-semibold text-sm mb-2" style={{ 
                        color: (isCustomFieldOrDocumentCategory && !isTag) ? '#7c3aed' : '#047857' 
                      }}>Extraction Type</h5>
                      
                      {rule.targetField === 'dateCreated' && (
                        <div className="form-group">
                          <label className="form-label">Date Format</label>
                          <div className="flex items-center gap-2">
                            <FieldSelector
                              type="dateFormat"
                              value={rule.dateFormat || ''}
                              onChange={(value) => updateExtractionRule(index, 'dateFormat', value)}
                              placeholder="Select or enter date format..."
                              allowCustom={true}
                            />
                            <button
                              onClick={() => openPatternHelper(index, 'dateFormat')}
                              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                              type="button"
                            >
                              <Wand2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {rule.targetField === 'tags' && (
                        <div className="space-y-3">
                          <div className="form-group">
                            <label className="form-label">Select Tag to Extract</label>
                            <TagSelector
                              selectedTags={rule.tagValue ? [rule.tagValue] : []}
                              onChange={(tags) => updateExtractionRule(index, 'tagValue', tags[0] || '')}
                              placeholder="Select tag..."
                              singleSelect
                              allowCustom={false}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Pattern to Match</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rule.regexPattern || ''}
                                onChange={(e) => updateExtractionRule(index, 'regexPattern', e.target.value)}
                                placeholder="Enter text or regex pattern..."
                                className="form-input flex-1"
                              />
                              <button
                                onClick={() => openPatternHelper(index, 'extraction')}
                                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                                type="button"
                              >
                                <Wand2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {rule.targetField && (rule.targetField.startsWith('customField') || rule.targetField === 'documentCategory') && (
                        <div className="form-group">
                          <label className="form-label">Pattern to Match</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={rule.regexPattern || ''}
                              onChange={(e) => updateExtractionRule(index, 'regexPattern', e.target.value)}
                              placeholder="Enter text or regex pattern..."
                              className="form-input flex-1"
                              style={customFieldStyle}
                            />
                            <button
                              onClick={() => openPatternHelper(index, 'extraction')}
                              className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                              type="button"
                            >
                              <Wand2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {!rule.targetField && (
                        <p className="text-sm text-gray-500 italic">Select a target field to configure extraction</p>
                      )}
                    </div>

                    {/* After Anchor */}
                    <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', border: '2px solid #3b82f6' }}>
                      <h5 className="font-semibold text-sm mb-2" style={{ color: '#1e40af' }}>After Anchor</h5>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule.afterAnchor?.pattern || ''}
                          onChange={(e) => updateAnchor(index, 'afterAnchor', e.target.value)}
                          placeholder="Enter text or regex pattern..."
                          className="form-input flex-1"
                        />
                        <button
                          onClick={() => openPatternHelper(index, 'afterAnchor')}
                          className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                          type="button"
                        >
                          <Wand2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button 
          onClick={addExtractionRule}
          className="w-full p-3 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg bg-transparent text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center justify-center gap-2 mt-4"
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
            setActiveRuleIndex(null);
            setActiveAnchorType(null);
          }}
          onUsePattern={handleUsePattern}
          initialValue={
            activeRuleIndex !== null && activeAnchorType
              ? activeAnchorType === 'extraction'
                ? ruleData.dynamicData?.extractionRules?.[activeRuleIndex]?.regexPattern || ''
                : activeAnchorType === 'dateFormat'
                  ? ruleData.dynamicData?.extractionRules?.[activeRuleIndex]?.dateFormat || ''
                  : ruleData.dynamicData?.extractionRules?.[activeRuleIndex]?.[activeAnchorType]?.pattern || ''
              : ''
          }
          restrictToDateOnly={
            activeRuleIndex !== null && 
            (activeAnchorType === 'dateFormat' ||
             (activeAnchorType === 'extraction' && ruleData.dynamicData?.extractionRules?.[activeRuleIndex]?.targetField === 'dateCreated'))
          }
        />
      )}
    </div>
  );
}
