import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rule, Document, Paperless } from "@/api/entities";
import { DeletedRule } from "@/api/entities";
import { apiClient } from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Pencil, Trash2, Copy, Power, PowerOff, Search, ArrowUpDown, Eye, X } from 'lucide-react';
import API_BASE_URL from '@/config/api';
import { useTranslation } from '@/components/translations';
import { useToast } from '@/components/ToastContainer';
import ConfirmDialog from '@/components/ConfirmDialog';
import YamlExportButton from '@/components/YamlExportButton';
import TrashCanModal from '@/components/TrashCanModal';
import PaperlessFilterBar from '@/components/PaperlessFilterBar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Rules() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
            showToast('Too many requests. Please wait a moment.', 'warning');
          } else {
            showToast('Error loading rules', 'error');
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
      showToast('Template Rule v2 cannot be deleted', 'error');
      return;
    }
    
    setConfirmDialog({
      isOpen: true,
      title: t('rules_confirm_delete'),
      message: `Delete "${rule.ruleName}"? This rule will be moved to the deleted folder.`,
      onConfirm: async () => {
        try {
          // Delete the rule (backend moves it to deleted folder)
          await Rule.delete(ruleId);
          showToast(`Rule "${rule.ruleName}" moved to deleted folder`, 'success');
          await reloadRules();
        } catch (error) {
          console.error('Error deleting rule:', error);
          showToast('Error deleting rule', 'error');
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
      showToast('Rule duplicated successfully', 'success');
      await reloadRules();
    } catch (error) {
      console.error('Error duplicating rule:', error);
      showToast('Error duplicating rule', 'error');
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
        ? `Rule "${rule.ruleName}" deactivated`
        : `Rule "${rule.ruleName}" activated`;
      showToast(message, 'success');
      await reloadRules();
    } catch (error) {
      console.error('Error toggling rule status:', error);
      showToast('Error updating rule status', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRules.length === 0) return;

    if (action === 'delete') {
      setConfirmDialog({
        isOpen: true,
        title: `Delete ${selectedRules.length} rule(s)?`,
        message: 'Rules will be moved to the trash can.',
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
              showToast(`${rulesToDelete.length} rule(s) deleted. ${protectedCount} protected rule(s) skipped.`, 'warning');
            } else {
              showToast(`${rulesToDelete.length} rule(s) moved to deleted folder`, 'success');
            }
            setSelectedRules([]);
            await reloadRules();
          } catch (error) {
            console.error('Bulk delete error:', error);
            showToast('Error deleting rules', 'error');
          }
          setConfirmDialog({ isOpen: false });
        },
        onClose: () => setConfirmDialog({ isOpen: false })
      });
    } else if (action === 'activate' || action === 'deactivate') {
      const newStatus = action === 'activate' ? 'active' : 'inactive';
      
      // Check if activating draft rules
      let confirmMessage = action === 'activate' 
        ? `Activate ${selectedRules.length} rule(s)?`
        : `Deactivate ${selectedRules.length} rule(s)?`;
      
      let warningMessage = `${selectedRules.length} rule(s) will be ${newStatus}`;
      
      if (action === 'activate') {
        const newRules = selectedRules.filter(id => {
          const rule = rules.find(r => r.id === id);
          return rule && rule.status === 'new';
        });
        
        if (newRules.length > 0) {
          warningMessage = `⚠️ Warning: ${newRules.length} of ${selectedRules.length} selected rule(s) are in "new" status. Are you sure you want to activate them?`;
        }
      }

      setConfirmDialog({
        isOpen: true,
        title: confirmMessage,
        message: warningMessage,
        variant: 'info',
        onConfirm: async () => {
          try{
            await Promise.all(
              selectedRules.map(id => {
                const rule = rules.find(r => r.id === id);
                return Rule.update(id, { ...rule, status: newStatus });
              })
            );
            const successMessage = action === 'activate' 
              ? `${selectedRules.length} rule(s) activated`
              : `${selectedRules.length} rule(s) deactivated`;
            showToast(successMessage, 'success');
            setSelectedRules([]);
            await reloadRules();
          } catch (error) {
            console.error('Bulk status update error:', error);
            showToast('Error updating rules', 'error');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="sr-only">Loading rules...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('rules_title')}</h1>
              <p className="text-gray-500">{t('rules_subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setTrashCanModal(true)}
              className="btn btn-secondary"
              aria-label="Open trash can"
            >
              <Trash2 className="w-5 h-5" />
              Trash
            </button>
            <button 
              onClick={() => navigate(createPageUrl('RuleEditor'))}
              className="btn btn-primary"
              aria-label="Create new rule"
            >
              <Plus className="w-5 h-5" />
              {t('rules_create')}
            </button>
          </div>
        </div>

        {/* Warning banner about rule activation */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Rule Activation Warning:</strong> Active rules automatically process documents in your Paperless archive during background processing and manual "Run" operations. Only activate rules that you have thoroughly tested. Use the power icon (
            <Power className="w-3 h-3 inline mx-1" />) in each row to activate or deactivate rules directly.
          </p>
        </div>

        {/* Search, Filter, Sort Bar */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" aria-hidden="true" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('rules_search_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  style={{ paddingLeft: '2.5rem' }}
                  aria-label="Search rules by name, ID, or description"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 appearance-none bg-white"
                style={{ paddingRight: '2.5rem' }}
                aria-label="Filter rules by status"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="new">New</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" aria-hidden="true" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 appearance-none bg-white"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  aria-label="Sort rules"
                >
                  <option value="date_newest">Newest First</option>
                  <option value="date_oldest">Oldest First</option>
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
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-900">
                  {selectedRules.length} rule(s) selected
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleBulkAction('activate')} 
                    className="btn btn-secondary btn-sm"
                    aria-label="Activate selected rules"
                  >
                    <Power className="w-4 h-4" />
                    Activate
                  </button>
                  <button 
                    onClick={() => handleBulkAction('deactivate')} 
                    className="btn btn-secondary btn-sm"
                    aria-label="Deactivate selected rules"
                  >
                    <PowerOff className="w-4 h-4" />
                    Deactivate
                  </button>
                  <button 
                    onClick={() => handleBulkAction('delete')} 
                    className="btn btn-secondary btn-sm text-red-600"
                    aria-label="Delete selected rules"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-2xl font-semibold text-gray-700 mb-2">{t('rules_no_rules')}</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first classification rule</p>
          <button 
            onClick={() => navigate(createPageUrl('RuleEditor'))}
            className="btn btn-primary"
            aria-label="Create your first rule"
          >
            <Plus className="w-5 h-5" />
            {t('rules_create')}
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full" role="table" aria-label="Rules table">
              <thead className="bg-gray-50 border-b border-gray-200">
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Rule Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Rule ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Source Document</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">{t('common_status')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Threshold</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Created</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700" scope="col">{t('common_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
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
                      <div className="font-medium text-gray-900">{rule.ruleName}</div>
                      {rule.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{rule.ruleId}</code>
                    </td>
                    <td className="px-4 py-3">
                      {rule.source_document_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 font-mono">{rule.source_document_id}</span>
                          <span className="text-xs text-gray-500">(Paperless ID)</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        rule.status === 'active' ? 'bg-green-100 text-green-800' :
                        rule.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {t(`status_${rule.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {rule.threshold}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
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
                            rule.status === 'active' ? 'text-green-600' : 'text-gray-400'
                          }`}
                          title={rule.status === 'active' ? 'Deactivate rule' : 'Activate rule'}
                          aria-label={rule.status === 'active' ? `Deactivate rule ${rule.ruleName}` : `Activate rule ${rule.ruleName}`}
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
                          title={t('common_edit')}
                          aria-label={`Edit rule ${rule.ruleName}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(rule)}
                          className="btn btn-ghost btn-sm"
                          title={t('common_duplicate')}
                          aria-label={`Duplicate rule ${rule.ruleName}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(rule.id)}
                          className="btn btn-ghost btn-sm text-red-500"
                          title={t('common_delete')}
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
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredRules.length)} of {filteredRules.length} rules
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                  aria-label="Go to previous page"
                >
                  {t('common_previous')}
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
                  {t('common_next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Documents without Rules */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>
            Documents without Rules ({documents.length} found)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* New Paperless-style Filter Bar */}
          <PaperlessFilterBar
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            allTags={allTags}
            allCorrespondents={allCorrespondents}
            allDocTypes={allDocTypes}
            allCustomFields={[]}
          />
          
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <div className="text-gray-500 space-y-2">
                <p>No documents found. This could mean:</p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto">
                  <li>No documents exist in Paperless-ngx</li>
                  <li>All documents have been processed</li>
                  <li>Current filters are too restrictive</li>
                </ul>
                <p className="mt-4 text-sm">
                  Check the browser console for API response details.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Correspondent</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">CF: Doc Category</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">POCO Score</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">View</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="px-2 py-1 text-xs text-gray-900">{doc.title}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.id}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{formatDate(doc.added || doc.created)}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.correspondent || '-'}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.documentType || '-'}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">
                        {doc.custom_fields?.find(cf => cf.field === 'Document Category')?.value || '-'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {doc.tags && doc.tags.length > 0 ? (
                            doc.tags.map((tag, i) => {
                              const tagObj = allTags.find(t => t.name === tag);
                              const tagColor = tagObj?.color || '#3B82F6';
                              
                              const getTextColor = (hexColor) => {
                                const r = parseInt(hexColor.slice(1, 3), 16);
                                const g = parseInt(hexColor.slice(3, 5), 16);
                                const b = parseInt(hexColor.slice(5, 7), 16);
                                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                return luminance > 0.5 ? '#111827' : '#FFFFFF';
                              };
                              
                              return (
                                <Badge 
                                  key={i} 
                                  style={{ 
                                    backgroundColor: tagColor,
                                    color: getTextColor(tagColor)
                                  }}
                                >
                                  {tag}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-gray-400 text-xs">No tags</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-center">
                        {doc.pocoScore !== null && doc.pocoScore !== undefined ? (
                          <span className={`text-xs font-semibold ${
                            doc.pocoScore >= 80 ? 'text-green-600' : 
                            doc.pocoScore >= 1 ? 'text-amber-600' : 
                            'text-gray-400'
                          }`}>
                            {doc.pocoScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-500">{doc.owner || '-'}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex gap-2 justify-center items-center">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPDF(doc);
                            }}
                            title="View PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOCR(doc);
                            }}
                            title="View OCR Content"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className="flex justify-center">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateRuleForDocument(doc);
                            }}
                          >
                            + New Rule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Content Modal */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">OCR Content: {ocrDocumentTitle}</h2>
              <button onClick={() => setOcrModalOpen(false)} className="btn btn-ghost">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-gray-50 p-4 rounded border flex">
                <div className="pr-4 border-r border-gray-300 text-right select-none">
                  <pre className="text-sm font-mono text-gray-500 leading-relaxed">
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

      <ConfirmDialog {...confirmDialog} />
      <TrashCanModal
        isOpen={trashCanModal}
        onClose={() => setTrashCanModal(false)}
        onRestore={reloadRules}
      />
    </div>
  );
}