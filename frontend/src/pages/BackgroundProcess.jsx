/**
 * @file BackgroundProcess.jsx
 * @description Admin-only background processing management page. Provides manual
 * and automatic document processing triggers, real-time status polling, processing
 * history with per-document results, document filtering, and dry-run capabilities.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Eye, FileText, X, CheckSquare, Square, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User, Paperless } from '@/api/entities';
import { apiClient } from "@/api/apiClient";
import API_BASE_URL from '@/config/api';
import PaperlessFilterBar from "@/components/PaperlessFilterBar";
import DocumentListSection from '@/components/DocumentListSection';
import PageLayout from "@/components/PageLayout";
import { useLanguage } from '@/contexts/LanguageContext';

export default function BackgroundProcess() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processingHistory, setProcessingHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(20);
  const [matchingDocuments, setMatchingDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [currentDryRun, setCurrentDryRun] = useState(null);
  const [backgroundSettings, setBackgroundSettings] = useState(null);
  
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  
  const [filters, setFilters] = useState({
    title: '',
    tagStates: {},
    tagsLogic: 'any',
    tagsSearch: '',
    correspondents: [],
    correspondentsMode: 'include',
    correspondentsSearch: '',
    docTypes: [],
    docTypesMode: 'include',
    docTypesSearch: '',
    dateFrom: '',
    dateTo: '',
    limit: 100
  });

  // Load current user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Verify admin access and load data; redirect non-admins to Dashboard
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'admin') {
        toast({
          title: t('backgroundProcess.accessDenied'),
          description: t('backgroundProcess.adminOnly'),
          variant: 'destructive',
          duration: 3000,
        });
        navigate('/Dashboard');
      } else {
        // Only load data if user is admin
        loadStatus();
        loadHistory();
        loadCacheData();
        loadBackgroundSettings();
      }
    }
  }, [currentUser, navigate, toast]);

  // Track previous processing status to detect idle→running→idle transitions
  const previousStatusRef = useRef('idle');
  
  // Poll processing status every 3s; auto-refresh history when processing completes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    let intervalId = null;
    let isMounted = true;
    
    const pollStatus = async () => {
      if (!isMounted) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/background/status`, {
          credentials: 'include'
        });
        
        if (response.ok && isMounted) {
          const data = await response.json();
          
          // Detect transition from running to idle using ref
          console.log(`Polling status: prev=${previousStatusRef.current}, current=${data.status}`);
          if (previousStatusRef.current === 'running' && data.status === 'idle') {
            // Processing just completed - refresh history
            console.log('✓ Processing completed, refreshing history...');
            loadHistory();
          }
          
          // Update ref with new status
          previousStatusRef.current = data.status;
          setProcessingStatus(data);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    // Start polling immediately, then every 3 seconds
    pollStatus();
    intervalId = setInterval(pollStatus, 3000);
    
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser]); // Only depend on currentUser to avoid restarting polling

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/status`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessingStatus(data);
        // Initialize previousStatusRef for polling transition detection
        previousStatusRef.current = data.status;
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/history?limit=${historyLimit}&offset=${(historyPage - 1) * historyLimit}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessingHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadBackgroundSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/settings`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackgroundSettings(data);
      }
    } catch (error) {
      console.error('Error loading background settings:', error);
    }
  };

  const loadCacheData = async () => {
    try {
      const [tags, correspondents, docTypes] = await Promise.all([
        Paperless.getTags(),
        Paperless.getCorrespondents(),
        Paperless.getDocumentTypes()
      ]);
      setAllTags(tags.map(t => ({ name: t.name, color: t.color })).sort((a, b) => a.name.localeCompare(b.name)));
      setAllCorrespondents(correspondents.map(c => c.name).sort());
      setAllDocTypes(docTypes.map(dt => dt.name).sort());
    } catch (error) {
      console.error('Error loading cache data:', error);
    }
  };

  const loadMatchingDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const params = new URLSearchParams();
      
      // Build query params from filters
      if (filters.title) params.append('title', filters.title);
      
      // Convert tri-state tagStates to backend format
      const includedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'include')
        .map(([tag, _]) => tag);
      const excludedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'exclude')
        .map(([tag, _]) => tag);
      
      if (includedTags.length > 0) params.append('tags', includedTags.join(','));
      if (filters.tagsLogic) params.append('tags_mode', filters.tagsLogic);
      if (excludedTags.length > 0) params.append('exclude_tags', excludedTags.join(','));
      
      if (filters.correspondents.length > 0) params.append('correspondents', filters.correspondents.join(','));
      if (filters.correspondentsMode) params.append('correspondents_mode', filters.correspondentsMode);
      if (filters.docTypes.length > 0) params.append('doc_types', filters.docTypes.join(','));
      if (filters.docTypesMode) params.append('doc_types_mode', filters.docTypesMode);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await fetch(`${API_BASE_URL}/api/documents?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setMatchingDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading matching documents:', error);
      setMatchingDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Load matching documents when filters change
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadMatchingDocuments();
    }
  }, [filters, currentUser]);

  // Clear selection when documents change
  useEffect(() => {
    setSelectedDocuments([]);
    setAllSelected(false);
  }, [matchingDocuments]);

  const handleTrigger = async () => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can trigger background processing',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/background/trigger`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Trigger failed');

      const data = await response.json();
      toast({
        title: 'Processing Triggered',
        description: data.message || 'Background processing has been triggered',
        duration: 3000,
      });

      await loadStatus();
      await loadHistory();
    } catch (error) {
      toast({
        title: 'Trigger Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Run manual processing (dry-run or real) with current filter/selection criteria
  const handleManualProcess = async (dryRunMode) => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can manually process documents',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setCurrentDryRun(dryRunMode);
    try {
      // Convert tri-state tagStates to backend format
      const includedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'include')
        .map(([tag, _]) => tag);
      const excludedTags = Object.entries(filters.tagStates || {})
        .filter(([_, state]) => state === 'exclude')
        .map(([tag, _]) => tag);
      
      const response = await fetch(`${API_BASE_URL}/api/background/process`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters: {
            title: filters.title || null,
            tags: includedTags.length > 0 ? includedTags : null,
            tags_mode: filters.tagsLogic,
            exclude_tags: excludedTags.length > 0 ? excludedTags : null,
            correspondents: filters.correspondents.length > 0 ? filters.correspondents : null,
            correspondents_mode: filters.correspondentsMode,
            doc_types: filters.docTypes.length > 0 ? filters.docTypes : null,
            doc_types_mode: filters.docTypesMode,
            date_from: filters.dateFrom || null,
            date_to: filters.dateTo || null,
            document_ids: selectedDocuments.length > 0 ? selectedDocuments : null,
          },
          dry_run: dryRunMode
        })
      });

      if (!response.ok) throw new Error('Manual processing failed');

      const data = await response.json();
      toast({
        title: dryRunMode ? t('backgroundProcess.dryRunComplete') : t('backgroundProcess.processingComplete'),
        description: `${data.documents_found || 0} documents found, ${data.classified || 0} classified, ${data.rules_applied || 0} rules applied`,
        duration: 5000,
      });

      // Refresh history immediately after processing completes (both dry run and real run)
      await loadHistory();
    } catch (error) {
      toast({
        title: t('backgroundProcess.processingFailed'),
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setCurrentDryRun(null);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      title: '',
      tagStates: {},
      tagsLogic: 'any',
      tagsSearch: '',
      correspondents: [],
      correspondentsMode: 'include',
      correspondentsSearch: '',
      docTypes: [],
      docTypesMode: 'include',
      docTypesSearch: '',
      dateFrom: '',
      dateTo: '',
      limit: 100
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
             ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocuments([]);
      setAllSelected(false);
    } else {
      setSelectedDocuments(matchingDocuments.map(doc => doc.id));
      setAllSelected(true);
    }
  };

  const toggleDocumentSelection = (docId) => {
    if (selectedDocuments.includes(docId)) {
      setSelectedDocuments(selectedDocuments.filter(id => id !== docId));
      setAllSelected(false);
    } else {
      const newSelected = [...selectedDocuments, docId];
      setSelectedDocuments(newSelected);
      setAllSelected(newSelected.length === matchingDocuments.length);
    }
  };

  const handleViewOCR = async (doc) => {
    try {
      const response = await apiClient.get(`/documents/${doc.id}/content`);
      setOcrDocumentTitle(doc.title);
      setOcrContent(response.content || 'No OCR content available');
      setOcrModalOpen(true);
    } catch (error) {
      console.error('Error loading OCR:', error);
      setOcrDocumentTitle(doc.title);
      setOcrContent(doc.content || 'No OCR content available');
      setOcrModalOpen(true);
    }
  };

  const handleViewPDF = (doc) => {
    const url = `/api/documents/${doc.id}/preview`;
    window.open(url, '_blank');
  };

  // Render a styled badge based on how the processing run was triggered
  const getTriggerTypeBadge = (triggerType) => {
    switch (triggerType) {
      case 'manual_dry_run':
        return <Badge style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' }}>{t('backgroundProcess.dryRun')}</Badge>;
      case 'manual_run':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Run</Badge>;
      case 'automatic':
        return <Badge style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>Automatic</Badge>;
      default:
        return <Badge style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>{triggerType || 'Unknown'}</Badge>;
    }
  };

  const getClassificationBadge = (classification) => {
    if (classification === 'POCO+') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">POCO+</Badge>;
    } else if (classification === 'POCO-') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">POCO-</Badge>;
    }
    return <Badge style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>{classification}</Badge>;
  };

  const isAdmin = currentUser?.role === 'admin';

  // Don't render until we know the user role
  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--info-text)' }} />
        </div>
      </div>
    );
  }

  // This should never render for non-admins due to redirect, but extra safety
  if (!isAdmin) {
    return null;
  }

  return (
    <PageLayout 
      title={t('nav.backgroundProcess')}
      subtitle={t('backgroundProcess.subtitle')}
      actions={
        <div className="flex flex-col items-end">
          <Button
            onClick={handleTrigger}
            disabled={loading || processingStatus?.is_processing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? t('backgroundProcess.triggering') : t('processing.trigger') + ' Now'}
          </Button>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>{t('backgroundProcess.autoDiscover')}</p>
        </div>
      }
    >

      {/* Info Section */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--info-text)' }} />
          <div className="text-sm" style={{ color: 'var(--info-text)' }}>
            <p className="font-medium mb-2">{t('backgroundProcess.whatIsThisFor')}</p>
            <p className="mb-3">{t('backgroundProcess.description')}</p>
            <p className="text-xs">
              <strong>{t('backgroundProcess.triggerNow')}</strong> {t('backgroundProcess.triggerNowDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('processing.status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processingStatus ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('processing.status')}:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    processingStatus.enabled 
                      ? 'bg-green-100 text-green-800' : ''
                  }`}
                  style={!processingStatus.enabled ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' } : undefined}>
                    {processingStatus.enabled ? t('processing.enabled') : t('processing.disabled')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('processing.processing')}:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    processingStatus.is_processing 
                      ? '' : ''
                  }`}
                  style={processingStatus.is_processing ? { backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' } : { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>
                    {processingStatus.is_processing ? t('processing.active') : t('processing.idle')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('processing.lastRun')}:</span>
                  <span className="text-sm" style={{ color: 'var(--app-text)' }}>
                    {processingStatus.last_run ? formatDate(processingStatus.last_run) : t('processing.never')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('processing.documentsProcessed')}:</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
                    {processingStatus.documents_processed || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8" style={{ color: 'var(--app-text-muted)' }}>
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                {t('processing.loadingStatus')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('backgroundProcess.quickStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('backgroundProcess.totalRuns')}:</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
                  {processingHistory.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('backgroundProcess.successful')}:</span>
                <span className="text-sm font-semibold text-green-600">
                  {processingHistory.filter(h => h.status === 'success').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{t('backgroundProcess.failed')}:</span>
                <span className="text-sm font-semibold text-red-600">
                  {processingHistory.filter(h => h.status === 'error').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('backgroundProcess.manualProcessing')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: 'var(--app-text-secondary)' }}>
            {t('backgroundProcess.testRulesAgainst')}
          </p>
        </CardContent>
      </Card>

      <DocumentListSection
        title={`${t('backgroundProcess.matchingDocuments')} (${matchingDocuments.length})`}
        documents={matchingDocuments}
        isLoading={loadingDocuments}
        filters={filters}
        onFiltersChange={setFilters}
        selectedDocuments={selectedDocuments}
        onSelectionChange={toggleDocumentSelection}
        allSelected={allSelected}
        onSelectAllChange={toggleSelectAll}
        allTags={allTags}
        allCorrespondents={allCorrespondents}
        allDocTypes={allDocTypes}
        showSelectionCheckboxes={true}
        showOwnerColumn={true}
        onViewOCR={handleViewOCR}
        onViewPDF={handleViewPDF}
        noDocumentsMessage={t('backgroundProcess.noDocumentsMatch')}
        cardClassName="mb-8"
      />

      <Card className="mb-8">
        <CardContent className="pt-6">

          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--app-text)' }}>{t('backgroundProcess.processingActions')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Dry Run Button */}
              <div className="flex flex-col">
                <Button
                  onClick={() => handleManualProcess(true)}
                  disabled={loading || matchingDocuments.length === 0}
                  className="flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' }}
                  onMouseEnter={(e) => !loading && matchingDocuments.length > 0 && (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => !loading && matchingDocuments.length > 0 && (e.currentTarget.style.opacity = '1')}
                >
                  <Play className="w-4 h-4" />
                  {loading && currentDryRun === true ? t('backgroundProcess.testing') : t('processing.dryRun')}
                </Button>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--app-text-muted)' }}>
                  {t('backgroundProcess.testAllRules')}
                </p>
              </div>

              {/* Run Button */}
              <div className="flex flex-col">
                <Button
                  onClick={() => {
                    if (window.confirm(t('backgroundProcess.warningMessage'))) {
                      handleManualProcess(false);
                    }
                  }}
                  disabled={loading || matchingDocuments.length === 0}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <Play className="w-4 h-4" />
                  {loading && currentDryRun === false ? t('backgroundProcess.running') : t('backgroundProcess.run')}
                </Button>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--app-text-muted)' }}>
                  {t('backgroundProcess.applyRulesToPaperless')}
                </p>
              </div>
            </div>
            
          <div className="mt-4 p-3 rounded text-xs" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', color: 'var(--info-text)' }}>
            <strong>{t('common.note')}:</strong> {t('backgroundProcess.dryRunNote')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('processing.history')}
            {backgroundSettings && (
              <span className="text-sm font-normal ml-2" style={{ color: 'var(--app-text-muted)' }}>
                ({t('backgroundProcess.retention')}: {backgroundSettings.history_retention_type === 'days' 
                  ? `${backgroundSettings.history_retention_days || 365} ${t('backgroundProcess.days')}`
                  : `${backgroundSettings.history_retention_count || 100} ${t('backgroundProcess.runs')}`})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processingHistory.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--app-text-muted)' }}>
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--app-text-muted)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{t('backgroundProcess.noProcessingHistory')}</h3>
              <p style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.processingRunsAppear')}</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-1">
              {processingHistory.map((entry) => (
                <AccordionItem key={entry.id} value={`run-${entry.id}`} className="border rounded-lg">
                  <AccordionTrigger 
                    className="px-3 py-1.5 hover:no-underline"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        {getTriggerTypeBadge(entry.trigger_type)}
                        {entry.status === 'completed' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        ) : entry.status === 'failed' ? (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-6 gap-2 text-xs">
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.started')}</div>
                          <div className="font-medium">{formatDateTime(entry.started_at)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.documents')}</div>
                          <div className="font-medium">{entry.documents_found || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.classified')}</div>
                          <div className="font-medium text-green-600">{entry.documents_classified || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.skipped')}</div>
                          <div className="font-medium" style={{ color: 'var(--app-text-secondary)' }}>{entry.documents_skipped || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.rulesApplied')}</div>
                          <div className="font-medium">{entry.rules_applied || 0}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--app-text-muted)' }}>{t('backgroundProcess.table.status')}</div>
                          <div className="font-medium">{entry.status}</div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2">
                    {entry.details && entry.details.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        <div className="grid grid-cols-1 gap-1 max-h-96 overflow-y-auto">
                          {entry.details.map((detail) => (
                            <div key={detail.id} className="border rounded px-2 py-1" style={{ backgroundColor: 'var(--app-bg-secondary)', borderColor: 'var(--app-border)' }}>
                              <div className="flex items-center justify-between gap-3">
                                {/* Left side: Document info in one compact line */}
                                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-xs">
                                  <span className="font-medium truncate max-w-xs" style={{ color: 'var(--app-text)' }}>
                                    {detail.document_title || `Document #${detail.document_id}`}
                                  </span>
                                  {detail.document_created && (
                                    <>
                                      <span style={{ color: 'var(--app-text-muted)' }}>•</span>
                                      <span style={{ color: 'var(--app-text-muted)' }}>
                                        {t('backgroundProcess.table.created')} {formatDate(detail.document_created)}
                                      </span>
                                    </>
                                  )}
                                  <span style={{ color: 'var(--app-text-muted)' }}>•</span>
                                  <span style={{ color: 'var(--app-text-secondary)' }}>
                                    {detail.rule_name || t('backgroundProcess.table.noMatch')}
                                  </span>
                                  <span style={{ color: 'var(--app-text-muted)' }}>•</span>
                                  <span style={{ color: 'var(--app-text-secondary)' }}>
                                    POCO: {detail.poco_score?.toFixed(1) || 0}% / OCR: {detail.ocr_score?.toFixed(1) || 0}%
                                  </span>
                                  {detail.metadata_applied && detail.metadata_applied.length > 0 && (
                                    <>
                                      <span style={{ color: 'var(--app-text-muted)' }}>•</span>
                                      {detail.metadata_applied.map((item, idx) => {
                                        // Handle both new object format and old string format
                                        let label, value, needsUpdate;
                                        
                                        if (typeof item === 'object' && item.label && item.value !== undefined) {
                                          // New structured format
                                          label = item.label;
                                          value = item.value;
                                          needsUpdate = item.needsUpdate;
                                        } else {
                                          // Old string format (backward compatibility)
                                          const colonIndex = item.indexOf(':');
                                          if (colonIndex === -1) {
                                            return <span key={idx} style={{ color: 'var(--app-text-secondary)' }}>{item}</span>;
                                          }
                                          label = item.substring(0, colonIndex);
                                          value = item.substring(colonIndex + 1).trim();
                                          needsUpdate = true; // Assume old format always needs update
                                        }
                                        
                                        // Map label to translation key
                                        const getTranslatedLabel = (labelText) => {
                                          const labelMap = {
                                            'Title': t('backgroundProcess.metadata.fieldTitle'),
                                            'Correspondent': t('backgroundProcess.metadata.fieldCorrespondent'),
                                            'Doc Type': t('backgroundProcess.metadata.fieldDocType'),
                                            'Tags': t('backgroundProcess.metadata.fieldTags'),
                                            'Date': t('backgroundProcess.metadata.fieldDate'),
                                            'Storage Path': t('backgroundProcess.metadata.fieldStoragePath'),
                                            'Document Category': t('backgroundProcess.metadata.fieldDocumentCategory'),
                                            'date_created': t('backgroundProcess.metadata.dateCreated')
                                          };
                                          return labelMap[labelText] || labelText;
                                        };
                                        
                                        const getValueStyle = (labelText) => {
                                          if (labelText.includes('Title')) return { color: 'var(--warning-text)' };
                                          if (labelText.includes('Correspondent')) return { color: 'var(--success-text)' };
                                          if (labelText.includes('Doc Type')) return { color: 'var(--warning-text)' };
                                          if (labelText.includes('Tags')) return { color: 'var(--info-text)' };
                                          if (labelText.includes('Date')) return { color: 'var(--app-primary)' };
                                          return { color: 'var(--info-text)' };
                                        };
                                        
                                        const translatedLabel = getTranslatedLabel(label);
                                        
                                        return (
                                          <span key={idx}>
                                            {idx > 0 && <span className="mx-1" style={{ color: 'var(--app-text-muted)' }}>|</span>}
                                            <span style={{ color: 'var(--app-text-muted)' }}>{translatedLabel}:</span>
                                            <span style={{ color: 'var(--app-text-muted)' }}> </span>
                                            <span className={needsUpdate ? 'font-medium' : ''} style={needsUpdate ? { ...getValueStyle(label) } : { color: 'var(--app-text-muted)' }}>
                                              {value}
                                            </span>
                                          </span>
                                        );
                                      })}
                                    </>
                                  )}
                                </div>
                                {/* Right side: Badges */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getClassificationBadge(detail.classification)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-center py-4" style={{ color: 'var(--app-text-muted)' }}>
                        {t('backgroundProcess.table.noDetails')}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* OCR Content Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--app-surface)' }}>
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--app-border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>OCR Content: {ocrDocumentTitle}</h2>
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="p-4 rounded border flex" style={{ backgroundColor: 'var(--app-bg-secondary)', borderColor: 'var(--app-border)' }}>
                <div className="pr-4 border-r text-right select-none" style={{ borderColor: 'var(--app-border)' }}>
                  <pre className="text-sm font-mono leading-relaxed" style={{ color: 'var(--app-text-muted)' }}>
                    {ocrContent.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                </div>
                <div className="flex-1 pl-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {ocrContent}
                  </pre>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
