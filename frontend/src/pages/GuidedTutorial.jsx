import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import PageLayout from '@/components/PageLayout';
import StepProgress from '@/components/wizard/StepProgress';
import TabbedPreviewPanel from '@/components/TabbedPreviewPanel';
import TutorialTooltip from '@/components/tutorial/TutorialTooltip';
import SpotlightOverlay from '@/components/tutorial/SpotlightOverlay';
import BankStatementPdf from '@/components/tutorial/BankStatementPdf';
import { EXAMPLE_OCR_TEXT, EXAMPLE_RULE_DATA, TUTORIAL_STEPS } from '@/components/tutorial/tutorialData';

import BasicInfoStep from '@/components/wizard/steps/BasicInfoStep';
import OcrIdentifiersStep from '@/components/wizard/steps/OcrIdentifiersStep';
import FilenameIdentificationStep from '@/components/wizard/steps/FilenameIdentificationStep';
import DataVerificationStep from '@/components/wizard/steps/DataVerificationStep';
import DocumentClassificationsStep from '@/components/wizard/steps/DocumentClassificationsStep';
import SummaryStep from '@/components/wizard/steps/SummaryStep';

export default function GuidedTutorial() {
  const navigate = useNavigate();
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [previewTabOverride, setPreviewTabOverride] = useState(null);
  const [ruleData] = useState(EXAMPLE_RULE_DATA);
  const [showInfoBoxes, setShowInfoBoxes] = useState({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true
  });

  const currentTutorialStep = TUTORIAL_STEPS[tutorialIndex];
  const wizardStep = currentTutorialStep?.step || 1;
  const isOrientation = wizardStep === 0;
  const displayWizardStep = isOrientation ? 1 : wizardStep;

  const stepStatus = {};
  if (isOrientation) {
    for (let i = 1; i <= 6; i++) {
      stepStatus[i] = 'untouched';
    }
  } else {
    for (let i = 1; i <= 6; i++) {
      if (i < wizardStep) stepStatus[i] = 'completed';
      else if (i === wizardStep) stepStatus[i] = 'edited';
      else stepStatus[i] = 'untouched';
    }
  }

  useEffect(() => {
    setPreviewTabOverride(null);
  }, [tutorialIndex]);

  useEffect(() => {
    const prevHighlights = document.querySelectorAll('.tutorial-highlight');
    prevHighlights.forEach(el => el.classList.remove('tutorial-highlight'));

    if (currentTutorialStep?.highlightFields) {
      currentTutorialStep.highlightFields.forEach(fieldId => {
        const el = document.querySelector(`[data-tutorial-field="${fieldId}"]`);
        if (el) el.classList.add('tutorial-highlight');
      });
    }

    return () => {
      const highlights = document.querySelectorAll('.tutorial-highlight');
      highlights.forEach(el => el.classList.remove('tutorial-highlight'));
    };
  }, [tutorialIndex, currentTutorialStep]);

  const handleTutorialAction = (action) => {
    if (action === 'togglePreview') {
      const currentTab = previewTabOverride || currentTutorialStep?.previewTab || 'pdf';
      setPreviewTabOverride(currentTab === 'pdf' ? 'ocr' : 'pdf');
    }
    if (action === 'openGuide') {
      const guideButton = document.querySelector('[data-guide-trigger]');
      if (guideButton) guideButton.click();
    }
  };

  const noOp = useCallback(() => {}, []);

  const goToTutorialStep = (index) => {
    if (index >= 0 && index < TUTORIAL_STEPS.length) {
      setTutorialIndex(index);
    }
  };

  const handleStepClick = (step) => {
    const firstOfStep = TUTORIAL_STEPS.findIndex(s => s.step === step);
    if (firstOfStep >= 0) setTutorialIndex(firstOfStep);
  };

  const renderCurrentStep = () => {
    const stepProps = {
      ruleData,
      updateRuleData: noOp,
      currentStep: displayWizardStep,
      showInfoBoxes,
      setShowInfoBoxes,
    };

    switch (displayWizardStep) {
      case 1: return <BasicInfoStep {...stepProps} />;
      case 2: return <OcrIdentifiersStep {...stepProps} />;
      case 3: return <FilenameIdentificationStep {...stepProps} />;
      case 4: return <DataVerificationStep {...stepProps} />;
      case 5: return <DocumentClassificationsStep {...stepProps} />;
      case 6: return <SummaryStep {...stepProps} />;
      default: return <BasicInfoStep {...stepProps} />;
    }
  };

  const ocrHighlights = currentTutorialStep?.ocrHighlights || [];

  return (
    <PageLayout
      title="Guided Tutorial"
      subtitle="Learn how to build classification rules with a real bank statement example"
      headerPadding="py-3"
      actions={
        <button
          onClick={() => navigate(createPageUrl('Rules'))}
          className="btn btn-ghost"
        >
          <ArrowLeft size={16} />
          Back to Rules
        </button>
      }
    >
      <div className="max-w-[1800px] mx-auto px-12">
        <div data-tutorial-area="step-progress">
          <StepProgress
            currentStep={isOrientation ? null : wizardStep}
            stepStatus={stepStatus}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.35fr)_minmax(0,2.65fr)] gap-6" style={{ paddingBottom: '100px', marginTop: '24px' }}>
          <div data-tutorial-area="input-area" style={{ pointerEvents: 'none', opacity: 0.95 }}>
            <div style={{
              padding: '8px 12px',
              marginBottom: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--app-primary, #2563eb)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <GraduationCap size={14} />
              TUTORIAL MODE — Fields are read-only
            </div>
            {renderCurrentStep()}
          </div>

          <div data-tutorial-area="preview-panel" style={{ height: '100%', marginTop: '24px' }}>
            <TabbedPreviewPanel
              ruleData={ruleData}
              ocrContent={EXAMPLE_OCR_TEXT}
              pdfContent={<BankStatementPdf highlights={ocrHighlights} />}
              externalActiveTab={previewTabOverride || currentTutorialStep?.previewTab || 'pdf'}
            />
          </div>
        </div>
      </div>

      <SpotlightOverlay targetSelector={currentTutorialStep?.spotlightTarget || null} />

      <TutorialTooltip
        step={currentTutorialStep}
        totalSteps={TUTORIAL_STEPS.length}
        currentIndex={tutorialIndex}
        onNext={() => goToTutorialStep(tutorialIndex + 1)}
        onPrev={() => goToTutorialStep(tutorialIndex - 1)}
        onClose={() => navigate(createPageUrl('Rules'))}
        spotlightTarget={currentTutorialStep?.spotlightTarget || null}
        onAction={handleTutorialAction}
      />
    </PageLayout>
  );
}
