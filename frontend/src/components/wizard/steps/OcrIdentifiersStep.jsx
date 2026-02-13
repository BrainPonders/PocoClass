
import React, { useEffect, useRef, useState } from 'react';
import { Plus, FileText, Eye, HelpCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LogicGroupEditor from '../LogicGroupEditor';
import Tooltip from '@/components/Tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import WizardHelpPanel, { HelpSection, HelpExample, HelpTip } from '../WizardHelpPanel';

export default function OcrIdentifiersStep({ 
  ruleData, 
  updateRuleData,
  selectedDocumentId,
  selectedDocumentName,
  onViewOcr,
  onViewPdf,
  showWizardHelp
}) {
  const { t } = useLanguage();
  const isInitialized = useRef(false);
  const [showOcrThresholdWarning, setShowOcrThresholdWarning] = useState(false);
  const [pendingOcrThreshold, setPendingOcrThreshold] = useState(null);
  const [showMultiplierWarning, setShowMultiplierWarning] = useState(false);
  const [pendingMultiplier, setPendingMultiplier] = useState(null);

  // Temporary state for slider values to allow for confirmation dialog before committing
  const [tempOcrThreshold, setTempOcrThreshold] = useState(ruleData.ocrThreshold || 75);
  const [tempMultiplier, setTempMultiplier] = useState(ruleData.ocrMultiplier || 3);

  // Effect to sync temp states if ruleData changes from outside this component
  useEffect(() => {
    setTempOcrThreshold(ruleData.ocrThreshold || 75);
  }, [ruleData.ocrThreshold]);

  useEffect(() => {
    setTempMultiplier(ruleData.ocrMultiplier || 3);
  }, [ruleData.ocrMultiplier]);

  const addOcrLogicGroup = () => {
    const currentGroups = ruleData.ocrIdentifiers || [];
    const newGroup = {
      type: 'match',
      mandatory: false,
      conditions: [{ pattern: '', range: '0-1600' }]
    };
    const updatedGroups = [...currentGroups, newGroup];
    updateRuleData('ocrIdentifiers', updatedGroups);
  };

  const updateOcrLogicGroup = (index, updatedGroup) => {
    const newGroups = [...(ruleData.ocrIdentifiers || [])];
    newGroups[index] = updatedGroup;
    updateRuleData('ocrIdentifiers', newGroups);
  };

  const removeOcrLogicGroup = (index) => {
    const currentGroups = ruleData.ocrIdentifiers || [];
    if (currentGroups.length <= 3) return;
    
    const newGroups = currentGroups.filter((_, i) => i !== index);
    updateRuleData('ocrIdentifiers', newGroups);
  };

  useEffect(() => {
    if (!isInitialized.current && (!ruleData.ocrIdentifiers || ruleData.ocrIdentifiers.length === 0)) {
      const initialGroups = [
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] },
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] },
        { type: 'match', mandatory: false, conditions: [{ pattern: '', range: '0-1600' }] }
      ];
      updateRuleData('ocrIdentifiers', initialGroups, false); // false = initialization, not a user change
      isInitialized.current = true;
    }
  }, [ruleData.ocrIdentifiers, updateRuleData]);

  const handleOcrThresholdSliderChange = (e) => {
    setTempOcrThreshold(parseInt(e.target.value));
  };

  const handleOcrThresholdSliderRelease = () => {
    const numValue = tempOcrThreshold;
    if (numValue !== 75 && numValue !== ruleData.ocrThreshold) {
      const hideWarning = sessionStorage.getItem('hideWarning_ocrThreshold') === 'true';
      if (hideWarning) {
        updateRuleData('ocrThreshold', numValue);
        setTempOcrThreshold(numValue);
      } else {
        setPendingOcrThreshold(numValue);
        setShowOcrThresholdWarning(true);
      }
    } else if (numValue !== ruleData.ocrThreshold) {
      updateRuleData('ocrThreshold', numValue);
    }
  };

  const handleMultiplierSliderChange = (e) => {
    setTempMultiplier(parseInt(e.target.value));
  };

  const handleMultiplierSliderRelease = () => {
    const numValue = tempMultiplier;
    if (numValue !== 3 && numValue !== ruleData.ocrMultiplier) {
      const hideWarning = sessionStorage.getItem('hideWarning_ocrMultiplier') === 'true';
      if (hideWarning) {
        updateRuleData('ocrMultiplier', numValue);
        setTempMultiplier(numValue);
      } else {
        setPendingMultiplier(numValue);
        setShowMultiplierWarning(true);
      }
    } else if (numValue !== ruleData.ocrMultiplier) {
      updateRuleData('ocrMultiplier', numValue);
    }
  };

  const confirmOcrThresholdChange = () => {
    if (pendingOcrThreshold !== null) {
      updateRuleData('ocrThreshold', pendingOcrThreshold);
      setTempOcrThreshold(pendingOcrThreshold); // Update temp state to reflect confirmed value
    }
    setShowOcrThresholdWarning(false);
    setPendingOcrThreshold(null);
  };

  const cancelOcrThresholdChange = () => {
    setTempOcrThreshold(ruleData.ocrThreshold || 75); // Reset temp to actual ruleData value
    setShowOcrThresholdWarning(false);
    setPendingOcrThreshold(null);
  };

  const confirmMultiplierChange = () => {
    if (pendingMultiplier !== null) {
      updateRuleData('ocrMultiplier', pendingMultiplier);
      setTempMultiplier(pendingMultiplier); // Update temp state to reflect confirmed value
    }
    setShowMultiplierWarning(false);
    setPendingMultiplier(null);
  };

  const cancelMultiplierChange = () => {
    setTempMultiplier(ruleData.ocrMultiplier || 3); // Reset temp to actual ruleData value
    setShowMultiplierWarning(false);
    setPendingMultiplier(null);
  };

  // These `ocrMultiplier` and `ocrThreshold` refer to the actual `ruleData` values, not the temporary slider values.
  const ocrMultiplier = ruleData.ocrMultiplier || 3; 
  const ocrThreshold = ruleData.ocrThreshold || 75;
  
  // Calculate total identifiers based on logic:
  // - OR groups (type: 'match') count as 1
  // - AND groups (type: 'match_all') count each condition
  const totalIdentifiers = ruleData.ocrIdentifiers?.reduce((sum, group) => {
    if (group.type === 'match_all') {
      return sum + (group.conditions?.length || 0);
    } else {
      return sum + 1;
    }
  }, 0) || 0;
  
  // Changed calculation based on outline: totalIdentifiers * totalIdentifiers * ocrMultiplier
  const maxOcrWeight = totalIdentifiers * totalIdentifiers * ocrMultiplier;

  const filledGroups = ruleData.ocrIdentifiers?.filter(group => 
    group.conditions?.some(c => c.pattern && c.pattern.trim() !== '')
  ).length || 0;

  // Check if values are at default/recommended
  const isOcrThresholdDefault = ocrThreshold === 75;
  const isMultiplierDefault = ocrMultiplier === 3;
  const summaryTextColor = (isOcrThresholdDefault && isMultiplierDefault) ? 'var(--info-text)' : 'var(--app-text-secondary)';

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('wizard.step2Title')}</h2>
          <Tooltip content={t('tooltips.ocrThresholdHelp')} />
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.step2Description')}</p>
        {selectedDocumentId && selectedDocumentName && (
          <div className="mt-2 p-2 rounded text-sm" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
            📄 {t('wizard.workingWith')} <span className="font-medium">{selectedDocumentName}</span>
          </div>
        )}
        {filledGroups < 3 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {t('ocr_identifiers_warning', { filledGroups })}
          </div>
        )}
      </div>

      <WizardHelpPanel stepNumber={2} showHelp={showWizardHelp}>
        <HelpSection>
          <p style={{ fontStyle: 'italic', marginBottom: '10px', opacity: 0.85 }}>{t('wizard.help.scenarioIntro')}</p>
        </HelpSection>
        <HelpSection title={t('wizard.help.step2.whatTitle')}>
          <p>{t('wizard.help.step2.whatText')}</p>
        </HelpSection>
        <HelpSection title={t('wizard.help.step2.conceptTitle')}>
          <p style={{ marginBottom: '6px' }}>{t('wizard.help.step2.conceptText')}</p>
          <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--help-panel-code-bg, #bfdbfe)', marginBottom: '4px', paddingTop: '2px', paddingBottom: '2px' }}>
            <p style={{ marginBottom: '4px' }}><strong>OR:</strong> {t('wizard.help.step2.conceptOR')}</p>
            <p style={{ marginBottom: '4px' }}><strong>AND:</strong> {t('wizard.help.step2.conceptAND')}</p>
            <p><strong>Mandatory:</strong> {t('wizard.help.step2.conceptMandatory')}</p>
          </div>
        </HelpSection>
        <HelpSection title={t('wizard.help.step2.exampleTitle')}>
          <p style={{ marginBottom: '8px' }}>{t('wizard.help.step2.exampleIntro')}</p>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '2px' }}>{t('wizard.help.step2.group1Title')}</div>
            <HelpExample label={t('wizard.help.step2.patternsLabel')} value={t('wizard.help.step2.group1Patterns')} />
            <div style={{ fontSize: '0.775rem', color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic', paddingLeft: '10px', marginBottom: '4px' }}>{t('wizard.help.step2.group1Why')}</div>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '2px' }}>{t('wizard.help.step2.group2Title')}</div>
            <HelpExample label={t('wizard.help.step2.patternsLabel')} value={t('wizard.help.step2.group2Patterns')} />
            <div style={{ fontSize: '0.775rem', color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic', paddingLeft: '10px', marginBottom: '4px' }}>{t('wizard.help.step2.group2Why')}</div>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: '600', fontSize: '0.8rem', marginBottom: '2px' }}>{t('wizard.help.step2.group3Title')}</div>
            <HelpExample label={t('wizard.help.step2.patternsLabel')} value={t('wizard.help.step2.group3Patterns')} />
            <div style={{ fontSize: '0.775rem', color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic', paddingLeft: '10px', marginBottom: '4px' }}>{t('wizard.help.step2.group3Why')}</div>
          </div>
        </HelpSection>
        <HelpSection title={t('wizard.help.step2.tipTitle')}>
          <HelpTip>{t('wizard.help.step2.tip1')}</HelpTip>
          <HelpTip>{t('wizard.help.step2.tip2')}</HelpTip>
          <HelpTip>{t('wizard.help.step2.tip3')}</HelpTip>
          <HelpTip>{t('wizard.help.step2.tip4')}</HelpTip>
        </HelpSection>
      </WizardHelpPanel>

      <div className="space-y-4 mb-6">
        {ruleData.ocrIdentifiers?.map((group, index) => (
          <LogicGroupEditor
            key={index}
            group={group}
            index={index}
            onUpdate={(updatedGroup) => updateOcrLogicGroup(index, updatedGroup)}
            onDelete={() => removeOcrLogicGroup(index)}
            type="ocr"
            canDelete={ruleData.ocrIdentifiers.length > 3}
          />
        ))}
        <button 
          onClick={addOcrLogicGroup}
          className="btn btn-outline w-full"
        >
          <Plus className="w-4 h-4" />
          {t('add_logic_group')}
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">{t('wizard.ocrScoreRequirement')}</h3>
          <Tooltip content={t('ocr_score_requirement_tooltip')} />
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={tempOcrThreshold}
            onChange={handleOcrThresholdSliderChange}
            onMouseUp={handleOcrThresholdSliderRelease}
            onTouchEnd={handleOcrThresholdSliderRelease}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--app-bg-secondary)' }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 px-2 pb-8">
            <div className="relative" style={{fontSize: '0.7rem', color: 'var(--app-text-muted)'}}>
              <span style={{position: 'absolute', left: '0%', transform: 'translateX(-50%)'}}>50</span>
              <span style={{position: 'absolute', left: '10%', transform: 'translateX(-50%)'}}>55</span>
              <span style={{position: 'absolute', left: '20%', transform: 'translateX(-50%)'}}>60</span>
              <span style={{position: 'absolute', left: '30%', transform: 'translateX(-50%)'}}>65</span>
              <span style={{position: 'absolute', left: '40%', transform: 'translateX(-50%)'}}>70</span>
              <span style={{position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: 'var(--info-text)'}} className="font-semibold">75</span>
              <div style={{position: 'absolute', left: '50%', transform: 'translateX(12px)'}}>
                <Tooltip content={t('tooltips.ocrThresholdDefault')}>
                  <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--info-text)' }} />
                </Tooltip>
              </div>
              <span style={{position: 'absolute', left: '60%', transform: 'translateX(-50%)'}}>80</span>
              <span style={{position: 'absolute', left: '70%', transform: 'translateX(-50%)'}}>85</span>
              <span style={{position: 'absolute', left: '80%', transform: 'translateX(-50%)'}}>90</span>
              <span style={{position: 'absolute', left: '90%', transform: 'translateX(-50%)'}}>95</span>
              <span style={{position: 'absolute', left: '100%', transform: 'translateX(-50%)'}}>100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">{t('wizard.ocrWeightMultiplier')}</h3>
          <Tooltip content={t('ocr_weight_multiplier_tooltip')} />
        </div>
        
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={tempMultiplier}
            onChange={handleMultiplierSliderChange}
            onMouseUp={handleMultiplierSliderRelease}
            onTouchEnd={handleMultiplierSliderRelease}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ backgroundColor: 'var(--app-bg-secondary)' }}
          />
          
          {/* Scale markers */}
          <div className="relative mt-2 px-2 pb-8">
            <div className="relative" style={{fontSize: '0.7rem', color: 'var(--app-text-muted)'}}>
              <span style={{position: 'absolute', left: '0%', transform: 'translateX(-50%)'}}>1</span>
              <span style={{position: 'absolute', left: '11.11%', transform: 'translateX(-50%)'}}>2</span>
              <span style={{position: 'absolute', left: '22.22%', transform: 'translateX(-50%)', color: 'var(--info-text)'}} className="font-semibold">3</span>
              <div style={{position: 'absolute', left: '22.22%', transform: 'translateX(8px)'}}>
                <Tooltip content={t('tooltips.ocrThresholdDefault')}>
                  <HelpCircle className="w-3 h-3 cursor-help" style={{ color: 'var(--info-text)' }} />
                </Tooltip>
              </div>
              <span style={{position: 'absolute', left: '33.33%', transform: 'translateX(-50%)'}}>4</span>
              <span style={{position: 'absolute', left: '44.44%', transform: 'translateX(-50%)'}}>5</span>
              <span style={{position: 'absolute', left: '55.56%', transform: 'translateX(-50%)'}}>6</span>
              <span style={{position: 'absolute', left: '66.67%', transform: 'translateX(-50%)'}}>7</span>
              <span style={{position: 'absolute', left: '77.78%', transform: 'translateX(-50%)'}}>8</span>
              <span style={{position: 'absolute', left: '88.89%', transform: 'translateX(-50%)'}}>9</span>
              <span style={{position: 'absolute', left: '100%', transform: 'translateX(-50%)'}}>10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--info-text)' }}>{t('wizard.configSummary')}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.logicGroups')}:</span>
            <span className="ml-2 font-medium">{ruleData.ocrIdentifiers?.length || 0}</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.totalIdentifiers')}:</span>
            <span className="ml-2 font-medium">{totalIdentifiers} <span className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('wizard.includingAnd')}</span></span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.ocrScoreRequirementLabel')}:</span>
            <span className="ml-2 font-medium">{ocrThreshold}%</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.ocrMultiplier')}:</span>
            <span className="ml-2 font-medium">{ocrMultiplier}×</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.patternWeight')}:</span>
            <span className="ml-2 font-medium">{totalIdentifiers}</span>
          </div>
          <div>
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.maxOcrWeight')}:</span>
            <span className="ml-2 font-medium">{maxOcrWeight}</span>
          </div>
          {totalIdentifiers > 0 && (
            <div className="col-span-2 mt-1 pt-2" style={{ borderTop: '1px solid var(--info-border)' }}>
              <span className="text-xs italic" style={{ color: 'var(--app-text-muted)' }}>{t('wizard.ocrExampleText', { count: totalIdentifiers, plural: totalIdentifiers !== 1 ? 's' : '', weight: maxOcrWeight })}</span>
            </div>
          )}
        </div>
        {ocrThreshold !== 75 && (
          <div className="mt-2 pt-2 text-amber-700 flex items-center gap-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <AlertTriangle className="w-4 h-4" />
            <span>{t('wizard.ocrScoreChangedWarning')}</span>
          </div>
        )}
        {ocrMultiplier !== 3 && (
          <div className="mt-2 pt-2 text-amber-700 flex items-center gap-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <AlertTriangle className="w-4 h-4" />
            <span>{t('wizard.ocrMultiplierChangedWarning')}</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showOcrThresholdWarning}
        onClose={cancelOcrThresholdChange}
        onConfirm={confirmOcrThresholdChange}
        title={t('dialogs.ocrThresholdWarning.title')}
        message={t('dialogs.ocrThresholdWarning.message', { threshold: pendingOcrThreshold })}
        confirmText={t('dialogs.ocrThresholdWarning.confirmButton')}
        cancelText={t('dialogs.ocrThresholdWarning.cancelButton')}
        variant="warning"
        showDontShowAgain={true}
        warningKey="ocrThreshold"
      />

      <ConfirmDialog
        isOpen={showMultiplierWarning}
        onClose={cancelMultiplierChange}
        onConfirm={confirmMultiplierChange}
        title={t('dialogs.multiplierWarning.title')}
        message={t('dialogs.multiplierWarning.message', { multiplier: pendingMultiplier })}
        confirmText={t('dialogs.multiplierWarning.confirmButton')}
        cancelText={t('dialogs.multiplierWarning.cancelButton')}
        variant="warning"
        showDontShowAgain={true}
        warningKey="ocrMultiplier"
      />
    </div>
  );
}
