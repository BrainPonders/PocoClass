/**
 * @file SystemTab.jsx
 * @description Settings tab for system-level configuration including Paperless-ngx
 * connection status, cache management, language selection, and OCR settings.
 */

import React from 'react';
import { RefreshCw, Database, Globe, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function SystemTab({
  loading,
  syncing,
  t,
  isAdmin,
  paperlessConfig,
  setPaperlessConfig,
  testPaperlessConnection,
  testingConnection,
  handlePaperlessUrlUpdate,
  appSettings,
  handleAppSettingChange,
  syncStatus,
  handleSync,
  users,
  currentUser,
  handleRoleChange,
  handleToggleUserStatus,
  syncHistory
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.system.title')}</h2>
        <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.system.subtitle')}
        </p>
      </div>

      {(loading || syncing) && (
        <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>
              {syncing ? t('settings.system.syncingData') : t('settings.appearance.loadingSettings')}
            </span>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
          <Database className="w-5 h-5" style={{ color: 'var(--info-text)' }} />
          {t('settings.system.paperlessConnection')}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
              {t('settings.system.paperlessUrl')}
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={paperlessConfig.paperless_url || ''}
                onChange={(e) => setPaperlessConfig({ ...paperlessConfig, paperless_url: e.target.value })}
                placeholder="https://paperless.example.com"
                className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                disabled={!isAdmin}
              />
              <Button
                onClick={testPaperlessConnection}
                disabled={testingConnection || !paperlessConfig.paperless_url}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Globe className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? t('settings.system.testing') : t('settings.system.testConnection')}
              </Button>
              <Button
                onClick={handlePaperlessUrlUpdate}
                disabled={!isAdmin}
                size="sm"
              >
                {t('settings.system.update')}
              </Button>
            </div>
            {!isAdmin && (
              <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                {t('settings.system.onlyAdminCanUpdate')}
              </p>
            )}
            <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
              Examples: <span style={{ color: 'var(--app-text)', fontWeight: '500' }}>http://webserver:8000</span> · <span style={{ color: 'var(--app-text)', fontWeight: '500' }}>http://paperless-ngx:8000</span> · <span style={{ color: 'var(--app-text)', fontWeight: '500' }}>your external Paperless URL</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.system.sessionSettings')}</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.system.sessionSettingsSubtitle')}
        </p>
        
        <div>
          <div className="flex items-center gap-3 mb-3">
            <input
              id="session-timeout"
              type="number"
              min="1"
              max="168"
              value={appSettings.session_timeout_hours || ''}
              onChange={(e) => handleAppSettingChange('session_timeout_hours', e.target.value)}
              disabled={loading}
              className="w-32 border rounded-md px-3 py-2 text-sm focus:outline-none"
              style={{ 
                borderColor: 'var(--app-border)', 
                backgroundColor: loading ? 'var(--app-bg-secondary)' : 'var(--app-surface)', 
                color: 'var(--app-text)',
                cursor: loading ? 'not-allowed' : 'default'
              }}
              onFocus={(e) => !loading && (e.target.style.boxShadow = '0 0 0 2px var(--app-primary)')}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            <label htmlFor="session-timeout" className="text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>{t('settings.system.sessionTimeout')}</label>
          </div>
          <div className="p-3 rounded text-sm" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
            <strong>{t('settings.system.bgProtectionTitle')}</strong> {t('settings.system.bgProtectionDesc')}
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.system.paperlessSync')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
              {t('settings.system.syncSubtitle')}
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('settings.system.syncing') : t('settings.system.sync')}
          </Button>
        </div>
        
        {syncStatus && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--info-bg)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>{t('settings.system.correspondents')}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.correspondents?.count || 0}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">{t('settings.system.tags')}</div>
              <div className="text-2xl font-bold text-green-900">{syncStatus.tags?.count || 0}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">{t('settings.system.documentTypes')}</div>
              <div className="text-2xl font-bold text-purple-900">{syncStatus.document_types?.count || 0}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">{t('settings.system.customFields')}</div>
              <div className="text-2xl font-bold text-orange-900">{syncStatus.custom_fields?.count || 0}</div>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg">
              <div className="text-sm text-cyan-600 font-medium">{t('settings.system.users')}</div>
              <div className="text-2xl font-bold text-cyan-900">{syncStatus.users?.count || 0}</div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.system.userManagement')}</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
          {t('settings.system.userManagementSubtitle')}
        </p>
        
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: 'var(--app-border)' }}>
              <thead style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.username')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.groups')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.paperlessStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.pococlassStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    {t('settings.system.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
                {users.map(user => {
                  const isCurrentUser = user.pococlass_id === currentUser?.id;
                  const canManage = user.is_registered && !isCurrentUser;
                  
                  return (
                    <tr key={user.paperless_id} style={!user.is_enabled && user.is_registered ? { backgroundColor: 'var(--app-bg-secondary)', opacity: 0.6 } : undefined}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                        {user.paperless_username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--info-text)' }}>(You)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                        {user.paperless_groups?.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-100 text-green-800' : ''
                        }`}
                        style={!user.is_active ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } : undefined}>
                          {user.is_active ? t('settings.system.active') : t('settings.system.inactive')}
                        </span>
                        {user.is_superuser && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {t('settings.system.superuser')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                        {user.is_registered ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_enabled ? t('settings.system.active') : t('settings.system.disabled')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' }}>
                            {t('settings.system.notRegistered')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                        {user.is_registered ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.pococlass_role === 'admin' ? 'bg-purple-100 text-purple-800' : ''
                          }`}
                          style={user.pococlass_role !== 'admin' ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' } : undefined}>
                            {user.pococlass_role === 'admin' ? t('settings.system.admin') : t('settings.system.user')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--app-text-muted)' }}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canManage ? (
                          <div className="flex gap-2">
                            <select
                              value={user.pococlass_role || 'user'}
                              onChange={(e) => handleRoleChange(user.pococlass_id, e.target.value)}
                              className="text-xs border rounded px-2 py-1"
                              style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
                            >
                              <option value="user">{t('settings.system.user')}</option>
                              <option value="admin">{t('settings.system.admin')}</option>
                            </select>
                            <Button
                              onClick={() => handleToggleUserStatus(user.pococlass_id, user.is_enabled)}
                              variant="outline"
                              size="sm"
                              className={`text-xs ${user.is_enabled ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {user.is_enabled ? t('settings.system.disable') : t('settings.system.enable')}
                            </Button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--app-text-muted)' }}>
                            {isCurrentUser ? t('settings.system.currentUser') : t('settings.system.notRegistered')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
            <p style={{ color: 'var(--app-text-muted)' }}>{t('settings.system.noUsers')}</p>
          </div>
        )}
      </div>

      {syncHistory.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('settings.system.recentSync')}</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
            {t('settings.system.recentSyncSubtitle')}
          </p>
          <div className="space-y-2">
            {syncHistory.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
                {entry.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>{t(`settings.system.${entry.entity_type}`)}</span>
                <span style={{ color: 'var(--app-text-muted)' }}>{entry.items_synced} {t('settings.system.items')}</span>
                <span className="ml-auto" style={{ color: 'var(--app-text-muted)' }}>
                  {new Date(entry.synced_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
