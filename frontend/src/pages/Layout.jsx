/**
 * @file Layout.jsx
 * @description Application shell layout providing sidebar navigation, header with
 * user info/logout, theme CSS variables (light/dark/colorblind), validation banner,
 * guide modal, and auto-sync on tab visibility. Wraps all authenticated page content.
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Settings, Home, BookOpen, BarChart3, FileStack, LogOut, User as UserIcon, X, AlertTriangle, Activity } from "lucide-react";
import { User } from "@/api/entities";
import { ToastProvider } from "@/components/ToastContainer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { usePOCOFields } from "@/contexts/POCOFieldsContext";
import { useTabVisibility } from "@/components/hooks/useTabVisibility";
import { useToast } from "@/components/ui/use-toast";
import GuardedLink from "@/components/GuardedLink";
import API_BASE_URL from '@/config/api';
import ValidationBanner from '@/components/ValidationBanner';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ErrorBoundary from '@/components/ErrorBoundary';

function LayoutContent({ children }) {
  const location = useLocation();
  const { t } = useLanguage();
  const [showGuide, setShowGuide] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [showPaperlessInfo, setShowPaperlessInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [buildNumber, setBuildNumber] = useState(null);
  const { hasMissingFields } = usePOCOFields();
  const { toast } = useToast();

  const navigationItems = [
    {
      title: t('nav.dashboard'),
      url: createPageUrl("Dashboard"),
      icon: Home,
    },
    {
      title: t('nav.rules'),
      url: createPageUrl("Rules"),
      icon: FileText,
    },
    {
      title: t('nav.ruleEvaluation'),
      url: createPageUrl("RuleReviewer"),
      icon: BarChart3,
    },
    {
      title: t('nav.backgroundProcess'),
      url: createPageUrl("BackgroundProcess"),
      icon: Activity,
      adminOnly: true,
    },
    {
      title: t('nav.logs'),
      url: createPageUrl("Logs"),
      icon: FileStack,
    },
    {
      title: t('nav.settings'),
      url: createPageUrl("Settings"),
      icon: Settings,
    },
  ];

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.build && data.build !== 'dev') {
          setBuildNumber(data.build);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch current user on mount for role-based nav filtering
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("User not logged in or error fetching user:", error);
      setCurrentUser(null);
    }
  };

  // Auto-sync Paperless data when user returns to the browser tab
  const handleTabVisible = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/counts`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.needs_sync) {
          toast({
            title: 'Auto-Sync Triggered',
            description: 'Syncing data from Paperless-ngx...',
            duration: 3000,
          });

          const syncResponse = await fetch(`${API_BASE_URL}/api/sync`, {
            method: 'POST',
            credentials: 'include'
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            toast({
              title: 'Auto-Sync Complete',
              description: `Synced: ${syncData.results?.correspondents || 0} correspondents, ${syncData.results?.tags || 0} tags, ${syncData.results?.document_types || 0} document types`,
              duration: 4000,
            });
          }
        }
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  };

  useTabVisibility(handleTabVisible);

  const isAdmin = currentUser?.role === 'admin';

  // Redirect non-admin users away from admin-only pages (e.g. BackgroundProcess)
  useEffect(() => {
    if (currentUser && !isAdmin) {
      const adminOnlyPaths = [
        createPageUrl('BackgroundProcess')
      ];
      
      if (adminOnlyPaths.includes(location.pathname)) {
        window.location.href = createPageUrl('Dashboard');
      }
    }
  }, [currentUser, isAdmin, location.pathname]);

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  return (
    <ToastProvider>
      <SidebarProvider>
        <style>{`
              :root.light {
                --app-bg: #f8fafc;
                --app-bg-secondary: #f1f5f9;
                --app-surface: #ffffff;
                --app-surface-light: #f1f5f9;
                --app-surface-hover: #e2e8f0;
                --app-text: #1e293b;
                --app-text-secondary: #64748b;
                --app-text-muted: #94a3b8;
                --app-primary: #2563eb;
                --app-primary-hover: #1d4ed8;
                --app-primary-light: #dbeafe;
                --app-primary-light-rgb: 219, 234, 254;
                --app-border: #e2e8f0;
                --app-success: #16a34a;
                --app-success-rgb: 22, 163, 74;
                --app-warning: #d97706;
                --app-danger: #dc2626;
                --app-danger-rgb: 220, 38, 38;
                --info-bg: #eff6ff;
                --info-border: #bfdbfe;
                --info-text: #1e40af;
                --info-yellow-bg: #fefce8;
                --info-yellow-border: #fde047;
                --info-yellow-text: #a16207;
                --input-bg: #f9fafb;
                --input-border: #d1d5db;
                --input-text: #1f2937;
                --input-focus-bg: #ffffff;
                --input-focus-border: #3b82f6;
              }

              :root.dark {
                --app-bg: #0f172a;
                --app-bg-secondary: #1e293b;
                --app-surface: #1e293b;
                --app-surface-light: #334155;
                --app-surface-hover: #475569;
                --app-text: #f1f5f9;
                --app-text-secondary: #cbd5e1;
                --app-text-muted: #94a3b8;
                --app-primary: #1e40af;
                --app-primary-hover: #1e3a8a;
                --app-primary-light: #1e293b;
                --app-primary-light-rgb: 30, 41, 59;
                --app-border: #334155;
                --app-success: #22c55e;
                --app-success-rgb: 34, 197, 94;
                --app-warning: #f59e0b;
                --app-danger: #991b1b;
                --app-danger-rgb: 153, 27, 27;
                --info-bg: rgba(37, 99, 235, 0.1);
                --info-border: rgba(59, 130, 246, 0.3);
                --info-text: #93c5fd;
                --info-yellow-bg: #422006;
                --info-yellow-border: #92400e;
                --info-yellow-text: #fbbf24;
                --input-bg: #1e293b;
                --input-border: #475569;
                --input-text: #f1f5f9;
                --input-focus-bg: #334155;
                --input-focus-border: #1e40af;
              }

              :root.protanopia {
                --app-success: #0ea5e9;
                --app-success-rgb: 14, 165, 233;
                --app-danger: #f97316;
                --app-danger-rgb: 249, 115, 22;
                --app-warning: #8b5cf6;
              }

              :root.deuteranopia {
                --app-success: #06b6d4;
                --app-success-rgb: 6, 182, 212;
                --app-danger: #f59e0b;
                --app-danger-rgb: 245, 158, 11;
                --app-warning: #8b5cf6;
              }

              :root.tritanopia {
                --app-success: #ec4899;
                --app-success-rgb: 236, 72, 153;
                --app-danger: #ef4444;
                --app-danger-rgb: 239, 68, 68;
                --app-warning: #06b6d4;
              }
              
              body {
                background-color: var(--app-bg);
                color: var(--app-text);
                transition: background-color 0.3s, color 0.3s;
              }
              
              .wizard-container {
                background: var(--app-surface);
                border-radius: 12px;
                border: 1px solid var(--app-border);
                padding: 32px;
                margin: 24px;
              }
              
              .info-box {
                padding: 16px;
                border-radius: 8px;
                border: 1px solid;
                margin: 16px 0;
              }
              
              .info-box-yellow {
                background: var(--info-yellow-bg);
                border-color: var(--info-yellow-border);
                color: var(--info-yellow-text);
              }
              
              .info-box-blue {
                background: var(--app-primary-light);
                border-color: var(--app-primary);
                color: var(--app-text);
              }
              
              .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 10px 16px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 500;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.2s;
                text-decoration: none;
              }
              
              .btn-primary {
                background: var(--app-primary);
                color: white;
                border-color: var(--app-primary);
              }
              
              .btn-primary:hover {
                background: var(--app-primary-hover);
              }
              
              .btn-secondary {
                background: var(--app-surface);
                color: var(--app-text);
                border-color: var(--app-border);
              }
              
              .btn-secondary:hover {
                background: var(--app-surface-hover);
              }
              
              .btn-outline {
                background: transparent;
                color: var(--app-primary);
                border-color: var(--app-primary);
              }
              
              .btn-ghost {
                background: transparent;
                color: var(--app-text-secondary);
                border-color: transparent;
              }
              
              .btn-ghost:hover {
                background: var(--app-surface-hover);
              }
              
              .btn-sm {
                padding: 6px 12px;
                font-size: 0.8125rem;
              }
              
              .form-group {
                margin-bottom: 28px;
              }

              .form-label {
                display: block;
                font-size: 1rem;
                font-weight: 600;
                color: var(--app-text);
                margin-bottom: 14px;
                letter-spacing: -0.01em;
              }
              
              .card {
                background: var(--app-surface);
                border: 1px solid var(--app-border);
                border-radius: 8px;
                padding: 20px;
              }

              .summary-box {
                background-color: var(--app-primary-light);
                border: 1px solid var(--app-primary);
                color: var(--app-primary);
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
              }

              .extraction-anchor-box {
                border: 2px dashed var(--app-primary);
                padding: 8px;
                margin: 4px 0;
                border-radius: 4px;
                background-color: rgba(var(--app-primary-light-rgb), 0.5);
              }
              .extraction-anchor-box-start {
                  border-color: var(--app-success);
                  background-color: rgba(var(--app-success-rgb), 0.3);
              }
              .extraction-anchor-box-end {
                  border-color: var(--app-danger);
                  background-color: rgba(var(--app-danger-rgb), 0.3);
              }

              .step-section {
                padding: 24px;
                background: var(--app-surface-light);
                border-radius: 8px;
                margin-top: 16px;
                border: 1px solid var(--app-border);
              }
              .step-section-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: var(--app-text);
                margin-bottom: 16px;
              }

              .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
              }

              .modal-content {
                background: var(--app-surface);
                border-radius: 12px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              }

              .modal-header {
                padding: 24px;
                border-bottom: 1px solid var(--app-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
              }

              .modal-body {
                padding: 32px 36px;
              }

              .guide-section {
                margin-bottom: 40px;
                padding-top: 8px;
              }

              .guide-section:not(:first-child) {
                border-top: 1px solid var(--app-border);
                padding-top: 32px;
              }

              .guide-section h3 {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--app-text);
                margin-bottom: 16px;
                padding-bottom: 8px;
                border-bottom: 2px solid var(--app-primary);
                display: inline-block;
              }

              .guide-section h4 {
                font-size: 1.05rem;
                font-weight: 600;
                color: var(--app-text);
                margin-top: 28px;
                margin-bottom: 12px;
                padding-left: 12px;
                border-left: 3px solid var(--app-primary-light);
              }

              .guide-section p {
                color: var(--app-text-secondary);
                line-height: 1.7;
                margin-bottom: 16px;
              }

              .guide-section ul {
                list-style: disc;
                margin-left: 24px;
                margin-bottom: 16px;
                color: var(--app-text-secondary);
              }

              .guide-section li {
                margin-bottom: 10px;
                line-height: 1.7;
              }

              .guide-workflow {
                background: var(--app-surface-light);
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
              }

              .guide-step {
                display: flex;
                align-items: start;
                gap: 14px;
                margin-bottom: 16px;
              }

              .guide-step-number {
                background: var(--app-primary);
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.9rem;
                flex-shrink: 0;
              }

              .guide-step-content {
                flex: 1;
                padding-top: 4px;
              }

              .guide-highlight {
                background: var(--app-primary-light);
                border-left: 3px solid var(--app-primary);
                padding: 16px 20px;
                margin: 20px 0;
                border-radius: 4px;
              }
            `}</style>
            <div className="min-h-screen flex w-full">
              <Sidebar style={{ borderRight: '1px solid var(--app-border)' }}>
                <SidebarHeader className="px-3" style={{ borderBottom: '1px solid var(--app-border)', paddingTop: 'calc(1rem - 5px)', paddingBottom: 'calc(1rem - 5px)' }}>
                  <div className="flex flex-col items-start gap-0">
                    <div className="flex items-start justify-start w-full">
                      <img src="/logo.png" alt="PocoClass Logo" className="h-14 w-auto" />
                    </div>
                    <div className="flex items-center gap-2" style={{ marginLeft: '41px', marginTop: '2px' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--app-text-secondary)' }}>Document Classification</p>
                      <span className="text-xs font-semibold" style={{ color: 'var(--app-text-muted)' }}>v2.0{buildNumber ? ` · #${buildNumber}` : ''}</span>
                    </div>
                  </div>
                </SidebarHeader>
                
                <SidebarContent className="p-2 flex flex-col h-full">
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider px-2 py-2" style={{ color: 'var(--app-text-secondary)' }}>
                      Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {navigationItems.map((item) => {
                          // Hide admin-only items for non-admin users
                          if (item.adminOnly && !isAdmin) {
                            return null;
                          }
                          
                          const isActive = location.pathname === item.url;
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton 
                                asChild 
                                className="transition-colors duration-200 rounded-lg mb-1"
                                style={isActive ? { 
                                  backgroundColor: 'var(--app-primary-light)', 
                                  color: 'var(--app-primary)' 
                                } : {}}
                                onMouseEnter={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'var(--app-primary-light)';
                                    e.currentTarget.style.color = 'var(--app-primary)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.color = '';
                                  }
                                }}
                              >
                                <GuardedLink to={item.url} className="flex items-center gap-3 px-3 py-2">
                                  <item.icon className="w-4 h-4" />
                                  <span className="font-medium">{item.title}</span>
                                  {item.title === 'Settings' && hasMissingFields && (
                                    <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" title="POCO fields missing" />
                                  )}
                                </GuardedLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            onClick={() => setShowGuide(true)}
                            className="transition-colors duration-200 rounded-lg mb-1 cursor-pointer"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--app-primary-light)';
                              e.currentTarget.style.color = 'var(--app-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '';
                              e.currentTarget.style.color = '';
                            }}
                          >
                            <div className="flex items-center gap-3 px-3 py-2 w-full" data-guide-trigger="true">
                              <BookOpen className="w-4 h-4" />
                              <span className="font-medium">{t('nav.guide')}</span>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>

                  {currentUser && (
                    <SidebarGroup className="mt-auto">
                      <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider px-2 py-2" style={{ color: 'var(--app-text-secondary)' }}>
                        User
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <div className="flex items-center gap-3 px-3 py-2 text-sm">
                              <UserIcon className="w-4 h-4" style={{ color: 'var(--app-text-secondary)' }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" style={{ color: 'var(--app-text)' }}>{currentUser.full_name}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--app-text-secondary)' }}>{currentUser.email}</p>
                              </div>
                            </div>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton 
                              onClick={handleLogout}
                              className="transition-colors duration-200 rounded-lg cursor-pointer"
                              style={{ 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                color: '#dc2626' 
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.color = '#b91c1c';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.color = '#dc2626';
                              }}
                            >
                              <div className="flex items-center gap-3 px-3 py-2 w-full">
                                <LogOut className="w-4 h-4" />
                                <span className="font-medium">{t('nav.logout')}</span>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  )}
                </SidebarContent>
              </Sidebar>

              <main className="flex-1 flex flex-col">
                <ValidationBanner />
                <header className="px-6 py-4 md:hidden" style={{ backgroundColor: 'var(--app-surface)', borderBottom: '1px solid var(--app-border)' }}>
                  <div className="flex items-center gap-4">
                    <SidebarTrigger 
                      className="p-2 rounded-lg transition-colors duration-200" 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    />
                    <h1 className="text-xl font-semibold">PocoClass</h1>
                  </div>
                </header>
                <div className="flex-1 overflow-auto">
                  {children}
                </div>
              </main>
            </div>

            {showGuide && (
              <div className="modal-overlay" onClick={() => setShowGuide(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('guide.title')}</h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>{t('guide.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowGuide(false);
                          setShowQuickGuide(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        {t('nav.quickStart')}
                      </button>
                      <button 
                        onClick={() => setShowGuide(false)}
                        className="transition-colors"
                        style={{ color: 'var(--app-text-muted)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--app-text-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--app-text-muted)'}
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-body">
                    <div className="guide-section">
                      <h3>{t('guide.introduction.title')}</h3>
                      <p>
                        {t('guide.introduction.p1')}
                      </p>
                      <p>
                        {t('guide.introduction.p2')}
                      </p>
                      <div style={{
                        backgroundColor: '#fef9c3',
                        border: '1px solid #eab308',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}>
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p style={{ margin: 0, fontSize: '13px', color: '#854d0e' }}>
                          {t('guide.introduction.paperlessTip')}{' '}
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowPaperlessInfo(true); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#1d4ed8',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              font: 'inherit',
                              fontSize: '13px'
                            }}
                          >
                            {t('guide.introduction.paperlessTipLink')}
                          </button>
                        </p>
                      </div>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.howItWorks.title')}</h3>
                      <p>
                        {t('guide.howItWorks.intro')}
                      </p>
                      
                      <div className="guide-workflow">
                        <div className="guide-step">
                          <div className="guide-step-number">1</div>
                          <div className="guide-step-content">
                            <strong>{t('guide.howItWorks.step1Title')}</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              {t('guide.howItWorks.step1Desc')}
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">2</div>
                          <div className="guide-step-content">
                            <strong>{t('guide.howItWorks.step2Title')}</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              {t('guide.howItWorks.step2Desc')}
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">3</div>
                          <div className="guide-step-content">
                            <strong>{t('guide.howItWorks.step3Title')}</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              {t('guide.howItWorks.step3Desc')}
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">4</div>
                          <div className="guide-step-content">
                            <strong>{t('guide.howItWorks.step4Title')}</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              {t('guide.howItWorks.step4Desc')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="guide-highlight">
                        <strong>{t('guide.howItWorks.autoProcessingTitle')}</strong>
                        <p>{t('guide.howItWorks.autoProcessingDesc')}</p>
                      </div>

                      <h4>{t('guide.howItWorks.whatCanEditTitle')}</h4>
                      <p>
                        {t('guide.howItWorks.whatCanEditIntro')}
                      </p>
                      <ul>
                        <li><strong>{t('guide.howItWorks.correspondent')}</strong> - {t('guide.howItWorks.correspondentDesc')}</li>
                        <li><strong>{t('guide.howItWorks.documentType')}</strong> - {t('guide.howItWorks.documentTypeDesc')}</li>
                        <li><strong>{t('guide.howItWorks.tags')}</strong> - {t('guide.howItWorks.tagsDesc')}</li>
                        <li><strong>{t('guide.howItWorks.customFields')}</strong> - {t('guide.howItWorks.customFieldsDesc')}</li>
                      </ul>
                      <p>
                        {t('guide.howItWorks.updatesNote')}
                      </p>

                    </div>

                    <div className="guide-section">
                      <h3 id="guide-scoring-system">{t('guide.scoring.title')}</h3>
                      <p>
                        {t('guide.scoring.intro')}
                      </p>
                      <p>
                        {t('guide.scoring.twoScoresIntro')}
                      </p>

                      <h4>{t('guide.scoring.ocrScoreTitle')}</h4>
                      <p>
                        {t('guide.scoring.ocrScoreDesc')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.ocrScorePoint1') }} />
                        <li>{t('guide.scoring.ocrScorePoint2')}</li>
                      </ul>
                      <p>
                        {t('guide.scoring.ocrScoreNote')}
                      </p>

                      <h4>{t('guide.scoring.pocoScoreTitle')}</h4>
                      <p>
                        {t('guide.scoring.pocoScoreIntro')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.pocoScorePoint1') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.pocoScorePoint2') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.pocoScorePoint3') }} />
                      </ul>
                      <p style={{ fontFamily: 'monospace', backgroundColor: 'var(--app-bg)', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', marginTop: '12px' }}>
                        {t('guide.scoring.pocoScoreFormula')}
                      </p>
                      <p dangerouslySetInnerHTML={{ __html: t('guide.scoring.pocoScoreNote') }} />

                      <h4>{t('guide.scoring.calculationTitle')}</h4>
                      <p>
                        {t('guide.scoring.calculationIntro')}
                      </p>
                      <p style={{ fontFamily: 'monospace', backgroundColor: 'var(--app-bg)', padding: '8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                        {t('guide.scoring.calculationFormula')}
                      </p>
                      <p>
                        {t('guide.scoring.calculationEnsures')}
                      </p>
                      <ul>
                        <li>{t('guide.scoring.calculationPoint1')}</li>
                        <li>{t('guide.scoring.calculationPoint2')}</li>
                        <li>{t('guide.scoring.calculationPoint3')}</li>
                      </ul>
                      <h4>{t('guide.scoring.multipliersTitle')}</h4>
                      <p>
                        {t('guide.scoring.multipliersIntro')}
                      </p>
                      <p><strong>{t('guide.scoring.defaultMultipliers')}</strong></p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.ocrMultiplier') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.filenameMultiplier') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.classificationsMultiplier') }} />
                      </ul>
                      <p><strong>{t('guide.scoring.whenToAdjust')}</strong></p>
                      <ul>
                        <li>{t('guide.scoring.adjustPoint1')}</li>
                        <li>{t('guide.scoring.adjustPoint2')}</li>
                        <li>{t('guide.scoring.adjustPoint3')}</li>
                      </ul>

                      <details style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: '500', color: 'var(--app-text-primary)' }}>
                          {t('guide.scoring.examplesTitle')}
                        </summary>
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--app-border)' }}>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.examplesThresholdNote') }} />

                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>{t('guide.scoring.example1Title')}</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                            <li>{t('guide.scoring.example1OCR')}</li>
                            <li>{t('guide.scoring.example1Filename')}</li>
                            <li>{t('guide.scoring.example1Paperless')}</li>
                            <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example1Total') }} />
                          </ul>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--app-text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example1Result') }} />

                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>{t('guide.scoring.example2Title')}</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                            <li>{t('guide.scoring.example2OCR')}</li>
                            <li>{t('guide.scoring.example2Filename')}</li>
                            <li>{t('guide.scoring.example2Paperless')}</li>
                            <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example2Total') }} />
                          </ul>
                          <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example2Result') }} />

                          <p style={{ fontSize: '0.9rem', marginTop: '16px', marginBottom: '16px' }}>
                            <strong>{t('guide.scoring.example3Title')}</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                            <li>{t('guide.scoring.example3OCR')}</li>
                            <li>{t('guide.scoring.example3Filename')}</li>
                            <li>{t('guide.scoring.example3Paperless')}</li>
                            <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example3Total') }} />
                          </ul>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--app-text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('guide.scoring.example3Result') }} />

                          <p style={{ fontSize: '0.9rem', marginTop: '16px', marginBottom: '8px' }}>
                            <strong>{t('guide.scoring.ruleOfThumb')}</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                            <li>{t('guide.scoring.ruleOfThumbPoint1')}</li>
                            <li>{t('guide.scoring.ruleOfThumbPoint2')}</li>
                            <li>{t('guide.scoring.ruleOfThumbPoint3')}</li>
                          </ul>
                        </div>
                      </details>

                      <h4 style={{ marginTop: '24px' }}>{t('guide.scoring.whereStoredTitle')}</h4>
                      <p>
                        {t('guide.scoring.whereStoredIntro')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.whereStoredScore') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.whereStoredOCR') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.whereStoredPlus') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.scoring.whereStoredMinus') }} />
                      </ul>
                      <div className="guide-highlight" style={{ marginTop: '16px' }}>
                        <strong>{t('guide.scoring.documentNotesTitle')}</strong>
                        <p>{t('guide.scoring.documentNotesDesc')}</p>
                      </div>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.setup.title')}</h3>
                      <p>
                        {t('guide.setup.intro')}
                      </p>

                      <h4>{t('guide.setup.requiredTitle')}</h4>
                      <p><strong>{t('guide.setup.customFieldsLabel')}</strong></p>
                      <ul>
                        <li><strong style={{ color: 'var(--app-primary)' }}>{t('guide.setup.pocoScoreRequired')}</strong> - {t('guide.setup.pocoScoreDesc')}</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>{t('guide.setup.pocoOCROptional')}</strong> - {t('guide.setup.pocoOCRDesc')}</li>
                      </ul>
                      <p style={{ marginTop: '12px' }}><strong>{t('guide.setup.tagsLabel')}</strong></p>
                      <ul>
                        <li><strong style={{ color: 'var(--app-primary)' }}>{t('guide.setup.newTagRequired')}</strong> - {t('guide.setup.newTagDesc')}</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>{t('guide.setup.plusTagRequired')}</strong> - {t('guide.setup.plusTagDesc')}</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>{t('guide.setup.minusTagRequired')}</strong> - {t('guide.setup.minusTagDesc')}</li>
                      </ul>
                      <p style={{ marginTop: '12px' }}>
                        {t('guide.setup.managedIn')}{' '}
                        <button 
                          onClick={() => {
                            sessionStorage.setItem('settings_active_tab', 'validation');
                            window.location.href = createPageUrl('Settings');
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <FileText className="w-4 h-4" />
                          {t('guide.setup.dataValidation')}
                        </button>
                      </p>

                      <h4>{t('guide.setup.syncArchTitle')}</h4>
                      <p>
                        {t('guide.setup.syncArchDesc')}
                      </p>

                      <h4>{t('guide.setup.autoSyncTitle')}</h4>
                      <p>
                        {t('guide.setup.autoSyncDesc')}
                      </p>
                      <p>
                        {t('guide.setup.forceSyncNote')}{' '}
                        <button 
                          onClick={() => {
                            sessionStorage.setItem('settings_active_tab', 'system');
                            window.location.href = createPageUrl('Settings');
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <Settings className="w-4 h-4" />
                          {t('guide.setup.system')}
                        </button>
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.buildingRules.title')}</h3>
                      <p>
                        {t('guide.buildingRules.intro')}
                      </p>
                      <p>
                        {t('guide.buildingRules.wizardIntro')}
                      </p>
                      
                      <h4>{t('guide.buildingRules.step1Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step1Intro')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.ruleName') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.ruleId') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.description') }} />
                      </ul>
                      <p>
                        {t('guide.buildingRules.step1Note')}
                      </p>

                      <h4>{t('guide.buildingRules.step2Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step2Intro')}
                      </p>
                      <p><strong>{t('guide.buildingRules.whatCanMatch')}</strong></p>
                      <ul>
                        <li>{t('guide.buildingRules.matchOrgNames')}</li>
                        <li>{t('guide.buildingRules.matchKeywords')}</li>
                        <li>{t('guide.buildingRules.matchRefNumbers')}</li>
                        <li>{t('guide.buildingRules.matchDates')}</li>
                      </ul>
                      <p><strong>{t('guide.buildingRules.howItWorksLabel')}</strong></p>
                      <ul>
                        <li>{t('guide.buildingRules.add3to10')}</li>
                        <li>{t('guide.buildingRules.chooseMatch')}</li>
                        <li>{t('guide.buildingRules.setOCRThreshold')}</li>
                      </ul>
                      <p>
                        {t('guide.buildingRules.ocrContinueNote')}
                      </p>
                      <p id="guide-regex-support"><strong>{t('guide.buildingRules.regexSupport')}</strong></p>
                      <p>
                        {t('guide.buildingRules.regexIntro')}
                      </p>
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <p><strong>{t('guide.buildingRules.examplesLabel')}</strong></p>
                        <ul style={{ fontSize: '0.9rem' }}>
                          <li><code>/invoice/i</code> – {t('guide.buildingRules.regexExample1')}</li>
                          <li><code>/\d{'{4}'}-\d{'{2}'}-\d{'{2}'}/</code> – {t('guide.buildingRules.regexExample2')}</li>
                          <li><code>/Visa|Mastercard/i</code> – {t('guide.buildingRules.regexExample3')}</li>
                        </ul>
                        <p style={{ fontSize: '0.9rem', marginTop: '8px', marginBottom: '0' }}>{t('guide.buildingRules.regexOptionalNote')}</p>
                      </div>

                      <div className="info-box info-box-yellow" style={{ marginTop: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.regexBuilderTip') }} />
                      </div>

                      <h4>{t('guide.buildingRules.step3Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step3Intro')}
                      </p>
                      <p><strong>{t('guide.buildingRules.exampleFilename')}</strong>: <code>2024-01-Bank-Statement.pdf</code></p>
                      <p><strong>{t('guide.buildingRules.possiblePatterns')}</strong></p>
                      <ul style={{ fontSize: '0.9rem' }}>
                        <li><code>/Bank/i</code></li>
                        <li><code>/Statement/i</code></li>
                        <li><code>/2024/i</code></li>
                      </ul>
                      <p><strong>{t('guide.buildingRules.keyPoints')}</strong></p>
                      <ul>
                        <li>{t('guide.buildingRules.filenameOptional')}</li>
                        <li>{t('guide.buildingRules.filenameAfterOCR')}</li>
                        <li>{t('guide.buildingRules.filenameMultiplierNote')}</li>
                      </ul>

                      <h4>{t('guide.buildingRules.step4Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step4Intro')}
                      </p>
                      <p>{t('guide.buildingRules.youCanAdjust')}</p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.ocrThreshold') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.pocoThreshold') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.ocrMultiplierConfig') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.filenameMultiplierConfig') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.classificationMultiplierConfig') }} />
                      </ul>
                      <p>
                        {t('guide.buildingRules.step4Note')}
                      </p>

                      <h4 id="guide-metadata-step">{t('guide.buildingRules.step5Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step5Intro')}
                      </p>
                      <p><strong>{t('guide.buildingRules.staticClassifications')}</strong></p>
                      <p>
                        {t('guide.buildingRules.staticDesc')}
                      </p>
                      <ul>
                        <li>{t('guide.buildingRules.staticCorrespondent')}</li>
                        <li>{t('guide.buildingRules.staticDocType')}</li>
                        <li>{t('guide.buildingRules.staticTags')}</li>
                        <li>{t('guide.buildingRules.staticCustomFields')}</li>
                      </ul>
                      <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.staticExample') }} />
                      <p><strong>{t('guide.buildingRules.dynamicClassifications')}</strong></p>
                      <p>
                        {t('guide.buildingRules.dynamicDesc')}
                      </p>
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                          <strong>{t('guide.buildingRules.dynamicExampleTitle')}</strong>: {t('guide.buildingRules.dynamicExampleIntro')}
                        </p>
                        
                        <p style={{ fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>{t('guide.buildingRules.simulatedOCR')}</p>
                        <div style={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #ddd',
                          padding: '12px',
                          borderRadius: '4px',
                          fontFamily: 'Georgia, serif',
                          fontSize: '0.95rem',
                          color: '#000',
                          marginBottom: '12px',
                          lineHeight: '1.6'
                        }}>
                          Thank you for your business. <span style={{ backgroundColor: '#ffeb3b', padding: '2px 4px' }}>Inv: </span><span style={{ backgroundColor: '#81c784', padding: '2px 4px', fontWeight: 'bold' }}>INV-2024-0547</span> <span style={{ backgroundColor: '#ff9800', padding: '2px 4px' }}>has been generated</span> for your case. Please keep this for your records.
                        </div>
                        
                        <ul style={{ fontSize: '0.9rem' }}>
                          <li>{t('guide.buildingRules.beforeAnchor')} <span style={{ backgroundColor: '#ffeb3b', padding: '2px 4px' }}>Inv: </span></li>
                          <li>{t('guide.buildingRules.textToExtract')} <span style={{ backgroundColor: '#81c784', padding: '2px 4px', color: '#fff', fontWeight: 'bold' }}>INV-2024-0547</span></li>
                          <li>{t('guide.buildingRules.afterAnchor')} <span style={{ backgroundColor: '#ff9800', padding: '2px 4px', color: '#fff' }}>has been generated</span></li>
                        </ul>
                      </div>

                      <h4>{t('guide.buildingRules.step6Title')}</h4>
                      <p>
                        {t('guide.buildingRules.step6Intro')}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }} dangerouslySetInnerHTML={{ __html: t('guide.buildingRules.step6Example') }} />
                      <p>
                        {t('guide.buildingRules.step6Note')}
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.testing.title')}</h3>
                      <p>
                        {t('guide.testing.intro')}
                      </p>
                      
                      <h4>{t('guide.testing.twoTypesTitle')}</h4>
                      
                      <p><strong>{t('guide.testing.dryRunTitle')}</strong> {t('guide.testing.dryRunSubtitle')}</p>
                      <p>{t('guide.testing.dryRunQuestion')}</p>
                      <ul>
                        <li>{t('guide.testing.dryRunPoint1')}</li>
                        <li>{t('guide.testing.dryRunPoint2')}</li>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.dryRunPoint3') }} />
                        <li>{t('guide.testing.dryRunPoint4')}</li>
                      </ul>

                      <p><strong>{t('guide.testing.fullRunTitle')}</strong> {t('guide.testing.fullRunSubtitle')}</p>
                      <p>{t('guide.testing.fullRunQuestion')}</p>
                      <ul>
                        <li>{t('guide.testing.fullRunPoint1')}</li>
                        <li>{t('guide.testing.fullRunPoint2')}</li>
                        <li>{t('guide.testing.fullRunPoint3')}</li>
                        <li>{t('guide.testing.fullRunPoint4')}</li>
                      </ul>

                      <h4>{t('guide.testing.understandingTitle')}</h4>
                      <p>{t('guide.testing.understandingIntro')}</p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultDocument') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultMatched') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultOCR') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultPOCO') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultClassification') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.testing.resultApplied') }} />
                      </ul>
                      <div className="guide-highlight">
                        <strong>{t('guide.testing.scoresExplainedTitle')}</strong>
                        <ul>
                          <li dangerouslySetInnerHTML={{ __html: t('guide.testing.scoresOCR') }} />
                          <li dangerouslySetInnerHTML={{ __html: t('guide.testing.scoresPOCO') }} />
                          <li>{t('guide.testing.scoresTrigger')}</li>
                        </ul>
                      </div>
                      <p>
                        {t('guide.testing.barChartIntro')}
                      </p>
                      <ul>
                        <li>{t('guide.testing.barBlue')}</li>
                        <li>{t('guide.testing.barGreen')}</li>
                        <li>{t('guide.testing.barOrange')}</li>
                      </ul>
                      <p>{t('guide.testing.barNote')}</p>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.backgroundProcessing.title')}</h3>
                      <p>
                        {t('guide.backgroundProcessing.intro')}
                      </p>
                      
                      <h4>{t('guide.backgroundProcessing.howItWorksTitle')}</h4>
                      <p>{t('guide.backgroundProcessing.howItWorksIntro')}</p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.step1') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.step2') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.step3') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.step4') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.step5') }} />
                      </ul>

                      <div className="info-box info-box-yellow" style={{ marginTop: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.tipNewTag') }} />
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: t('guide.backgroundProcessing.tipLocation') }} />
                        <button
                          onClick={() => {
                            sessionStorage.setItem('settings_active_tab', 'backgroundProcessing');
                            setShowGuide(false);
                            window.location.href = createPageUrl("Settings");
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: '12px' }}
                        >
                          <Settings className="w-4 h-4" />
                          {t('guide.backgroundProcessing.openSettings')}
                        </button>
                      </div>

                      <h4>{t('guide.backgroundProcessing.modesTitle')}</h4>
                      <p><strong>{t('guide.backgroundProcessing.automaticMode')}</strong></p>
                      <ul>
                        <li>{t('guide.backgroundProcessing.automaticPoint1')}</li>
                        <li>{t('guide.backgroundProcessing.automaticPoint2')}</li>
                        <li>{t('guide.backgroundProcessing.automaticPoint3')}</li>
                        <li>{t('guide.backgroundProcessing.automaticPoint4')}</li>
                      </ul>

                      <p><strong>{t('guide.backgroundProcessing.triggerMode')}</strong></p>
                      <ul>
                        <li>{t('guide.backgroundProcessing.triggerPoint1')}</li>
                        <li>{t('guide.backgroundProcessing.triggerPoint2')}</li>
                        <li>{t('guide.backgroundProcessing.triggerPoint3')}</li>
                      </ul>

                      <p><strong>{t('guide.backgroundProcessing.dryRunMode')}</strong></p>
                      <ul>
                        <li>{t('guide.backgroundProcessing.dryRunPoint1')}</li>
                        <li>{t('guide.backgroundProcessing.dryRunPoint2')}</li>
                      </ul>

                      <h4>{t('guide.backgroundProcessing.historyTitle')}</h4>
                      <p>{t('guide.backgroundProcessing.historyIntro')}</p>
                      <p><strong>{t('guide.backgroundProcessing.summaryView')}</strong></p>
                      <ul>
                        <li>{t('guide.backgroundProcessing.summaryPoint1')}</li>
                        <li>{t('guide.backgroundProcessing.summaryPoint2')}</li>
                        <li>{t('guide.backgroundProcessing.summaryPoint3')}</li>
                        <li>{t('guide.backgroundProcessing.summaryPoint4')}</li>
                      </ul>
                      <p><strong>{t('guide.backgroundProcessing.detailView')}</strong></p>
                      <ul>
                        <li>{t('guide.backgroundProcessing.detailPoint1')}</li>
                        <li>{t('guide.backgroundProcessing.detailPoint2')}</li>
                        <li>{t('guide.backgroundProcessing.detailPoint3')}</li>
                        <li>{t('guide.backgroundProcessing.detailPoint4')}</li>
                        <li>{t('guide.backgroundProcessing.detailPoint5')}</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>{t('guide.aboutName.title')}</h3>
                      <p dangerouslySetInnerHTML={{ __html: t('guide.aboutName.p1') }} />
                      <p>
                        {t('guide.aboutName.p2')}
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {showPaperlessInfo && (
              <div className="modal-overlay" onClick={() => setShowPaperlessInfo(false)} style={{ zIndex: 10000 }}>
                <div onClick={(e) => e.stopPropagation()} style={{
                  backgroundColor: 'var(--app-card-bg, white)',
                  borderRadius: '12px',
                  padding: '32px',
                  maxWidth: '600px',
                  width: '90%',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setShowPaperlessInfo(false)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--app-text-secondary)'
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--app-text)' }}>
                    {t('guide.introduction.paperlessPopupTitle')}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
                    {t('guide.introduction.paperlessPopupP1')}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
                    {t('guide.introduction.paperlessPopupP2')}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
                    {t('guide.introduction.paperlessPopupP3')}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
                    {t('guide.introduction.paperlessPopupP4')}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
                    {t('guide.introduction.paperlessPopupP5')}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <a
                      href="https://docs.paperless-ngx.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {t('guide.introduction.paperlessVisitSite')} ↗
                    </a>
                    <button
                      onClick={() => setShowPaperlessInfo(false)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--app-hover-bg, #f3f4f6)',
                        color: 'var(--app-text)',
                        borderRadius: '6px',
                        border: '1px solid var(--app-border-color, #e5e7eb)',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t('guide.introduction.paperlessClose')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showQuickGuide && (
              <div className="modal-overlay" onClick={() => setShowQuickGuide(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('quickStart.title')}</h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>{t('quickStart.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowQuickGuide(false);
                          setShowGuide(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        {t('nav.guide')}
                      </button>
                      <button 
                        onClick={() => setShowQuickGuide(false)}
                        className="transition-colors"
                        style={{ color: 'var(--app-text-muted)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--app-text-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--app-text-muted)'}
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-body">
                    <div className="guide-section">
                      <h3>{t('quickStart.howItWorks.title')}</h3>
                      <p>
                        {t('quickStart.howItWorks.description')}
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>{t('quickStart.minimumSetup.title')}</h3>
                      <p>
                        {t('quickStart.minimumSetup.intro')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.pocoScore') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.pocoOCR') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.newTag') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.plusTag') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.minusTag') }} />
                      </ul>
                      <p dangerouslySetInnerHTML={{ __html: t('quickStart.minimumSetup.checkSettings') }} />
                    </div>

                    <div className="guide-section">
                      <h3>{t('quickStart.scoring.title')}</h3>
                      <p>
                        {t('quickStart.scoring.intro')}
                      </p>
                      <ul>
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.scoring.ocrScore') }} />
                        <li dangerouslySetInnerHTML={{ __html: t('quickStart.scoring.pocoScore') }} />
                      </ul>
                      <p dangerouslySetInnerHTML={{ __html: t('quickStart.scoring.result') }} />
                      <div className="info-box info-box-blue">
                        <h4 style={{ marginTop: 0 }}>{t('quickStart.scoring.formulaTitle')}</h4>
                        <p><code>{t('quickStart.scoring.formula')}</code></p>
                        <p dangerouslySetInnerHTML={{ __html: t('quickStart.scoring.example') }} />
                        <p style={{ marginBottom: 0 }}>
                          {t('quickStart.scoring.seeGuide')} <button onClick={() => { setShowQuickGuide(false); setShowGuide(true); }} className="text-[var(--app-primary)] hover:underline font-medium" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{t('quickStart.fullGuide')}</button>.
                        </p>
                      </div>
                    </div>

                    <div className="guide-section">
                      <h3>{t('quickStart.gettingStarted.title')}</h3>
                      <div className="guide-workflow">
                        <div className="guide-step">
                          <div className="guide-step-number">1</div>
                          <div className="guide-step-content">
                            <strong>{t('quickStart.gettingStarted.step1Title')}</strong>
                            <p>{t('quickStart.gettingStarted.step1Desc')}</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">2</div>
                          <div className="guide-step-content">
                            <strong>{t('quickStart.gettingStarted.step2Title')}</strong>
                            <p>{t('quickStart.gettingStarted.step2Desc')}</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">3</div>
                          <div className="guide-step-content">
                            <strong>{t('quickStart.gettingStarted.step3Title')}</strong>
                            <p>{t('quickStart.gettingStarted.step3Desc')}</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">4</div>
                          <div className="guide-step-content">
                            <strong>{t('quickStart.gettingStarted.step4Title')}</strong>
                            <p>{t('quickStart.gettingStarted.step4Desc')}</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">5</div>
                          <div className="guide-step-content">
                            <strong>{t('quickStart.gettingStarted.step5Title')}</strong>
                            <p>{t('quickStart.gettingStarted.step5Desc')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
        </SidebarProvider>
      </ToastProvider>
  );
}

export default function Layout({ children }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <LayoutContent>{children}</LayoutContent>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

