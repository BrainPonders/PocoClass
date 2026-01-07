

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
  const [currentUser, setCurrentUser] = useState(null);
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

  const handleTabVisible = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      const response = await fetch(`${API_BASE_URL}/api/sync/counts`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
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
            headers: { 'Authorization': `Bearer ${sessionToken}` }
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

  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Redirect non-admin users away from admin-only pages
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
                      <div className="relative inline-block">
                        <img src="/logo.png" alt="PocoClass Logo" className="h-14 w-auto" />
                        <div className="absolute bottom-0 right-0 transform translate-x-[30px] translate-y-[1px]">
                          <span className="text-xs font-semibold text-gray-500">v2.0</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" style={{ marginLeft: '41px', marginTop: '2px' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--app-text-secondary)' }}>Document Classification</p>
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
                            <div className="flex items-center gap-3 px-3 py-2 w-full">
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
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>PocoClass Guide</h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>A beginner-friendly guide to document classification</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowGuide(false);
                          setShowQuickGuide(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        {t('nav.quickGuide')}
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
                      <h3>Introduction</h3>
                      <p>
                        PocoClass is an intelligent rule-based classification engine designed to enhance Paperless-ngx. While Paperless already provides 
                        a powerful search interface and a built-in classifier, it might struggle to recognize complex document types, especially during initial 
                        bulk imports or when documents follow complex formats. PocoClass fills this gap by letting you explicitly define how each type of 
                        document should be identified through patterns and how it should be classified.
                      </p>
                      <p>
                        Its primary objective is to deliver consistent, accurate classification—no matter how many documents you are importing or how varied 
                        they may be. Once configured, PocoClass can run fully automatically, quietly keeping your Paperless library structured with minimal 
                        effort from you.
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>How PocoClass Works with Paperless</h3>
                      <p>
                        PocoClass works alongside Paperless to automatically organize your documents. Here's how it all fits together:
                      </p>
                      
                      <div className="guide-workflow">
                        <div className="guide-step">
                          <div className="guide-step-number">1</div>
                          <div className="guide-step-content">
                            <strong>Document Arrives in Paperless</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              You scan or upload a document. Paperless extracts the text (OCR) so it can be searched. Paperless automatically notifies PocoClass that one or more new documents are available for analysis.
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">2</div>
                          <div className="guide-step-content">
                            <strong>PocoClass Analyzes It</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              PocoClass checks the document against your personal defined rules. It looks at the text, filename, and other information, then calculates a confidence score (POCO Score) for each possible match. The scoring system evaluates how well the document fits each rule.
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">3</div>
                          <div className="guide-step-content">
                            <strong>PocoClass Assigns Classifications</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              If a match is found, PocoClass automatically applies the classifications you specified in your rule—like tags, correspondents, document type, and other details—directly to the document in Paperless.
                            </p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">4</div>
                          <div className="guide-step-content">
                            <strong>Document is Organized</strong>
                            <p style={{ marginTop: '4px', marginBottom: '0', fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                              Your document now has the right classification and is easy to find. You can also use Paperless workflows to do additional processing based on these classifications, like automatically moving documents to specific folders.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="guide-highlight">
                        <strong>Automatic Background Processing</strong>
                        <p>PocoClass is triggered automatically whenever Paperless finishes consuming documents. It applies your rules without any manual action required, ensuring consistent classification for bulk imports and daily new documents.</p>
                      </div>

                      <h4>What PocoClass Can Edit in Paperless</h4>
                      <p>
                        PocoClass updates your documents directly in Paperless once a rule matches. Depending on your rule configuration, PocoClass can set or update the following fields:
                      </p>
                      <ul>
                        <li><strong>Correspondent</strong> - Who the document is from (e.g., a bank, insurer, or government agency)</li>
                        <li><strong>Document Type</strong> - The category of the document (e.g., invoice, statement, receipt, contract)</li>
                        <li><strong>Tags</strong> - Labels that help group or filter documents (e.g., "Finance", "Tax", "2024")</li>
                        <li><strong>Custom Fields</strong> - Additional information extracted from the document, such as invoice numbers, reference codes, dates, or account numbers</li>
                      </ul>
                      <p>
                        All these updates happen within Paperless itself, meaning your library stays organized, searchable, and consistent.
                      </p>

                    </div>

                    <div className="guide-section">
                      <h3>The Scoring System</h3>
                      <p>
                        PocoClass uses a confidence-based scoring system to decide whether a document matches a rule. This score determines whether the rule is applied, skipped, or flagged for review.
                      </p>
                      <p>
                        To keep the process transparent, PocoClass generates two scores for every document:
                      </p>

                      <h4>1. POCO OCR Score (Transparency Score)</h4>
                      <p>
                        This score reflects how many OCR identifiers were found in the document text. It shows how well the document content matches your rule.
                      </p>
                      <ul>
                        <li>It acts as a gatekeeper: if the OCR score is below the <strong>OCR Threshold (default 75%)</strong>, rule evaluation stops immediately</li>
                        <li>This threshold is configurable per rule in the rule builder</li>
                      </ul>
                      <p>
                        If a rule requires 75% OCR accuracy and the document only matches 50%, PocoClass stops here and will not continue with filename or Paperless checks.
                      </p>

                      <h4>2. POCO Score (Final Classification Score)</h4>
                      <p>
                        Once OCR passes the minimum threshold, PocoClass evaluates the full document using:
                      </p>
                      <ul>
                        <li><strong>OCR results</strong> (primary evidence)</li>
                        <li><strong>Filename patterns</strong> (secondary evidence)</li>
                        <li><strong>Paperless classifications</strong> (verification evidence)</li>
                      </ul>
                      <p style={{ fontFamily: 'monospace', backgroundColor: 'var(--app-bg)', padding: '8px', borderRadius: '4px', fontSize: '0.9rem', marginTop: '12px' }}>
                        POCO Score = (OCR_weighted + Filename_weighted + Paperless_weighted) / Total_max_weight × 100%
                      </p>
                      <p>
                        Each domain contributes to the final score according to its number of identifiers and its trust multiplier. The final POCO Score must meet the <strong>POCO Threshold (default 75%)</strong> for the rule to be applied.
                      </p>

                      <h4>Score Calculation</h4>
                      <p>
                        PocoClass evaluates each data source using this formula:
                      </p>
                      <p style={{ fontFamily: 'monospace', backgroundColor: 'var(--app-bg)', padding: '8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                        Weighted Score = (<span style={{ color: '#3b82f6', fontWeight: '600' }}>matches</span> / <span style={{ color: '#10b981', fontWeight: '600' }}>total</span>) × <span style={{ color: '#10b981', fontWeight: '600' }}>total</span> × <span style={{ color: '#f59e0b', fontWeight: '600' }}>multiplier</span>
                      </p>
                      <p>
                        This method ensures:
                      </p>
                      <ul>
                        <li>More <span style={{ color: '#3b82f6', fontWeight: '600' }}>matches</span> → higher score</li>
                        <li>More <span style={{ color: '#10b981', fontWeight: '600' }}>identifiers</span> → stronger evidence</li>
                        <li>More <span style={{ color: '#f59e0b', fontWeight: '600' }}>trusted domains</span> → greater impact</li>
                      </ul>
                      <h4>Why Multipliers?</h4>
                      <p>
                        Multipliers control how much each data source contributes to the final score. A higher multiplier means that source carries more weight in determining classification confidence.
                      </p>
                      <p><strong>Default multipliers:</strong></p>
                      <ul>
                        <li><strong>OCR: 3×</strong> - OCR text is usually very reliable</li>
                        <li><strong>Filename: 1×</strong> - Filenames are less reliable</li>
                        <li><strong>Classifications: Auto</strong> - By default, the classification multiplier neutralizes the number of Paperless classifications, ensuring they can influence confidence without overpowering OCR</li>
                      </ul>
                      <p><strong>When to adjust:</strong></p>
                      <ul>
                        <li>Using unreliable OCR? Lower the OCR multiplier</li>
                        <li>Filenames are super reliable in your organization? Raise the Filename multiplier</li>
                        <li>Trust Paperless classifications more? Adjust accordingly</li>
                      </ul>

                      <details style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: '500', color: 'var(--app-text-primary)' }}>
                          Examples (and Converting to Percentages)
                        </summary>
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--app-border)' }}>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>Understanding the Threshold Percentage:</strong> The scores shown here are absolute values. To convert them to the percentages you define in the rule builder (like 75%), divide the score by the maximum possible score for that rule. The maximum possible score is what you'd get if all identifiers matched perfectly.
                          </p>

                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>Example 1 – Strong Match</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                            <li>OCR: 4/5, multiplier = 3 → (4/5 × 5 × 3) = 12</li>
                            <li>Filename: 2/2, multiplier = 1 → (2/2 × 2 × 1) = 2</li>
                            <li>Paperless: 3/4, multiplier = 0.25 → (3/4 × 4 × 0.25) = 0.75</li>
                            <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>Total score = 12 + 2 + 0.75 = <strong>14.75</strong></li>
                          </ul>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--app-text-secondary)' }}>
                            Maximum possible: (5 × 3) + (2 × 1) + (4 × 0.25) = 18<br/>
                            Percentage: 14.75 ÷ 18 = <strong>82%</strong><br/>
                            If your threshold is 75% → ✓ Classification applied (82% exceeds 75%)
                          </p>

                          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>Example 2 – Weak OCR, Filename Disagrees</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                          <li>OCR: 3/4, multiplier = 3 → (3/4 × 4 × 3) = 9</li>
                          <li>Filename: 0/2, multiplier = 1 → (0/2 × 2 × 1) = 0</li>
                          <li>Paperless: 2/4, multiplier = 0.25 → (2/4 × 4 × 0.25) = 0.5</li>
                          <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>Total score = 9 + 0 + 0.5 = <strong>9.5</strong></li>
                          </ul>
                          <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                            Maximum possible: 18 (same as Example 1)<br/>
                            Percentage: 9.5 ÷ 18 = <strong>53%</strong><br/>
                            If your threshold is 75% → ✗ Rule skipped (53% is below 75%)
                          </p>

                          <p style={{ fontSize: '0.9rem', marginTop: '16px', marginBottom: '16px' }}>
                            <strong>Example 3 – OCR Failure (Filename & Paperless Can't Save It)</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'monospace' }}>
                            <li>OCR: 1/5, multiplier = 3 → (1/5 × 5 × 3) = 3</li>
                            <li>Filename: 2/2, multiplier = 1 → (2/2 × 2 × 1) = 2</li>
                            <li>Paperless: 4/4, multiplier = 0.25 → (4/4 × 4 × 0.25) = 1</li>
                            <li style={{ marginTop: '8px', borderTop: '1px solid var(--app-border)', paddingTop: '8px' }}>Total score = 3 + 2 + 1 = <strong>6</strong></li>
                          </ul>
                          <p style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--app-text-secondary)' }}>
                            Maximum possible: 18 (same as Example 1)<br/>
                            Percentage: 6 ÷ 18 = <strong>33%</strong><br/>
                            If your threshold is 75% → ✗ Rule skipped (even perfect filename & Paperless can't compensate for weak OCR)
                          </p>

                          <p style={{ fontSize: '0.9rem', marginTop: '16px', marginBottom: '8px' }}>
                            <strong>Rule of thumb:</strong>
                          </p>
                          <ul style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                            <li>If OCR is strong, filename and Paperless usually confirm it.</li>
                            <li>If OCR is borderline, filename and Paperless decide whether the rule passes or fails.</li>
                            <li>If OCR is weak, the rule never proceeds.</li>
                          </ul>
                        </div>
                      </details>

                      <h4 style={{ marginTop: '24px' }}>Where Scores Are Stored in Paperless</h4>
                      <p>
                        PocoClass writes its evaluation results back into Paperless so you always know what happened:
                      </p>
                      <ul>
                        <li><strong>POCO Score</strong> – final classification confidence (custom field)</li>
                        <li><strong>POCO OCR Score</strong> – OCR-only confidence (optional custom field). Every document gets an OCR score recorded, even if it's 0%</li>
                        <li><strong>POCO+ tag</strong> – rule matched and classification applied</li>
                        <li><strong>POCO- tag</strong> – rule evaluated but did not meet the threshold</li>
                      </ul>
                      <div className="guide-highlight" style={{ marginTop: '16px' }}>
                        <strong>Document Notes</strong>
                        <p>A detailed scoring breakdown is also appended to the document's notes in Paperless, providing full transparency for every evaluation.</p>
                      </div>
                    </div>

                    <div className="guide-section">
                      <h3>Setup Requirements & Data Synchronization</h3>
                      <p>
                        Before PocoClass can work, you need to set up a few things in your Paperless system. These required fields allow PocoClass to track its work and store important information.
                      </p>

                      <h4>Required Setup</h4>
                      <p><strong>Custom Fields:</strong></p>
                      <ul>
                        <li><strong style={{ color: 'var(--app-primary)' }}>POCO Score (Required)</strong> - Stores the confidence score calculated by PocoClass for each document after rule evaluation</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>POCO OCR (Optional)</strong> - Stores the OCR-specific confidence score component for analysis and troubleshooting</li>
                      </ul>
                      <p style={{ marginTop: '12px' }}><strong>Tags:</strong></p>
                      <ul>
                        <li><strong style={{ color: 'var(--app-primary)' }}>NEW Tag (Required)</strong> - Applied to documents immediately after Paperless consumes them, marking them as candidates for PocoClass processing. PocoClass uses this to identify new documents requiring rule evaluation</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>POCO+ Tag (Required)</strong> - Applied to documents where PocoClass's classification exceeds the minimum POCO Score threshold, indicating successful matches</li>
                        <li><strong style={{ color: 'var(--app-primary)' }}>POCO- Tag (Required)</strong> - Applied to documents where PocoClass's classification falls below the minimum POCO Score threshold, indicating insufficient confidence</li>
                      </ul>
                      <p style={{ marginTop: '12px' }}>
                        Custom fields and tag requirements are managed in{' '}
                        <button 
                          onClick={() => {
                            sessionStorage.setItem('settings_active_tab', 'validation');
                            window.location.href = createPageUrl('Settings');
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <FileText className="w-4 h-4" />
                          Data Validation
                        </button>
                      </p>

                      <h4>Data Synchronization Architecture</h4>
                      <p>
                        PocoClass employs a caching strategy to minimize API overhead on your Paperless instance. Rather than querying Paperless on every document evaluation, PocoClass fetches and caches the current state of all tags, correspondents, document types, and custom fields during synchronization. Without caching, each document processed could require hundreds of API calls to resolve all these classification references. This cached state remains valid until explicitly refreshed, significantly reducing API calls while maintaining data consistency.
                      </p>

                      <h4>Automatic Synchronization</h4>
                      <p>
                        Synchronization happens automatically without manual intervention. PocoClass monitors for schema changes and re-syncs when you return to the application after switching tabs or leaving the interface. The system evaluates whether re-synchronization is needed and triggers it transparently—keeping your cached state current with minimal overhead.
                      </p>
                      <p>
                        In most cases, automatic synchronization handles all data consistency needs. If you need to force an immediate update, it can be managed through{' '}
                        <button 
                          onClick={() => {
                            sessionStorage.setItem('settings_active_tab', 'system');
                            window.location.href = createPageUrl('Settings');
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          <Settings className="w-4 h-4" />
                          System
                        </button>
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>Building Rules: The 6-Step Wizard</h3>
                      <p>
                        A rule tells PocoClass: "If a document contains these patterns, classify it like this."
                      </p>
                      <p>
                        The rule builder wizard guides you step by step through defining how a document should be identified and what classifications should be assigned when it matches.
                      </p>
                      
                      <h4>Step 1 — Basic Information</h4>
                      <p>
                        Give your rule a clear identity:
                      </p>
                      <ul>
                        <li><strong>Rule Name</strong> – A descriptive, human-friendly name (e.g., Bank Statements, Tax Letters)</li>
                        <li><strong>Rule ID</strong> – A unique identifier automatically generated. You may customize it for readability</li>
                        <li><strong>Description</strong> – Optional notes to remind yourself what the rule does</li>
                      </ul>
                      <p>
                        This helps keep your rules organized, especially once you build many of them.
                      </p>

                      <h4>Step 2 — OCR Pattern Matching</h4>
                      <p>
                        In this step you define the text patterns PocoClass should look for in the OCR text extracted from the document.
                      </p>
                      <p><strong>What you can match</strong>:</p>
                      <ul>
                        <li>Organization names</li>
                        <li>Keywords like Invoice, Statement, Receipt</li>
                        <li>Reference numbers</li>
                        <li>Dates or short phrases unique to a document format</li>
                      </ul>
                      <p><strong>How it works</strong>:</p>
                      <ul>
                        <li>Add 3 to 10 OCR patterns</li>
                        <li>Choose how they must match (ALL / ANY / logic groups)</li>
                        <li>Set the OCR Threshold (default: 75%) – this determines how many patterns must match before PocoClass considers the rule valid</li>
                      </ul>
                      <p>
                        PocoClass only continues to filename and classifications evaluation if the OCR threshold is met. (See the scoring section for details.)
                      </p>
                      <p><strong>Regex Support</strong></p>
                      <p>
                        You may use simple text patterns or more advanced regular expressions (regex).
                      </p>
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <p><strong>Examples</strong>:</p>
                        <ul style={{ fontSize: '0.9rem' }}>
                          <li><code>/invoice/i</code> – matches "invoice", "Invoice", "INVOICE"</li>
                          <li><code>/\d{'{4}'}-\d{'{2}'}-\d{'{2}'}/</code> – matches dates like "2024-01-15"</li>
                          <li><code>/Visa|Mastercard/i</code> – matches either "Visa" OR "Mastercard"</li>
                        </ul>
                        <p style={{ fontSize: '0.9rem', marginTop: '8px', marginBottom: '0' }}>Regex is optional — most rules work fine with simple patterns.</p>
                      </div>

                      <div className="info-box info-box-yellow" style={{ marginTop: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          <strong>Tip:</strong> There is a built-in <strong>Regex Builder</strong> (available in the pattern editor) to assist in creating complex patterns without writing code manually.
                        </p>
                      </div>

                      <h4>Step 3 — Filename Patterns</h4>
                      <p>
                        Filename patterns allow PocoClass to use the document's filename as a secondary signal.
                      </p>
                      <p><strong>Example filename</strong>: <code>2024-01-Bank-Statement.pdf</code></p>
                      <p><strong>Possible patterns</strong>:</p>
                      <ul style={{ fontSize: '0.9rem' }}>
                        <li><code>/Bank/i</code></li>
                        <li><code>/Statement/i</code></li>
                        <li><code>/2024/i</code></li>
                      </ul>
                      <p><strong>Key points</strong>:</p>
                      <ul>
                        <li>Filename patterns are optional</li>
                        <li>They are evaluated only after OCR passes</li>
                        <li>Their influence is controlled by the Filename Multiplier (default: 1×)</li>
                      </ul>

                      <h4>Step 4 — Rule Configuration</h4>
                      <p>
                        This is where you define how confident PocoClass must be before applying the rule.
                      </p>
                      <p>You can adjust:</p>
                      <ul>
                        <li><strong>OCR Threshold</strong> – Minimum percentage of OCR patterns that must match</li>
                        <li><strong>POCO Threshold</strong> – Minimum final score required for the rule to apply</li>
                        <li><strong>OCR Multiplier</strong> – Trust level for OCR (default: 3×)</li>
                        <li><strong>Filename Multiplier</strong> – Trust level for filename matching (default: 1×)</li>
                        <li><strong>Classification Multiplier</strong> – Trust level for Paperless classifications</li>
                      </ul>
                      <p>
                        These settings determine how heavily each data source influences the final score. For full details, see The Scoring System.
                      </p>

                      <h4>Step 5 — Document Classifications</h4>
                      <p>
                        Here you define what PocoClass should write into Paperless if the rule matches.
                      </p>
                      <p><strong>Static Classifications</strong></p>
                      <p>
                        Values that always apply when the rule matches:
                      </p>
                      <ul>
                        <li>Correspondent</li>
                        <li>Document Type</li>
                        <li>Tags</li>
                        <li>Custom fields</li>
                      </ul>
                      <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                        <strong>Example</strong>: Assign Correspondent → "Bank XYZ", Assign Document Type → "Monthly Statement", Tags → Finance, 2024
                      </p>
                      <p><strong>Dynamic Classifications</strong></p>
                      <p>
                        Extracted directly from the document using anchors.
                      </p>
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                          <strong>Example extraction</strong>: You want to extract an invoice number that appears after "Inv: "
                        </p>
                        
                        <p style={{ fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>Simulated OCR text from document:</p>
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
                          <li>Before Anchor: <span style={{ backgroundColor: '#ffeb3b', padding: '2px 4px' }}>Inv: </span></li>
                          <li>Text to extract: <span style={{ backgroundColor: '#81c784', padding: '2px 4px', color: '#fff', fontWeight: 'bold' }}>INV-2024-0547</span></li>
                          <li>After Anchor: <span style={{ backgroundColor: '#ff9800', padding: '2px 4px', color: '#fff' }}>has been generated</span></li>
                        </ul>
                      </div>

                      <h4>Step 6 — Verification</h4>
                      <p>
                        Verification allows PocoClass to confirm that the extracted or assigned classifications aligns with what is already stored in Paperless.
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--app-text-secondary)' }}>
                        <strong>Example</strong>: Extracted Correspondent → "John Smith", Paperless Correspondent → "John Smith" → Verification passes
                      </p>
                      <p>
                        If verification fails, you can choose to allow the rule anyway or block it from applying. Verification adds an extra safety layer, especially when similar document formats may overlap.
                      </p>
                    </div>

                    <div className="guide-section">
                      <h3>Testing Your Rules</h3>
                      <p>
                        Before you let PocoClass automatically classify hundreds of documents, you want to make sure your rule works correctly on real documents.
                      </p>
                      
                      <h4>Two Types of Testing</h4>
                      
                      <p><strong>1. Dry Run</strong> (Simulation - No Changes)</p>
                      <p>"What would happen if I ran this rule?"</p>
                      <ul>
                        <li>PocoClass tests your rule against selected documents</li>
                        <li>Shows you what would happen (classifications, scores)</li>
                        <li><strong>Does not make any changes</strong> to Paperless</li>
                        <li>Perfect for testing before you're confident</li>
                      </ul>

                      <p><strong>2. Full Run</strong> (Real - Makes Changes)</p>
                      <p>"Apply this rule for real"</p>
                      <ul>
                        <li>PocoClass tests your rule and actually classifies the documents</li>
                        <li>Makes changes in Paperless</li>
                        <li>Applied tags, correspondents, and classifications to documents</li>
                        <li>Scores are recorded in the POCO Score custom field</li>
                      </ul>

                      <h4>Understanding Test Results</h4>
                      <p>When you test, PocoClass shows you a report with:</p>
                      <ul>
                        <li><strong>Document</strong>: Which document was tested</li>
                        <li><strong>Rule Matched</strong>: Did the rule match? (Yes/No)</li>
                        <li><strong>OCR Score</strong>: What % of OCR patterns matched?</li>
                        <li><strong>POCO Score</strong>: What was the final classification score?</li>
                        <li><strong>Classification</strong>: POCO+ (matched) or POCO- (no match) - shows whether the rule matched the document</li>
                        <li><strong>Classifications Applied</strong>: What got assigned (correspondent, tags, etc.) - which identifiers like OCR or filename were successful</li>
                      </ul>
                      <div className="guide-highlight">
                        <strong>Scores Explained</strong>
                        <ul>
                          <li><strong>OCR Score</strong> – Percentage of OCR patterns that matched</li>
                          <li><strong>POCO Score</strong> – Combined confidence from OCR, filename, and Paperless</li>
                          <li>Rule triggers when POCO Score meets your threshold (default 75%)</li>
                        </ul>
                      </div>
                      <p>
                        Test results include a bar chart showing:
                      </p>
                      <ul>
                        <li>Blue bar = OCR Score (how many patterns matched)</li>
                        <li>Green/Red bar = POCO Score (final decision score)</li>
                        <li>Orange line = Your threshold (75% by default)</li>
                      </ul>
                      <p>If the bars reach the orange line, the rule triggers.</p>
                    </div>

                    <div className="guide-section">
                      <h3>Background Processing</h3>
                      <p>
                        Background processing is how PocoClass automatically classifies new documents without you doing anything.
                      </p>
                      
                      <h4>How It Works</h4>
                      <p>Background processing operates as a scheduled service that periodically scans for new documents and applies classification rules automatically.</p>
                      <ul>
                        <li><strong>Step 1: The Trigger</strong> - PocoClass looks for documents with the <strong>"NEW"</strong> tag</li>
                        <li><strong>Step 2: Filter Documents</strong> - Find documents tagged with <strong>"NEW"</strong> and NOT already tagged with <strong>"POCO+"</strong> or <strong>"POCO-"</strong></li>
                        <li><strong>Step 3: Apply Rules</strong> - Run all enabled rules against these documents in order</li>
                        <li><strong>Step 4: Tag & Score</strong> - Apply classifications, write <strong>POCO Score</strong> and <strong>POCO OCR</strong>, apply <strong>POCO+</strong> or <strong>POCO-</strong> tag, optionally remove <strong>NEW</strong> tag (if enabled in Settings)</li>
                        <li><strong>Step 5: Repeat</strong> - Continue looking for more documents with the <strong>"NEW"</strong> tag</li>
                      </ul>

                      <div className="info-box info-box-yellow" style={{ marginTop: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          <strong>Tip:</strong> You can choose whether PocoClass automatically removes the <strong>NEW</strong> tag after processing. Enable this option to keep your Paperless inbox clean, or leave it disabled if you prefer to manually verify documents before removing the tag yourself.
                        </p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                          <strong>Location:</strong> Settings → Background Processing → Tag Configuration
                        </p>
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
                          Open Background Processing Settings
                        </button>
                      </div>

                      <h4>Three Processing Modes</h4>
                      <p><strong>1. Automatic Mode</strong></p>
                      <ul>
                        <li>Runs continuously in the background every few minutes</li>
                        <li>Always watching for new documents with "NEW" tag</li>
                        <li>Pauses when you're using the web interface (so it doesn't interfere)</li>
                        <li>Pauses when no documents need processing (saves resources)</li>
                      </ul>

                      <p><strong>2. Trigger Mode</strong></p>
                      <ul>
                        <li>Runs once when you manually ask it to</li>
                        <li>Useful for testing or processing a specific batch of documents</li>
                        <li>You click "Trigger Background Processing" and it processes once</li>
                      </ul>

                      <p><strong>3. Dry Run Mode</strong></p>
                      <ul>
                        <li>Same as Trigger Mode, but doesn't make changes</li>
                        <li>Shows you what would happen without actually classifying</li>
                      </ul>

                      <h4>Processing History</h4>
                      <p>PocoClass keeps track of what it processed:</p>
                      <p><strong>Summary View</strong>:</p>
                      <ul>
                        <li>When was the run (timestamp)</li>
                        <li>What type of run (Automatic, Manual, Dry Run)</li>
                        <li>How many documents were processed</li>
                        <li>How many matched rules</li>
                      </ul>
                      <p><strong>Detail View</strong> (expandable):</p>
                      <ul>
                        <li>Document title</li>
                        <li>Which rule matched (if any)</li>
                        <li>OCR and POCO scores</li>
                        <li>What classification it got (POCO+ or POCO-)</li>
                        <li>What classifications were applied</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>Best Practices</h3>
                      <ul>
                        <li><strong>Start with Dry Run</strong>: Always test rules with dry run first</li>
                        <li><strong>Test on varied documents</strong>: Try your rule on 5-10 different documents</li>
                        <li><strong>Use meaningful patterns</strong>: Specific patterns work better than generic ones</li>
                        <li><strong>Document your rules</strong>: Give rules clear names describing what they match</li>
                        <li><strong>Keep rules organized</strong>: Use naming conventions (e.g., "Bank-", "Invoice-")</li>
                        <li><strong>Monitor processing history</strong>: Check results regularly to see if rules are working</li>
                        <li><strong>Adjust thresholds slowly</strong>: Change by 5% at a time, not 20%</li>
                        <li><strong>Sync regularly</strong>: Keep PocoClass in sync with Paperless changes</li>
                      </ul>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {showQuickGuide && (
              <div className="modal-overlay" onClick={() => setShowQuickGuide(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>Quick Reference Guide</h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--app-text-secondary)' }}>TL;DR - Key concepts and workflows</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowQuickGuide(false);
                          setShowGuide(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Full Guide
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
                      <h3>Core Concept</h3>
                      <p>POCO = Weighted scoring system combining OCR content, filename patterns, and classifications verification.</p>
                    </div>

                    <div className="guide-section">
                      <h3>The 6-Step Rule Building Workflow</h3>
                      <div className="guide-workflow">
                        <div className="guide-step">
                          <div className="guide-step-number">1</div>
                          <div className="guide-step-content">
                            <strong>Basic Info</strong>
                            <p>Name your rule and add an optional description</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">2</div>
                          <div className="guide-step-content">
                            <strong>OCR Patterns</strong>
                            <p>Define text patterns to search for in document content using regex (e.g., <code>/invoice/i</code>)</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">3</div>
                          <div className="guide-step-content">
                            <strong>Filename Patterns</strong>
                            <p>Define patterns to match against document filenames (optional)</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">4</div>
                          <div className="guide-step-content">
                            <strong>Configuration</strong>
                            <p>Adjust thresholds and multipliers (defaults: POCO 75%, OCR 75%, OCR 3×, Filename 1×)</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">5</div>
                          <div className="guide-step-content">
                            <strong>classifications Assignment</strong>
                            <p>Define what to assign (static) or extract (dynamic) when rule matches</p>
                          </div>
                        </div>
                        <div className="guide-step">
                          <div className="guide-step-number">6</div>
                          <div className="guide-step-content">
                            <strong>Verification</strong>
                            <p>Cross-check extracted/assigned classifications against existing Paperless data</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="guide-section">
                      <h3>Dual Scoring System</h3>
                      <h4>POCO OCR Score (Transparency)</h4>
                      <p><code>OCR Score = (Matched Patterns / Total Patterns) × 100%</code></p>
                      <p>Shows what percentage of your expected text patterns were found. Recorded in document notes.</p>
                      
                      <h4>POCO Score (Actionable)</h4>
                      <p><code>POCO Score = (OCR × 3 + Filename × 1 + classifications) / Total × 100%</code></p>
                      <p>Combines all factors with weighted multipliers. Must meet threshold (default 75%) to trigger classification.</p>
                    </div>

                    <div className="guide-section">
                      <h3>Testing & Execution</h3>
                      <ul>
                        <li><strong>Dry Run</strong>: Test without making changes - shows what would happen</li>
                        <li><strong>Run</strong>: Apply classifications for real - updates Paperless documents</li>
                        <li><strong>Results</strong>: View OCR score, POCO score, and classifications applied for each document</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>Background Processing Modes</h3>
                      <ul>
                        <li><strong>Automatic</strong>: Runs continuously every few minutes, watching for NEW-tagged documents</li>
                        <li><strong>Trigger</strong>: Run once manually when you click the button</li>
                        <li><strong>Dry Run</strong>: Trigger mode but without making changes (simulation)</li>
                      </ul>
                      <p><strong>How it works</strong>: Finds documents with "NEW" tag → Applies enabled rules → Tags as POCO+ or POCO- → Removes NEW tag</p>
                    </div>

                    <div className="guide-section">
                      <h3>Syncing with Paperless</h3>
                      <p><strong>Location</strong>: Settings → System → Paperless Datafield Synchronisation</p>
                      <p><strong>What gets synced</strong>: Tags, correspondents, document types, custom fields</p>
                      <p><strong>When to sync</strong>:</p>
                      <ul>
                        <li>After creating/deleting tags or custom fields in Paperless</li>
                        <li>When PocoClass doesn't recognize Paperless data</li>
                        <li>Roughly once per day during active configuration</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>Required Paperless Setup</h3>
                      <ul>
                        <li><strong>Custom Field</strong>: "POCO Score" (required) - stores classification confidence</li>
                        <li><strong>Custom Field</strong>: "POCO OCR" (optional) - stores OCR transparency score</li>
                        <li><strong>Tags</strong>: "POCO+", "POCO-", "NEW" - used for classification workflow</li>
                      </ul>
                      <p>Check status: Settings → Data Validation</p>
                    </div>

                    <div className="guide-section">
                      <h3>Key Terminology</h3>
                      <ul>
                        <li><strong>Regex</strong>: Pattern format <code>/pattern/flags</code> (e.g., <code>/invoice/i</code> for case-insensitive)</li>
                        <li><strong>Anchors</strong>: Text markers for dynamic extraction (<code>beforeAnchor</code>, <code>afterAnchor</code>)</li>
                        <li><strong>Threshold</strong>: Minimum score required to trigger action (default 75%)</li>
                        <li><strong>Multiplier</strong>: Weight given to data source (OCR 3×, Filename 1×)</li>
                        <li><strong>Static classifications</strong>: Always assign the same value</li>
                        <li><strong>Dynamic classifications</strong>: Extract value from document using patterns</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>Quick Troubleshooting</h3>
                      <ul>
                        <li><strong>Rule not matching?</strong> Lower POCO threshold to 70%, check OCR patterns with Dry Run</li>
                        <li><strong>Sync issues?</strong> Settings → System → Sync Now, verify connection</li>
                        <li><strong>Background not working?</strong> Check Settings → Background Processing for errors, verify NEW tag exists</li>
                        <li><strong>Missing fields?</strong> Run manual sync, check Data Validation tab</li>
                      </ul>
                    </div>

                    <div className="guide-section">
                      <h3>Best Practices</h3>
                      <ul>
                        <li>Always test with Dry Run before using Run</li>
                        <li>Test rules on 5-10 varied documents</li>
                        <li>Use specific patterns over generic ones</li>
                        <li>Give rules descriptive names (e.g., "Bank-Statement-RaboBank")</li>
                        <li>Adjust thresholds in small increments (5% at a time)</li>
                        <li>Monitor Processing History regularly</li>
                        <li>Keep PocoClass synced with Paperless</li>
                      </ul>
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

