import React from 'react';
import { Lightbulb, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const HIGHLIGHT_COLORS = {
  group1: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', label: '#dc2626' },
  group2: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', label: '#2563eb' },
  group3: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', label: '#059669' },
  filename: { bg: 'rgba(168, 85, 247, 0.15)', border: '#a855f7', label: '#7c3aed' },
  metadata: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', label: '#d97706' },
  verification: { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', label: '#0891b2' },
};

function HighlightBox({ color, label, children, style = {} }) {
  const c = HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.group1;
  return (
    <span style={{
      backgroundColor: c.bg,
      border: `2px solid ${c.border}`,
      borderRadius: '3px',
      padding: '1px 4px',
      position: 'relative',
      ...style
    }}>
      {label && (
        <span style={{
          position: 'absolute',
          top: '-10px',
          right: '-2px',
          backgroundColor: c.border,
          color: 'white',
          fontSize: '0.55rem',
          padding: '0px 4px',
          borderRadius: '3px',
          fontWeight: '700',
          lineHeight: '1.4',
          whiteSpace: 'nowrap'
        }}>{label}</span>
      )}
      {children}
    </span>
  );
}

function StepAnnotation({ children }) {
  return (
    <div style={{
      backgroundColor: 'var(--help-panel-bg, #eff6ff)',
      border: '1px solid var(--app-border, #bfdbfe)',
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      padding: '12px 14px',
      marginTop: '16px',
      fontSize: '0.8rem',
      lineHeight: '1.6',
      color: 'var(--help-panel-text, #1e3a5f)'
    }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        <Lightbulb size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
        <div>{children}</div>
      </div>
    </div>
  );
}

function TipBox({ children }) {
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      padding: '6px 10px',
      backgroundColor: 'var(--help-panel-tip-bg, rgba(245, 158, 11, 0.1))',
      border: '1px solid var(--help-panel-tip-border, rgba(245, 158, 11, 0.3))',
      borderRadius: '6px',
      marginTop: '8px',
      fontSize: '0.75rem',
      color: 'var(--help-panel-tip-text, #92400e)',
      alignItems: 'flex-start'
    }}>
      <span style={{ flexShrink: 0 }}>💡</span>
      <span>{children}</span>
    </div>
  );
}

function LegendItem({ color, children }) {
  const c = HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.group1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
      <span style={{
        width: '12px', height: '12px', borderRadius: '2px',
        backgroundColor: c.bg, border: `2px solid ${c.border}`,
        flexShrink: 0
      }} />
      <span style={{ color: 'var(--help-panel-text, #1e3a5f)' }}>{children}</span>
    </div>
  );
}

