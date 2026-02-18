import React from 'react';
import { Info, Lightbulb, AlertTriangle } from 'lucide-react';

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

export default function Banner({ variant = 'info', children, className = '' }) {
  const config = variants[variant];
  const IconComponent = config.icon;

  return (
    <div
      className={`mb-6 p-4 rounded-lg ${className}`}
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-start gap-3">
        <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: config.text }} />
        <div className="text-sm" style={{ color: config.text }}>
          {children}
        </div>
      </div>
    </div>
  );
}
