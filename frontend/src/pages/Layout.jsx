

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, Settings, Home, BookOpen, BarChart3, FileStack, LogOut, User as UserIcon, X, AlertTriangle, Activity } from "lucide-react";
import { User } from "@/api/entities";
import { ToastProvider } from "@/components/ToastContainer";
import { ThemeProvider } from "@/components/ThemeProvider";
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

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Rules",
    url: createPageUrl("Rules"),
    icon: FileText,
  },
  {
    title: "Rule Evaluation",
    url: createPageUrl("RuleReviewer"),
    icon: BarChart3,
  },
  {
    title: "Background Process",
    url: createPageUrl("BackgroundProcess"),
    icon: Activity,
    adminOnly: true,
  },
  {
    title: "Logs",
    url: createPageUrl("Logs"),
    icon: FileStack,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [showGuide, setShowGuide] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { hasMissingFields } = usePOCOFields();
  const { toast } = useToast();

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
        createPageUrl('Settings'),
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
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SidebarProvider>
            <style>{`
              :root.light {
                --app-bg: #f8fafc;
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
                --info-yellow-bg: #fefce8;
                --info-yellow-border: #fde047;
                --info-yellow-text: #a16207;
              }

              :root.dark {
                --app-bg: #0f172a;
                --app-surface: #1e293b;
                --app-surface-light: #334155;
                --app-surface-hover: #475569;
                --app-text: #f1f5f9;
                --app-text-secondary: #cbd5e1;
                --app-text-muted: #94a3b8;
                --app-primary: #3b82f6;
                --app-primary-hover: #2563eb;
                --app-primary-light: #1e3a8a;
                --app-primary-light-rgb: 30, 58, 138;
                --app-border: #334155;
                --app-success: #22c55e;
                --app-success-rgb: 34, 197, 94;
                --app-warning: #f59e0b;
                --app-danger: #ef4444;
                --app-danger-rgb: 239, 68, 68;
                --info-yellow-bg: #422006;
                --info-yellow-border: #92400e;
                --info-yellow-text: #fbbf24;
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

              .form-input, .form-textarea, .form-select {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #d1d5db;
                border-radius: 8px;
                font-size: 1rem;
                background: #f9fafb;
                color: #1f2937;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
              }
              
              .form-input:focus, .form-textarea:focus, .form-select:focus {
                outline: none;
                border-color: #3b82f6;
                background: white;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              
              .form-label {
                display: block;
                font-size: 1rem;
                font-weight: 600;
                color: #111827;
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
                padding: 24px;
              }

              .guide-section {
                margin-bottom: 32px;
              }

              .guide-section h3 {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--app-text);
                margin-bottom: 12px;
              }

              .guide-section h4 {
                font-size: 1rem;
                font-weight: 600;
                color: var(--app-text);
                margin-top: 16px;
                margin-bottom: 8px;
              }

              .guide-section p {
                color: var(--app-text-secondary);
                line-height: 1.6;
                margin-bottom: 12px;
              }

              .guide-section ul {
                list-style: disc;
                margin-left: 24px;
                color: var(--app-text-secondary);
              }

              .guide-section li {
                margin-bottom: 8px;
                line-height: 1.6;
              }

              .guide-workflow {
                background: var(--app-surface-light);
                border-radius: 8px;
                padding: 16px;
                margin: 16px 0;
              }

              .guide-step {
                display: flex;
                align-items: start;
                gap: 12px;
                margin-bottom: 12px;
              }

              .guide-step-number {
                background: var(--app-primary);
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
                flex-shrink: 0;
              }

              .guide-step-content {
                flex: 1;
              }

              .guide-highlight {
                background: var(--app-primary-light);
                border-left: 3px solid var(--app-primary);
                padding: 12px 16px;
                margin: 16px 0;
                border-radius: 4px;
              }
            `}</style>
            <div className="min-h-screen flex w-full">
              <Sidebar className="border-r border-gray-200">
                <SidebarHeader className="border-b border-gray-200 px-6 py-[22.5px]">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="PocoClass Logo" className="h-10 w-auto" />
                    <div>
                      <span className="text-xs font-normal text-gray-500">v2.0</span>
                      <p className="text-xs text-gray-500">Document Classification</p>
                    </div>
                  </div>
                </SidebarHeader>
                
                <SidebarContent className="p-2 flex flex-col h-full">
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                      Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {navigationItems.map((item) => {
                          // Hide admin-only items for non-admin users
                          if (item.adminOnly && !isAdmin) {
                            return null;
                          }
                          
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton 
                                asChild 
                                className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                                  location.pathname === item.url ? 'bg-blue-50 text-blue-700' : ''
                                }`}
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
                            className="hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 px-3 py-2 w-full">
                              <BookOpen className="w-4 h-4" />
                              <span className="font-medium">Guide</span>
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>

                  {currentUser && (
                    <SidebarGroup className="mt-auto">
                      <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                        User
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <div className="flex items-center gap-3 px-3 py-2 text-sm">
                              <UserIcon className="w-4 h-4 text-gray-500" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{currentUser.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                              </div>
                            </div>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton 
                              onClick={handleLogout}
                              className="hover:bg-red-50 hover:text-red-700 transition-colors duration-200 rounded-lg cursor-pointer"
                            >
                              <div className="flex items-center gap-3 px-3 py-2 w-full">
                                <LogOut className="w-4 h-4" />
                                <span className="font-medium">Logout</span>
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
                <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
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
                      <h2 className="text-2xl font-bold text-gray-900">PocoClass Guide</h2>
                      <p className="text-sm text-gray-500 mt-1">A beginner-friendly guide to document classification</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setShowGuide(false);
                          setShowQuickGuide(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Quick Guide
                      </button>
                      <button 
                        onClick={() => setShowGuide(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-body">
                    <div className="guide-section">
                      <h3>What is PocoClass?</h3>
                      <p>
                        Think of PocoClass as your smart filing assistant. Just like you might recognize a bank statement by its logo, 
                        layout, and specific text, PocoClass learns to recognize different types of documents automatically.
                      </p>
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
                      <h2 className="text-2xl font-bold text-gray-900">Quick Reference Guide</h2>
                      <p className="text-sm text-gray-500 mt-1">TL;DR - Key concepts and workflows</p>
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
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-body">
                    <div className="guide-section">
                      <h3>Core Concept</h3>
                      <p>POCO = Weighted scoring system combining OCR content, filename patterns, and metadata verification.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SidebarProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

