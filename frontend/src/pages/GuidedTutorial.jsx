import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import PageLayout from '@/components/PageLayout';
import StepProgress from '@/components/wizard/StepProgress';
import TabbedPreviewPanel from '@/components/TabbedPreviewPanel';
import TutorialTooltip from '@/components/tutorial/TutorialTooltip';
import BankStatementPdf from '@/components/tutorial/BankStatementPdf';
import { EXAMPLE_OCR_TEXT, EXAMPLE_RULE_DATA, TUTORIAL_STEPS } from '@/components/tutorial/tutorialData';

export default function GuidedTutorial() {
  const navigate = useNavigate();
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [ruleData] = useState(EXAMPLE_RULE_DATA);

  const currentTutorialStep = TUTORIAL_STEPS[tutorialIndex];
  const wizardStep = currentTutorialStep?.step || 1;

  const stepStatus = {};
  for (let i = 1; i <= 6; i++) {
    if (i < wizardStep) stepStatus[i] = 'completed';
    else if (i === wizardStep) stepStatus[i] = 'edited';
    else stepStatus[i] = 'untouched';
  }

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

  useEffect(() => {
    const highlightFields = currentTutorialStep?.highlightFields || [];

    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    highlightFields.forEach(fieldId => {
      const el = document.querySelector(`[data-tutorial="${fieldId}"]`);
      if (el) el.classList.add('tutorial-highlight');
    });

    return () => {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [tutorialIndex, currentTutorialStep]);

  const renderCurrentStep = () => {
    const stepProps = {
      ruleData,
      updateRuleData: noOp,
      currentStep: wizardStep,
    };

    switch (wizardStep) {
      case 1:
        return (
          <div data-tutorial-step="1">
            <div data-tutorial="tutorial-field-rulename">
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Rule Name</label>
              <input
                type="text"
                value={ruleData.ruleName}
                readOnly
                className="form-input"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface-light)', color: 'var(--app-text)', cursor: 'default' }}
              />
            </div>
            <div data-tutorial="tutorial-field-ruleid" style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Rule ID</label>
              <input
                type="text"
                value={ruleData.ruleId}
                readOnly
                className="form-input"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface-light)', color: 'var(--app-text-muted)', cursor: 'default' }}
              />
            </div>
            <div data-tutorial="tutorial-field-description" style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Description</label>
              <textarea
                value={ruleData.description}
                readOnly
                rows={3}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface-light)', color: 'var(--app-text)', cursor: 'default', resize: 'none' }}
              />
            </div>
            <div data-tutorial="tutorial-field-threshold" style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>POCO Score Threshold</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="range" min="0" max="100" value={ruleData.threshold} readOnly style={{ flex: 1, cursor: 'default' }} />
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--app-primary)', minWidth: '45px' }}>{ruleData.threshold}%</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div data-tutorial-step="2">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--app-text)', marginBottom: '8px' }}>OCR Identifying Patterns</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Patterns that identify this document type in the OCR text.</p>
            </div>
            {(ruleData.ocrIdentifiers || []).map((group, i) => (
              <div
                key={i}
                data-tutorial={`tutorial-field-ocrgroup-${i}`}
                style={{
                  padding: '12px 16px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-light)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--app-text-muted)' }}>
                    Logic Group {i + 1} {group.mandatory && <span style={{ color: '#ef4444', fontWeight: '700' }}>(Mandatory)</span>}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--app-text-muted)' }}>Range: {group.conditions[0]?.range}</span>
                </div>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--app-bg-secondary, #f3f4f6)',
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  color: 'var(--app-text)'
                }}>
                  {group.conditions[0]?.pattern || '(empty)'}
                </div>
              </div>
            ))}
            <div data-tutorial="tutorial-field-ocrthreshold" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>OCR Threshold</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="range" min="0" max="100" value={ruleData.ocrThreshold} readOnly style={{ flex: 1, cursor: 'default' }} />
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--app-primary)', minWidth: '45px' }}>{ruleData.ocrThreshold}%</span>
              </div>
            </div>
            <div data-tutorial="tutorial-field-ocrmultiplier" style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>OCR Multiplier</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="range" min="1" max="5" value={ruleData.ocrMultiplier} readOnly style={{ flex: 1, cursor: 'default' }} />
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--app-primary)', minWidth: '45px' }}>×{ruleData.ocrMultiplier}</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div data-tutorial-step="3">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--app-text)', marginBottom: '8px' }}>Filename Patterns</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Patterns to match against the document filename.</p>
            </div>
            {(ruleData.filenamePatterns?.patterns || []).map((pattern, i) => (
              <div key={i} data-tutorial={`tutorial-field-filename-${i}`} style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Pattern {i + 1}</label>
                <input
                  type="text"
                  value={pattern}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--app-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--app-surface-light)',
                    fontFamily: 'monospace',
                    fontSize: '0.8125rem',
                    color: 'var(--app-text)',
                    cursor: 'default'
                  }}
                />
              </div>
            ))}
          </div>
        );

      case 4:
        return (
          <div data-tutorial-step="4">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--app-text)', marginBottom: '8px' }}>Data Verification</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Cross-reference extracted data with Paperless-ngx metadata for extra validation. This is an advanced feature.</p>
            </div>
            <div style={{
              padding: '24px',
              borderRadius: '8px',
              border: '1px dashed var(--app-border)',
              textAlign: 'center',
              color: 'var(--app-text-muted)',
              fontSize: '0.875rem'
            }}>
              No verification rules configured for this example.
              <br />
              <span style={{ fontSize: '0.75rem' }}>This step is optional — you can skip it when starting out.</span>
            </div>
          </div>
        );

      case 5:
        return (
          <div data-tutorial-step="5">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--app-text)', marginBottom: '8px' }}>Metadata Assignment</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>When a document matches, assign these Paperless-ngx fields automatically.</p>
            </div>
            <div data-tutorial="tutorial-field-doctype" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Document Type</label>
              <input
                type="text"
                value={ruleData.predefinedData.documentType}
                readOnly
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface-light)', color: 'var(--app-text)', cursor: 'default' }}
              />
            </div>
            <div data-tutorial="tutorial-field-correspondent" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Correspondent</label>
              <input
                type="text"
                value={ruleData.predefinedData.correspondent}
                readOnly
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface-light)', color: 'var(--app-text)', cursor: 'default' }}
              />
            </div>
            <div data-tutorial="tutorial-field-tags" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Tags</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ruleData.predefinedData.tags.map((tag, i) => (
                  <span key={i} style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--app-primary, #2563eb)',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>{tag}</span>
                ))}
              </div>
            </div>
            <div data-tutorial="tutorial-field-dynamic" style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.875rem', color: 'var(--app-text)' }}>Dynamic Extraction</label>
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-light)',
              }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--app-text)' }}>
                  <span style={{ fontWeight: '600' }}>Account Number</span>
                  <span style={{ color: 'var(--app-text-muted)', marginLeft: '8px' }}>→ Extract using anchor "Account Number:" with pattern \d{'{7}'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div data-tutorial-step="6">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--app-text)', marginBottom: '8px' }}>Summary & Review</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--app-text-muted)' }}>Review your complete rule before saving.</p>
            </div>
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-light)',
            }}>
              <div style={{ display: 'grid', gap: '10px', fontSize: '0.8125rem' }}>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>Rule:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.ruleName} ({ruleData.ruleId})</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>POCO Threshold:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.threshold}%</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>OCR Threshold:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.ocrThreshold}%</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>OCR Patterns:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.ocrIdentifiers.length} groups ({ruleData.ocrIdentifiers.filter(g => g.mandatory).length} mandatory)</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>Filename Patterns:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.filenamePatterns.patterns.join(', ')}</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>Document Type:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.predefinedData.documentType}</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>Correspondent:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.predefinedData.correspondent}</span></div>
                <div><span style={{ fontWeight: '600', color: 'var(--app-text)' }}>Tags:</span> <span style={{ color: 'var(--app-text-muted)' }}>{ruleData.predefinedData.tags.join(', ')}</span></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const pdfHighlights = currentTutorialStep?.pdfHighlights || [];
  const ocrHighlights = currentTutorialStep?.ocrHighlights || [];

  const getHighlightedOcr = () => {
    if (!ocrHighlights.length) return EXAMPLE_OCR_TEXT;
    return EXAMPLE_OCR_TEXT;
  };

  const renderOcrWithHighlights = () => {
    if (!ocrHighlights.length) return EXAMPLE_OCR_TEXT;

    let result = EXAMPLE_OCR_TEXT;
    return result;
  };

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
        <div>
          <StepProgress
            currentStep={wizardStep}
            stepStatus={stepStatus}
            onStepClick={handleStepClick}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.35fr)_minmax(0,2.65fr)] gap-6" style={{ paddingBottom: '100px', marginTop: '24px' }}>
          <div style={{ pointerEvents: 'none', opacity: 0.95 }}>
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
              pointerEvents: 'none'
            }}>
              <GraduationCap size={14} />
              TUTORIAL MODE — Fields are read-only
            </div>
            {renderCurrentStep()}
          </div>

          <div style={{ height: '100%', marginTop: '24px' }}>
            <TabbedPreviewPanel
              ruleData={ruleData}
              ocrContent={EXAMPLE_OCR_TEXT}
              pdfContent={<BankStatementPdf highlights={ocrHighlights} />}
              externalActiveTab={currentTutorialStep?.previewTab || 'pdf'}
            />
          </div>
        </div>
      </div>

      <TutorialTooltip
        step={currentTutorialStep}
        totalSteps={TUTORIAL_STEPS.length}
        currentIndex={tutorialIndex}
        onNext={() => goToTutorialStep(tutorialIndex + 1)}
        onPrev={() => goToTutorialStep(tutorialIndex - 1)}
        onClose={() => navigate(createPageUrl('Rules'))}
      />
    </PageLayout>
  );
}
