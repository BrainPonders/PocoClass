import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Settings as SettingsIcon, Database, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { User } from '@/api/entities';
import API_BASE_URL from '@/config/api';

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('sync');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadCurrentUser();
    loadSyncStatus();
    loadSyncHistory();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
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
      const response = await fetch(`${API_BASE_URL}/api/sync/history?limit=5`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
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
      const response = await fetch(`${API_BASE_URL}/api/users/all-paperless`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to load users:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Loaded Paperless users:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const data = await response.json();
      
      toast({
        title: 'Sync Complete',
        description: `Synced: ${data.results.correspondents} correspondents, ${data.results.tags} tags, ${data.results.document_types} document types, ${data.results.custom_fields} custom fields`,
        duration: 5000,
      });

      loadSyncStatus();
      loadSyncHistory();
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
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}`,
        duration: 3000,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleEnableUser = async (paperlessUserId) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/users/${paperlessUserId}/enable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to enable user');
      }

      toast({
        title: 'User Enabled',
        description: 'User has been granted POCOclass access',
        duration: 3000,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const handleDisableUser = async (paperlessUserId) => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/users/${paperlessUserId}/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable user');
      }

      toast({
        title: 'User Disabled',
        description: 'User access to POCOclass has been revoked',
        duration: 3000,
      });

      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-6" style={{ backgroundColor: 'var(--app-bg)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--app-text)' }}>
          Settings
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sync'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Data Sync
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              User Management
            </button>
          )}
        </div>

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--app-text)' }}>
                Paperless Data Synchronization
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--app-text-secondary)' }}>
                POCOclass caches Paperless data locally for faster performance. Sync to get the latest correspondents, tags, document types, and custom fields.
              </p>

              {syncStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface-light)' }}>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--app-text-secondary)' }}>Correspondents</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.correspondents.count}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
                      Last: {formatDate(syncStatus.correspondents.last_sync)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface-light)' }}>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--app-text-secondary)' }}>Tags</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.tags.count}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
                      Last: {formatDate(syncStatus.tags.last_sync)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface-light)' }}>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--app-text-secondary)' }}>Document Types</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.document_types.count}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
                      Last: {formatDate(syncStatus.document_types.last_sync)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--app-surface-light)' }}>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--app-text-secondary)' }}>Custom Fields</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.custom_fields.count}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--app-text-muted)' }}>
                      Last: {formatDate(syncStatus.custom_fields.last_sync)}
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <Button
                  onClick={handleSync}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Syncing...' : 'Sync Now'}
                </Button>
              )}

              {!isAdmin && (
                <div className="info-box info-box-yellow">
                  <p className="text-sm">Admin access required to trigger manual sync</p>
                </div>
              )}
            </div>

            {/* Sync History */}
            {isAdmin && syncHistory.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--app-text)' }}>
                  Recent Sync History
                </h2>
                <div className="space-y-2">
                  {syncHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--app-surface-light)' }}
                    >
                      <div className="flex items-center gap-3">
                        {entry.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium capitalize" style={{ color: 'var(--app-text)' }}>
                            {entry.entity_type.replace('_', ' ')}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                            {entry.items_synced} items synced
                          </div>
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--app-text-muted)' }}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        {formatDate(entry.synced_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && isAdmin && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--app-text)' }}>
              User Management
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--app-text-secondary)' }}>
              Manage POCOclass users and their roles. Users authenticate with their Paperless credentials.
            </p>

            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.paperless_id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--app-surface-light)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${user.is_enabled ? 'bg-blue-600' : 'bg-gray-400'}`}>
                      {user.paperless_username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" style={{ color: 'var(--app-text)' }}>
                          {user.paperless_username}
                        </span>
                        
                        {/* Paperless Permission Levels */}
                        {user.is_superuser && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-200 text-purple-700">
                            Superuser
                          </span>
                        )}
                        {user.is_staff && !user.is_superuser && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-200 text-blue-700">
                            Admin
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-200 text-orange-700">
                            Inactive
                          </span>
                        )}
                        
                        {/* POCOclass Status */}
                        {!user.is_registered && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                            Not Registered
                          </span>
                        )}
                        {user.is_registered && !user.is_enabled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-200 text-red-700">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                        {user.last_login ? `Last login: ${formatDate(user.last_login)}` : 'Never logged in'}
                        {user.paperless_groups && user.paperless_groups.length > 0 && (
                          <span className="ml-2">
                            • Groups: {user.paperless_groups.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.is_registered && user.pococlass_role && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.pococlass_role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.pococlass_role}
                      </span>
                    )}
                    
                    {user.is_registered && user.pococlass_id !== currentUser?.id && (
                      <select
                        value={user.pococlass_role}
                        onChange={(e) => handleRoleChange(user.pococlass_id, e.target.value)}
                        disabled={!user.is_enabled}
                        className="px-3 py-1 rounded-lg border border-gray-300 text-sm"
                        style={{ opacity: user.is_enabled ? 1 : 0.5 }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}

                    {user.is_enabled ? (
                      <button
                        onClick={() => handleDisableUser(user.paperless_id)}
                        disabled={user.paperless_username.toLowerCase() === 'admin'}
                        className={`px-4 py-1.5 rounded text-white text-sm font-medium transition-colors ${
                          user.paperless_username.toLowerCase() === 'admin'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        title={user.paperless_username.toLowerCase() === 'admin' ? 'Cannot disable Admin user' : 'Disable user'}
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnableUser(user.paperless_id)}
                        className="px-4 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--app-text-secondary)' }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
