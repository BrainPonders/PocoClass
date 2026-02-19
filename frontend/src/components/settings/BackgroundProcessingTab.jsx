/**
 * @file BackgroundProcessingTab.jsx
 * @description Settings tab for background processing configuration including
 * API key management, webhook endpoints, polling intervals, and
 * automated rule execution scheduling.
 */

import React from 'react';
import { Key, Terminal, CheckCircle, Copy, Trash2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function BackgroundProcessingTab({
  loading,
  t,
  isAdmin,
  backgroundSettings,
  setBackgroundSettings,
  handleBackgroundSettingsSave,
  systemTokenInfo,
  newSystemToken,
  generatingToken,
  revokingToken,
  showTokenConfirm,
  setShowTokenConfirm,
  showRevokeConfirm,
  setShowRevokeConfirm,
  handleGenerateSystemToken,
  handleRevokeSystemToken,
  copyTokenToClipboard
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.title')}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.backgroundProcessing.subtitle')}
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

      <div className="border-t pt-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                {t('settings.backgroundProcessing.enableProcessing')}
              </label>
              <Switch
                checked={backgroundSettings.bg_enabled}
                onCheckedChange={(checked) => setBackgroundSettings({ ...backgroundSettings, bg_enabled: checked })}
                disabled={!isAdmin}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
              {t('settings.backgroundProcessing.enableProcessingDesc')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
              {t('settings.backgroundProcessing.debounceTime')}
            </label>
            <div className="flex gap-3 mb-2">
              <input
                type="number"
                min="5"
                max="300"
                value={backgroundSettings.bg_debounce_seconds}
                onChange={(e) => setBackgroundSettings({ ...backgroundSettings, bg_debounce_seconds: parseInt(e.target.value) || 30 })}
                disabled={!isAdmin}
                className="w-32 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                style={{ 
                  border: '1px solid var(--app-border)', 
                  backgroundColor: !isAdmin ? 'var(--app-bg-secondary)' : 'var(--app-surface)',
                  color: 'var(--app-text)' 
                }}
              />
              <span className="text-sm self-center" style={{ color: 'var(--app-text-muted)' }}>{t('settings.backgroundProcessing.seconds')}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
              {t('settings.backgroundProcessing.debounceDesc')}
            </p>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5" style={{ color: 'var(--app-text)' }} />
              <h3 className="text-md font-semibold" style={{ color: 'var(--app-text)' }}>{t('settings.systemToken.title')}</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
              {t('settings.systemToken.description')}
            </p>

            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
              <div className="flex items-start gap-3">
                <Terminal className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--info-text)' }} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--info-text)' }}>
                    {t('settings.systemToken.scriptSetupRequired')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.systemToken.scriptSetupDesc')}
                  </p>
                  <p className="text-xs mt-2 font-mono" style={{ color: 'var(--app-text-muted)' }}>
                    PAPERLESS_POST_CONSUME_SCRIPT=/path/to/pococlass_trigger.sh
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--app-surface-hover)', border: '1px solid var(--app-border)' }}>
              {systemTokenInfo.exists ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                      {t('settings.systemToken.active')}
                    </span>
                  </div>
                  {systemTokenInfo.created_at && (
                    <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                      {t('settings.systemToken.createdAt')}: {new Date(systemTokenInfo.created_at).toLocaleString()}
                    </p>
                  )}

                  {newSystemToken && (
                    <div className="rounded-lg p-3 mt-2" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                        {t('settings.systemToken.copyWarning')}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs p-2 rounded font-mono break-all" style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)', border: '1px solid var(--app-border)' }}>
                          {newSystemToken}
                        </code>
                        <Button
                          onClick={copyTokenToClipboard}
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {showRevokeConfirm ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                        {t('settings.systemToken.confirmRevoke')}
                      </span>
                      <Button
                        onClick={handleRevokeSystemToken}
                        disabled={revokingToken}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        {revokingToken ? t('settings.systemToken.revoking') : t('settings.systemToken.confirmYes')}
                      </Button>
                      <Button
                        onClick={() => setShowRevokeConfirm(false)}
                        variant="outline"
                        size="sm"
                      >
                        {t('settings.systemToken.confirmNo')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowRevokeConfirm(true)}
                      disabled={!isAdmin}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t('settings.systemToken.revoke')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" style={{ color: 'var(--app-text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      {t('settings.systemToken.noToken')}
                    </span>
                  </div>

                  {showTokenConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                        {t('settings.systemToken.confirmGenerate')}
                      </span>
                      <Button
                        onClick={handleGenerateSystemToken}
                        disabled={generatingToken}
                        size="sm"
                      >
                        {generatingToken ? t('settings.systemToken.generating') : t('settings.systemToken.confirmYes')}
                      </Button>
                      <Button
                        onClick={() => setShowTokenConfirm(false)}
                        variant="outline"
                        size="sm"
                      >
                        {t('settings.systemToken.confirmNo')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowTokenConfirm(true)}
                      disabled={!isAdmin}
                      size="sm"
                      className="gap-1"
                    >
                      <Key className="w-3 h-3" />
                      {t('settings.systemToken.generate')}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {!isAdmin && (
              <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                {t('settings.systemToken.adminOnly')}
              </p>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.tagConfiguration')}</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--app-text-muted)' }}>
              {t('settings.backgroundProcessing.tagConfigurationDesc')}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--info-text)' }}></div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.tagNew')}</div>
                  <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.backgroundProcessing.tagNewDesc')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.tagPocoPlus')}</div>
                  <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.backgroundProcessing.tagPocoPlusDesc')}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.tagPocoMinus')}</div>
                  <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.backgroundProcessing.tagPocoMinusDesc')}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--app-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                  {t('settings.backgroundProcessing.removeNewTag')}
                </label>
                <Switch
                  checked={backgroundSettings.bg_remove_new_tag}
                  onCheckedChange={(checked) => setBackgroundSettings({ ...backgroundSettings, bg_remove_new_tag: checked })}
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                {t('settings.backgroundProcessing.removeNewTagDesc')}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>{t('settings.backgroundProcessing.retentionPolicy')}</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--app-text-muted)' }}>
              {t('settings.backgroundProcessing.retentionPolicyDesc')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--app-text-secondary)' }}>
                  {t('settings.backgroundProcessing.retentionType')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="retention_type"
                      value="days"
                      checked={backgroundSettings.history_retention_type === 'days'}
                      onChange={(e) => setBackgroundSettings({ ...backgroundSettings, history_retention_type: e.target.value })}
                      disabled={!isAdmin}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('settings.backgroundProcessing.byDays')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="retention_type"
                      value="count"
                      checked={backgroundSettings.history_retention_type === 'count'}
                      onChange={(e) => setBackgroundSettings({ ...backgroundSettings, history_retention_type: e.target.value })}
                      disabled={!isAdmin}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('settings.backgroundProcessing.byRuns')}</span>
                  </label>
                </div>
              </div>

              {backgroundSettings.history_retention_type === 'days' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.backgroundProcessing.daysToKeep')}
                  </label>
                  <div className="flex gap-3 mb-2">
                    <input
                      type="number"
                      min="1"
                      value={backgroundSettings.history_retention_days}
                      onChange={(e) => setBackgroundSettings({ ...backgroundSettings, history_retention_days: parseInt(e.target.value) || 365 })}
                      disabled={!isAdmin}
                      className="w-32 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                      style={{ 
                        border: '1px solid var(--app-border)', 
                        backgroundColor: !isAdmin ? 'var(--app-bg-secondary)' : 'var(--app-surface)',
                        color: 'var(--app-text)' 
                      }}
                    />
                    <span className="text-sm self-center" style={{ color: 'var(--app-text-muted)' }}>{t('settings.backgroundProcessing.days')}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.backgroundProcessing.daysToKeepDesc')}
                  </p>
                </div>
              )}

              {backgroundSettings.history_retention_type === 'count' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                    {t('settings.backgroundProcessing.runsToKeep')}
                  </label>
                  <div className="flex gap-3 mb-2">
                    <input
                      type="number"
                      min="1"
                      value={backgroundSettings.history_retention_count}
                      onChange={(e) => setBackgroundSettings({ ...backgroundSettings, history_retention_count: parseInt(e.target.value) || 100 })}
                      disabled={!isAdmin}
                      className="w-32 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                      style={{ 
                        border: '1px solid var(--app-border)', 
                        backgroundColor: !isAdmin ? 'var(--app-bg-secondary)' : 'var(--app-surface)',
                        color: 'var(--app-text)' 
                      }}
                    />
                    <span className="text-sm self-center" style={{ color: 'var(--app-text-muted)' }}>runs</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    Keep only the most recent N processing runs (default: 100 runs)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleBackgroundSettingsSave}
              disabled={!isAdmin}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {t('settings.backgroundProcessing.saveSettings')}
            </Button>
            {!isAdmin && (
              <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                Only administrators can update background processing settings
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
