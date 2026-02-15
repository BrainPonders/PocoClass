/**
 * @file SummaryStep.jsx
 * @description Final summary step of the rule builder wizard. Displays a read-only
 * overview of all configured rule data, weight calculations, example POCO score,
 * and allows setting the rule status (new/active/inactive) before saving.
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Tooltip from '@/components/Tooltip';

import { 
  calculateTotalMaxWeight, 
  calculateExampleScore,
  OCR_DEFAULT_MULTIPLIER,
  FILENAME_DEFAULT_MULTIPLIER,
  VERIFICATION_DEFAULT_MULTIPLIER
} from '@/components/utils/pocoCalculations';

export default function SummaryStep({ 
  ruleData, 
  showInfoBoxes,
  setShowInfoBoxes,
  updateRuleData
}) {
  const { t } = useLanguage();
  const ocrMultiplier = ruleData.ocrMultiplier ?? OCR_DEFAULT_MULTIPLIER;
  const filenameMultiplier = ruleData.filenameMultiplier ?? FILENAME_DEFAULT_MULTIPLIER;
  
  // Handle verification multiplier config (new format)
  const verificationMultiplierConfig = ruleData.verificationMultiplierConfig || {
    mode: 'auto',
    value: ruleData.verificationMultiplier ?? VERIFICATION_DEFAULT_MULTIPLIER
  };
  const verificationMultiplier = verificationMultiplierConfig.value;

  const totalOcrIdentifiers = ruleData.ocrIdentifiers?.reduce((sum, group) => sum + (group.conditions?.length || 0), 0) || 0;
  const totalFilenamePatterns = (ruleData.filenamePatterns?.patterns?.length || 0) + (ruleData.filenamePatterns?.dateFormats?.length || 0);
  const totalVerificationFields = Object.values(ruleData.verification?.enabledFields || {}).filter(Boolean).length;

  const weights = calculateTotalMaxWeight(ruleData);
  
  const exampleMatchRate = 0.8;
  const exampleScore = calculateExampleScore(weights, exampleMatchRate);

  return (
    <div className="wizard-container">
      <div className="flex items-center gap-2 mb-6" style={{minHeight: '32px'}}>
        <h2 className="text-2xl font-bold">{t('wizard.step7Title')}</h2>
        <Tooltip content={t('summary.reviewTooltip')} />
      </div>
      <p className="mb-6" style={{ color: 'var(--app-text-secondary)' }}>
        {t('summary.reviewConfiguration')}
      </p>

      <div className="space-y-6" data-tutorial-field="tutorial-field-summary-review">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">{t('summary.basicInformation')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.ruleName')}</span>
              <span className="font-medium">{ruleData.ruleName || t('common.notSet')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.ruleId')}</span>
              <span className="font-medium font-mono text-xs">{ruleData.ruleId || t('common.notSet')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.threshold')}</span>
              <span className="font-medium">{ruleData.threshold}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.status')}</span>
              <select
                value={ruleData.status || 'new'}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (newStatus === 'active') {
                    if (window.confirm(t('summary.activateRuleWarning'))) {
                      updateRuleData('status', newStatus);
                    } else {
                      // Reset dropdown to current value
                      e.target.value = ruleData.status || 'new';
                    }
                  } else {
                    updateRuleData('status', newStatus);
                  }
                }}
                className="px-3 py-1 rounded focus:outline-none text-sm"
                style={{ 
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--input-text)'
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              >
                {ruleData.status === 'new' ? (
                  <>
                    <option value="new">{t('status.new')}</option>
                    <option value="active">{t('status.active')}</option>
                    <option value="inactive">{t('status.inactive')}</option>
                  </>
                ) : (
                  <>
                    <option value="active">{t('status.active')}</option>
                    <option value="inactive">{t('status.inactive')}</option>
                  </>
                )}
              </select>
            </div>
            {ruleData.status === 'active' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                {t('summary.activeRuleNote')}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">{t('summary.ocrIdentifiers')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.logicGroups')}</span>
              <span className="font-medium">{ruleData.ocrIdentifiers?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.totalIdentifiers')}</span>
              <span className="font-medium">{totalOcrIdentifiers} {t('common.patterns')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.ocrThreshold')}</span>
              <span className="font-medium">{ruleData.ocrThreshold || 75}%</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.ocrMultiplier')}</span>
              <span className="font-medium">{ocrMultiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.maxOcrWeight')}</span>
              <span className="font-medium" style={{ color: 'var(--info-text)' }}>{weights.ocrMax} {t('common.points')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">{t('summary.filenameIdentification')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.filenamePatterns')}</span>
              <span className="font-medium">{ruleData.filenamePatterns?.patterns?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.dateFormats')}</span>
              <span className="font-medium">{ruleData.filenamePatterns?.dateFormats?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.totalPatterns')}</span>
              <span className="font-medium">{totalFilenamePatterns}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.filenameMultiplier')}</span>
              <span className="font-medium">{filenameMultiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.maxFilenameWeight')}</span>
              <span className="font-medium" style={{ color: 'var(--info-text)' }}>{weights.filenameMax} {t('common.points')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">{t('summary.dataVerification')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.enabledFields')}</span>
              <span className="font-medium">{totalVerificationFields}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.verificationMultiplier')}</span>
              <span className="font-medium">
                {verificationMultiplierConfig.mode === 'auto' 
                  ? `${t('summary.auto')} (${verificationMultiplier.toFixed(2)}×)` 
                  : `${verificationMultiplier.toFixed(2)}×`}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.maxVerificationWeight')}</span>
              <span className="font-medium" style={{ color: 'var(--info-text)' }}>{weights.verificationMax.toFixed(1)} {t('common.points')}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-lg">{t('summary.documentClassifications')}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.correspondent')}</span>
              <span className="font-medium">{ruleData.predefinedData?.correspondent || t('common.notSet')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.documentType')}</span>
              <span className="font-medium">{ruleData.predefinedData?.documentType || t('common.notSet')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.tags')}</span>
              <span className="font-medium">{ruleData.predefinedData?.tags?.length || 0} {t('common.tags')}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--app-text-secondary)' }}>{t('summary.dynamicExtractionRules')}</span>
              <span className="font-medium">{ruleData.dynamicData?.extractionRules?.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="card" data-tutorial-field="tutorial-field-summary-score" style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' }}>
          <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--info-text)' }}>{t('summary.pocoScoreCalculation')}</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-2" style={{ color: 'var(--info-text)' }}>{t('summary.maxPossibleWeights')}</p>
              <div className="space-y-1 ml-4" style={{ color: 'var(--info-text)' }}>
                <p>• {t('summary.ocrLabel')} {weights.ocrMax.toFixed(1)} {t('common.points')}</p>
                <p>• {t('summary.filenameLabel')} {weights.filenameMax.toFixed(1)} {t('common.points')}</p>
                <p>• {t('summary.verificationLabel')} {weights.verificationMax.toFixed(1)} {t('common.points')}</p>
                <p className="font-semibold pt-2" style={{ borderTop: '1px solid var(--info-border)' }}>
                  {t('summary.totalMaxWeight')} {weights.totalMax.toFixed(1)} {t('common.points')}
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2" style={{ color: 'var(--info-text)' }}>{t('summary.exampleCalculation', { matchRate: exampleMatchRate * 100 })}</p>
              <div className="space-y-1 ml-4" style={{ color: 'var(--info-text)' }}>
                <p>• {t('summary.ocrScoreLabel')} {exampleScore.ocrScore.toFixed(1)}</p>
                <p>• {t('summary.filenameScoreLabel')} {exampleScore.filenameScore.toFixed(1)}</p>
                <p>• {t('summary.verificationScoreLabel')} {exampleScore.verificationScore.toFixed(1)}</p>
                <p className="font-semibold pt-2" style={{ borderTop: '1px solid var(--info-border)' }}>
                  {t('summary.pocoScoreLabel')} {exampleScore.pocoPercentage}%
                </p>
              </div>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid var(--info-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--info-text)' }}>{t('summary.thresholds')}</p>
              <div className="space-y-1 ml-4" style={{ color: 'var(--info-text)' }}>
                <p>{t('summary.ocrThresholdLabel', { threshold: ruleData.ocrThreshold || 75 })}</p>
                <p>{t('summary.pocoThresholdLabel', { threshold: ruleData.threshold })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}