
import React from 'react';
import { Plus, Trash2 } from 'lucide-react'; // Changed from HelpCircle, added Trash2
import Tooltip from '../Tooltip'; // Assuming Tooltip is a custom component
import { useTranslation } from '@/components/translations';

export default function BonusIdentifiersStep({ 
  ruleData, 
  updateRuleData, 
  // Removed showInfoBoxes, setShowInfoBoxes props
}) {
  const { t } = useTranslation(); // Initialize useTranslation

  // Renamed and refactored from addBonusLogicGroup
  const addBonusIdentifier = () => {
    const newIdentifier = { field: '', value: '' };
    updateRuleData('bonusIdentifiers', [...(ruleData.bonusIdentifiers || []), newIdentifier]);
  };

  // Renamed and refactored from updateBonusLogicGroup
  const updateBonusIdentifier = (index, key, newValue) => {
    const newIdentifiers = [...(ruleData.bonusIdentifiers || [])];
    newIdentifiers[index] = { ...newIdentifiers[index], [key]: newValue };
    updateRuleData('bonusIdentifiers', newIdentifiers);
  };

  // Renamed and refactored from removeBonusLogicGroup
  const removeBonusIdentifier = (index) => {
    const newIdentifiers = (ruleData.bonusIdentifiers || []).filter((_, i) => i !== index);
    updateRuleData('bonusIdentifiers', newIdentifiers);
  };

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('step_3_title')}</h2>
          <Tooltip content="Bonus identifiers are additional metadata fields that can help confirm document classification. They add extra points to the POCO score but are not required for classification." />
        </div>
        <p className="text-gray-600 mt-2">Add optional metadata fields that can increase classification confidence</p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Check if bonusIdentifiers is defined before mapping */}
        {(ruleData.bonusIdentifiers && ruleData.bonusIdentifiers.length > 0) ? (
          ruleData.bonusIdentifiers.map((identifier, index) => (
            <div key={index} className="card p-4 border rounded-lg shadow-sm bg-white"> {/* Added some default card styling */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Bonus Identifier {index + 1}</h4>
                  <Tooltip content="Specify a metadata field name and its expected value. If the document's metadata matches this field and value, bonus points are added to the POCO score." />
                </div>
                {ruleData.bonusIdentifiers.length > 1 && (
                  <button
                    onClick={() => removeBonusIdentifier(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove bonus identifier ${index + 1}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 form-label">Field Name</label> {/* Added form-label styling */}
                  <input
                    type="text"
                    value={identifier.field}
                    onChange={(e) => updateBonusIdentifier(index, 'field', e.target.value)}
                    placeholder="e.g., author, department"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm form-input" // Added form-input styling
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 form-label">Expected Value</label> {/* Added form-label styling */}
                  <input
                    type="text"
                    value={identifier.value}
                    onChange={(e) => updateBonusIdentifier(index, 'value', e.target.value)}
                    placeholder="e.g., John Doe, Finance"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm form-input" // Added form-input styling
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg text-gray-500">
            <div className="text-4xl mb-3">✨</div>
            <p className="mb-4">No bonus identifiers added yet. Click the button below to add one.</p>
          </div>
        )}

        <button 
          onClick={addBonusIdentifier}
          className="btn btn-outline w-full py-2 px-4 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2" // Added some default btn-outline styling
        >
          <Plus className="w-4 h-4" />
          Add Bonus Identifier
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">Bonus Weight Multiplier: {ruleData.bonusMultiplier || 1}×</h3>
          <Tooltip content="Controls how much influence bonus identifiers have in the final POCO score. Higher values mean metadata matching is more important." />
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Controls how much weight bonus identifiers have in the final POCO score. Default is 1× for moderate influence.
        </p>
        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={ruleData.bonusMultiplier || 1}
            onChange={(e) => updateRuleData('bonusMultiplier', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(((ruleData.bonusMultiplier || 1) - 1) / 4) * 100}%, #e5e7eb ${(((ruleData.bonusMultiplier || 1) - 1) / 4) * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-1"> {/* Added px-1 for slight padding */}
            <span>1× (Default)</span>
            <span>3× (Moderate)</span>
            <span>5× (High)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
