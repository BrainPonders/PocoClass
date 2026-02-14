
import React, { useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import PatternHelperModal from '@/components/PatternHelperModal';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LogicGroupEditor({ group, index, onUpdate, onDelete, type, canDelete = true }) {
  const { t } = useLanguage();
  const [showPatternHelper, setShowPatternHelper] = useState(false);
  const [activeConditionIndex, setActiveConditionIndex] = useState(null);

  const addCondition = () => {
    const newConditions = [...(group.conditions || []), { pattern: '', range: group.conditions?.[0]?.range || '0-1600' }];
    onUpdate({ ...group, conditions: newConditions });
  };

  const updateCondition = (condIndex, field, value) => {
    const newConditions = [...(group.conditions || [])];
    newConditions[condIndex] = { ...newConditions[condIndex], [field]: value };
    onUpdate({ ...group, conditions: newConditions });
  };

  const removeCondition = (condIndex) => {
    if (group.conditions.length <= 1) return;
    const newConditions = group.conditions.filter((_, i) => i !== condIndex);
    onUpdate({ ...group, conditions: newConditions });
  };

  const getSearchAreaConfig = () => {
    const range = group.conditions?.[0]?.range || '0-1600';
    
    if (range.startsWith('first-')) {
      return { mode: 'first', value: range.replace('first-', '') };
    } else if (range.startsWith('last-')) {
      return { mode: 'last', value: range.replace('last-', '') };
    } else {
      const parts = range.split('-');
      return { mode: 'between', from: parts[0] || '0', to: parts[1] || '1600' };
    }
  };

  const updateSearchArea = (mode, value1, value2) => {
    let newRange;
    if (mode === 'first') {
      newRange = `first-${value1}`;
    } else if (mode === 'last') {
      newRange = `last-${value1}`;
    } else {
      newRange = `${value1}-${value2}`;
    }
    
    const newConditions = group.conditions.map(cond => ({ ...cond, range: newRange }));
    onUpdate({ ...group, conditions: newConditions });
  };

  const openPatternHelper = (condIndex) => {
    setActiveConditionIndex(condIndex);
    setShowPatternHelper(true);
  };

  const handleUsePattern = (pattern) => {
    if (activeConditionIndex !== null) {
      updateCondition(activeConditionIndex, 'pattern', pattern);
    }
    setShowPatternHelper(false);
    setActiveConditionIndex(null);
  };

  const searchConfig = getSearchAreaConfig();
  const [searchMode, setSearchMode] = useState(searchConfig.mode);
  const [firstValue, setFirstValue] = useState(searchConfig.mode === 'first' ? searchConfig.value : '100');
  const [lastValue, setLastValue] = useState(searchConfig.mode === 'last' ? searchConfig.value : '100');
  const [fromValue, setFromValue] = useState(searchConfig.mode === 'between' ? searchConfig.from : '0');
  const [toValue, setToValue] = useState(searchConfig.mode === 'between' ? searchConfig.to : '1600');

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    if (mode === 'first') {
      updateSearchArea('first', firstValue);
    } else if (mode === 'last') {
      updateSearchArea('last', lastValue);
    } else {
      updateSearchArea('between', fromValue, toValue);
    }
  };

  const handleValueChange = (field, value) => {
    if (!/^\d*$/.test(value)) return;
    
    if (field === 'first') {
      setFirstValue(value);
      if (searchMode === 'first') updateSearchArea('first', value);
    } else if (field === 'last') {
      setLastValue(value);
      if (searchMode === 'last') updateSearchArea('last', value);
    } else if (field === 'from') {
      setFromValue(value);
      if (searchMode === 'between') updateSearchArea('between', value, toValue);
    } else if (field === 'to') {
      setToValue(value);
      if (searchMode === 'between') updateSearchArea('between', fromValue, value);
    }
  };

  return (
    <div className="card" data-tutorial-field={`tutorial-field-ocrgroup-${index}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-lg">{t('wizard.step2.logicGroup')} {index + 1}</h4>
          <Tooltip content={t('wizard.step2.tooltipLogicGroup')} />
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title={t('wizard.step2.deleteLogicGroup')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-4 text-sm overflow-x-auto">
          <span className="font-medium text-gray-700 whitespace-nowrap">{t('wizard.step2.searchLines')}:</span>
          
          <label className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="radio"
              name={`searchMode-${index}`}
              checked={searchMode === 'between'}
              onChange={() => handleSearchModeChange('between')}
              className="form-radio"
            />
            <input
              type="text"
              value={fromValue}
              onChange={(e) => handleValueChange('from', e.target.value)}
              disabled={searchMode !== 'between'}
              className="pc-input"
              style={{ width: '60px', padding: '4px 8px' }}
              placeholder="from"
            />
            <span>{t('wizard.step2.to')}</span>
            <input
              type="text"
              value={toValue}
              onChange={(e) => handleValueChange('to', e.target.value)}
              disabled={searchMode !== 'between'}
              className="pc-input"
              style={{ width: '60px', padding: '4px 8px' }}
              placeholder="to"
            />
          </label>

          <div style={{ width: '2px', height: '24px', backgroundColor: '#d1d5db', margin: '0 8px' }} className="flex-shrink-0"></div>

          <label className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="radio"
              name={`searchMode-${index}`}
              checked={searchMode === 'first'}
              onChange={() => handleSearchModeChange('first')}
              className="form-radio"
            />
            <span>{t('wizard.step2.first')}</span>
            <input
              type="text"
              value={firstValue}
              onChange={(e) => handleValueChange('first', e.target.value)}
              disabled={searchMode !== 'first'}
              className="pc-input"
              style={{ width: '60px', padding: '4px 8px' }}
              placeholder="100"
            />
          </label>

          <div style={{ width: '2px', height: '24px', backgroundColor: '#d1d5db', margin: '0 8px' }} className="flex-shrink-0"></div>

          <label className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="radio"
              name={`searchMode-${index}`}
              checked={searchMode === 'last'}
              onChange={() => handleSearchModeChange('last')}
              className="form-radio"
            />
            <span>{t('wizard.step2.last')}</span>
            <input
              type="text"
              value={lastValue}
              onChange={(e) => handleValueChange('last', e.target.value)}
              disabled={searchMode !== 'last'}
              className="pc-input"
              style={{ width: '60px', padding: '4px 8px' }}
              placeholder="100"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm" style={{ marginLeft: '115px' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`type-${index}`}
              checked={group.type === 'match'}
              onChange={() => onUpdate({ ...group, type: 'match' })}
              className="form-radio"
            />
            <span className="font-medium">{t('wizard.step2.matchAnyOR')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`type-${index}`}
              checked={group.type === 'match_all'}
              onChange={() => onUpdate({ ...group, type: 'match_all' })}
              className="form-radio"
            />
            <span className="font-medium">{t('wizard.step2.matchAllAND')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={group.mandatory || false}
              onChange={(e) => onUpdate({ ...group, mandatory: e.target.checked })}
              className="form-checkbox"
            />
            <span className="font-medium">{t('wizard.step2.mandatory')}</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {group.conditions?.map((condition, condIndex) => (
          <div key={condIndex}>
            <div className="flex items-center gap-2 mb-2">
              <h5 className="text-sm font-semibold">{t('wizard.step2.pattern')} {condIndex + 1}</h5>
              <Tooltip content={t('wizard.step2.tooltipPattern')} />
              {group.conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(condIndex)}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  title={t('wizard.step2.removePattern')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={condition.pattern || ''}
                onChange={(e) => updateCondition(condIndex, 'pattern', e.target.value)}
                placeholder={t('wizard.step2.enterPattern')}
                className="pc-input flex-1"
              />
              <button
                onClick={() => openPatternHelper(condIndex)}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                type="button"
                title={t('wizard.step2.openPatternHelper')}
              >
                <Wand2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addCondition}
          className="w-full p-3 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg bg-transparent text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('wizard.step2.addPattern')}
        </button>
      </div>

      {showPatternHelper && (
        <PatternHelperModal
          isOpen={showPatternHelper}
          onClose={() => {
            setShowPatternHelper(false);
            setActiveConditionIndex(null);
          }}
          onUsePattern={handleUsePattern}
          initialValue={activeConditionIndex !== null ? group.conditions[activeConditionIndex]?.pattern : ''}
        />
      )}
    </div>
  );
}
