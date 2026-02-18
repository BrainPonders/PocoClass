import React, { useState } from 'react';
import { Info, Lightbulb, AlertTriangle, X } from 'lucide-react';

const variants = {
  info: {
    icon: Info,
    bg: 'var(--info-bg)',
    border: 'var(--info-border)',
    text: 'var(--info-text)',
  },
  tip: {
    icon: Lightbulb,
    bg: 'var(--tip-bg)',
    border: 'var(--tip-border)',
    text: 'var(--tip-text)',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'var(--warning-bg)',
    border: 'var(--warning-border)',
    text: 'var(--warning-text)',
  },
};

export default function Banner({ variant = 'info', children, className = '', dismissible = false, storageKey = '' }) {
  const [dismissed, setDismissed] = useState(() => {
    if (dismissible && storageKey) {
      return sessionStorage.getItem('banner_dismissed_' + storageKey) === 'true';
    }
    return false;
  });

  if (dismissed) return null;

  const config = variants[variant];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    if (storageKey) {
      sessionStorage.setItem('banner_dismissed_' + storageKey, 'true');
    }
    setDismissed(true);
  };

  return (
    <div
      className={`mb-6 p-4 rounded-lg ${className}`}
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-start gap-3">
        <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: config.text }} />
        <div className="flex-1 text-sm" style={{ color: config.text }}>
          {children}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-0.5 rounded-sm hover:opacity-70 transition-opacity"
            style={{ color: config.text, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
