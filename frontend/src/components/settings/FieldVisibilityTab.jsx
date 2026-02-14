/**
 * @file FieldVisibilityTab.jsx
 * @description Settings tab for controlling which POCO fields are visible across
 * the application. Core fields are locked and always visible; optional fields
 * can be toggled on/off per user preference.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { QuickTooltip } from '@/components/ui/QuickTooltip';

export default function FieldVisibilityTab({
  loading,
  t,
  placeholders,
  pocoScoreExists,
  pocoOcrExists,
  handlePlaceholderVisibilityChange,
  handleCreateFieldClick,
  getCustomFieldDataType,
  isDynamicExtractable,
  getDynamicDisabledReason
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>
          {t('settings.fieldVisibility.title')}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.fieldVisibility.subtitle')}
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

      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--info-text)' }}>{t('settings.fieldVisibility.visibilityModes')}</h3>
        <ul className="text-xs space-y-1" style={{ color: 'var(--info-text)' }}>
          <li><strong>{t('settings.fieldVisibility.modeDisabled')}</strong> {t('settings.fieldVisibility.modeDisabledDesc')}</li>
          <li><strong>{t('settings.fieldVisibility.modePredefined')}</strong> {t('settings.fieldVisibility.modePredefinedDesc')}</li>
          <li><strong>{t('settings.fieldVisibility.modeDynamic')}</strong> {t('settings.fieldVisibility.modeDynamicDesc')}</li>
          <li><strong>{t('settings.fieldVisibility.modeBothEnabled')}</strong> {t('settings.fieldVisibility.modeBothEnabledDesc')}</li>
        </ul>
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--info-border)' }}>
          <p className="text-xs" style={{ color: 'var(--info-text)' }}>
            <strong>{t('settings.fieldVisibility.noteVerification')}</strong> {t('settings.fieldVisibility.noteVerificationDesc')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {placeholders.filter(p => !p.is_internal || (p.is_internal && p.is_custom_field)).map(placeholder => {
          const isMissingPoco = (placeholder.placeholder_name === 'POCO Score' && !pocoScoreExists) || 
                               (placeholder.placeholder_name === 'POCO OCR' && !pocoOcrExists);
          const dataType = getCustomFieldDataType(placeholder.placeholder_name);
          const canExtractDynamic = isDynamicExtractable(placeholder.placeholder_name, placeholder.is_custom_field);
          const disabledReason = getDynamicDisabledReason(placeholder.placeholder_name, placeholder.is_custom_field);
          
          return (
          <div key={placeholder.id} className="p-3 border rounded-lg" style={{
            borderColor: isMissingPoco ? '#991b1b' : placeholder.is_locked ? 'var(--app-border)' : placeholder.is_custom_field ? '#7c3aed' : 'var(--app-border)',
            backgroundColor: isMissingPoco ? '#fef2f2' : placeholder.is_locked ? 'var(--app-bg-secondary)' : placeholder.is_custom_field ? '#f5f3ff' : 'var(--app-surface)'
          }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!!placeholder.is_locked && <Lock className="w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />}
                  <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                    {placeholder.placeholder_name}
                  </div>
                  {!!placeholder.is_custom_field && dataType && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' }}>
                      {dataType}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                  {placeholder.is_locked ? (
                    <span className="italic" style={{ color: 'var(--app-text-muted)' }}>{t('settings.fieldVisibility.notAvailable')}</span>
                  ) : placeholder.is_custom_field ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {t('settings.fieldVisibility.customField')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--app-text-muted)' }}>{t('settings.fieldVisibility.builtInField')}</span>
                  )}
                </div>
              </div>
              
              {!placeholder.is_locked && !placeholder.is_internal ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePlaceholderVisibilityChange(placeholder.placeholder_name, 'disabled')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      placeholder.visibility_mode === 'disabled'
                        ? 'bg-gray-600 text-white'
                        : ''
                    }`}
                    style={placeholder.visibility_mode !== 'disabled' ? {
                      backgroundColor: 'var(--app-bg-secondary)',
                      color: 'var(--app-text-secondary)'
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (placeholder.visibility_mode !== 'disabled') {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (placeholder.visibility_mode !== 'disabled') {
                        e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)';
                      }
                    }}
                  >
                    Disabled
                  </button>
                  <button
                    onClick={() => {
                      const currentMode = placeholder.visibility_mode;
                      let newMode;
                      if (currentMode === 'disabled' || currentMode === 'dynamic') {
                        newMode = currentMode === 'disabled' ? 'predefined' : 'both';
                      } else if (currentMode === 'predefined') {
                        newMode = 'disabled';
                      } else {
                        newMode = 'dynamic';
                      }
                      handlePlaceholderVisibilityChange(placeholder.placeholder_name, newMode);
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded transition-colors"
                    style={
                      placeholder.visibility_mode === 'predefined' || placeholder.visibility_mode === 'both'
                        ? { backgroundColor: 'var(--app-primary)', color: 'white' }
                        : {
                            backgroundColor: 'var(--app-bg-secondary)',
                            color: 'var(--app-text-secondary)'
                          }
                    }
                    onMouseEnter={(e) => {
                      if (placeholder.visibility_mode !== 'predefined' && placeholder.visibility_mode !== 'both') {
                        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (placeholder.visibility_mode !== 'predefined' && placeholder.visibility_mode !== 'both') {
                        e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)';
                      }
                    }}
                  >
                    Predefined
                  </button>
                  <QuickTooltip content={disabledReason} disabled={canExtractDynamic}>
                    <button
                      onClick={() => {
                        if (!canExtractDynamic) return;
                        const currentMode = placeholder.visibility_mode;
                        let newMode;
                        if (currentMode === 'disabled' || currentMode === 'predefined') {
                          newMode = currentMode === 'disabled' ? 'dynamic' : 'both';
                        } else if (currentMode === 'dynamic') {
                          newMode = 'disabled';
                        } else {
                          newMode = 'predefined';
                        }
                        handlePlaceholderVisibilityChange(placeholder.placeholder_name, newMode);
                      }}
                      disabled={!canExtractDynamic}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                        !canExtractDynamic
                          ? 'cursor-not-allowed opacity-60'
                          : placeholder.visibility_mode === 'dynamic' || placeholder.visibility_mode === 'both'
                          ? 'bg-green-600 text-white'
                          : ''
                      }`}
                      style={!canExtractDynamic ? {
                        backgroundColor: 'var(--app-bg-secondary)',
                        color: 'var(--app-text-muted)'
                      } : (placeholder.visibility_mode !== 'dynamic' && placeholder.visibility_mode !== 'both') ? {
                        backgroundColor: 'var(--app-bg-secondary)',
                        color: 'var(--app-text-secondary)'
                      } : undefined}
                      onMouseEnter={(e) => {
                        if (canExtractDynamic && placeholder.visibility_mode !== 'dynamic' && placeholder.visibility_mode !== 'both') {
                          e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canExtractDynamic && placeholder.visibility_mode !== 'dynamic' && placeholder.visibility_mode !== 'both') {
                          e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)';
                        }
                      }}
                    >
                      Dynamic
                    </button>
                  </QuickTooltip>
                </div>
              ) : placeholder.is_internal ? (
                placeholder.placeholder_name === 'POCO Score' ? (
                  <button
                    onClick={() => !pocoScoreExists && handleCreateFieldClick('POCO Score')}
                    disabled={pocoScoreExists}
                    className="px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
                    style={
                      pocoScoreExists
                        ? { backgroundColor: '#dcfce7', color: '#15803d', cursor: 'default' }
                        : { backgroundColor: 'var(--app-primary)', color: 'white' }
                    }
                    onMouseEnter={(e) => {
                      if (!pocoScoreExists) {
                        e.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!pocoScoreExists) {
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    {pocoScoreExists ? 'Existing' : 'Create'}
                  </button>
                ) : placeholder.placeholder_name === 'POCO OCR' ? (
                  <button
                    onClick={() => !pocoOcrExists && handleCreateFieldClick('POCO OCR')}
                    disabled={pocoOcrExists}
                    className="px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer"
                    style={
                      pocoOcrExists
                        ? { backgroundColor: '#dcfce7', color: '#15803d', cursor: 'default' }
                        : { backgroundColor: 'var(--app-primary)', color: 'white' }
                    }
                    onMouseEnter={(e) => {
                      if (!pocoOcrExists) {
                        e.currentTarget.style.opacity = '0.9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!pocoOcrExists) {
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    {pocoOcrExists ? 'Existing' : 'Create'}
                  </button>
                ) : (
                  <div className="text-xs font-medium px-3 py-1 rounded" style={{ color: 'var(--info-text)', backgroundColor: 'var(--info-bg)' }}>
                    Mandatory
                  </div>
                )
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
