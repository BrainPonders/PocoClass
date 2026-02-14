/**
 * @file GuidedTutorial.jsx
 * @description Interactive guided tutorial that walks users through the 6-step rule
 * builder using a real bank statement example. All wizard fields are read-only.
 * Features spotlight overlays, step-by-step tooltips, and a preview panel with
 * highlighted OCR text and a rendered PDF preview.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();

  // Resolve initial tutorial index from ?step= query param
  const getInitialIndex = () => {
    const requestedStep = parseInt(searchParams.get('step'), 10);
    if (!requestedStep || requestedStep < 1 || requestedStep > 6) return 0;
    const idx = TUTORIAL_STEPS.findIndex(s => s.step === requestedStep);
    return idx >= 0 ? idx : 0;
  };

  const [tutorialIndex, setTutorialIndex] = useState(getInitialIndex);
  const [previewTabOverride, setPreviewTabOverride] = useState(null);
  const [ruleData] = useState(EXAMPLE_RULE_DATA);
  const [showInfoBoxes, setShowInfoBoxes] = useState({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true
  });

  const currentTutorialStep = TUTORIAL_STEPS[tutorialIndex];
  const wizardStep = currentTutorialStep?.step || 1;
  const isOrientation = wizardStep === 0;
  const displayWizardStep = isOrientation ? 1 : wizardStep;

  // Build step status map: completed for past steps, edited for current
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

  // Reset preview tab override when navigating between tutorial steps
  useEffect(() => {
    setPreviewTabOverride(null);
  }, [tutorialIndex]);

  // Auto-scroll to the input area when a step specifies scrollBehavior='start'
  useEffect(() => {
    if (currentTutorialStep?.scrollBehavior === 'start' && !currentTutorialStep?.spotlightTarget) {
      const inputArea = document.querySelector('[data-tutorial-area="input-area"]');
      if (inputArea) {
        inputArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [tutorialIndex]);

  // Handle custom tutorial actions (toggle preview, open guide sections)
  const handleTutorialAction = (action) => {
    if (action === 'togglePreview') {
      const currentTab = previewTabOverride || currentTutorialStep?.previewTab || 'pdf';
      setPreviewTabOverride(currentTab === 'pdf' ? 'ocr' : 'pdf');
    }
    if (action === 'openGuide' || action === 'openGuideScoring' || action === 'openGuideMetadata') {
      const guideButton = document.querySelector('[data-guide-trigger]');
      if (guideButton) {
        guideButton.click();
        const anchorId = action === 'openGuideScoring' ? 'guide-scoring-system' : action === 'openGuideMetadata' ? 'guide-metadata-step' : 'guide-regex-support';
        setTimeout(() => {
          const anchor = document.getElementById(anchorId);
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
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
        <div data-tutorial-area="step-progress" style={{ width: 'fit-content' }}>
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
              ocrHighlights={ocrHighlights}
            />
          </div>
        </div>
      </div>

      <SpotlightOverlay 
        targetSelector={currentTutorialStep?.spotlightTarget} 
        scrollBehavior={currentTutorialStep?.scrollBehavior || 'center'} 
      />

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
