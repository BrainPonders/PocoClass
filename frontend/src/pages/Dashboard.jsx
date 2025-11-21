
import React, { useState, useEffect } from "react";
import { Rule, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Settings, BarChart3, Activity, CheckCircle, XCircle, Users, Tag, FileType, Database } from "lucide-react";
import API_BASE_URL from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageLayout from "@/components/PageLayout";
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Status data
  const [currentUser, setCurrentUser] = useState(null);
  const [backgroundSettings, setBackgroundSettings] = useState(null);
  const [backgroundStatus, setBackgroundStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    loadRules();
    loadStatusData();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const fetchedRules = await Rule.list("-created_date");
      setRules(fetchedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
    }
    setIsLoading(false);
  };

  const loadStatusData = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      
      const [user, bgSettings, bgStatus, syncStat] = await Promise.all([
        User.me().catch(() => null),
        fetch(`${API_BASE_URL}/api/background/settings`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE_URL}/api/background/status`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE_URL}/api/sync/status`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      
      setCurrentUser(user);
      setBackgroundSettings(bgSettings);
      setBackgroundStatus(bgStatus);
      setSyncStatus(syncStat);
    } catch (error) {
      console.error("Error loading status data:", error);
    }
  };

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.status === 'active').length,
    deactivatedRules: rules.filter(r => r.status === 'inactive').length,
  };

  return (
    <PageLayout 
      title={t('dashboard.title')}
      subtitle="View and manage documents"
      actions={
        <Link to={createPageUrl("RuleEditor")} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          {t('rules.createNew')}
        </Link>
      }
    >

      {/* PocoClass Status Section */}
      {(backgroundSettings || backgroundStatus || syncStatus) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Background Processing Status */}
              {backgroundSettings && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    {backgroundSettings.bg_enabled ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6" style={{ color: 'var(--app-text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Background Processing</div>
                    <div className={`text-xs ${backgroundSettings.bg_enabled ? 'text-green-600' : ''}`} style={{ color: backgroundSettings.bg_enabled ? undefined : 'var(--app-text-muted)' }}>
                      {backgroundSettings.bg_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    {backgroundStatus?.is_paused && (
                      <div className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--app-warning)' }}>
                        <Activity className="h-3 w-3" />
                        Paused (Active session)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Correspondents Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6" style={{ color: 'var(--info-text)' }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Correspondents</div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--info-text)' }}>
                      {syncStatus.correspondents?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    <Tag className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Tags</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {syncStatus.tags?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Types Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    <FileType className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Document Types</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {syncStatus.document_types?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fields Count */}
              {syncStatus && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    <Database className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Custom Fields</div>
                    <div className="text-2xl font-bold text-teal-600">
                      {syncStatus.custom_fields?.count || 0}
                    </div>
                  </div>
                </div>
              )}

              {/* Users Count (admin only) */}
              {syncStatus && currentUser?.role === 'admin' && (
                <div className="flex items-start gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Users</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {syncStatus.users?.count || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.totalRules')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRules}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.stats.activeRules')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeRules}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deactivated Rules</CardTitle>
            <Settings className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.deactivatedRules}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Rule Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Rule Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--info-text)' }}></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--app-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>No Rules Yet</h3>
              <p className="mb-4" style={{ color: 'var(--app-text-muted)' }}>Create your first document classification rule to get started</p>
              <Link to={createPageUrl("RuleEditor")} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Create First Rule
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                <p className="text-sm" style={{ color: 'var(--info-text)' }}>
                  📊 <strong>Note:</strong> Execution tracking coming soon. Currently showing rule creation dates as activity indicators.
                </p>
              </div>
              <div className="space-y-3">
                {rules.slice(0, 5).map((rule) => {
                  const lastActivity = rule.created_date 
                    ? new Date(rule.created_date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : 'N/A';
                  
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg" style={{ border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg-secondary)' }}>
                      <div className="flex-1">
                        <h4 className="font-semibold" style={{ color: 'var(--app-text)' }}>{rule.ruleName}</h4>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            Last Activity: {lastActivity}
                          </span>
                          <span>•</span>
                          <span>Status: 
                            <span 
                              className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                rule.status === 'active' ? 'bg-green-100 text-green-800' : 
                                rule.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''
                              }`}
                              style={rule.status !== 'active' && rule.status !== 'draft' ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' } : {}}
                            >
                              {rule.status}
                            </span>
                          </span>
                          <span>•</span>
                          <span style={{ color: 'var(--app-text-muted)' }}>Executions: -</span>
                          <span>•</span>
                          <span style={{ color: 'var(--app-text-muted)' }}>Success Rate: -</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
