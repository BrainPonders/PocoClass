import React from 'react';

export default function PageLayout({ title, subtitle, actions, children, headerPadding = 'py-4' }) {
  return (
    <div className="flex flex-col h-full">
      <div className={`sticky top-0 z-10 bg-white border-b border-gray-200 px-6 ${headerPadding}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && <div className="text-gray-500 mt-1">{subtitle}</div>}
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
