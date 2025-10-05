import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rule } from "@/api/entities";
import { DeletedRule } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { FileText, Plus, Pencil, Trash2, Copy, Power, PowerOff, Search, ArrowUpDown, PlayCircle } from 'lucide-react';
import { useTranslation } from '@/components/translations';
import { useToast } from '@/components/ToastContainer';
import ConfirmDialog from '@/components/ConfirmDialog';
import YamlExportButton from '@/components/YamlExportButton';
import QuickTestModal from '@/components/QuickTestModal';
import TrashCanModal from '@/components/TrashCanModal';

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
  const [quickTestModal, setQuickTestModal] = useState({ isOpen: false, rule: null });
  const [trashCanModal, setTrashCanModal] = useState(false);
  
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
    
    setConfirmDialog({
      isOpen: true,
      title: t('rules_confirm_delete'),
      message: t('rules_cannot_undo'),
      onConfirm: async () => {
        try {
          // Save to trash before deleting
          await DeletedRule.create({
            originalRuleId: rule.ruleId,
            ruleName: rule.ruleName,
            ruleData: rule,
            deletedDate: new Date().toISOString(),
            deletedBy: 'current_user' // In real app, get from User.me()
          });
          
          // Delete the rule
          await Rule.delete(ruleId);
          showToast(`Rule moved to trash`, 'success');
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
        status: 'draft'
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

  const handleBulkAction = async (action) => {
    if (selectedRules.length === 0) return;

    if (action === 'delete') {
      setConfirmDialog({
        isOpen: true,
        title: `Delete ${selectedRules.length} rule(s)?`,
        message: 'Rules will be moved to the trash can.',
        onConfirm: async () => {
          try {
            // Save all to trash
            await Promise.all(
              selectedRules.map(id => {
                const rule = rules.find(r => r.id === id);
                return DeletedRule.create({
                  originalRuleId: rule.ruleId,
                  ruleName: rule.ruleName,
                  ruleData: rule,
                  deletedDate: new Date().toISOString(),
                  deletedBy: 'current_user'
                });
              })
            );
            
            // Delete all rules
            await Promise.all(selectedRules.map(id => Rule.delete(id)));
            showToast(`${selectedRules.length} rule(s) moved to trash`, 'success');
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
      const confirmMessage = action === 'activate' 
        ? `Activate ${selectedRules.length} rule(s)?`
        : `Deactivate ${selectedRules.length} rule(s)?`;

      setConfirmDialog({
        isOpen: true,
        title: confirmMessage,
        message: `${selectedRules.length} rule(s) will be ${newStatus}`,
        variant: 'info',
        onConfirm: async () => {
          try {
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

        {/* Search, Filter, Sort Bar */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('rules_search_placeholder')}
                  className="form-input pl-10"
                  aria-label="Search rules by name, ID, or description"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select"
                aria-label="Filter rules by status"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-select pl-10"
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

        {/* Bulk Actions */}
        {selectedRules.length > 0 && (
          <div className="card mb-6 bg-blue-50 border-blue-200">
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">{t('common_status')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700" scope="col">Threshold</th>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setQuickTestModal({ isOpen: true, rule })}
                          className="btn btn-ghost btn-sm"
                          title="Quick test"
                          aria-label={`Quick test rule ${rule.ruleName}`}
                        >
                          <PlayCircle className="w-4 h-4" />
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

      <ConfirmDialog {...confirmDialog} />
      <QuickTestModal 
        isOpen={quickTestModal.isOpen}
        onClose={() => setQuickTestModal({ isOpen: false, rule: null })}
        rule={quickTestModal.rule}
      />
      <TrashCanModal
        isOpen={trashCanModal}
        onClose={() => setTrashCanModal(false)}
        onRestore={reloadRules}
      />
    </div>
  );
}