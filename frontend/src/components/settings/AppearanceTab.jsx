/**
 * @file AppearanceTab.jsx
 * @description Settings tab for UI appearance preferences including theme selection
 * (light/dark/system), accent color, and layout density options.
 */

import React from 'react';

export default function AppearanceTab({
  loading,
  t,
  language,
  handleAppSettingChange,
  theme,
  colorBlindMode
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.appearance.title')}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.appearance.subtitle')}
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

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
          {t('settings.appearance.language')}
        </label>
        <select
          value={language}
          onChange={(e) => handleAppSettingChange('language', e.target.value)}
          className="w-full md:w-64 rounded-md px-3 py-2 text-sm focus:outline-none"
          style={{ 
            border: '1px solid var(--app-border)', 
            backgroundColor: 'var(--app-surface)',
            color: 'var(--app-text)'
          }}
          onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
          onBlur={(e) => e.target.style.boxShadow = 'none'}
        >
          <option value="en">English (British)</option>
          <option value="de">Deutsch (German)</option>
          <option value="es">Español (Spanish)</option>
          <option value="fr">Français (French)</option>
          <option value="it">Italiano (Italian)</option>
          <option value="nl">Nederlands (Dutch)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
          {t('settings.appearance.theme')}
        </label>
        <select
          value={theme}
          onChange={(e) => handleAppSettingChange('theme', e.target.value)}
          className="w-full md:w-64 rounded-md px-3 py-2 text-sm focus:outline-none"
          style={{ 
            border: '1px solid var(--app-border)', 
            backgroundColor: 'var(--app-surface)',
            color: 'var(--app-text)'
          }}
          onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
          onBlur={(e) => e.target.style.boxShadow = 'none'}
        >
          <option value="light">{t('settings.appearance.themeLight')}</option>
          <option value="dark">{t('settings.appearance.themeDark')}</option>
          <option value="auto">{t('settings.appearance.themeAuto')}</option>
        </select>
      </div>

      <div style={{ opacity: 0.5 }}>
        <label className="flex items-center gap-3" style={{ cursor: 'not-allowed' }}>
          <input
            type="checkbox"
            checked={false}
            disabled
            className="w-4 h-4 border-gray-300 rounded"
            style={{ cursor: 'not-allowed' }}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
            {t('settings.appearance.colorblindMode')}
          </span>
        </label>
        <p className="mt-1 ml-7 text-xs" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.appearance.colorblindNotImplemented')}
        </p>
      </div>
    </div>
  );
}
