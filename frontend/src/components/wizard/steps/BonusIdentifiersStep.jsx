
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Tooltip from '../Tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BonusIdentifiersStep({ 
  ruleData, 
  updateRuleData
}) {
  const { t } = useLanguage();

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
          <Tooltip content={t('bonusIdentifiers.tooltip')} />
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>{t('bonusIdentifiers.description')}</p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Check if bonusIdentifiers is defined before mapping */}
        {(ruleData.bonusIdentifiers && ruleData.bonusIdentifiers.length > 0) ? (
          ruleData.bonusIdentifiers.map((identifier, index) => (
            <div key={index} className="card p-4 border rounded-lg shadow-sm" style={{ backgroundColor: 'var(--app-surface)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{t('bonusIdentifiers.identifierTitle')} {index + 1}</h4>
                  <Tooltip content={t('bonusIdentifiers.identifierTooltip')} />
                </div>
                {ruleData.bonusIdentifiers.length > 1 && (
                  <button
                    onClick={() => removeBonusIdentifier(index)}
                    className="hover:text-red-500 transition-colors"
                    style={{ color: 'var(--app-text-muted)' }}
                    aria-label={`${t('bonusIdentifiers.removeAriaLabel')} ${index + 1}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 form-label" style={{ color: 'var(--app-text-secondary)' }}>{t('bonusIdentifiers.fieldNameLabel')}</label>
                  <input
                    type="text"
                    value={identifier.field}
                    onChange={(e) => updateBonusIdentifier(index, 'field', e.target.value)}
                    placeholder={t('bonusIdentifiers.fieldNamePlaceholder')}
                    className="mt-1 block w-full rounded-md shadow-sm sm:text-sm form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 form-label" style={{ color: 'var(--app-text-secondary)' }}>{t('bonusIdentifiers.expectedValueLabel')}</label>
                  <input
                    type="text"
                    value={identifier.value}
                    onChange={(e) => updateBonusIdentifier(index, 'value', e.target.value)}
                    placeholder={t('bonusIdentifiers.expectedValuePlaceholder')}
                    className="mt-1 block w-full rounded-md shadow-sm sm:text-sm form-input"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg" style={{ color: 'var(--app-text-muted)' }}>
            <div className="text-4xl mb-3">✨</div>
            <p className="mb-4">{t('bonusIdentifiers.emptyStateMessage')}</p>
          </div>
        )}

        <button 
          onClick={addBonusIdentifier}
          className="btn btn-outline w-full py-2 px-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--info-border)', color: 'var(--info-text)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--info-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Plus className="w-4 h-4" />
          {t('bonusIdentifiers.addButton')}
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">{t('bonusIdentifiers.multiplierTitle')} {ruleData.bonusMultiplier || 1}×</h3>
          <Tooltip content={t('bonusIdentifiers.multiplierTooltip')} />
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--app-text-secondary)' }}>
          {t('bonusIdentifiers.multiplierDescription')}
        </p>
        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={ruleData.bonusMultiplier || 1}
            onChange={(e) => updateRuleData('bonusMultiplier', parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(((ruleData.bonusMultiplier || 1) - 1) / 4) * 100}%, var(--app-bg-secondary) ${(((ruleData.bonusMultiplier || 1) - 1) / 4) * 100}%, var(--app-bg-secondary) 100%)`
            }}
          />
          <div className="flex justify-between text-xs mt-1 px-1" style={{ color: 'var(--app-text-muted)' }}>
            <span>{t('bonusIdentifiers.multiplierDefault')}</span>
            <span>{t('bonusIdentifiers.multiplierModerate')}</span>
            <span>{t('bonusIdentifiers.multiplierHigh')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
