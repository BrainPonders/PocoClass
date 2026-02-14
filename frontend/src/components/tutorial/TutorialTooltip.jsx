import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function TutorialTooltip({ step, totalSteps, currentIndex, onNext, onPrev, onClose }) {
  if (!step) return null;

  const positions = {
    '1.1': { top: '120px', left: '50%', transform: 'translateX(-50%)' },
    '1.2': { top: '200px', left: '28%', transform: 'translateX(-50%)' },
    '1.3': { top: '380px', left: '28%', transform: 'translateX(-50%)' },
    '2.1': { top: '120px', left: '50%', transform: 'translateX(-50%)' },
    '2.2': { top: '200px', left: '28%', transform: 'translateX(-50%)' },
    '2.3': { top: '350px', left: '28%', transform: 'translateX(-50%)' },
    '2.4': { top: '500px', left: '28%', transform: 'translateX(-50%)' },
    '3.1': { top: '200px', left: '28%', transform: 'translateX(-50%)' },
    '4.1': { top: '200px', left: '50%', transform: 'translateX(-50%)' },
    '5.1': { top: '200px', left: '28%', transform: 'translateX(-50%)' },
    '5.2': { top: '350px', left: '28%', transform: 'translateX(-50%)' },
    '6.1': { top: '200px', left: '65%', transform: 'translateX(-50%)' },
    '6.2': { top: '200px', left: '50%', transform: 'translateX(-50%)' },
  };

  const pos = positions[step.id] || { top: '200px', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      style={{
        position: 'fixed',
        ...pos,
        zIndex: 9999,
        maxWidth: '420px',
        width: '90vw',
        backgroundColor: 'var(--app-surface, #fff)',
        border: '2px solid var(--app-primary, #2563eb)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 4000px rgba(0,0,0,0.15)',
        padding: '0',
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--app-border, #e5e7eb)',
        backgroundColor: 'var(--app-primary, #2563eb)',
        borderRadius: '10px 10px 0 0',
        color: '#fff'
      }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
          {step.title}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '2px', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: '16px', color: 'var(--app-text, #333)' }}>
        <p style={{ fontSize: '0.8125rem', lineHeight: '1.6', margin: 0 }}>
          {step.text}
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        borderTop: '1px solid var(--app-border, #e5e7eb)',
      }}>
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            border: '1px solid var(--app-border, #d1d5db)',
            borderRadius: '6px',
            background: currentIndex === 0 ? 'var(--app-surface-light, #f9fafb)' : 'var(--app-surface, #fff)',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.4 : 1,
            color: 'var(--app-text, #333)',
            fontSize: '0.8125rem'
          }}
        >
          <ChevronLeft size={14} /> Back
        </button>

        <span style={{
          fontSize: '0.6875rem',
          color: 'var(--app-text-muted, #9ca3af)',
          fontWeight: '500'
        }}>
          Step {step.id} · {currentIndex + 1}/{totalSteps}
        </span>

        <button
          onClick={currentIndex === totalSteps - 1 ? onClose : onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            border: 'none',
            borderRadius: '6px',
            background: 'var(--app-primary, #2563eb)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: '500'
          }}
        >
          {currentIndex === totalSteps - 1 ? 'Finish' : 'Next'} {currentIndex < totalSteps - 1 && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
