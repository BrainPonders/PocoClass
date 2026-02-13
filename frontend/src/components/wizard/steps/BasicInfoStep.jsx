
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ValidatedInput from '@/components/ValidatedInput';
import ValidatedTextarea from '@/components/ValidatedTextarea';
import Tooltip from '@/components/Tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import WizardHelpPanel, { HelpSection, HelpExample, HelpTip } from '../WizardHelpPanel';

export default function BasicInfoStep({ 
  ruleData, 
  updateRuleData,
  currentStep,
  showWizardHelp
}) {
  const { t } = useLanguage();
  const [showThresholdWarning, setShowThresholdWarning] = useState(false);
  const [pendingThreshold, setPendingThreshold] = useState(null);
  const [tempThreshold, setTempThreshold] = useState(ruleData.threshold || 75);

  const generateRuleId = (ruleName) => {
    return ruleName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleRuleNameChange = (e) => {
    const newName = e.target.value;
    const updates = { ruleName: newName };
    
    if (!ruleData.ruleIdManuallyEdited) {
      updates.ruleId = generateRuleId(newName);
    }
    
    updateRuleData('', updates);
  };

  const handleThresholdSliderChange = (e) => {
    setTempThreshold(parseInt(e.target.value));
  };

  const handleThresholdSliderRelease = () => {
    const numValue = tempThreshold;
    if (numValue !== 75 && numValue !== ruleData.threshold) {
      const hideWarning = sessionStorage.getItem('hideWarning_pocoThreshold') === 'true';
      if (hideWarning) {
        updateRuleData('threshold', numValue);
      } else {
        setPendingThreshold(numValue);
        setShowThresholdWarning(true);
      }
    } else if (numValue !== ruleData.threshold) {
      updateRuleData('threshold', numValue);
    }
  };

  const confirmThresholdChange = () => {
    if (pendingThreshold !== null) {
      updateRuleData('threshold', pendingThreshold);
    }
    setShowThresholdWarning(false);
    setPendingThreshold(null);
  };

  const cancelThresholdChange = () => {
    setTempThreshold(ruleData.threshold || 75);
    setShowThresholdWarning(false);
    setPendingThreshold(null);
  };

  const getRuleNameError = () => {
    if (!ruleData.ruleName) return t('validation.ruleNameRequired');
    if (ruleData.ruleName.length < 3) return t('validation.ruleNameMinLength');
    return '';
  };

  const getRuleIdError = () => {
    if (!ruleData.ruleId) return t('validation.ruleIdRequired');
    if (!/^[a-z0-9_]+$/.test(ruleData.ruleId)) return t('validation.ruleIdFormat');
    return '';
  };

  const getDescriptionError = () => {
    if (!ruleData.description) return t('validation.descriptionRequired');
    if (ruleData.description.length < 10) return t('validation.descriptionMinLength');
    return '';
  };

  return (
    <div className="wizard-container">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('wizard.step1')}</h2>
          <Tooltip content={t('tooltips.basicInfoHelp')} />
        </div>
        <p className="mt-2" style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.step1Description')}</p>
      </div>

      <WizardHelpPanel stepNumber={1} showHelp={showWizardHelp}>
        <HelpSection>
          <p style={{ fontStyle: 'italic', marginBottom: '10px', opacity: 0.85 }}>{t('wizard.help.scenarioIntro')}</p>
        </HelpSection>
        <HelpSection title={t('wizard.help.step1.whatTitle')}>
          <p>{t('wizard.help.step1.whatText')}</p>
        </HelpSection>
        <HelpSection title={t('wizard.help.step1.exampleTitle')}>
          <HelpExample label={t('wizard.ruleNameLabel')} value={t('wizard.help.step1.ruleName')} explanation={t('wizard.help.step1.ruleNameWhy')} />
          <HelpExample label={t('wizard.ruleIdLabel')} value={t('wizard.help.step1.ruleId')} explanation={t('wizard.help.step1.ruleIdWhy')} />
          <HelpExample label={t('rules.description')} value={t('wizard.help.step1.description')} explanation={t('wizard.help.step1.descriptionWhy')} />
          <HelpExample label={t('wizard.pocoScoreReq')} value={t('wizard.help.step1.pocoThreshold')} explanation={t('wizard.help.step1.pocoThresholdWhy')} />
          <HelpExample label={t('wizard.ocrScoreReq')} value={t('wizard.help.step1.ocrThreshold')} explanation={t('wizard.help.step1.ocrThresholdWhy')} />
        </HelpSection>
        <HelpSection title={t('wizard.help.step1.tipTitle')}>
          <HelpTip>{t('wizard.help.step1.tip1')}</HelpTip>
          <HelpTip>{t('wizard.help.step1.tip2')}</HelpTip>
        </HelpSection>
      </WizardHelpPanel>

      <div className="space-y-6">
        <ValidatedInput
          label={t('rules.ruleName')}
          value={ruleData.ruleName}
          onChange={handleRuleNameChange}
          placeholder={t('placeholders.ruleName')}
          error={ruleData.ruleName && getRuleNameError()}
          success={ruleData.ruleName && !getRuleNameError()}
          required
          helpText={t('helpText.ruleNameHelp')}
        />

        <ValidatedInput
          label={t('rules.ruleId')}
          value={ruleData.ruleId}
          onChange={(e) => updateRuleData('', { 
            ruleId: e.target.value, 
            ruleIdManuallyEdited: true 
          })}
          placeholder={t('placeholders.ruleId')}
          error={ruleData.ruleId && getRuleIdError()}
          success={ruleData.ruleId && !getRuleIdError()}
          required
          helpText={t('helpText.ruleIdHelp')}
        />

        <ValidatedTextarea
          label={t('rules.description')}
          value={ruleData.description}
          onChange={(e) => updateRuleData('description', e.target.value)}
          placeholder={t('placeholders.description')}
          error={ruleData.description && getDescriptionError()}
          success={ruleData.description && !getDescriptionError()}
          required
          rows={4}
        />

        <div className="form-group">
          <label className="form-label flex items-center gap-2">
            {t('wizard.pocoScoreReq')}
            <Tooltip content={t('tooltips.pocoScoreHelp')} />
          </label>
          
          <div className="space-y-2">
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={tempThreshold}
              onChange={handleThresholdSliderChange}
              onMouseUp={handleThresholdSliderRelease}
              onTouchEnd={handleThresholdSliderRelease}
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
                  <Tooltip content={t('tooltips.pocoScoreDefault')}>
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
      </div>

      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--info-text)' }}>{t('wizard.configSummary')}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2">
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.ruleNameLabel')}:</span>
            <span className="ml-2 font-medium">{ruleData.ruleName || t('wizard.notSet')}</span>
          </div>
          <div className="col-span-2">
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.ruleIdLabel')}:</span>
            <span className="ml-2 font-medium">{ruleData.ruleId || t('wizard.notSet')}</span>
          </div>
          <div className="col-span-2">
            <span style={{ color: 'var(--app-text-secondary)' }}>{t('wizard.pocoScoreReq')}:</span>
            <span className="ml-2 font-medium">{ruleData.threshold || 75}%</span>
          </div>
          <div className="col-span-2 mt-1 pt-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <span className="text-xs italic" style={{ color: 'var(--app-text-muted)' }}>{t('wizard.examplePrefix')} {t('helpText.pocoScoreHelp', {threshold: ruleData.threshold || 75, example: Math.min((ruleData.threshold || 75) + 5, 100)})}</span>
          </div>
        </div>
        {(ruleData.threshold || 75) !== 75 && (
          <div className="mt-2 pt-2 text-amber-700 flex items-center gap-2" style={{ borderTop: '1px solid var(--info-border)' }}>
            <AlertTriangle className="w-4 h-4" />
            <span>POCO Score requirement changed from default (75%).</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showThresholdWarning}
        onClose={cancelThresholdChange}
        onConfirm={confirmThresholdChange}
        title={t('dialogs.thresholdWarning.title')}
        message={pendingThreshold < 75 
          ? t('dialogs.thresholdWarning.messageLow', { threshold: pendingThreshold })
          : t('dialogs.thresholdWarning.messageHigh', { threshold: pendingThreshold })
        }
        confirmText={t('dialogs.thresholdWarning.confirmButton')}
        cancelText={t('dialogs.thresholdWarning.cancelButton')}
        variant="warning"
        showDontShowAgain={true}
        warningKey="pocoThreshold"
      />
    </div>
  );
}
