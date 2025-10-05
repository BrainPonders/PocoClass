
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Moon, Sun, Eye, Wrench, Database, Users, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from '@/components/ThemeProvider';
import Tooltip from '@/components/Tooltip';

export default function Settings() {
  const { toast } = useToast();
  const { theme, colorBlindMode, updateTheme, updateColorBlindMode } = useTheme();

  const [activeTab, setActiveTab] = useState('general'); // Initialize active tab to 'general'

  const [settings, setSettings] = useState({
    language: 'en',
    enabledFields: {},
    fieldDisplaySettings: {},
    paperlessUrl: '',
    paperlessToken: '',
    customFieldNames: {},
    commonDateFormats: [], // Initialize commonDateFormats
    maxLoginAttempts: 5 // Added for user management
  });

  const [paperlessConnected, setPaperlessConnected] = useState(false);
  const [paperlessUsers, setPaperlessUsers] = useState([]); // Added for user management
  const [pococlassUsers, setPococlassUsers] = useState([]); // Added for user management
  const [showPasswordModal, setShowPasswordModal] = useState(false); // Added for user management
  const [selectedUser, setSelectedUser] = useState(null); // Added for user management
  const [newPassword, setNewPassword] = useState(''); // Added for user management

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  const themes = [
    { id: 'light', name: 'Light Mode', icon: Sun },
    { id: 'dark', name: 'Dark Mode', icon: Moon }
  ];

  const colorBlindModes = [
    { id: 'none', name: 'Standard Colors' },
    { id: 'protanopia', name: 'Protanopia (Red-Green)' },
    { id: 'deuteranopia', name: 'Deuteranopia (Red-Green)' },
    { id: 'tritanopia', name: 'Tritanopia (Blue-Yellow)' }
  ];

  const paperlessFields = [
    { key: 'title', label: 'Title', isCustom: false },
    { key: 'archiveSerialNumber', label: 'Archive Serial Number', isCustom: false },
    { key: 'dateCreated', label: 'Date Created', isCustom: false },
    { key: 'correspondent', label: 'Correspondent', isCustom: false },
    { key: 'documentType', label: 'Document Type', isCustom: false },
    { key: 'storagePath', label: 'Storage Path', isCustom: false },
    { key: 'tags', label: 'Tags', isCustom: false },
    { key: 'documentCategory', label: 'Document Category', isCustom: true }, // Changed to true
    { key: 'customField1', label: 'Custom Field 1', isCustom: true },
    { key: 'customField2', label: 'Custom Field 2', isCustom: true },
    { key: 'pocoScore', label: 'Poco Score', isCustom: true, isInternal: true }, // Added
    { key: 'pocoOcr', label: 'Poco OCR', isCustom: true, isInternal: true } // Added
  ];

  useEffect(() => {
    loadSettings();
    checkPaperlessConnection();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('pococlass_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        const defaultEnabledFields = {
          title: true,
          archiveSerialNumber: false,
          dateCreated: false,
          correspondent: true,
          documentType: true,
          storagePath: false,
          tags: true,
          documentCategory: true,
          customField1: false,
          customField2: false,
          pocoScore: false, // Added
          pocoOcr: false // Added
        };

        const defaultFieldDisplaySettings = {
          title: 'disabled',
          archiveSerialNumber: 'disabled',
          dateCreated: 'dynamic',
          correspondent: 'predefined',
          documentType: 'predefined',
          storagePath: 'disabled',
          tags: 'predefined',
          documentCategory: 'predefined',
          customField1: 'disabled',
          customField2: 'disabled',
          pocoScore: 'disabled', // Added
          pocoOcr: 'disabled' // Added
        };

        const defaultCommonDateFormats = [
          'DD-MM-YYYY', 'DD-MMM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 
          'DD.MM.YYYY', 'DDDD DD MMMM YYYY', 'DD MMMM YYYY', 'MMMM DD, YYYY'
        ];

        const loadedFieldDisplaySettings = { ...defaultFieldDisplaySettings, ...parsed.fieldDisplaySettings };
        // Force unsupported fields to always be disabled
        loadedFieldDisplaySettings.title = 'disabled';
        loadedFieldDisplaySettings.archiveSerialNumber = 'disabled';
        loadedFieldDisplaySettings.storagePath = 'disabled';
        loadedFieldDisplaySettings.pocoScore = 'disabled'; // Added
        loadedFieldDisplaySettings.pocoOcr = 'disabled'; // Added

        setSettings({
          language: parsed.language || 'en',
          enabledFields: { ...defaultEnabledFields, ...parsed.enabledFields },
          fieldDisplaySettings: loadedFieldDisplaySettings,
          paperlessUrl: parsed.paperlessUrl || '',
          paperlessToken: parsed.paperlessToken || '',
          customFieldNames: parsed.customFieldNames || { 
            customField1: 'Invoice Number', 
            customField2: 'Reference ID',
            documentCategory: 'Document Category' // Added default custom field name for documentCategory
          },
          commonDateFormats: parsed.commonDateFormats || defaultCommonDateFormats,
          maxLoginAttempts: parsed.maxLoginAttempts || 5 // Load maxLoginAttempts
        });
      }
    } catch (e) {
      console.error('Error loading settings:', e);
      toast({
        title: 'Error',
        description: 'Failed to load settings. Using defaults.',
        variant: 'destructive',
      });
    }
  };

  const checkPaperlessConnection = () => {
    const saved = localStorage.getItem('pococlass_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const isConnected = !!(parsed.paperlessUrl && parsed.paperlessToken);
      setPaperlessConnected(isConnected);
      if (isConnected) {
        // Automatically fetch users if connected on load
        fetchPaperlessUsers(parsed.paperlessUrl, parsed.paperlessToken); 
      }
    }
  };

  const fetchPaperlessUsers = async (url = settings.paperlessUrl, token = settings.paperlessToken) => {
    if (!url || !token) {
      showToast('Paperless URL and Token are required to fetch users.', 'error');
      return;
    }
    
    try {
      // Mock API call - replace with actual Paperless API call
      // const response = await fetch(`${url}/api/users/`, {
      //   headers: { 'Authorization': `Token ${token}` }
      // });
      // if (!response.ok) throw new Error('Failed to fetch Paperless users');
      // const users = await response.json();
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const mockUsers = [
        { id: 1, username: 'john.doe', email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
        { id: 2, username: 'jane.smith', email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith' },
        { id: 3, username: 'bob.wilson', email: 'bob@example.com', first_name: 'Bob', last_name: 'Wilson' }
      ];
      
      setPaperlessUsers(mockUsers);
      loadPococlassUsers(mockUsers);
      showToast('Paperless users fetched successfully!', 'success');
    } catch (error) {
      console.error('Error fetching Paperless users:', error);
      showToast('Error fetching Paperless users. Make sure URL and Token are correct.', 'error');
    }
  };

  const loadPococlassUsers = (paperlessUsersList) => {
    try {
      const stored = localStorage.getItem('pococlass_users');
      const users = stored ? JSON.parse(stored) : [];
      
      // Merge with Paperless users
      const mergedUsers = paperlessUsersList.map(pUser => {
        const existing = users.find(u => u.paperlessUserId === pUser.id);
        return existing || {
          paperlessUserId: pUser.id,
          username: pUser.username,
          email: pUser.email,
          fullName: `${pUser.first_name} ${pUser.last_name}`,
          enabled: false,
          failedLoginAttempts: 0,
          passwordHash: null // Stored as base64 encoded string
        };
      });
      
      setPococlassUsers(mergedUsers);
    } catch (error) {
      console.error('Error loading PocoClass users:', error);
    }
  };

  const savePococlassUsers = (users) => {
    try {
      localStorage.setItem('pococlass_users', JSON.stringify(users));
      setPococlassUsers(users);
    } catch (error) {
      console.error('Error saving PocoClass users:', error);
      showToast('Error saving users', 'error');
    }
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    const updatedUsers = pococlassUsers.map(u => {
      if (u.paperlessUserId === selectedUser.paperlessUserId) {
        return {
          ...u,
          enabled: true,
          passwordHash: btoa(newPassword), // Simple base64 encoding - use proper hashing in production!
          failedLoginAttempts: 0
        };
      }
      return u;
    });

    savePococlassUsers(updatedUsers);
    setShowPasswordModal(false);
    showToast(`Password set for ${selectedUser.username}. User enabled.`, 'success');
  };

  const toggleUserEnabled = (user) => {
    const updatedUsers = pococlassUsers.map(u => {
      if (u.paperlessUserId === user.paperlessUserId) {
        if (!u.passwordHash && !u.enabled) { // If enabling, and no password set
          showToast('Cannot enable user without a password. Please set a password first.', 'error');
          return u; // Return original user, don't change state
        }
        return { ...u, enabled: !u.enabled };
      }
      return u;
    });
    savePococlassUsers(updatedUsers);
    showToast(`User ${user.username} ${!user.enabled ? 'enabled' : 'disabled'}`, 'success');
  };

  const resetFailedAttempts = (user) => {
    const updatedUsers = pococlassUsers.map(u => {
      if (u.paperlessUserId === user.paperlessUserId) {
        return { ...u, failedLoginAttempts: 0 };
      }
      return u;
    });
    savePococlassUsers(updatedUsers);
    showToast(`Reset failed login attempts for ${user.username}`, 'success');
  };

  const testPaperlessConnection = async () => {
    // TODO: Implement actual API call to Paperless
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response with custom field names
      const mockCustomFields = {
        customField1: 'Invoice Number',
        customField2: 'Reference ID',
        documentCategory: 'Document Category' // Include documentCategory in mock response
      };
      
      setSettings(prev => ({
        ...prev,
        customFieldNames: mockCustomFields
      }));
      
      setPaperlessConnected(true);
      showToast('Successfully connected to Paperless!', 'success');
      fetchPaperlessUsers(); // Fetch users after successful connection test
    } catch (error) {
      showToast('Failed to connect to Paperless', 'error');
    }
  };

  const initializePaperless = async () => {
    // TODO: Implement full initialization
    try {
      // This would:
      // 1. Test connection to Paperless
      // 2. Fetch all custom field names
      // 3. Fetch correspondents, document types, tags
      // 4. Store them in localStorage for offline use
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response
      const mockCustomFields = {
        customField1: 'Invoice Number',
        customField2: 'Reference ID',
        documentCategory: 'Document Category'
      };
      
      setSettings(prev => ({
        ...prev,
        customFieldNames: mockCustomFields
      }));
      
      setPaperlessConnected(true);
      showToast('Initialization complete! Custom fields and data fetched successfully.', 'success');
      fetchPaperlessUsers(); // Fetch users after successful initialization
    } catch (error) {
      showToast('Initialization failed. Please check your connection settings.', 'error');
    }
  };

  const showToast = (message, type) => {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      variant: type === 'success' ? 'default' : 'destructive',
    });
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('pococlass_settings', JSON.stringify(settings));
      showToast('Settings saved successfully', 'success');
      window.location.reload();
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', 'error');
    }
  };

  const handleLanguageChange = (languageCode) => {
    setSettings(prev => ({
      ...prev,
      language: languageCode
    }));
  };

  const toggleDateFormat = (format) => {
    setSettings(prev => {
      const current = prev.commonDateFormats || [];
      const newFormats = current.includes(format)
        ? current.filter(f => f !== format)
        : [...current, format];
      return {
        ...prev,
        commonDateFormats: newFormats
      };
    });
  };

  const updateFieldMode = (fieldKey, mode) => {
    if (fieldKey === 'title' || fieldKey === 'archiveSerialNumber' || fieldKey === 'storagePath' || fieldKey === 'pocoScore' || fieldKey === 'pocoOcr') {
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      fieldDisplaySettings: {
        ...prev.fieldDisplaySettings,
        [fieldKey]: mode
      }
    }));
  };

  const getFieldLabel = (field) => {
    if (field.isInternal) {
      return `${field.label} (PocoClass Internal)`;
    }
    if (field.isCustom && settings.customFieldNames[field.key]) {
      return `Custom Field: ${settings.customFieldNames[field.key]}`;
    }
    return field.label;
  };

  const allDateFormats = {
    dash: [
      { value: 'DD-MM-YYYY', example: '15-04-2024' },
      { value: 'DD-MMM-YYYY', example: '15-Apr-2024' },
      { value: 'MM-DD-YYYY', example: '04-15-2024' },
      { value: 'YYYY-MM-DD', example: '2024-04-15' },
      { value: 'DD-MM-YY', example: '15-04-24' },
      { value: 'MM-DD-YY', example: '04-15-24' },
      { value: 'YY-MM-DD', example: '24-04-15' }
    ],
    slash: [
      { value: 'DD/MM/YYYY', example: '15/04/2024' },
      { value: 'MM/DD/YYYY', example: '04/15/2024' },
      { value: 'YYYY/MM/DD', example: '2024/04/15' },
      { value: 'D/M/YYYY', example: '5/4/2024' },
      { value: 'M/D/YYYY', example: '4/5/2024' }
    ],
    dot: [
      { value: 'DD.MM.YYYY', example: '15.04.2024' },
      { value: 'MM.DD.YYYY', example: '04.15.2024' },
      { value: 'YYYY.MM.DD', example: '2024.04.15' }
    ],
    space: [
      { value: 'DD MMMM YYYY', example: '15 April 2024' },
      { value: 'MMMM DD, YYYY', example: 'April 15, 2024' },
      { value: 'MMM DD, YYYY', example: 'Apr 15, 2024' },
      { value: 'DD MMM YYYY', example: '15 Apr 2024' },
      { value: 'YYYY MMM DD', example: '2024 Apr 15' },
      { value: 'DDDD DD MMMM YYYY', example: 'Monday 15 April 2024' },
      { value: 'YYYYMMDD', example: '20240415' }
    ]
  };

  const tabs = [
    { id: 'setup', label: 'Setup', icon: Wrench },
    { id: 'general', label: 'General Settings', icon: SettingsIcon },
    { id: 'step1', label: 'Step 1: Basic Information', icon: null },
    { id: 'step2', label: 'Step 2: OCR Identifiers', icon: null },
    { id: 'step3', label: 'Step 3: Document Classifications', icon: null },
    { id: 'step4', label: 'Step 4: Filename Identification', icon: null },
    { id: 'step5', label: 'Step 5: Verification', icon: null },
    { id: 'step6', label: 'Step 6: Review & Summary', icon: null }
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--app-text)' }}>Settings</h1>
          </div>
          <p className="text-gray-600 mt-2">Configure application settings and rule creation options</p>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4 inline mr-2" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <Card>
              <CardContent className="space-y-6 pt-6">
                {/* Paperless Connection */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold">Paperless Connection</h4>
                    {paperlessConnected && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Connected</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Paperless-NGX URL</label>
                      <input
                        type="url"
                        value={settings.paperlessUrl}
                        onChange={(e) => setSettings(prev => ({ ...prev, paperlessUrl: e.target.value }))}
                        placeholder="https://paperless.example.com"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Token</label>
                      <input
                        type="password"
                        value={settings.paperlessToken}
                        onChange={(e) => setSettings(prev => ({ ...prev, paperlessToken: e.target.value }))}
                        placeholder="Enter your Paperless API token"
                        className="form-input"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={testPaperlessConnection} className="btn btn-secondary">
                        Test Connection
                      </Button>
                      <div className="flex-1">
                        <Button onClick={initializePaperless} className="btn btn-primary w-full">
                          Initialize
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Fetches custom field names, correspondents, document types, and tags from Paperless for use in the rule editor
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Setup */}
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold">User Management</h4>
                    </div>
                    <Button onClick={() => fetchPaperlessUsers()} className="btn btn-secondary btn-sm">
                      Fetch Paperless Users
                    </Button>
                  </div>

                  {/* Security Settings */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-sm mb-3">Security Settings</h5>
                    <div className="form-group">
                      <label className="form-label">Maximum Failed Login Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.maxLoginAttempts}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                        className="form-input w-32"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        After this many failed attempts, the user account will be disabled
                      </p>
                    </div>
                  </div>

                  {/* User List */}
                  {pococlassUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No users loaded. Click "Fetch Paperless Users" to load users from your Paperless-NGX instance.</p>
                  ) : (
                    <div className="space-y-3">
                      {pococlassUsers.map((user) => {
                        const isDisabledDueToFailures = user.failedLoginAttempts >= settings.maxLoginAttempts;
                        
                        return (
                          <div 
                            key={user.paperlessUserId}
                            className={`border rounded-lg p-4 ${
                              isDisabledDueToFailures ? 'bg-red-50 border-red-200' :
                              user.enabled ? 'bg-green-50 border-green-200' : 
                              'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-semibold">{user.fullName}</h5>
                                  {user.enabled && (
                                    <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                                      Enabled
                                    </span>
                                  )}
                                  {!user.enabled && user.passwordHash && (
                                    <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded-full">
                                      Disabled
                                    </span>
                                  )}
                                  {isDisabledDueToFailures && (
                                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                                      Locked
                                    </span>
                                  )}
                                  {!user.passwordHash && (
                                    <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                                      Password Not Set
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">@{user.username} • {user.email}</p>
                                {user.failedLoginAttempts > 0 && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Failed login attempts: {user.failedLoginAttempts} / {settings.maxLoginAttempts}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button 
                                  onClick={() => openPasswordModal(user)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  {user.passwordHash ? 'Reset Password' : 'Set Password'}
                                </Button>
                                {user.enabled && (
                                  <Button 
                                    onClick={() => toggleUserEnabled(user)}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    Disable User
                                  </Button>
                                )}
                                {!user.enabled && user.passwordHash && !isDisabledDueToFailures && (
                                  <Button 
                                    onClick={() => toggleUserEnabled(user)}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    Enable User
                                  </Button>
                                )}
                                {user.failedLoginAttempts > 0 && (
                                  <Button 
                                    onClick={() => resetFailedAttempts(user)}
                                    className="btn btn-secondary btn-sm text-blue-600"
                                  >
                                    Reset Attempts
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <Card>
              <CardContent className="space-y-6 pt-6">
                {/* Language */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-semibold">Language</label>
                  </div>
                  <div className="flex gap-2">
                    {languages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                          settings.language === lang.code
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-semibold">Appearance</label>
                  </div>
                  
                  {/* Theme */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-600 mb-2 block">Theme</label>
                    <div className="flex gap-2">
                      {themes.map(({ id, name, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => updateTheme(id)}
                          className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm flex items-center justify-center gap-2 ${
                            theme === id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Blind Mode */}
                  <div>
                    <label className="text-xs text-gray-600 mb-2 block">Color Blind Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {colorBlindModes.map(({ id, name }) => (
                        <button
                          key={id}
                          onClick={() => updateColorBlindMode(id)}
                          className={`px-3 py-2 rounded-lg border transition-colors text-xs ${
                            colorBlindMode === id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Common Date Formats */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-sm font-semibold">Common Date Formats</label>
                    <Tooltip content="Select which date formats appear as quick options throughout the app. You can always enter custom formats when needed." />
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Select formats to show as quick options in date fields and pattern helper
                  </p>
                  <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {/* Dash formats */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">Dash (-)</div>
                      {allDateFormats.dash.map((format) => {
                        const isSelected = settings.commonDateFormats?.includes(format.value);
                        return (
                          <button
                            key={format.value}
                            onClick={() => toggleDateFormat(format.value)}
                            className={`w-full text-left px-2 py-2 rounded border transition-colors text-xs ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-mono font-semibold">{format.value}</div>
                            <div className="text-gray-500 text-[10px] mt-0.5">e.g., {format.example}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Slash formats */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">Slash (/)</div>
                      {allDateFormats.slash.map((format) => {
                        const isSelected = settings.commonDateFormats?.includes(format.value);
                        return (
                          <button
                            key={format.value}
                            onClick={() => toggleDateFormat(format.value)}
                            className={`w-full text-left px-2 py-2 rounded border transition-colors text-xs ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-mono font-semibold">{format.value}</div>
                            <div className="text-gray-500 text-[10px] mt-0.5">e.g., {format.example}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dot formats */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">Dot (.)</div>
                      {allDateFormats.dot.map((format) => {
                        const isSelected = settings.commonDateFormats?.includes(format.value);
                        return (
                          <button
                            key={format.value}
                            onClick={() => toggleDateFormat(format.value)}
                            className={`w-full text-left px-2 py-2 rounded border transition-colors text-xs ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-mono font-semibold">{format.value}</div>
                            <div className="text-gray-500 text-[10px] mt-0.5">e.g., {format.example}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Space/Text formats */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b">Space / Text</div>
                      {allDateFormats.space.map((format) => {
                        const isSelected = settings.commonDateFormats?.includes(format.value);
                        return (
                          <button
                            key={format.value}
                            onClick={() => toggleDateFormat(format.value)}
                            className={`w-full text-left px-2 py-2 rounded border transition-colors text-xs ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-mono font-semibold text-[10px]">{format.value}</div>
                            <div className="text-gray-500 text-[9px] mt-0.5">e.g., {format.example}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {settings.commonDateFormats?.length || 0} format{(settings.commonDateFormats?.length || 0) !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1 Tab */}
          {activeTab === 'step1' && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 italic">Optional settings will be added here</p>
              </CardContent>
            </Card>
          )}

          {/* Step 2 Tab */}
          {activeTab === 'step2' && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 italic">Optional settings will be added here</p>
              </CardContent>
            </Card>
          )}

          {/* Step 3 Tab */}
          {activeTab === 'step3' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold">Paperless Placeholders</h4>
                      <Tooltip content="Configure where each field appears in the rule wizard. Choose between: Disabled (hidden), Predefined Data (static values), Dynamic Extraction (extracted from OCR), or Both (appears in both sections)." />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Configure where each field appears: Disabled, Predefined Data section, Dynamic Extraction section, or both.
                    </p>
                    <div className="space-y-3">
                      {paperlessFields.map((field) => {
                        const currentMode = settings.fieldDisplaySettings[field.key] || 'disabled';
                        const isDisabled = field.key === 'title' || field.key === 'archiveSerialNumber' || field.key === 'storagePath' || field.isInternal;
                        const fieldLabel = getFieldLabel(field);
                        
                        return (
                          <div 
                            key={field.key} 
                            // Changed custom field tag colors from purple to indigo
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              field.isCustom ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium flex items-center gap-2 ${
                              field.isCustom ? 'text-indigo-900' : 'text-gray-900' // Changed custom field text color
                            }`}>
                              {fieldLabel}
                              {isDisabled && !field.isInternal && ( // Modified condition
                                <span className="text-xs text-gray-500 italic">Not supported in this version</span>
                              )}
                              {field.isInternal && ( // Added specific message for internal fields, changed color to indigo
                                <span className="text-xs text-indigo-600 italic">Internal field - auto-populated</span>
                              )}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => !isDisabled && updateFieldMode(field.key, 'disabled')}
                                disabled={isDisabled}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  currentMode === 'disabled'
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                disabled
                              </button>
                              <button
                                onClick={() => !isDisabled && updateFieldMode(field.key, 'predefined')}
                                disabled={isDisabled}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  currentMode === 'predefined'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                predefined
                              </button>
                              <button
                                onClick={() => !isDisabled && updateFieldMode(field.key, 'dynamic')}
                                disabled={isDisabled}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  currentMode === 'dynamic'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                dynamic
                              </button>
                              <button
                                onClick={() => !isDisabled && updateFieldMode(field.key, 'both')}
                                disabled={isDisabled}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  currentMode === 'both'
                                    ? 'bg-purple-600 text-white' // Kept purple for 'both' mode as it's a specific functional tag
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                both
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4 Tab */}
          {activeTab === 'step4' && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 italic">Optional settings will be added here</p>
              </CardContent>
            </Card>
          )}

          {/* Step 5 Tab */}
          {activeTab === 'step5' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The placeholder settings below are configured in Step 3: Document Classifications. 
                      This view shows which placeholders are available for verification based on Step 3 settings.
                      Only placeholders that are <strong>not disabled</strong> in Step 3 will appear here.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold">Available Placeholders for Verification</h4>
                      <Tooltip content="These placeholders can be enabled for verification in Step 5 of the rule wizard. Only placeholders that are enabled (predefined, dynamic, or both) in Step 3 appear here." />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Placeholders available for verification in the rule wizard. To change which placeholders appear here, modify their settings in Step 3.
                    </p>
                    <div className="space-y-3">
                      {paperlessFields.map((field) => {
                        const currentMode = settings.fieldDisplaySettings[field.key] || 'disabled';
                        const isDisabledInStep3 = currentMode === 'disabled';
                        const fieldLabel = getFieldLabel(field);
                        
                        return (
                          <div 
                            key={field.key} 
                            className={`flex items-center justify-between p-3 border rounded-lg ${
                              isDisabledInStep3 ? 'bg-gray-50 border-gray-200 opacity-60' : 
                              field.isCustom ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium flex items-center gap-2 ${
                              isDisabledInStep3 ? 'text-gray-500' :
                              field.isCustom ? 'text-indigo-900' : 'text-gray-900'
                            }`}>
                              {fieldLabel}
                              {isDisabledInStep3 && (
                                <span className="text-xs text-gray-500 italic">Disabled in Step 3</span>
                              )}
                              {!isDisabledInStep3 && (
                                <span className="text-xs text-green-600 italic">Available for verification</span>
                              )}
                            </span>
                            <div className="flex gap-2">
                              <button
                                disabled
                                className={`px-3 py-1 rounded text-xs font-medium cursor-not-allowed ${
                                  isDisabledInStep3
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {isDisabledInStep3 ? 'disabled' : 'enabled'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6 Tab */}
          {activeTab === 'step6' && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500 italic">Optional settings will be added here</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-right">
          <Button onClick={handleSave} className="px-6 py-3 text-lg">Save Changes</Button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Set Password for {selectedUser?.fullName}</h3>
                <p className="text-sm text-gray-500 mt-1">@{selectedUser?.username}</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="modal-body p-6">
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Please provide this password to the user securely. 
                    If lost, you will need to reset it manually.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-3 border-t">
              <Button onClick={() => setShowPasswordModal(false)} className="btn btn-secondary px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100">
                Cancel
              </Button>
              <Button onClick={handleSetPassword} className="btn btn-primary px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
                Set Password & Enable User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