export default function ExampleDocumentPanel({ currentStep }) {
  const { t } = useLanguage();

  const showHighlights = (step) => currentStep === step;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '0px',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: 'var(--help-panel-bg, #eff6ff)',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid var(--app-border, #bfdbfe)'
      }}>
        <Lightbulb size={16} style={{ color: '#f59e0b' }} />
        <span style={{
          fontSize: '0.8125rem',
          fontWeight: '600',
          color: 'var(--help-panel-title, #1e40af)'
        }}>
          {t('wizard.help.exampleDocTitle')}
        </span>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px',
        backgroundColor: 'var(--app-bg, #f8fafc)'
      }}>
        {currentStep <= 2 && (
          <div style={{ marginBottom: '12px' }}>
            {showHighlights(2) && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <LegendItem color="group1">{t('wizard.help.step2.group1Title')}</LegendItem>
                <LegendItem color="group2">{t('wizard.help.step2.group2Title')}</LegendItem>
                <LegendItem color="group3">{t('wizard.help.step2.group3Title')}</LegendItem>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              backgroundColor: 'var(--help-panel-example-bg, rgba(255,255,255,0.7))',
              border: '1px solid var(--app-border, #e2e8f0)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '0.775rem',
              color: 'var(--help-panel-text, #1e3a5f)'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{t('wizard.help.step3.filenameTitle')}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--help-panel-code-bg, #dbeafe)', borderRadius: '4px', marginBottom: '6px' }}>
                <HighlightBox color="filename" label={t('wizard.help.step2.patternsLabel')}>2024-03-15_electricity_bill_greenpower.pdf</HighlightBox>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic' }}>
                {t('wizard.help.step3.filenameExplanation')}
              </div>
            </div>
          </div>
        )}

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          padding: '28px 32px',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: '0.82rem',
          lineHeight: '1.5',
          color: '#1a1a1a',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          position: 'relative',
          maxWidth: '100%'
        }}>
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '0.6rem',
            color: '#9ca3af',
            fontFamily: 'sans-serif',
            fontStyle: 'italic'
          }}>
            {t('wizard.help.exampleLabel')}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #1a1a1a', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <Zap size={20} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '1.3rem', fontWeight: '700', letterSpacing: '0.5px' }}>GreenPower Energy Ltd.</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
              123 Renewable Drive, Solar City, EC1A 1BB<br />
              Tel: 0800 123 4567 &nbsp;|&nbsp; www.greenpower-energy.example.com
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {showHighlights(2) ? (
                <HighlightBox color="group1" label="Group 1">Electricity Bill</HighlightBox>
              ) : (
                'Electricity Bill'
              )}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.78rem' }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: '0.68rem' }}>Customer</div>
              <div style={{ fontWeight: '600' }}>
                {showHighlights(5) ? (
                  <HighlightBox color="metadata" label={t('wizard.help.step5.correspondentLabel')}>John Smith</HighlightBox>
                ) : 'John Smith'}
              </div>
              <div>42 Oak Street</div>
              <div>Manchester, M1 2AB</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><span style={{ color: '#6b7280', fontSize: '0.68rem' }}>Invoice No:</span> <span style={{ fontWeight: '600' }}>INV-2024-0847</span></div>
              <div><span style={{ color: '#6b7280', fontSize: '0.68rem' }}>Account:</span> EL-4829173</div>
              <div><span style={{ color: '#6b7280', fontSize: '0.68rem' }}>Date:</span>{' '}
                {showHighlights(5) ? (
                  <HighlightBox color="metadata" label={t('wizard.help.step5.dateLabel')}>15 March 2024</HighlightBox>
                ) : '15 March 2024'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '14px', fontSize: '0.78rem' }}>
            <div style={{ color: '#6b7280', fontSize: '0.68rem', marginBottom: '2px' }}>Billing Period</div>
            <div>15 January 2024 – 14 March 2024</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #374151' }}>
                <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: '700' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: '700' }}>Usage</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: '700' }}>Rate</th>
                <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: '700' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 4px' }}>
                  {showHighlights(2) ? (
                    <span><HighlightBox color="group1" label="Group 1">Electricity</HighlightBox> — Standard Rate</span>
                  ) : 'Electricity — Standard Rate'}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>
                  {showHighlights(2) ? (
                    <span>1,247 <HighlightBox color="group2" label="Group 2">kWh</HighlightBox></span>
                  ) : '1,247 kWh'}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>£0.28/kWh</td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>£349.16</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 4px' }}>Standing Charge (59 days)</td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}></td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>£0.46/day</td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>£27.14</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 4px' }}>VAT (5%)</td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}></td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}></td>
                <td style={{ textAlign: 'right', padding: '6px 4px' }}>£18.82</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '8px 4px', borderTop: '2px solid #374151', borderBottom: '2px solid #374151' }}>
            <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>
              {showHighlights(2) ? (
                <HighlightBox color="group3" label="Group 3">Total Charges</HighlightBox>
              ) : 'Total Charges'}
            </span>
            <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>£395.12</span>
          </div>

          <div style={{ marginBottom: '14px', fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{showHighlights(2) ? <HighlightBox color="group2" label="Group 2">Meter Reading</HighlightBox> : 'Meter Reading'} (Current):</span>
              <span style={{ fontWeight: '600' }}>54,821</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Meter Reading (Previous):</span>
              <span style={{ fontWeight: '600' }}>53,574</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Units Used:</span>
              <span style={{ fontWeight: '600' }}>
                {showHighlights(2) ? <span>1,247 <HighlightBox color="group2" label="Group 2">kWh</HighlightBox></span> : '1,247 kWh'}
              </span>
            </div>
          </div>

          <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '0.76rem' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>
              {showHighlights(2) ? (
                <HighlightBox color="group3" label="Group 3">Payment Due</HighlightBox>
              ) : 'Payment Due'}
            </div>
            <div>Please pay by <strong>30 March 2024</strong> using your preferred method.</div>
            <div style={{ marginTop: '4px' }}>
              {showHighlights(2) ? (
                <span><HighlightBox color="group3" label="Group 3">Amount Due</HighlightBox>: <strong>£395.12</strong></span>
              ) : <span>Amount Due: <strong>£395.12</strong></span>}
            </div>
          </div>

          <div style={{ fontSize: '0.65rem', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: '10px', textAlign: 'center' }}>
            GreenPower Energy Ltd. Registered in England No. 12345678<br />
            For queries, call 0800 123 4567 or email support@greenpower-energy.example.com
          </div>
        </div>

        <StepAnnotation>
          {currentStep === 1 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step1.whatTitle')}</div>
              <p style={{ marginBottom: '8px' }}>{t('wizard.help.step1.whatText')}</p>
              <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                <strong>{t('wizard.ruleNameLabel')}:</strong>{' '}
                <code style={{ backgroundColor: 'var(--help-panel-code-bg, #dbeafe)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{t('wizard.help.step1.ruleName')}</code>
                <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic' }}> — {t('wizard.help.step1.ruleNameWhy')}</span>
              </div>
              <div style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                <strong>{t('rules.description')}:</strong>{' '}
                <code style={{ backgroundColor: 'var(--help-panel-code-bg, #dbeafe)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{t('wizard.help.step1.description')}</code>
                <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontStyle: 'italic' }}> — {t('wizard.help.step1.descriptionWhy')}</span>
              </div>
              <TipBox>{t('wizard.help.step1.tip1')}</TipBox>
              <TipBox>{t('wizard.help.step1.tip2')}</TipBox>
            </div>
          )}
          {currentStep === 2 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step2.whatTitle')}</div>
              <p style={{ marginBottom: '8px' }}>{t('wizard.help.step2.whatText')}</p>
              <p style={{ marginBottom: '6px', fontSize: '0.775rem' }}>{t('wizard.help.step2.exampleIntro')}</p>
              <div style={{ marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ color: HIGHLIGHT_COLORS.group1.label, fontWeight: '600' }}>● {t('wizard.help.step2.group1Title')}</span>
                <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontSize: '0.725rem' }}> — {t('wizard.help.step2.group1Why')}</span>
              </div>
              <div style={{ marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ color: HIGHLIGHT_COLORS.group2.label, fontWeight: '600' }}>● {t('wizard.help.step2.group2Title')}</span>
                <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontSize: '0.725rem' }}> — {t('wizard.help.step2.group2Why')}</span>
              </div>
              <div style={{ marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ color: HIGHLIGHT_COLORS.group3.label, fontWeight: '600' }}>● {t('wizard.help.step2.group3Title')}</span>
                <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontSize: '0.725rem' }}> — {t('wizard.help.step2.group3Why')}</span>
              </div>
              <TipBox>{t('wizard.help.step2.tip1')}</TipBox>
              <TipBox>{t('wizard.help.step2.tip2')}</TipBox>
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step3.whatTitle')}</div>
              <p style={{ marginBottom: '8px' }}>{t('wizard.help.step3.whatText')}</p>
              <TipBox>{t('wizard.help.step3.tip1')}</TipBox>
            </div>
          )}
          {currentStep === 4 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step4.whatTitle')}</div>
              <p>{t('wizard.help.step4.whatText')}</p>
              <TipBox>{t('wizard.help.step4.tip1')}</TipBox>
            </div>
          )}
          {currentStep === 5 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step5.whatTitle')}</div>
              <p style={{ marginBottom: '8px' }}>{t('wizard.help.step5.whatText')}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <LegendItem color="metadata">{t('wizard.help.step5.highlightedFields')}</LegendItem>
              </div>
              <TipBox>{t('wizard.help.step5.tip1')}</TipBox>
            </div>
          )}
          {currentStep === 6 && (
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>{t('wizard.help.step6.whatTitle')}</div>
              <p>{t('wizard.help.step6.whatText')}</p>
            </div>
          )}
        </StepAnnotation>
      </div>
    </div>
  );
}
