/**
 * @file ValidationTab.jsx
 * @description Settings tab for rule validation configuration. Manages validation
 * checks, duplicate detection settings, and rule health monitoring with
 * toggleable validation rules and severity levels.
 */

import React from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function ValidationTab({
  t,
  loadValidationData,
  loadingValidation,
  validationData,
  isAdmin,
  handleFixMandatoryData,
  fixingMandatoryData,
  pocoOcrEnabled,
  handlePocoOcrEnabledToggle,
  loadingPocoOcr
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--app-text)' }}>{t('settings.validation.title')}</h2>
          <Button
            onClick={loadValidationData}
            disabled={loadingValidation}
            className="text-white gap-2"
            style={{ backgroundColor: '#1e40af' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a8a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
          >
            <RefreshCw className={`w-4 h-4 ${loadingValidation ? 'animate-spin' : ''}`} />
            {loadingValidation ? t('settings.validation.verifying') : t('common.search')}
          </Button>
        </div>
        <p className="text-sm mb-2" style={{ color: 'var(--app-text-secondary)' }}>
        </p>
      </div>

      {loadingValidation ? (
        <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Checking mandatory data...</span>
          </div>
        </div>
      ) : validationData && !validationData.valid ? (
        <div className="border rounded-lg p-4 mb-6" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#7f1d1d' }}>Missing Required Data</h3>
              <p className="text-sm mb-3" style={{ color: '#991b1b' }}>
                PocoClass requires specific custom fields and tags to function. The following items are missing from your Paperless-ngx instance:
              </p>
              {validationData.missing_fields.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#7f1d1d' }}>Missing Custom Fields:</p>
                  <ul className="list-disc list-inside text-sm ml-2" style={{ color: '#991b1b' }}>
                    {validationData.missing_fields.map(field => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationData.missing_tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#7f1d1d' }}>Missing Tags:</p>
                  <ul className="list-disc list-inside text-sm ml-2" style={{ color: '#991b1b' }}>
                    {validationData.missing_tags.map(tag => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleFixMandatoryData}
              disabled={fixingMandatoryData || !isAdmin}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {fixingMandatoryData ? 'Creating...' : t('settings.validation.fixMissingData')}
            </Button>
            {!isAdmin && (
              <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                Only administrators can create missing custom fields and tags
              </p>
            )}
          </div>
        </div>
      ) : validationData && validationData.valid ? (
        <div className="border rounded-lg p-4 mb-6" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#14532d' }}>{t('settings.allRequiredDataPresent')}</h3>
              <p className="text-sm" style={{ color: '#15803d' }}>
                {t('settings.allMandatoryConfigured')}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.requiredTags')}</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
            {loadingValidation ? (
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : validationData?.tags?.poco_plus ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO+</div>
              <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('settings.pocoPlus')}</div>
            </div>
            <div 
              className="text-xs font-medium px-3 py-1 rounded"
              style={
                loadingValidation 
                  ? { backgroundColor: '#1e3a8a', color: '#dbeafe' } 
                  : validationData?.tags?.poco_plus 
                    ? { backgroundColor: '#dcfce7', color: '#15803d' } 
                    : { backgroundColor: '#fee2e2', color: '#991b1b' }
              }
            >
              {loadingValidation ? t('settings.verifying') : validationData?.tags?.poco_plus ? t('settings.present') : t('settings.missing')}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
            {loadingValidation ? (
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : validationData?.tags?.poco_minus ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO-</div>
              <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('settings.pocoMinus')}</div>
            </div>
            <div 
              className="text-xs font-medium px-3 py-1 rounded"
              style={
                loadingValidation 
                  ? { backgroundColor: '#1e3a8a', color: '#dbeafe' } 
                  : validationData?.tags?.poco_minus 
                    ? { backgroundColor: '#dcfce7', color: '#15803d' } 
                    : { backgroundColor: '#fee2e2', color: '#991b1b' }
              }
            >
              {loadingValidation ? t('settings.verifying') : validationData?.tags?.poco_minus ? t('settings.present') : t('settings.missing')}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
            {loadingValidation ? (
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : validationData?.tags?.new ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>NEW</div>
              <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('settings.newTag')}</div>
            </div>
            <div 
              className="text-xs font-medium px-3 py-1 rounded"
              style={
                loadingValidation 
                  ? { backgroundColor: '#1e3a8a', color: '#dbeafe' } 
                  : validationData?.tags?.new 
                    ? { backgroundColor: '#dcfce7', color: '#15803d' } 
                    : { backgroundColor: '#fee2e2', color: '#991b1b' }
              }
            >
              {loadingValidation ? t('settings.verifying') : validationData?.tags?.new ? t('settings.present') : t('settings.missing')}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.requiredCustomFields')}</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
            {loadingValidation ? (
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : validationData?.fields?.poco_score ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO Score</div>
              <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('settings.pocoScoreDesc')}</div>
            </div>
            <div 
              className="text-xs font-medium px-3 py-1 rounded"
              style={
                loadingValidation 
                  ? { backgroundColor: '#1e3a8a', color: '#dbeafe' } 
                  : validationData?.fields?.poco_score 
                    ? { backgroundColor: '#dcfce7', color: '#15803d' } 
                    : { backgroundColor: '#fee2e2', color: '#991b1b' }
              }
            >
              {loadingValidation ? t('settings.verifying') : validationData?.fields?.poco_score ? t('settings.present') : t('settings.missing')}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.optionalCustomFields')}</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
            {loadingValidation ? (
              <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : validationData?.fields?.poco_ocr ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#1e40af' }} />
            ) : (
              <Info className="w-5 h-5" style={{ color: 'var(--app-text-muted)' }} />
            )}
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO OCR</div>
              <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{t('settings.pocoOcrDesc')}</div>
            </div>
            <div 
              className="text-xs font-medium px-3 py-1 rounded"
              style={
                loadingValidation || validationData?.fields?.poco_ocr
                  ? { backgroundColor: '#1e3a8a', color: '#dbeafe' }
                  : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' }
              }>
              {loadingValidation ? t('settings.verifying') : validationData?.fields?.poco_ocr ? t('settings.present') : t('settings.optional')}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.optionalFeatures')}</h3>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>
                {t('settings.pocoOcrTransparencyField')}
              </label>
              <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                {t('settings.pocoOcrTransparencyDesc')}
              </p>
            </div>
            <Switch
              checked={pocoOcrEnabled}
              onCheckedChange={handlePocoOcrEnabledToggle}
              disabled={!isAdmin || loadingPocoOcr}
            />
          </div>

          {!isAdmin && (
            <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
              Only administrators can modify optional feature settings
            </p>
          )}

          {pocoOcrEnabled && (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--info-text)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--info-text)' }}>
                    POCO OCR field will be created during next sync or when you click "Fix Missing Data" above
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
