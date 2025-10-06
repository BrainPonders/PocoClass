import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Settings as SettingsIcon, Database, Globe, Palette, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { User } from '@/api/entities';
import API_BASE_URL from '@/config/api';

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('system');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [dateFormats, setDateFormats] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [paperlessConfig, setPaperlessConfig] = useState({});

  useEffect(() => {
    loadCurrentUser();
    loadSyncStatus();
    loadSyncHistory();
    loadUsers();
    loadAppSettings();
    loadDateFormats();
    loadPlaceholders();
    loadPaperlessConfig();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
      return null;
    }
  };

  const loadSyncStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync/history?limit=4`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      setSyncHistory(data);
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAppSettings = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/app`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAppSettings(data);
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  const loadDateFormats = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/date-formats`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDateFormats(data);
      }
    } catch (error) {
      console.error('Error loading date formats:', error);
    }
  };

  const loadPlaceholders = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/placeholders`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlaceholders(data);
      }
    } catch (error) {
      console.error('Error loading placeholders:', error);
    }
  };

  const loadPaperlessConfig = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/paperless-config`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPaperlessConfig(data);
      }
    } catch (error) {
      console.error('Error loading Paperless config:', error);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      toast({
        title: 'Sync Complete',
        description: `Synced: ${data.results.correspondents} correspondents, ${data.results.tags} tags, ${data.results.document_types} document types, ${data.results.custom_fields} custom fields`,
        duration: 5000,
      });

      loadSyncStatus();
      loadSyncHistory();
      loadPlaceholders();
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) throw new Error('Role update failed');

      toast({
        title: 'Role Updated',
        description: 'User role has been updated successfully',
        duration: 3000,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleToggleUserStatus = async (userId, isEnabled) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const action = isEnabled ? 'disable' : 'enable';
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Status update failed');
      }

      toast({
        title: isEnabled ? 'Account Disabled' : 'Account Enabled',
        description: `User account has been ${isEnabled ? 'disabled' : 'enabled'} successfully`,
        duration: 3000,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleAppSettingChange = async (key, value) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ [key]: value })
      });

      if (!response.ok) throw new Error('Setting update failed');

      toast({
        title: 'Setting Updated',
        description: 'Your preference has been saved',
        duration: 2000,
      });

      setAppSettings({ ...appSettings, [key]: value });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const handleDateFormatToggle = async (formatPattern, isSelected) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/date-formats/${encodeURIComponent(formatPattern)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ is_selected: isSelected })
      });

      if (!response.ok) throw new Error('Date format update failed');

      setDateFormats(dateFormats.map(fmt => 
        fmt.format_pattern === formatPattern 
          ? { ...fmt, is_selected: isSelected ? 1 : 0 }
          : fmt
      ));
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const handlePlaceholderVisibilityChange = async (placeholderName, visibilityMode) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/placeholders/${encodeURIComponent(placeholderName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ visibility_mode: visibilityMode })
      });

      if (!response.ok) throw new Error('Placeholder update failed');

      toast({
        title: 'Visibility Updated',
        description: 'Field visibility has been updated',
        duration: 2000,
      });

      setPlaceholders(placeholders.map(ph => 
        ph.placeholder_name === placeholderName 
          ? { ...ph, visibility_mode: visibilityMode }
          : ph
      ));
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const handlePaperlessUrlUpdate = async () => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can update Paperless URL',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/paperless-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ paperless_url: paperlessConfig.paperless_url })
      });

      if (!response.ok) throw new Error('Paperless URL update failed');

      toast({
        title: 'URL Updated',
        description: 'Paperless URL has been updated successfully',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const testPaperlessConnection = async () => {
    setTestingConnection(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        const totalItems = (data.correspondents?.count || 0) + (data.tags?.count || 0) + (data.document_types?.count || 0);
        toast({
          title: 'Connection Successful',
          description: `Connected to Paperless-ngx. Found ${totalItems} cached items.`,
          duration: 3000,
        });
      } else {
        throw new Error(`Connection test failed: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Could not verify Paperless connection',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const tabs = [
    { id: 'system', label: 'System', icon: Database, adminOnly: true },
    { id: 'appearance', label: 'Appearance', icon: Palette, adminOnly: false },
    { id: 'dateFormats', label: 'Date Formats', icon: Calendar, adminOnly: false },
    { id: 'fieldVisibility', label: 'Field Visibility', icon: FileText, adminOnly: false },
  ];

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
          </div>

          <div className="flex">
            <div className="w-64 border-r border-gray-200">
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isDisabled = tab.adminOnly && !isAdmin;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isDisabled && setActiveTab(tab.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700'
                          : isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex-1 p-6">
              {activeTab === 'system' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">System Management</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Manage Paperless connection, users, and data synchronization
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Paperless Instance</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paperless URL
                      </label>
                      <div className="flex gap-3 mb-3">
                        <input
                          type="url"
                          value={paperlessConfig.paperless_url || ''}
                          onChange={(e) => setPaperlessConfig({ ...paperlessConfig, paperless_url: e.target.value })}
                          placeholder="https://paperless.example.com"
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!isAdmin}
                        />
                        <Button
                          onClick={handlePaperlessUrlUpdate}
                          disabled={!isAdmin}
                        >
                          Update
                        </Button>
                      </div>
                      <Button
                        onClick={testPaperlessConnection}
                        disabled={testingConnection || !paperlessConfig.paperless_url}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Globe className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                        {testingConnection ? 'Testing...' : 'Test Connection'}
                      </Button>
                      {!isAdmin && (
                        <p className="mt-2 text-xs text-gray-500">
                          Only administrators can update the Paperless URL
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">User Management</h3>
                    
                    {users.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Username
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Group(s)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                              <tr key={user.id} className={!user.is_enabled ? 'bg-gray-50 opacity-60' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {user.username}
                                  {!user.is_enabled && (
                                    <span className="ml-2 text-xs text-red-600">(Disabled)</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {user.groups?.join(', ') || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {user.is_admin ? 'Admin' : 'User'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {user.id !== currentUser?.id && (
                                    <div className="flex gap-2">
                                      <select
                                        value={user.is_admin ? 'admin' : 'user'}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                        disabled={!user.is_enabled}
                                      >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                      </select>
                                      <button
                                        onClick={() => handleToggleUserStatus(user.id, user.is_enabled)}
                                        className={`px-3 py-1 text-xs font-medium rounded ${
                                          user.is_enabled
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                      >
                                        {user.is_enabled ? 'Disable' : 'Enable'}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No users found
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Data Synchronization</h3>
                    
                    {syncStatus && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">Correspondents</div>
                          <div className="text-2xl font-bold text-blue-900">{syncStatus.correspondents?.count || 0}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-green-600 font-medium">Tags</div>
                          <div className="text-2xl font-bold text-green-900">{syncStatus.tags?.count || 0}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-purple-600 font-medium">Document Types</div>
                          <div className="text-2xl font-bold text-purple-900">{syncStatus.document_types?.count || 0}</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="text-sm text-orange-600 font-medium">Custom Fields</div>
                          <div className="text-2xl font-bold text-orange-900">{syncStatus.custom_fields?.count || 0}</div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleSync}
                      disabled={loading}
                      className="flex items-center gap-2 mb-6"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'Syncing...' : 'Sync Now'}
                    </Button>

                    {syncHistory.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Sync History</h4>
                        <div className="space-y-2">
                          {syncHistory.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-lg">
                              {entry.status === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="font-medium text-gray-700">{entry.entity_type}</span>
                              <span className="text-gray-500">{entry.items_synced} items</span>
                              <span className="text-gray-400 ml-auto">
                                {new Date(entry.synced_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Appearance Settings</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Customize the look and feel of your interface
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={appSettings.language || 'en'}
                      onChange={(e) => handleAppSettingChange('language', e.target.value)}
                      className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="nl">Dutch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <select
                      value={appSettings.theme || 'light'}
                      onChange={(e) => handleAppSettingChange('theme', e.target.value)}
                      className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={appSettings.colorblind_mode === 'true'}
                        onChange={(e) => handleAppSettingChange('colorblind_mode', e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Color Blind Mode</span>
                    </label>
                    <p className="mt-1 ml-7 text-xs text-gray-500">
                      Adjusts colors for better accessibility
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'dateFormats' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Date Format Presets</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Select date formats to appear in the wizard quick-select dropdown
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(
                      dateFormats.reduce((acc, fmt) => {
                        if (!acc[fmt.format_category]) acc[fmt.format_category] = [];
                        acc[fmt.format_category].push(fmt);
                        return acc;
                      }, {})
                    ).map(([category, formats]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">{category}</h3>
                        <div className="space-y-2">
                          {formats.map(fmt => (
                            <label key={fmt.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border border-gray-200">
                              <input
                                type="checkbox"
                                checked={fmt.is_selected === 1}
                                onChange={(e) => handleDateFormatToggle(fmt.format_pattern, e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900">{fmt.format_pattern}</div>
                                <div className="text-xs text-gray-500 truncate">{fmt.example}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'fieldVisibility' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Field Visibility Settings</h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Control which fields appear in the wizard and how they behave
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Visibility Modes</h3>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li><strong>Disabled:</strong> Field is hidden from the wizard</li>
                      <li><strong>Predefined Only:</strong> Show dropdown with existing values (used in verification)</li>
                      <li><strong>Dynamic Only:</strong> Extract value from document content only</li>
                      <li><strong>Both:</strong> Show dropdown + extract from document (recommended)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    {placeholders.filter(p => !p.is_internal || (p.is_internal && p.is_custom_field)).map(placeholder => (
                      <div key={placeholder.id} className={`p-3 border rounded-lg ${
                        placeholder.is_locked
                          ? 'border-gray-300 bg-gray-100'
                          : placeholder.is_custom_field 
                          ? 'border-purple-300 bg-purple-50' 
                          : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {placeholder.is_locked && <Lock className="w-4 h-4 text-gray-500" />}
                              <div className="text-sm font-medium text-gray-900">
                                {placeholder.placeholder_name}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {placeholder.is_locked ? (
                                <span className="text-gray-500 italic">Not available in this version of POCOclass</span>
                              ) : placeholder.is_custom_field ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Custom Field
                                </span>
                              ) : (
                                <span className="text-gray-500">Built-in Field</span>
                              )}
                            </div>
                          </div>
                          
                          {!placeholder.is_locked && !placeholder.is_internal ? (
                            <div className="flex gap-1">
                              {['disabled', 'predefined', 'dynamic', 'both'].map(mode => (
                                <button
                                  key={mode}
                                  onClick={() => handlePlaceholderVisibilityChange(placeholder.placeholder_name, mode)}
                                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                                    placeholder.visibility_mode === mode
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {mode === 'disabled' && 'Disabled'}
                                  {mode === 'predefined' && 'Predefined'}
                                  {mode === 'dynamic' && 'Dynamic'}
                                  {mode === 'both' && 'Both'}
                                </button>
                              ))}
                            </div>
                          ) : placeholder.is_internal ? (
                            <div className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded">
                              Mandatory
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Fields Used in Verification</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These fields are displayed in Step 5 (Verification) to cross-check extracted data against existing Paperless metadata
                    </p>
                    
                    <div className="space-y-2">
                      {placeholders
                        .filter(p => ['predefined', 'both'].includes(p.visibility_mode) && !p.is_internal)
                        .map(placeholder => (
                          <div key={placeholder.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{placeholder.placeholder_name}</div>
                              <div className="text-xs text-gray-500">Mode: {placeholder.visibility_mode}</div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {placeholders.filter(p => ['predefined', 'both'].includes(p.visibility_mode) && !p.is_internal).length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No fields configured for verification. Set fields to "Predefined" or "Both" mode to enable verification.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
