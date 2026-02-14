/**
 * @file TutorialTooltip.jsx
 * @description Floating tooltip component for the tutorial system. Positions itself
 * relative to the spotlight target element (above or below based on viewport half),
 * supports rich text parts with bold/action formatting, and provides step navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function TutorialTooltip({ step, totalSteps, currentIndex, onNext, onPrev, onClose, spotlightTarget, onAction }) {
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  const computePosition = useCallback(() => {
    if (step?.tooltipPosition) {
      setPosition(step.tooltipPosition);
      return;
    }

    if (!spotlightTarget) {
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const el = document.querySelector(spotlightTarget);
    if (!el) {
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const centerY = rect.top + rect.height / 2;
    const isTopHalf = centerY < viewportHeight / 2;

    if (isTopHalf) {
      const topVal = Math.min(rect.bottom + 24, viewportHeight - 220);
      setPosition({
        top: `${Math.max(topVal, 20)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      });
    } else {
      const bottomVal = viewportHeight - rect.top + 24;
      setPosition({
        bottom: `${Math.max(Math.min(bottomVal, viewportHeight - 220), 20)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      });
    }
  }, [spotlightTarget, step]);

  useEffect(() => {
    computePosition();
    const handle = () => computePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    const raf = requestAnimationFrame(computePosition);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
      cancelAnimationFrame(raf);
    };
  }, [computePosition]);

  if (!step) return null;

  return (
    <div
      style={{
        position: 'fixed',
        ...position,
        zIndex: 9999,
        maxWidth: '500px',
        width: '90vw',
        backgroundColor: 'var(--app-surface, #fff)',
        border: '2px solid var(--app-primary, #2563eb)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        padding: '0',
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid var(--app-border, #e5e7eb)',
        backgroundColor: 'var(--app-primary, #2563eb)',
        borderRadius: '10px 10px 0 0',
        color: '#fff'
      }}>
        <div style={{ fontSize: '1rem', fontWeight: '700' }}>
          {step.title}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: '2px', display: 'flex' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '20px', color: 'var(--app-text, #333)', minHeight: step.tooltipBodyMinHeight || undefined }}>
        <p style={{ fontSize: '0.9375rem', lineHeight: '1.6', margin: 0 }}>
          {step.textParts ? step.textParts.map((part, i) => {
            if (part.text === '\n\n') return <div key={i} style={{ height: '8px' }} />;
            if (part.action) {
              return <button key={i} onClick={() => onAction?.(part.action)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--app-primary, #2563eb)', cursor: 'pointer', fontWeight: '700', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}>{part.text}</button>;
            }
            if (part.bold) return <strong key={i}>{part.text}</strong>;
            return <span key={i}>{part.text}</span>;
          }) : step.text}
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderTop: '1px solid var(--app-border, #e5e7eb)',
      }}>
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 14px',
            border: '1px solid var(--app-border, #d1d5db)',
            borderRadius: '6px',
            background: currentIndex === 0 ? 'var(--app-surface-light, #f9fafb)' : 'var(--app-surface, #fff)',
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: currentIndex === 0 ? 0.4 : 1,
            color: 'var(--app-text, #333)',
            fontSize: '0.875rem'
          }}
        >
          <ChevronLeft size={15} /> Back
        </button>

        <span style={{
          fontSize: '0.75rem',
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
            padding: '8px 14px',
            border: 'none',
            borderRadius: '6px',
            background: 'var(--app-primary, #2563eb)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          {currentIndex === totalSteps - 1 ? 'Finish' : 'Next'} {currentIndex < totalSteps - 1 && <ChevronRight size={15} />}
        </button>
      </div>
    </div>
  );
}
