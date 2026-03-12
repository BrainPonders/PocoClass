/**
 * @file Settings.jsx
 * @description Main settings page with tabbed navigation for system configuration,
 * appearance, date formats, field visibility, validation, maintenance, and background
 * processing. Delegates rendering to individual tab components and manages shared
 * state (users, sync status, Paperless config, custom fields, etc.).
 */
import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Settings as SettingsIcon, Database, Globe, Palette, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Lock, AlertTriangle, Activity, Sliders, Info, Key, Copy, Trash2, Terminal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { User } from '@/api/entities';
import API_BASE_URL from '@/config/api';
import { usePOCOFields } from '@/contexts/POCOFieldsContext';
import { useTheme } from '@/components/ThemeProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import CreatePocoFieldDialog from '@/components/CreatePocoFieldDialog';
import { QuickTooltip } from '@/components/ui/QuickTooltip';
import SystemTab from '@/components/settings/SystemTab';
import AppearanceTab from '@/components/settings/AppearanceTab';
import DateFormatsTab from '@/components/settings/DateFormatsTab';
import FieldVisibilityTab from '@/components/settings/FieldVisibilityTab';
import MaintenanceTab from '@/components/settings/MaintenanceTab';
import ValidationTab from '@/components/settings/ValidationTab';
import BackgroundProcessingTab from '@/components/settings/BackgroundProcessingTab';

