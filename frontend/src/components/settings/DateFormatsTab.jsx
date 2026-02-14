/**
 * @file DateFormatsTab.jsx
 * @description Settings tab for configuring date format preferences used in
 * filename pattern matching and document date extraction throughout the application.
 */

import React from 'react';

export default function DateFormatsTab({
  loading,
  t,
  dateFormats,
  handleDateFormatToggle
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.dateFormats.title')}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.dateFormats.subtitle')}
        </p>
      </div>

      {loading && (
        <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>{t('settings.appearance.loadingSettings')}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(
          dateFormats.reduce((acc, fmt) => {
            if (!acc[fmt.format_category]) acc[fmt.format_category] = [];
            acc[fmt.format_category].push(fmt);
            return acc;
          }, {})
        ).map(([category, formats]) => {
          const getCategoryTranslation = (cat) => {
            const categoryMap = {
              'Dash (-)': t('settings.dateFormats.dash'),
              'Slash (/)': t('settings.dateFormats.slash'),
              'Dot (.)': t('settings.dateFormats.dot'),
              'Space / Text': t('settings.dateFormats.spaceText')
            };
            return categoryMap[cat] || cat;
          };
          
          return (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text-secondary)' }}>{getCategoryTranslation(category)}</h3>
            <div className="space-y-2">
              {formats.map(fmt => (
                <label key={fmt.id} className="flex items-start gap-2 p-2 rounded cursor-pointer" 
                  style={{ 
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-surface)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface)'}>
                  <input
                    type="checkbox"
                    checked={fmt.is_selected === 1}
                    onChange={(e) => handleDateFormatToggle(fmt.format_pattern, e.target.checked)}
                    className="mt-0.5 w-4 h-4 border-gray-300 rounded"
                    style={{ accentColor: 'var(--app-primary)' }}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--app-text)' }}>{fmt.format_pattern}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--app-text-muted)' }}>{fmt.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
