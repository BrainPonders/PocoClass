import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import InfoBox from '../InfoBox';
import LogicGroupEditor from '../LogicGroupEditor';

export default function CoreIdentifiersStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
  const { t } = useLanguage();
  const addCoreLogicGroup = () => {
    const newGroup = {
      type: 'match',
      score: 20,
      mandatory: false,
      conditions: [{ pattern: '', range: '0-1600' }]
    };
    updateRuleData('coreIdentifiers', [...ruleData.coreIdentifiers, newGroup]);
  };

  const updateCoreLogicGroup = (index, updatedGroup) => {
    const newGroups = [...ruleData.coreIdentifiers];
    newGroups[index] = updatedGroup;
    updateRuleData('coreIdentifiers', newGroups);
  };

  const removeCoreLogicGroup = (index) => {
    const newGroups = ruleData.coreIdentifiers.filter((_, i) => i !== index);
    updateRuleData('coreIdentifiers', newGroups);
  };

  const calculateCoreScore = () => {
    return ruleData.coreIdentifiers?.reduce((total, group) => total + (group.score || 0), 0) || 0;
  };

  return (
    <div className="wizard-container">
      <div className="flex items-center gap-2 mb-6" style={{minHeight: '32px'}}>
        <h2 className="text-2xl font-bold">{t('coreIdentifiers.title')}</h2>
        {!showInfoBoxes[2] && (
          <button 
            onClick={() => setShowInfoBoxes(prev => ({ ...prev, 2: true }))}
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
        {t('coreIdentifiers.description')}
      </p>

      <InfoBox 
        stepNumber={2}
        showInfoBoxes={showInfoBoxes}
        setShowInfoBoxes={setShowInfoBoxes}
      >
        <div>
          <h4 className="font-semibold text-sm mb-1">{t('coreIdentifiers.infoBoxTitle')}</h4>
          <p className="text-sm mb-2">
            {t('coreIdentifiers.infoBoxDescription')}
          </p>
          <p className="text-sm">
            <strong>{t('coreIdentifiers.infoBoxScoringLabel')}</strong> {t('coreIdentifiers.infoBoxScoringValue')}<br/>
            <strong>{t('coreIdentifiers.infoBoxLogicGroupsLabel')}</strong> {t('coreIdentifiers.infoBoxLogicGroupsValue')}
          </p>
        </div>
      </InfoBox>

      {ruleData.coreIdentifiers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">{t('coreIdentifiers.emptyStateTitle')}</h3>
          <p className="mb-6" style={{ color: 'var(--app-text-secondary)' }}>{t('coreIdentifiers.emptyStateDescription')}</p>
          <button 
            onClick={addCoreLogicGroup}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            {t('coreIdentifiers.addLogicGroupButton')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ruleData.coreIdentifiers?.map((group, index) => (
            <LogicGroupEditor
              key={index}
              group={group}
              index={index}
              onUpdate={(updatedGroup) => updateCoreLogicGroup(index, updatedGroup)}
              onDelete={() => removeCoreLogicGroup(index)}
              type="core"
            />
          ))}
          <button 
            onClick={addCoreLogicGroup}
            className="btn btn-outline w-full"
          >
            <Plus className="w-4 h-4" />
            {t('coreIdentifiers.addLogicGroupButton')}
          </button>
        </div>
      )}

      <div className="mt-6 p-4 border rounded-lg" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
        <h4 className="font-semibold text-sm" style={{ color: 'var(--info-text)' }}>{t('coreIdentifiers.scoreSummaryTitle')}</h4>
        <p className="text-sm" style={{ color: 'var(--info-text)' }}>
          {t('coreIdentifiers.totalCoreScore')} {calculateCoreScore()}/100 {t('coreIdentifiers.pointsUnit')}
          {calculateCoreScore() < 70 && (
            <span className="block mt-1">
              {t('coreIdentifiers.lowScoreWarning')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}