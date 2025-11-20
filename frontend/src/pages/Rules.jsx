import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rule, Document, Paperless } from "@/api/entities";
import { DeletedRule } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Pencil, Trash2, Copy, Power, PowerOff, Search, ArrowUpDown, Eye, X } from 'lucide-react';
import API_BASE_URL from '@/config/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ToastContainer';
import ConfirmDialog from '@/components/ConfirmDialog';
import YamlExportButton from '@/components/YamlExportButton';
import TrashCanModal from '@/components/TrashCanModal';
import PaperlessFilterBar from '@/components/PaperlessFilterBar';
import DocumentListSection from '@/components/DocumentListSection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageLayout from '@/components/PageLayout';

export default function Rules() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_newest');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRules, setSelectedRules] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [trashCanModal, setTrashCanModal] = useState(false);
  
  // Document-related state
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrContent, setOcrContent] = useState('');
  const [ocrDocumentTitle, setOcrDocumentTitle] = useState('');
  
  // Cache data for filters
  const [allTags, setAllTags] = useState([]);
  const [allCorrespondents, setAllCorrespondents] = useState([]);
  const [allDocTypes, setAllDocTypes] = useState([]);
  
  // Consolidated filter state (new Paperless style)
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
    limit: 10
  });
  
  const ITEMS_PER_PAGE = 10;

  // Load rules only once on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadRules = async () => {
      setIsLoading(true);
      try {
        const fetchedRules = await Rule.list();
        if (isMounted) {
          setRules(fetchedRules);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading rules:', error);
          if (error.message && error.message.includes('Rate limit')) {
            showToast(t('toasts.tooManyRequests'), 'warning');
          } else {
            showToast(t('toasts.errorLoadingRules'), 'error');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadRules();
    
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Load documents and cache data on mount
  useEffect(() => {
    loadDocuments();
    loadCacheData();
  }, []);
  
  // Reload documents when filters change
  useEffect(() => {
    loadDocuments();
  }, [filters]);

  // Reload function for after CRUD operations
  const reloadRules = useCallback(async () => {
    try {
      const fetchedRules = await Rule.list();
      setRules(fetchedRules);
    } catch (error) {
      console.error('Error reloading rules:', error);
      showToast('Error reloading rules', 'error');
    }
  }, [showToast]);

  // Document-related functions
  const loadDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const params = new URLSearchParams();
      
      // Add filters to query
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
      
      const sessionToken = localStorage.getItem('pococlass_session');
      const apiUrl = `${API_BASE_URL}/api/documents?${params.toString()}`;
      console.log('[Documents] Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      console.log('[Documents] API Response status:', response.status, response.statusText);
      
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      console.log('[Documents] API Response data:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        count: data.count || 0,
        resultsCount: data.results?.length || 0,
        hasNext: data.next ? 'yes' : 'no',
        hasPrevious: data.previous ? 'yes' : 'no',
        fullData: data
      });
      
      // Backend returns flat array, not paginated response
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]);
    }
    setIsLoadingDocuments(false);
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
      console.error("Error loading cache data:", error);
    }
  };

  const handleCreateRuleForDocument = (doc) => {
    // Navigate to RuleEditor with document ID and filename for preview buttons
    const fileName = encodeURIComponent(doc.title || doc.originalFileName || 'Document');
    window.location.href = createPageUrl('RuleEditor') + `?docId=${doc.id}&selectedFile=${fileName}`;
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
    // Get session token and pass it as query parameter for new tab
    const sessionToken = localStorage.getItem('pococlass_session');
    const url = `/api/documents/${doc.id}/preview?token=${encodeURIComponent(sessionToken)}`;
    window.open(url, '_blank');
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
      limit: 10
    });
  };

  // Apply filters and sorting using useMemo to avoid unnecessary recalculations
  const filteredRules = useMemo(() => {
    let filtered = [...rules];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(rule => 
        rule.ruleName?.toLowerCase().includes(searchLower) ||
        rule.ruleId?.toLowerCase().includes(searchLower) ||
        rule.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(rule => rule.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.ruleName || '').localeCompare(b.ruleName || '');
        case 'name_desc':
          return (b.ruleName || '').localeCompare(a.ruleName || '');
        case 'date_newest':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'date_oldest':
          return new Date(a.created_date) - new Date(b.created_date);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [rules, searchTerm, sortBy, filterStatus]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterStatus]);

  const handleDelete = async (ruleId) => {
    const rule = rules.find(r => r.id === ruleId);
    
    // Protect template_v2 from deletion
    if (rule.ruleId === 'template_v2') {
      showToast(t('toasts.templateProtected'), 'error');
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: t('dialogs.deleteRule.title'),
      message: t('dialogs.deleteRule.message', { ruleName: rule.ruleName }),
      onConfirm: async () => {
        try {
          // Delete the rule (backend moves it to deleted folder)
          await Rule.delete(ruleId);
          showToast(t('toasts.ruleDeleted', { ruleName: rule.ruleName }), 'success');
          await reloadRules();
        } catch (error) {
          console.error('Error deleting rule:', error);
          showToast(t('toasts.ruleDeleteError'), 'error');
        }
        setConfirmDialog({ isOpen: false });
      },
      onClose: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleDuplicate = async (rule) => {
    try {
      const duplicateData = {
        ...rule,
        ruleName: `${rule.ruleName} (Copy)`,
        ruleId: `${rule.ruleId}_copy_${Date.now()}`,
        status: 'new'
      };
      delete duplicateData.id;
      delete duplicateData.created_date;
      delete duplicateData.updated_date;
      delete duplicateData.created_by;
      
      await Rule.create(duplicateData);
      showToast(t('toasts.ruleDuplicated'), 'success');
      await reloadRules();
    } catch (error) {
      console.error('Error duplicating rule:', error);
      showToast(t('toasts.ruleDuplicateError'), 'error');
    }
  };

  const handleToggleStatus = async (rule) => {
    const isCurrentlyActive = rule.status === 'active';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
    
    if (!isCurrentlyActive) {
      const confirmed = window.confirm(
        `⚠️ WARNING: Activating this rule will allow it to automatically process documents in your Paperless archive.\n\nRule: ${rule.ruleName}\n\nActive rules will be applied during:\n• Background processing (when triggered)\n• Manual "Run" operations\n\nAre you sure you want to activate this rule?`
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    try {
      await Rule.update(rule.id, { ...rule, status: newStatus });
      const message = isCurrentlyActive 
        ? t('toasts.ruleDeactivated', { ruleName: rule.ruleName })
        : t('toasts.ruleActivated', { ruleName: rule.ruleName });
      showToast(message, 'success');
      await reloadRules();
    } catch (error) {
      console.error('Error toggling rule status:', error);
      showToast(t('toasts.ruleStatusError'), 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRules.length === 0) return;

    if (action === 'delete') {
      setConfirmDialog({
        isOpen: true,
        title: t('dialogs.deleteMultiple.title', { count: selectedRules.length }),
        message: t('dialogs.deleteMultiple.message'),
        onConfirm: async () => {
          try {
            // Filter out protected rules
            const rulesToDelete = selectedRules.filter(id => {
              const rule = rules.find(r => r.id === id);
              return rule.ruleId !== 'template_v2';
            });
            
            const protectedCount = selectedRules.length - rulesToDelete.length;
            
            // Delete all non-protected rules (backend moves to deleted folder)
            await Promise.all(rulesToDelete.map(id => Rule.delete(id)));
            
            if (protectedCount > 0) {
              showToast(t('toasts.rulesDeletedWithSkipped', { count: rulesToDelete.length, skipped: protectedCount }), 'warning');
            } else {
              showToast(t('toasts.rulesDeleted', { count: rulesToDelete.length }), 'success');
            }
            setSelectedRules([]);
            await reloadRules();
          } catch (error) {
            console.error('Bulk delete error:', error);
            showToast(t('toasts.rulesDeleteError'), 'error');
          }
          setConfirmDialog({ isOpen: false });
        },
        onClose: () => setConfirmDialog({ isOpen: false })
      });
    } else if (action === 'activate' || action === 'deactivate') {
      const newStatus = action === 'activate' ? 'active' : 'inactive';
      
      const dialogKey = action === 'activate' ? 'activateRules' : 'deactivateRules';

      setConfirmDialog({
        isOpen: true,
        title: t(`dialogs.${dialogKey}.title`, { count: selectedRules.length }),
        message: t(`dialogs.${dialogKey}.message`),
        variant: 'info',
        onConfirm: async () => {
          try{
            await Promise.all(
              selectedRules.map(id => {
                const rule = rules.find(r => r.id === id);
                return Rule.update(id, { ...rule, status: newStatus });
              })
            );
            const toastKey = action === 'activate' ? 'rulesActivated' : 'rulesDeactivated';
            showToast(t(`toasts.${toastKey}`, { count: selectedRules.length }), 'success');
            setSelectedRules([]);
            await reloadRules();
          } catch (error) {
            console.error('Bulk status update error:', error);
            showToast(t('toasts.rulesStatusError'), 'error');
          }
          setConfirmDialog({ isOpen: false });
        },
        onClose: () => setConfirmDialog({ isOpen: false })
      });
    }
  };

  const toggleRuleSelection = (ruleId) => {
    setSelectedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRules.length === paginatedRules.length && paginatedRules.length > 0) {
      setSelectedRules([]);
    } else {
      setSelectedRules(paginatedRules.map(r => r.id));
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE);
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--app-primary)' }}></div>
        <span className="sr-only">Loading rules...</span>
      </div>
    );
  }

  return (
    <PageLayout
      title={t('rules.title')}
      subtitle={t('rules.subtitle')}
      actions={
        <>
          <button 
            onClick={() => setTrashCanModal(true)}
            className="btn btn-secondary"
            aria-label="Open trash can"
          >
            <Trash2 className="w-5 h-5" />
            {t('rulesPage.trash')}
          </button>
          <button 
            onClick={() => navigate(createPageUrl('RuleEditor'))}
            className="btn btn-primary"
            aria-label="Create new rule"
          >
            <Plus className="w-5 h-5" />
            {t('rules.createNew')}
          </button>
        </>
      }
    >
      {/* Warning banner about rule activation */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
        <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
          <strong>⚠️ {t('warnings.ruleActivationWarning')}</strong>
        </p>
      </div>

        {/* Search, Filter, Sort Bar */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none z-10" aria-hidden="true" style={{ color: 'var(--app-text-muted)' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('placeholders.searchRules')}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none"
                  style={{ paddingLeft: '2.5rem', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                  aria-label="Search rules by name, ID, or description"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none pr-10 appearance-none"
                style={{ paddingRight: '2.5rem', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
                aria-label="Filter rules by status"
              >
                <option value="all">{t('filters.allStatus')}</option>
                <option value="active">{t('status.active')}</option>
                <option value="new">New</option>
                <option value="inactive">{t('status.inactive')}</option>
              </select>
            </div>

            <div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none z-10" aria-hidden="true" style={{ color: 'var(--app-text-muted)' }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none pl-10 appearance-none"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text)' }}
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                  aria-label="Sort rules"
                >
                  <option value="date_newest">{t('filters.newestFirst')}</option>
                  <option value="date_oldest">{t('filters.oldestFirst')}</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions - Fixed height to prevent layout jumping */}
        <div className="mb-6" style={{ minHeight: selectedRules.length > 0 ? 'auto' : '0' }}>
          {selectedRules.length > 0 && (
            <div className="card" style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--info-text)' }}>
                  {selectedRules.length} rule(s) selected
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleBulkAction('activate')} 
                    className="btn btn-secondary btn-sm"
                    aria-label="Activate selected rules"
                  >
                    <Power className="w-4 h-4" />
                    {t('rulesPage.activate')}
                  </button>
                  <button 
                    onClick={() => handleBulkAction('deactivate')} 
                    className="btn btn-secondary btn-sm"
                    aria-label="Deactivate selected rules"
                  >
                    <PowerOff className="w-4 h-4" />
                    {t('rulesPage.deactivate')}
                  </button>
                  <button 
                    onClick={() => handleBulkAction('delete')} 
                    className="btn btn-secondary btn-sm text-red-600"
                    aria-label="Delete selected rules"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-20 h-20 mx-auto mb-4" aria-hidden="true" style={{ color: 'var(--app-text-muted)' }} />
          <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--app-text-secondary)' }}>{t('rules.noRules')}</h3>
          <p className="mb-6" style={{ color: 'var(--app-text-muted)' }}>{t('rules.createFirstRuleDesc')}</p>
          <button 
            onClick={() => navigate(createPageUrl('RuleEditor'))}
            className="btn btn-primary"
            aria-label="Create your first rule"
          >
            <Plus className="w-5 h-5" />
            {t('rules.createNew')}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: 'var(--app-surface)' }}>
            <table className="w-full" role="table" aria-label="Rules table">
              <thead style={{ backgroundColor: 'var(--app-bg-secondary)', borderBottom: '1px solid var(--app-border)' }}>
                <tr>
                  <th className="px-4 py-3 text-left w-12" scope="col">
                    <input
                      type="checkbox"
                      checked={selectedRules.length === paginatedRules.length && paginatedRules.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                      aria-label="Select all rules on this page"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('rules.ruleName')}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('rules.ruleId')}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('table.sourceDocument')}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('rules.status')}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('rules.threshold')}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('table.created')}</th>
                  <th className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--app-text-secondary)' }} scope="col">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid var(--app-border)' }}>
                {paginatedRules.map((rule) => (
                  <tr key={rule.id} className="transition-colors" style={{ borderBottom: '1px solid var(--app-border)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--app-bg-secondary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRules.includes(rule.id)}
                        onChange={() => toggleRuleSelection(rule.id)}
                        className="w-4 h-4"
                        aria-label={`Select rule ${rule.ruleName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--app-text)' }}>{rule.ruleName}</div>
                      {rule.description && (
                        <div className="text-sm truncate max-w-md" style={{ color: 'var(--app-text-secondary)' }}>{rule.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' }}>{rule.ruleId}</code>
                    </td>
                    <td className="px-4 py-3">
                      {rule.source_document_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono" style={{ color: 'var(--app-text)' }}>{rule.source_document_id}</span>
                          <span className="text-xs" style={{ color: 'var(--app-text-secondary)' }}>({t('filters.searchPlaceholder') === 'Rechercher...' ? 'ID Paperless' : 'Paperless ID'})</span>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        rule.status === 'active' ? 'bg-green-100 text-green-800' :
                        rule.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : ''
                      }`}
                      style={!['active', 'draft'].includes(rule.status) ? { backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text)' } : undefined}>
                        {rule.status ? rule.status.charAt(0).toUpperCase() + rule.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--app-text)' }}>
                      {rule.threshold}%
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                      {rule.created_date ? new Date(rule.created_date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(rule)}
                          className={`btn btn-ghost btn-sm ${
                            rule.status === 'active' ? 'text-green-600' : ''
                          }`}
                          style={rule.status !== 'active' ? { color: 'var(--app-text-muted)' } : undefined}
                          title={rule.status === 'active' ? t('rules.disableRule') : t('rules.enableRule')}
                          aria-label={rule.status === 'active' ? `${t('rules.disableRule')} ${rule.ruleName}` : `${t('rules.enableRule')} ${rule.ruleName}`}
                        >
                          {rule.status === 'active' ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <PowerOff className="w-4 h-4" />
                          )}
                        </button>
                        <YamlExportButton ruleData={rule} buttonStyle="ghost" />
                        <button 
                          onClick={() => navigate(createPageUrl('RuleEditor') + `?id=${rule.id}`)}
                          className="btn btn-ghost btn-sm"
                          title={t('common.edit')}
                          aria-label={`Edit rule ${rule.ruleName}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(rule)}
                          className="btn btn-ghost btn-sm"
                          title={t('rules.duplicateRule')}
                          aria-label={`${t('rules.duplicateRule')} ${rule.ruleName}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(rule.id)}
                          className="btn btn-ghost btn-sm text-red-500"
                          title={t('common.delete')}
                          aria-label={`Delete rule ${rule.ruleName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6" role="navigation" aria-label="Pagination">
              <div className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length)} of {filteredRules.length} rules
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  aria-label="Go to previous page"
                >
                  {t('common.previous')}
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                  aria-label="Go to next page"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Documents without Rules */}
      <DocumentListSection
        title={t('rules.documentsWithoutRules', { count: documents.length })}
        documents={documents}
        isLoading={isLoadingDocuments}
        filters={filters}
        onFiltersChange={setFilters}
        allTags={allTags}
        allCorrespondents={allCorrespondents}
        allDocTypes={allDocTypes}
        showSelectionCheckboxes={false}
        showOwnerColumn={true}
        onViewOCR={handleViewOCR}
        onViewPDF={handleViewPDF}
        onRowClick={setSelectedDocument}
        renderCustomActions={(doc) => (
          <button 
            className="btn btn-primary btn-sm"
            style={{ padding: '2px 8px', height: '22px', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleCreateRuleForDocument(doc);
            }}
          >
            {t('rules.newRule')}
          </button>
        )}
        cardClassName="mt-8"
      />

      {/* OCR Content Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--app-surface)' }}>
            <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid var(--app-border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>OCR Content: {ocrDocumentTitle}</h2>
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="p-4 rounded flex" style={{ backgroundColor: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)' }}>
                <div className="pr-4 text-right select-none" style={{ borderRight: '1px solid var(--app-border)' }}>
                  <pre className="text-sm font-mono leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>
                    {ocrContent.split('\n').map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </pre>
                </div>
                <div className="flex-1 pl-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed" style={{ color: 'var(--app-text)' }}>
                    {ocrContent}
                  </pre>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6" style={{ borderTop: '1px solid var(--app-border)' }}>
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialog} />
      <TrashCanModal
        isOpen={trashCanModal}
        onClose={() => setTrashCanModal(false)}
        onRestore={reloadRules}
      />
    </PageLayout>
  );
}