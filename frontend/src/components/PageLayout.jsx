import React from 'react';

export default function PageLayout({ title, subtitle, actions, children, headerPadding = 'py-4' }) {
  return (
    <div className="flex flex-col h-full">
      <div 
        className={`sticky top-0 z-10 px-6 ${headerPadding}`}
        style={{ 
          backgroundColor: 'var(--app-surface)', 
          borderBottom: '1px solid var(--app-border)' 
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--app-text)' }}>{title}</h1>
            {subtitle && <div className="mt-1" style={{ color: 'var(--app-text-secondary)' }}>{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  );
}
