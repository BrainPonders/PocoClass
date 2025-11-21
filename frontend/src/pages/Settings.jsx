import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Settings as SettingsIcon, Database, Globe, Palette, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Lock, AlertTriangle, Activity, Sliders, Info } from 'lucide-react';
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

export default function Settings() {
  const { toast } = useToast();
  const { theme, updateTheme, colorBlindMode, updateColorBlindMode } = useTheme();
  const { language, updateLanguage, t } = useLanguage();
  
  // Check if we should auto-select validation tab
  const defaultTab = sessionStorage.getItem('settings_active_tab') || 'system';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Clear sessionStorage after reading
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
  
  const [backgroundSettings, setBackgroundSettings] = useState({
    bg_enabled: false,
    bg_debounce_seconds: 30,
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

  useEffect(() => {
    loadAllSettings();
    loadCustomFieldsData();
    loadBackgroundSettings();
  }, []);

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
  }, [activeTab]);

  // Listen for custom event from ValidationBanner to switch tabs
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
      const sessionToken = localStorage.getItem('pococlass_session');
      
      // Load user first (needed for admin check)
      const user = await User.me();
      setCurrentUser(user);
      
      // Load all settings in one batch request
      const response = await fetch(`${API_BASE_URL}/api/settings/batch?history_limit=5`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
      const response = await fetch(`${API_BASE_URL}/api/sync/history?limit=5`, {
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
      const response = await fetch(`${API_BASE_URL}/api/users/all-paperless`, {
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
    setSyncing(true);
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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

  const handleRoleChange = async (userId, newRole) => {
    if (!userId) {
      console.error('Cannot change role: userId is undefined');
      return;
    }
    
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
    if (!userId) {
      console.error('Cannot toggle user status: userId is undefined');
      return;
    }
    
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
      // Update theme and language contexts immediately
      if (key === 'theme') {
        updateTheme(value);
      } else if (key === 'language') {
        updateLanguage(value);
      } else if (key === 'colorblind_mode') {
        updateColorBlindMode(value === 'true' ? 'protanopia' : 'none');
      }

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
      // Prevent deselecting the last date format
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

  const loadValidationData = async () => {
    try {
      setLoadingValidation(true);
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/validation/fix-mandatory-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/paperless/custom-fields`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/settings`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackgroundSettings({
          bg_enabled: data.bg_enabled || false,
          bg_debounce_seconds: data.bg_debounce_seconds || 30,
          history_retention_type: data.history_retention_type || 'days',
          history_retention_days: data.history_retention_days || 365,
          history_retention_count: data.history_retention_count || 100
        });
      }
    } catch (error) {
      console.error('Error loading background settings:', error);
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/background/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/poco-ocr-enabled`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/settings/poco-ocr-enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
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
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/paperless/custom-fields`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
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
    { id: 'validation', label: 'Data Validation', icon: AlertCircle, adminOnly: true },
    { id: 'backgroundProcessing', label: 'Background Processing', icon: Activity, adminOnly: true },
    { id: 'appearance', label: 'Appearance', icon: Palette, adminOnly: false },
    { id: 'dateFormats', label: 'Date Formats', icon: Calendar, adminOnly: false },
    { id: 'fieldVisibility', label: 'Field Visibility', icon: FileText, adminOnly: false },
  ];

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg shadow" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--app-border)' }}>
            <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
          </div>

          <div className="flex">
            <div className="w-64" style={{ borderRight: '1px solid var(--app-border)' }}>
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>System Management</h2>
                    <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      Manage Paperless connection, users, and data synchronization
                    </p>
                  </div>

                  {/* Global Loading Indicator (initial load) or Syncing Indicator (manual sync) */}
                  {(loading || syncing) && (
                    <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>
                          {syncing ? 'Syncing data from Paperless-ngx...' : 'Loading settings from Paperless-ngx...'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 1. Paperless Connection */}
                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--app-text)' }}>
                      <Database className="w-5 h-5" style={{ color: 'var(--info-text)' }} />
                      Paperless Connection
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                          Paperless URL
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
                            {testingConnection ? 'Testing...' : 'Test Connection'}
                          </Button>
                          <Button
                            onClick={handlePaperlessUrlUpdate}
                            disabled={!isAdmin}
                            size="sm"
                          >
                            Update
                          </Button>
                        </div>
                        {!isAdmin && (
                          <p className="mt-2 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                            Only administrators can update the Paperless URL
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Session Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Session Settings</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      Configure session timeout and automatic logout behavior
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
                        <label htmlFor="session-timeout" className="text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>Session Timeout (hours)</label>
                      </div>
                      <div className="p-3 rounded text-sm" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
                        <strong>Background Processing Protection:</strong> The automatic background process is paused while any user is logged in. This prevents unwanted document modifications during manual testing or rule configuration. Background processing will resume after all users have logged out.
                      </div>
                    </div>
                  </div>

                  {/* 3. Paperless Datafield Synchronisation */}
                  <div className="border-t pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Paperless Datafield Synchronisation</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                          Sync and view cached data from Paperless-ngx
                        </p>
                      </div>
                      <Button
                        onClick={handleSync}
                        disabled={syncing}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </div>
                    
                    {syncStatus && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--info-bg)' }}>
                          <div className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Correspondents</div>
                          <div className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{syncStatus.correspondents?.count || 0}</div>
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
                        <div className="bg-cyan-50 p-4 rounded-lg">
                          <div className="text-sm text-cyan-600 font-medium">Users</div>
                          <div className="text-2xl font-bold text-cyan-900">{syncStatus.users?.count || 0}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. User Management */}
                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>User Management</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      All Paperless users with their PocoClass activation status
                    </p>
                    
                    {users.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y" style={{ borderColor: 'var(--app-border)' }}>
                          <thead style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                Username
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                Group(s)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                Paperless Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                PocoClass Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                                Actions
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
                                      {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {user.is_superuser && (
                                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        Superuser
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                    {user.is_registered ? (
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        user.is_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {user.is_enabled ? 'Active' : 'Disabled'}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' }}>
                                        Not Registered
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                    {user.is_registered ? (
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        user.pococlass_role === 'admin' ? 'bg-purple-100 text-purple-800' : ''
                                      }`}
                                      style={user.pococlass_role !== 'admin' ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' } : undefined}>
                                        {user.pococlass_role === 'admin' ? 'Admin' : 'User'}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--app-text-muted)' }}>-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--app-text-muted)' }}>
                                    {canManage ? (
                                      <div className="flex gap-2">
                                        <select
                                          value={user.pococlass_role || 'user'}
                                          onChange={(e) => handleRoleChange(user.pococlass_id, e.target.value)}
                                          className="border rounded-md px-2 py-1 text-sm"
                                          style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}
                                          disabled={!user.is_enabled}
                                        >
                                          <option value="user">User</option>
                                          <option value="admin">Admin</option>
                                        </select>
                                        <button
                                          onClick={() => handleToggleUserStatus(user.pococlass_id, user.is_enabled)}
                                          className={`px-3 py-1 text-xs font-medium rounded ${
                                            user.is_enabled
                                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                                          }`}
                                        >
                                          {user.is_enabled ? 'Disable' : 'Enable'}
                                        </button>
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--app-text-muted)' }}>-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: 'var(--app-text-muted)' }}>
                        No users found
                      </div>
                    )}
                  </div>

                  {/* 5. Sync History */}
                  {syncHistory.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Sync History</h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                        Recent synchronization events from Paperless-ngx
                      </p>
                      <div className="space-y-2">
                        {syncHistory.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)' }}>
                            {entry.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>{entry.entity_type}</span>
                            <span style={{ color: 'var(--app-text-muted)' }}>{entry.items_synced} items</span>
                            <span className="ml-auto" style={{ color: 'var(--app-text-muted)' }}>
                              {new Date(entry.synced_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Appearance Settings</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      Customize the look and feel of your interface
                    </p>
                  </div>

                  {/* Global Loading Indicator */}
                  {loading && (
                    <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Loading settings from Paperless-ngx...</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                      {t('settings.general.language')}
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
                      <option value="en">English</option>
                      <option value="es">Español (Spanish)</option>
                      <option value="fr">Français (French)</option>
                      <option value="de">Deutsch (German)</option>
                      <option value="nl">Nederlands (Dutch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text)' }}>
                      {t('settings.general.theme')}
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
                      <option value="light">{t('settings.general.themeLight')}</option>
                      <option value="dark">{t('settings.general.themeDark')}</option>
                      <option value="auto">{t('settings.general.themeAuto')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={colorBlindMode !== 'none'}
                        onChange={(e) => handleAppSettingChange('colorblind_mode', e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4 border-gray-300 rounded"
                        style={{ accentColor: 'var(--app-primary)' }}
                        onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
                        {t('settings.general.colorblindMode')}
                      </span>
                    </label>
                    <p className="mt-1 ml-7 text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                      {t('settings.general.colorblindModeDesc')}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'dateFormats' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Date Format Presets</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      Select date formats to appear in the wizard quick-select dropdown
                    </p>
                  </div>

                  {/* Global Loading Indicator */}
                  {loading && (
                    <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Loading settings from Paperless-ngx...</span>
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
                    ).map(([category, formats]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text-secondary)' }}>{category}</h3>
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
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'fieldVisibility' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>
                      Field Visibility Settings
                    </h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      Control which fields appear in the wizard and how they behave
                    </p>
                  </div>

                  {/* Global Loading Indicator */}
                  {loading && (
                    <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Loading settings from Paperless-ngx...</span>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--info-text)' }}>Visibility Modes</h3>
                    <ul className="text-xs space-y-1" style={{ color: 'var(--info-text)' }}>
                      <li><strong>Disabled:</strong> Field is hidden from the wizard</li>
                      <li><strong>Predefined:</strong> Show dropdown with existing values from Paperless (used for static assignment and verification)</li>
                      <li><strong>Dynamic:</strong> Extract value from document content using patterns and anchors</li>
                      <li><strong>Both Enabled:</strong> Enable both Predefined and Dynamic modes - field can be assigned statically and/or extracted dynamically</li>
                    </ul>
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--info-border)' }}>
                      <p className="text-xs" style={{ color: 'var(--info-text)' }}>
                        <strong>Note:</strong> Any field not disabled will also be available in Step 5 (Verification) to cross-check extracted data against existing Paperless metadata.
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
                        borderColor: isMissingPoco ? '#ef4444' : placeholder.is_locked ? 'var(--app-border)' : placeholder.is_custom_field ? '#a855f7' : 'var(--app-border)',
                        backgroundColor: isMissingPoco ? '#fef2f2' : placeholder.is_locked ? 'var(--app-bg-secondary)' : placeholder.is_custom_field ? '#faf5ff' : 'var(--app-surface)'
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
                                <span className="italic" style={{ color: 'var(--app-text-muted)' }}>Not available in this version of PocoClass</span>
                              ) : placeholder.is_custom_field ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Custom Field
                                </span>
                              ) : (
                                <span style={{ color: 'var(--app-text-muted)' }}>Built-in Field</span>
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
              )}

              {activeTab === 'validation' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold" style={{ color: 'var(--app-text)' }}>Data Validation</h2>
                      <Button
                        onClick={loadValidationData}
                        disabled={loadingValidation}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingValidation ? 'animate-spin' : ''}`} />
                        {loadingValidation ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                      Ensure all required custom fields and tags exist in Paperless-ngx for PocoClass to function correctly
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
                          {fixingMandatoryData ? 'Creating...' : 'Fix Missing Data'}
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
                          <h3 className="text-sm font-semibold mb-1" style={{ color: '#14532d' }}>All Required Data Present</h3>
                          <p className="text-sm" style={{ color: '#15803d' }}>
                            All mandatory custom fields and tags are configured correctly in Paperless-ngx.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Required Tags</h3>
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
                          <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Applied to documents that match a rule successfully</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${loadingValidation ? 'bg-blue-100 text-blue-700' : validationData?.tags?.poco_plus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {loadingValidation ? 'Verifying...' : validationData?.tags?.poco_plus ? 'Present' : 'Missing'}
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
                          <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Applied to documents that do not match any rule</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${loadingValidation ? 'bg-blue-100 text-blue-700' : validationData?.tags?.poco_minus ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {loadingValidation ? 'Verifying...' : validationData?.tags?.poco_minus ? 'Present' : 'Missing'}
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
                          <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Identifies unprocessed documents for background processing</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${loadingValidation ? 'bg-blue-100 text-blue-700' : validationData?.tags?.new ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {loadingValidation ? 'Verifying...' : validationData?.tags?.new ? 'Present' : 'Missing'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Required Custom Fields</h3>
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
                          <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Stores the overall POCO score (0-100%)</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${loadingValidation ? 'bg-blue-100 text-blue-700' : validationData?.fields?.poco_score ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {loadingValidation ? 'Verifying...' : validationData?.fields?.poco_score ? 'Present' : 'Missing'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Optional Custom Fields</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
                        {loadingValidation ? (
                          <svg className="animate-spin h-5 w-5" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : validationData?.fields?.poco_ocr ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Info className="w-5 h-5" style={{ color: 'var(--app-text-muted)' }} />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO OCR</div>
                          <div className="text-xs" style={{ color: 'var(--app-text-muted)' }}>Stores the OCR confidence score (0-100%). Optional for transparency.</div>
                        </div>
                        <div className={`text-xs font-medium px-3 py-1 rounded ${loadingValidation ? 'bg-blue-100 text-blue-700' : validationData?.fields?.poco_ocr ? 'bg-blue-100 text-blue-700' : ''}`}
                          style={!loadingValidation && !validationData?.fields?.poco_ocr ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-secondary)' } : undefined}>
                          {loadingValidation ? 'Verifying...' : validationData?.fields?.poco_ocr ? 'Present' : 'Optional'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Optional Features</h3>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--app-text)' }}>
                            POCO OCR Transparency Score Field
                          </label>
                          <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                            Enable the POCO OCR custom field in Paperless-ngx. This field stores the OCR transparency score separately from the main POCO Score. <strong>Not required for PocoClass to work</strong> - this provides additional visibility for advanced users who want to see the OCR pattern matching quality.
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
              )}

              {activeTab === 'backgroundProcessing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>Background Processing</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
                      Configure automatic document classification for newly uploaded documents
                    </p>
                  </div>

                  {/* Global Loading Indicator */}
                  {loading && (
                    <div className="rounded-md px-4 py-3" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-4 w-4" style={{ color: 'var(--info-text)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: 'var(--info-text)' }}>Loading settings from Paperless-ngx...</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-6">
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                            Enable Background Processing
                          </label>
                          <Switch
                            checked={backgroundSettings.bg_enabled}
                            onCheckedChange={(checked) => setBackgroundSettings({ ...backgroundSettings, bg_enabled: checked })}
                            disabled={!isAdmin}
                          />
                        </div>
                        <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                          Automatically classify documents when they are uploaded to Paperless-ngx
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                          Debounce Time (seconds)
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
                          <span className="text-sm self-center" style={{ color: 'var(--app-text-muted)' }}>seconds</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                          Wait time after detecting new documents before processing (prevents multiple runs for batch uploads). Range: 5-300 seconds.
                        </p>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Tag Configuration</h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--app-text-muted)' }}>
                          PocoClass uses these fixed tags for document processing and classification
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: 'var(--info-text)' }}></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>NEW</div>
                              <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                                Discovery tag - Documents with this tag will be automatically processed by background processing
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO+</div>
                              <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                                Success tag - Added when a document matches a rule and passes both POCO and OCR thresholds
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>POCO-</div>
                              <div className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>
                                Failure tag - Added when a document is processed but doesn't match any rule or fails thresholds
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--app-text)' }}>Processing History Retention Policy</h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--app-text-muted)' }}>
                          Control how long processing history is kept in the database
                        </p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--app-text-secondary)' }}>
                              Retention Type
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
                                <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>By Days</span>
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
                                <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>By Number of Runs</span>
                              </label>
                            </div>
                          </div>

                          {backgroundSettings.history_retention_type === 'days' && (
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                                Days to Keep
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
                                <span className="text-sm self-center" style={{ color: 'var(--app-text-muted)' }}>days</span>
                              </div>
                              <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                                Processing runs older than this will be automatically deleted (default: 365 days / 1 year)
                              </p>
                            </div>
                          )}

                          {backgroundSettings.history_retention_type === 'count' && (
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--app-text-secondary)' }}>
                                Runs to Keep
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
                          Save Settings
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
    </div>
  );
}
