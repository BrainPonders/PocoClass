import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const STORAGE_KEY = 'pococlass_wizard_help_collapsed';

export default function WizardHelpPanel({ stepNumber, showHelp, children }) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[stepNumber] || false;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[stepNumber] = collapsed;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  }, [collapsed, stepNumber]);

  if (!showHelp) return null;

  return (
    <div style={{
      border: '1px solid var(--app-border, #bfdbfe)',
      borderLeft: '4px solid #3b82f6',
      borderRadius: '8px',
      marginBottom: '20px',
      backgroundColor: 'var(--help-panel-bg, #eff6ff)',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--help-panel-title, #1e40af)',
          textAlign: 'left'
        }}
      >
        <Lightbulb size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{t('wizard.helpPanelTitle', { step: stepNumber })}</span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {!collapsed && (
        <div style={{
          padding: '0 16px 16px 16px',
          fontSize: '0.8125rem',
          lineHeight: '1.7',
          color: 'var(--help-panel-text, #1e3a5f)'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpSection({ title, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      {title && (
        <div style={{
          fontWeight: '600',
          fontSize: '0.8125rem',
          color: 'var(--help-panel-section-title, #1e40af)',
          marginBottom: '4px'
        }}>
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function HelpExample({ label, value, explanation }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '6px 10px',
      backgroundColor: 'var(--help-panel-example-bg, rgba(255,255,255,0.7))',
      borderRadius: '6px',
      marginBottom: '4px',
      alignItems: 'baseline',
      flexWrap: 'wrap'
    }}>
      <span style={{ fontWeight: '600', minWidth: '120px', color: 'var(--help-panel-label, #374151)' }}>{label}:</span>
      <code style={{
        backgroundColor: 'var(--help-panel-code-bg, #dbeafe)',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        color: 'var(--help-panel-code-text, #1e40af)'
      }}>{value}</code>
      {explanation && (
        <span style={{ color: 'var(--help-panel-explanation, #6b7280)', fontSize: '0.775rem', fontStyle: 'italic' }}>— {explanation}</span>
      )}
    </div>
  );
}

export function HelpTip({ children }) {
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      padding: '6px 10px',
      backgroundColor: 'var(--help-panel-tip-bg, rgba(245, 158, 11, 0.1))',
      border: '1px solid var(--help-panel-tip-border, rgba(245, 158, 11, 0.3))',
      borderRadius: '6px',
      marginTop: '6px',
      fontSize: '0.775rem',
      color: 'var(--help-panel-tip-text, #92400e)',
      alignItems: 'flex-start'
    }}>
      <span style={{ flexShrink: 0 }}>💡</span>
      <span>{children}</span>
    </div>
  );
}
