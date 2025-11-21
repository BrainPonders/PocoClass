import React from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import InfoBox from '../InfoBox';
import LogicGroupEditor from '../LogicGroupEditor';

export default function CoreIdentifiersStep({ 
  ruleData, 
  updateRuleData, 
  showInfoBoxes, 
  setShowInfoBoxes 
}) {
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
        <h2 className="text-2xl font-bold">Step 2 of 7: Core Identifiers by OCR</h2>
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
        Define the essential patterns that must be found in documents for identification. 
        These are the "must-have" elements that define your document type.
      </p>

      <InfoBox 
        stepNumber={2}
        showInfoBoxes={showInfoBoxes}
        setShowInfoBoxes={setShowInfoBoxes}
      >
        <div>
          <h4 className="font-semibold text-sm mb-1">Core Identifiers</h4>
          <p className="text-sm mb-2">
            Core identifiers are the essential patterns that must be found for document identification. 
            These are the "must-have" elements that define your document type.
          </p>
          <p className="text-sm">
            <strong>Scoring:</strong> Should total 70-100 points for reliable identification<br/>
            <strong>Logic Groups:</strong> Each group can contain multiple conditions that work together
          </p>
        </div>
      </InfoBox>

      {ruleData.coreIdentifiers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">No Core Identifiers Yet</h3>
          <p className="mb-6" style={{ color: 'var(--app-text-secondary)' }}>Add your first logic group to define essential document patterns</p>
          <button 
            onClick={addCoreLogicGroup}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Logic Group
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
            Add Logic Group
          </button>
        </div>
      )}

      <div className="mt-6 p-4 border rounded-lg" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
        <h4 className="font-semibold text-sm" style={{ color: 'var(--info-text)' }}>Score Summary</h4>
        <p className="text-sm" style={{ color: 'var(--info-text)' }}>
          Total Core Score: {calculateCoreScore()}/100 points
          {calculateCoreScore() < 70 && (
            <span className="block mt-1">
              ⚠️ Consider adding more points - core identifiers should total 70-100 points
            </span>
          )}
        </p>
      </div>
    </div>
  );
}