export default function Settings() {
  const { toast } = useToast();
  const { theme, updateTheme, colorBlindMode, updateColorBlindMode } = useTheme();
  const { language, updateLanguage, t } = useLanguage();
  
  // Restore previously selected tab (e.g. navigated from ValidationBanner)
  const defaultTab = sessionStorage.getItem('settings_active_tab') || 'system';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Clean up one-time tab override from sessionStorage after reading
  useEffect(() => {
    if (sessionStorage.getItem('settings_active_tab')) {
      sessionStorage.removeItem('settings_active_tab');
    }
  }, []);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const { hasMissingFields, pocoScoreExists, pocoOcrExists, refresh: refreshPocoFields } = usePOCOFields();
  
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [appSettings, setAppSettings] = useState({});
  const [dateFormats, setDateFormats] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [paperlessConfig, setPaperlessConfig] = useState({});
  const [customFieldsData, setCustomFieldsData] = useState([]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fieldToCreate, setFieldToCreate] = useState(null);
  const [isCreatingField, setIsCreatingField] = useState(false);
  
  // Default background processing configuration
  const [backgroundSettings, setBackgroundSettings] = useState({
    bg_enabled: false,
    bg_debounce_seconds: 30,
    bg_remove_new_tag: false,
    history_retention_type: 'days',
    history_retention_days: 365,
    history_retention_count: 100
  });

  const [validationData, setValidationData] = useState(null);
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [fixingMandatoryData, setFixingMandatoryData] = useState(false);

  const [pocoOcrEnabled, setPocoOcrEnabled] = useState(false);
  const [loadingPocoOcr, setLoadingPocoOcr] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Multi-step reset confirmation: 0=none, 1=first, 2=second, 3=final
  const [resetStage, setResetStage] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  // System API Token state
  const [systemTokenInfo, setSystemTokenInfo] = useState({ exists: false, created_at: null });
  const [newSystemToken, setNewSystemToken] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);
  const [showTokenConfirm, setShowTokenConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [backgroundAutomationTokenInfo, setBackgroundAutomationTokenInfo] = useState({ exists: false, created_at: null });
  const [backgroundAutomationTokenInput, setBackgroundAutomationTokenInput] = useState('');
  const [savingBackgroundAutomationToken, setSavingBackgroundAutomationToken] = useState(false);
  const [revokingBackgroundAutomationToken, setRevokingBackgroundAutomationToken] = useState(false);
  const [showBackgroundAutomationRevokeConfirm, setShowBackgroundAutomationRevokeConfirm] = useState(false);

  // Load all settings, custom fields, and background config on mount
  useEffect(() => {
    loadAllSettings();
    loadCustomFieldsData();
    loadBackgroundSettings();
  }, []);

  // Lazy-load tab-specific data when switching tabs
  useEffect(() => {
    if (activeTab === 'validation') {
      loadValidationData();
      loadPocoOcrEnabled();
    }
    if (activeTab === 'system') {
      loadSyncStatus();
      loadSyncHistory();
      loadUsers();
    }
    if (activeTab === 'backgroundProcessing') {
      loadSystemTokenInfo();
      loadBackgroundAutomationTokenInfo();
    }
  }, [activeTab]);

  // Listen for custom event from ValidationBanner to programmatically switch tabs
  useEffect(() => {
    const handleSwitchTab = (event) => {
      setActiveTab(event.detail.tab);
    };
    
    window.addEventListener('switchSettingsTab', handleSwitchTab);
    return () => window.removeEventListener('switchSettingsTab', handleSwitchTab);
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      // Load user first (needed for admin check)
      const user = await User.me();
      setCurrentUser(user);
      
      // Load all settings in one batch request
      const response = await fetch(`${API_BASE_URL}/api/settings/batch?history_limit=5`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update all state at once
        setAppSettings(data.appSettings || {});
        setDateFormats(data.dateFormats || []);
        setPlaceholders(data.placeholders || []);
        setPaperlessConfig(data.paperlessConfig || {});
        setSyncStatus(data.syncStatus || null);
        setSyncHistory(data.syncHistory || []);
        setUsers(data.users || []);

        // Sync all placeholders to localStorage
        syncAllPlaceholdersToLocalStorage(data.placeholders || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Loading Error',
        description: 'Failed to load settings. Please refresh the page.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/history?limit=5`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSyncHistory(data);
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/all-paperless`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDateFormats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/date-formats`, {
        credentials: 'include'
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
      const response = await fetch(`${API_BASE_URL}/api/settings/placeholders`, {
        credentials: 'include'
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
      const response = await fetch(`${API_BASE_URL}/api/settings/paperless-config`, {
        credentials: 'include'
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
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Sync failed');
      
      // Reload custom fields data after sync to get new/updated fields
      await loadCustomFieldsData();

      const data = await response.json();
      toast({
        title: 'Sync Complete',
        description: `Synced: ${data.results.correspondents} correspondents, ${data.results.tags} tags, ${data.results.document_types} document types, ${data.results.custom_fields} custom fields, ${data.results.users} users`,
        duration: 5000,
      });

      loadSyncStatus();
      loadSyncHistory();
      loadUsers();
      loadPlaceholders();
      refreshPocoFields();
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleApplicationReset = async () => {
    try {
      setIsResetting(true);
      const response = await fetch(`${API_BASE_URL}/api/system/reset-app`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Show success modal instead of toast
        setShowResetSuccess(true);
        setResetStage(0);
      } else {
        throw new Error('Failed to reset application');
      }
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset the application',
        variant: 'destructive',
        duration: 5000,
      });
      setIsResetting(false);
      setResetStage(0);
    }
  };

  const handleResetSuccessClose = () => {
    setShowResetSuccess(false);
    // Clear local storage
    localStorage.removeItem('pococlass_session');
    localStorage.removeItem('theme');
    localStorage.removeItem('language');
    // Redirect to setup wizard
    window.location.href = '/setup';
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!userId) {
      console.error('Cannot change role: userId is undefined');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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
    if (!userId) {
      console.error('Cannot toggle user status: userId is undefined');
      return;
    }
    
    try {
      const action = isEnabled ? 'disable' : 'enable';
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/${action}`, {
        method: 'PUT',
        credentials: 'include'
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

  // Persist app setting and immediately apply theme/language changes to context
  const handleAppSettingChange = async (key, value) => {
    try {
      if (key === 'theme') {
        updateTheme(value);
      } else if (key === 'language') {
        updateLanguage(value);
      } else if (key === 'colorblind_mode') {
        updateColorBlindMode(value === 'true' ? 'protanopia' : 'none');
      }

      const response = await fetch(`${API_BASE_URL}/api/settings/app`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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

  // Toggle a date format on/off, enforcing at least one must remain selected
  const handleDateFormatToggle = async (formatPattern, isSelected) => {
    try {
      if (!isSelected) {
        const selectedCount = dateFormats.filter(fmt => fmt.is_selected === 1).length;
        if (selectedCount <= 1) {
          toast({
            title: 'Cannot Deselect',
            description: 'At least one date format must be selected.',
            variant: 'destructive',
            duration: 3000,
          });
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/settings/date-formats/${encodeURIComponent(formatPattern)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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

  const loadValidationData = async () => {
    try {
      setLoadingValidation(true);
      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setValidationData(data);
      }
    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleFixMandatoryData = async () => {
    // Show confirmation dialog
    if (!window.confirm('Fix Missing Data?\n\nThis will create all missing required custom fields and tags in Paperless-ngx immediately.')) {
      return;
    }

    try {
      setFixingMandatoryData(true);
      const response = await fetch(`${API_BASE_URL}/api/validation/fix-mandatory-data`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const createdCount = data.created_fields.length + data.created_tags.length;
          if (createdCount > 0) {
            toast({
              title: 'Missing Data Created',
              description: `Successfully created ${createdCount} missing ${createdCount === 1 ? 'item' : 'items'}`,
              duration: 3000,
            });
          } else {
            toast({
              title: 'All Data Present',
              description: 'All required custom fields and tags already exist',
              duration: 3000,
            });
          }
          
          // Reload validation data and POCO fields
          await loadValidationData();
          await refreshPocoFields();
        } else {
          toast({
            title: 'Fix Failed',
            description: data.errors.join(', '),
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Fix Failed',
        description: error.message || 'Failed to fix missing data',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setFixingMandatoryData(false);
    }
  };

  const handlePlaceholderVisibilityChange = async (placeholderName, visibilityMode) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/placeholders/${encodeURIComponent(placeholderName)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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

      // Update localStorage to sync with database
      updateLocalStorageSettings(placeholderName, visibilityMode);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const loadCustomFieldsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/paperless/custom-fields`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomFieldsData(data || []);
      }
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  const loadBackgroundSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/settings`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackgroundSettings({
          bg_enabled: data.bg_enabled || false,
          bg_debounce_seconds: data.bg_debounce_seconds || 30,
          bg_remove_new_tag: data.bg_remove_new_tag || false,
          history_retention_type: data.history_retention_type || 'days',
          history_retention_days: data.history_retention_days || 365,
          history_retention_count: data.history_retention_count || 100
        });
      }
    } catch (error) {
      console.error('Error loading background settings:', error);
    }
  };

  const loadSystemTokenInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/system-token`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemTokenInfo({
          exists: data.exists || false,
          created_at: data.created_at || null
        });
      }
    } catch (error) {
      console.error('Error loading system token info:', error);
    }
  };

  const loadBackgroundAutomationTokenInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/automation-token`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBackgroundAutomationTokenInfo({
          exists: data.exists || false,
          created_at: data.created_at || null
        });
      }
    } catch (error) {
      console.error('Error loading background automation token info:', error);
    }
  };

  const handleGenerateSystemToken = async () => {
    setGeneratingToken(true);
    setShowTokenConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/system-token`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewSystemToken(data.token);
        setSystemTokenInfo({
          exists: true,
          created_at: data.created_at
        });
        toast({
          title: t('settings.systemToken.generated'),
          description: t('settings.systemToken.generatedDesc'),
          duration: 5000,
        });
      } else {
        throw new Error('Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating system token:', error);
      toast({
        title: t('settings.systemToken.error'),
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeSystemToken = async () => {
    setRevokingToken(true);
    setShowRevokeConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/system-token`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setSystemTokenInfo({ exists: false, created_at: null });
        setNewSystemToken(null);
        toast({
          title: t('settings.systemToken.revoked'),
          description: t('settings.systemToken.revokedDesc'),
          duration: 3000,
        });
      } else {
        throw new Error('Failed to revoke token');
      }
    } catch (error) {
      console.error('Error revoking system token:', error);
      toast({
        title: t('settings.systemToken.error'),
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setRevokingToken(false);
    }
  };

  const handleSaveBackgroundAutomationToken = async () => {
    setSavingBackgroundAutomationToken(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/automation-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paperless_token: backgroundAutomationTokenInput })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save automation token');
      }

      setBackgroundAutomationTokenInfo({
        exists: true,
        created_at: data.created_at || null
      });
      setBackgroundAutomationTokenInput('');
      toast({
        title: t('settings.backgroundAutomationToken.saved'),
        description: t('settings.backgroundAutomationToken.savedDesc'),
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving background automation token:', error);
      toast({
        title: t('settings.backgroundAutomationToken.error'),
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setSavingBackgroundAutomationToken(false);
    }
  };

  const handleRevokeBackgroundAutomationToken = async () => {
    setRevokingBackgroundAutomationToken(true);
    setShowBackgroundAutomationRevokeConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/automation-token`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to revoke automation token');
      }

      setBackgroundAutomationTokenInfo({ exists: false, created_at: null });
      setBackgroundAutomationTokenInput('');
      toast({
        title: t('settings.backgroundAutomationToken.revoked'),
        description: t('settings.backgroundAutomationToken.revokedDesc'),
        duration: 3000,
      });
    } catch (error) {
      console.error('Error revoking background automation token:', error);
      toast({
        title: t('settings.backgroundAutomationToken.error'),
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setRevokingBackgroundAutomationToken(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (newSystemToken) {
      navigator.clipboard.writeText(newSystemToken);
      toast({
        title: t('settings.systemToken.copied'),
        description: t('settings.systemToken.copiedDesc'),
        duration: 2000,
      });
    }
  };

  const handleBackgroundSettingsSave = async () => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can update background processing settings',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/background/settings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backgroundSettings)
      });

      if (!response.ok) throw new Error('Failed to save background settings');

      toast({
        title: 'Settings Saved',
        description: 'Background processing settings have been updated',
        duration: 3000,
      });

      await loadBackgroundSettings();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const loadPocoOcrEnabled = async () => {
    try {
      setLoadingPocoOcr(true);
      const response = await fetch(`${API_BASE_URL}/api/settings/poco-ocr-enabled`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPocoOcrEnabled(data.enabled || false);
      }
    } catch (error) {
      console.error('Error loading POCO OCR enabled status:', error);
    } finally {
      setLoadingPocoOcr(false);
    }
  };

  const handlePocoOcrEnabledToggle = async (enabled) => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can update POCO OCR settings',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    // If enabling, show confirmation dialog
    if (enabled) {
      if (!window.confirm('Enable POCO OCR field?\n\nThis will create the POCO OCR custom field in Paperless-ngx immediately. The field stores the OCR confidence score (0-100%).')) {
        return;
      }
    }

    try {
      setLoadingPocoOcr(true);
      const response = await fetch(`${API_BASE_URL}/api/settings/poco-ocr-enabled`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update POCO OCR setting');
      }

      const data = await response.json();
      setPocoOcrEnabled(enabled);
      
      toast({
        title: enabled ? 'POCO OCR Enabled' : 'POCO OCR Disabled',
        description: data.message || (enabled 
          ? 'POCO OCR field created successfully'
          : 'POCO OCR field disabled'),
        duration: 3000,
      });
      
      // Refresh validation data after change
      if (activeTab === 'validation') {
        await loadValidationData();
      }
      await refreshPocoFields();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
      // Reset toggle on error
      setPocoOcrEnabled(!enabled);
    } finally {
      setLoadingPocoOcr(false);
    }
  };

  const getCustomFieldDataType = (fieldName) => {
    const customField = customFieldsData.find(cf => cf.name === fieldName);
    return customField?.data_type || null;
  };

  const isDynamicExtractable = (fieldName, isCustomField) => {
    // Built-in fields: only Date Created supports dynamic extraction
    if (!isCustomField) {
      const extractableBuiltInFields = ['Date Created'];
      return extractableBuiltInFields.includes(fieldName);
    }
    
    const dataType = getCustomFieldDataType(fieldName);
    if (!dataType) return false; // No datatype means not extractable
    
    // Only these types support dynamic extraction
    const extractableTypes = ['string', 'integer', 'float', 'monetary', 'date'];
    return extractableTypes.includes(dataType);
  };

  const getDynamicDisabledReason = (fieldName, isCustomField) => {
    if (!isCustomField) {
      // Built-in fields that don't support dynamic extraction
      const extractableBuiltInFields = ['Date Created'];
      if (!extractableBuiltInFields.includes(fieldName)) {
        return 'This field does not support dynamic extraction';
      }
      return null;
    }
    
    const dataType = getCustomFieldDataType(fieldName);
    if (!dataType) return 'Datatype unknown - sync with Paperless-ngx to load field information';
    
    if (dataType === 'select') return 'Select fields have predefined options and cannot be extracted dynamically';
    if (dataType === 'boolean') return 'Boolean fields cannot be extracted from text';
    if (dataType === 'url') return 'URL fields are not currently supported for dynamic extraction';
    if (dataType === 'documentlink') return 'Document link fields cannot be extracted from text';
    
    return null;
  };

  const syncAllPlaceholdersToLocalStorage = (placeholdersList) => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      
      if (!parsed.fieldDisplaySettings) {
        parsed.fieldDisplaySettings = {};
      }
      if (!parsed.customFieldNames) {
        parsed.customFieldNames = {};
      }

      // Built-in field mappings (case-insensitive normalized keys)
      const builtInMap = {
        'title': 'title',
        'archive serial number': 'archiveSerialNumber',
        'date created': 'dateCreated',
        'correspondent': 'correspondent',
        'document type': 'documentType',
        'storage path': 'storagePath',
        'tags': 'tags'
      };

      // Process each placeholder
      placeholdersList.forEach(placeholder => {
        const placeholderName = placeholder.placeholder_name;
        const visibilityMode = placeholder.visibility_mode;
        
        // Normalize to lowercase and trim for case-insensitive matching
        const normalizedName = placeholderName.toLowerCase().trim();
        let fieldKey = builtInMap[normalizedName];
        
        // For custom fields, assign to slots
        if (!fieldKey && placeholder.is_custom_field) {
          // Check if already mapped
          if (placeholderName === parsed.customFieldNames.documentCategory) {
            fieldKey = 'documentCategory';
          } else if (placeholderName === parsed.customFieldNames.customField1) {
            fieldKey = 'customField1';
          } else if (placeholderName === parsed.customFieldNames.customField2) {
            fieldKey = 'customField2';
          } else {
            // Assign to first available slot
            if (!parsed.customFieldNames.documentCategory) {
              fieldKey = 'documentCategory';
              parsed.customFieldNames.documentCategory = placeholderName;
            } else if (!parsed.customFieldNames.customField1) {
              fieldKey = 'customField1';
              parsed.customFieldNames.customField1 = placeholderName;
            } else if (!parsed.customFieldNames.customField2) {
              fieldKey = 'customField2';
              parsed.customFieldNames.customField2 = placeholderName;
            }
          }
        }

        // Update field display setting
        if (fieldKey) {
          parsed.fieldDisplaySettings[fieldKey] = visibilityMode;
        }
      });

      localStorage.setItem('pococlass_settings', JSON.stringify(parsed));
      console.log('Synced all placeholders to localStorage:', parsed);
    } catch (e) {
      console.error('Error syncing placeholders to localStorage:', e);
    }
  };

  const updateLocalStorageSettings = (placeholderName, visibilityMode) => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      
      if (!parsed.fieldDisplaySettings) {
        parsed.fieldDisplaySettings = {};
      }

      // Convert placeholder name to camelCase field key
      // Built-in fields have specific mappings (case-insensitive)
      const builtInMap = {
        'title': 'title',
        'archive serial number': 'archiveSerialNumber',
        'date created': 'dateCreated',
        'correspondent': 'correspondent',
        'document type': 'documentType',
        'storage path': 'storagePath',
        'tags': 'tags'
      };

      // Normalize to lowercase and trim for case-insensitive matching
      const normalizedName = placeholderName.toLowerCase().trim();
      let fieldKey = builtInMap[normalizedName];
      
      // For custom fields, convert to camelCase
      if (!fieldKey) {
        // Check if it's a known custom field name from placeholder settings
        const placeholder = placeholders.find(p => p.placeholder_name === placeholderName);
        if (placeholder && placeholder.is_custom_field) {
          // Try to match against known custom field names in localStorage
          const existingCustomNames = parsed.customFieldNames || {};
          
          // Find which custom field slot this matches
          if (placeholderName === existingCustomNames.documentCategory) {
            fieldKey = 'documentCategory';
          } else if (placeholderName === existingCustomNames.customField1) {
            fieldKey = 'customField1';
          } else if (placeholderName === existingCustomNames.customField2) {
            fieldKey = 'customField2';
          } else {
            // Assign to first available custom field slot
            if (!existingCustomNames.documentCategory) {
              fieldKey = 'documentCategory';
              if (!parsed.customFieldNames) parsed.customFieldNames = {};
              parsed.customFieldNames.documentCategory = placeholderName;
            } else if (!existingCustomNames.customField1) {
              fieldKey = 'customField1';
              if (!parsed.customFieldNames) parsed.customFieldNames = {};
              parsed.customFieldNames.customField1 = placeholderName;
            } else if (!existingCustomNames.customField2) {
              fieldKey = 'customField2';
              if (!parsed.customFieldNames) parsed.customFieldNames = {};
              parsed.customFieldNames.customField2 = placeholderName;
            }
          }
        }
      }

      if (fieldKey) {
        parsed.fieldDisplaySettings[fieldKey] = visibilityMode;
        localStorage.setItem('pococlass_settings', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('Error updating localStorage:', e);
    }
  };

  const handleCreateFieldClick = (fieldName) => {
    setFieldToCreate(fieldName);
    setCreateDialogOpen(true);
  };

  const handleCreateFieldConfirm = async () => {
    setIsCreatingField(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/paperless/custom-fields`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: fieldToCreate,
          data_type: 'integer'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create field');
      }

      toast({
        title: 'Field Created',
        description: `${fieldToCreate} has been created successfully in Paperless`,
        duration: 3000,
      });

      setCreateDialogOpen(false);
      setFieldToCreate(null);
      
      refreshPocoFields();
      loadSyncStatus();
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsCreatingField(false);
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
      const response = await fetch(`${API_BASE_URL}/api/settings/paperless-config`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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
      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        credentials: 'include'
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
    { id: 'system', label: t('settings.tabs.system'), icon: Database, adminOnly: true },
    { id: 'validation', label: t('settings.tabs.validation'), icon: AlertCircle, adminOnly: true },
    { id: 'backgroundProcessing', label: t('settings.tabs.backgroundProcessing'), icon: Activity, adminOnly: true },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette, adminOnly: false },
    { id: 'dateFormats', label: t('settings.tabs.dateFormats'), icon: Calendar, adminOnly: false },
    { id: 'fieldVisibility', label: t('settings.tabs.fieldVisibility'), icon: FileText, adminOnly: false },
    { id: 'maintenance', label: 'Maintenance', icon: AlertTriangle, adminOnly: true },
  ];

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg shadow" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--app-border)' }}>
            <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
              <SettingsIcon className="w-6 h-6" />
              {t('settings.title')}
            </h1>
          </div>

          <div className="flex">
            <div className="w-80" style={{ borderRight: '1px solid var(--app-border)' }}>
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isDisabled = tab.adminOnly && !isAdmin;
                  const showWarning = tab.id === 'validation' && hasMissingFields;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isDisabled && setActiveTab(tab.id)}
                      disabled={isDisabled}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors"
                      style={
                        activeTab === tab.id
                          ? { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' }
                          : isDisabled
                          ? { color: 'var(--app-text-muted)', cursor: 'not-allowed' }
                          : { color: 'var(--app-text-secondary)' }
                      }
                      onMouseEnter={(e) => {
                        if (!isDisabled && activeTab !== tab.id) {
                          e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled && activeTab !== tab.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                      {showWarning && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" title="POCO fields missing" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex-1 p-6" style={{ color: 'var(--app-text)' }}>
              {activeTab === 'system' && (
                <SystemTab
                  loading={loading}
                  syncing={syncing}
                  t={t}
                  isAdmin={isAdmin}
                  paperlessConfig={paperlessConfig}
                  setPaperlessConfig={setPaperlessConfig}
                  testPaperlessConnection={testPaperlessConnection}
                  testingConnection={testingConnection}
                  handlePaperlessUrlUpdate={handlePaperlessUrlUpdate}
                  appSettings={appSettings}
                  handleAppSettingChange={handleAppSettingChange}
                  syncStatus={syncStatus}
                  handleSync={handleSync}
                  users={users}
                  currentUser={currentUser}
                  handleRoleChange={handleRoleChange}
                  handleToggleUserStatus={handleToggleUserStatus}
                  syncHistory={syncHistory}
                />
              )}

              {activeTab === 'appearance' && (
                <AppearanceTab
                  loading={loading}
                  t={t}
                  language={language}
                  handleAppSettingChange={handleAppSettingChange}
                  theme={theme}
                  colorBlindMode={colorBlindMode}
                />
              )}

              {activeTab === 'dateFormats' && (
                <DateFormatsTab
                  loading={loading}
                  t={t}
                  dateFormats={dateFormats}
                  handleDateFormatToggle={handleDateFormatToggle}
                />
              )}

              {activeTab === 'fieldVisibility' && (
                <FieldVisibilityTab
                  loading={loading}
                  t={t}
                  placeholders={placeholders}
                  pocoScoreExists={pocoScoreExists}
                  pocoOcrExists={pocoOcrExists}
                  handlePlaceholderVisibilityChange={handlePlaceholderVisibilityChange}
                  handleCreateFieldClick={handleCreateFieldClick}
                  getCustomFieldDataType={getCustomFieldDataType}
                  isDynamicExtractable={isDynamicExtractable}
                  getDynamicDisabledReason={getDynamicDisabledReason}
                />
              )}

              {activeTab === 'maintenance' && (
                <MaintenanceTab
                  isAdmin={isAdmin}
                  isResetting={isResetting}
                  setResetStage={setResetStage}
                />
              )}

              {activeTab === 'validation' && (
                <ValidationTab
                  t={t}
                  loadValidationData={loadValidationData}
                  loadingValidation={loadingValidation}
                  validationData={validationData}
                  isAdmin={isAdmin}
                  handleFixMandatoryData={handleFixMandatoryData}
                  fixingMandatoryData={fixingMandatoryData}
                  pocoOcrEnabled={pocoOcrEnabled}
                  handlePocoOcrEnabledToggle={handlePocoOcrEnabledToggle}
                  loadingPocoOcr={loadingPocoOcr}
                />
              )}

              {activeTab === 'backgroundProcessing' && (
                <BackgroundProcessingTab
                  loading={loading}
                  t={t}
                  isAdmin={isAdmin}
                  backgroundSettings={backgroundSettings}
                  setBackgroundSettings={setBackgroundSettings}
                  handleBackgroundSettingsSave={handleBackgroundSettingsSave}
                  systemTokenInfo={systemTokenInfo}
                  newSystemToken={newSystemToken}
                  generatingToken={generatingToken}
                  revokingToken={revokingToken}
                  showTokenConfirm={showTokenConfirm}
                  setShowTokenConfirm={setShowTokenConfirm}
                  showRevokeConfirm={showRevokeConfirm}
                  setShowRevokeConfirm={setShowRevokeConfirm}
                  handleGenerateSystemToken={handleGenerateSystemToken}
                  handleRevokeSystemToken={handleRevokeSystemToken}
                  copyTokenToClipboard={copyTokenToClipboard}
                  backgroundAutomationTokenInfo={backgroundAutomationTokenInfo}
                  backgroundAutomationTokenInput={backgroundAutomationTokenInput}
                  setBackgroundAutomationTokenInput={setBackgroundAutomationTokenInput}
                  savingBackgroundAutomationToken={savingBackgroundAutomationToken}
                  revokingBackgroundAutomationToken={revokingBackgroundAutomationToken}
                  showBackgroundAutomationRevokeConfirm={showBackgroundAutomationRevokeConfirm}
                  setShowBackgroundAutomationRevokeConfirm={setShowBackgroundAutomationRevokeConfirm}
                  handleSaveBackgroundAutomationToken={handleSaveBackgroundAutomationToken}
                  handleRevokeBackgroundAutomationToken={handleRevokeBackgroundAutomationToken}
                />
              )}
            </div>

          </div>
        </div>
      </div>

      <CreatePocoFieldDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fieldName={fieldToCreate}
        onConfirm={handleCreateFieldConfirm}
        isCreating={isCreatingField}
      />

      {/* Triple Confirmation for Reset */}
      {resetStage > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          {resetStage === 1 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">⚠️ Reset Application?</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    This will permanently delete all rules, settings, and configurations. The application will restart and return you to the initial setup wizard.
                  </p>
                  <p className="text-sm text-gray-700">
                    Are you sure you want to continue?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setResetStage(0)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setResetStage(2)}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  I Understand
                </Button>
              </div>
            </div>
          )}

          {resetStage === 2 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" style={{ animation: 'pulse 2s infinite' }} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Final Warning</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Once reset, you will need to:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-2 mb-4 ml-4">
                    <li>• Reconfigure your Paperless-ngx connection</li>
                    <li>• Recreate all rules and settings</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                  <p className="text-sm font-semibold text-red-700 mb-4">
                    Continue only if you absolutely want to reset the application.
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    Type <strong>RESET</strong> below to confirm you want to permanently reset the application:
                  </p>
                  <input
                    type="text"
                    placeholder="Type RESET to confirm"
                    id="reset-confirmation"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      marginBottom: '16px',
                      fontFamily: 'monospace',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setResetStage(0)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const confirmText = document.getElementById('reset-confirmation')?.value || '';
                    if (confirmText === 'RESET') {
                      handleApplicationReset();
                    } else {
                      toast({
                        title: 'Invalid Confirmation',
                        description: 'Please type RESET exactly to confirm',
                        variant: 'destructive',
                        duration: 3000
                      });
                    }
                  }}
                  disabled={isResetting}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    cursor: isResetting ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {isResetting ? 'Resetting...' : 'Confirm Reset'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset Success Modal */}
      {showResetSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '48px',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Application Reset Complete</h3>
            <p className="text-base text-gray-700 mb-6">
              The app has been successfully reset to its initial state. All rules, settings, and configurations have been cleared.
            </p>
            <p className="text-base text-gray-700 mb-8">
              You will be redirected to the setup wizard to reconfigure PocoClass.
            </p>
            <Button
              onClick={handleResetSuccessClose}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '500',
                borderRadius: '6px',
                width: '100%'
              }}
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
