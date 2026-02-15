/**
 * @file TrashCanModal.jsx
 * @description Modal for managing soft-deleted classification rules. Allows users
 * to view, restore, permanently delete individual rules, or empty the entire trash.
 * Restored rules are re-created via the Rule API and removed from the deleted store.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { DeletedRule } from '@/api/entities';
import { Rule } from '@/api/entities';
import { useToast } from '@/components/ToastContainer';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function TrashCanModal({ isOpen, onClose, onRestore }) {
  const [deletedRules, setDeletedRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const { showToast } = useToast();

  const loadDeletedRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const rules = await DeletedRule.list('-deletedDate');
      setDeletedRules(rules);
    } catch (error) {
      console.error('Error loading deleted rules:', error);
      showToast('Error loading trash can', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadDeletedRules();
    }
  }, [isOpen, loadDeletedRules]);

  const handleRestore = async (deletedRule) => {
    try {
      // Restore the rule
      await Rule.create(deletedRule.ruleData);
      
      // Remove from trash
      await DeletedRule.delete(deletedRule.id);
      
      showToast(`Rule "${deletedRule.ruleName}" restored successfully`, 'success');
      loadDeletedRules();
      if (onRestore) onRestore();
    } catch (error) {
      console.error('Error restoring rule:', error);
      showToast('Error restoring rule', 'error');
    }
  };

  const handlePermanentDelete = async (deletedRule) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Rule?',
      message: `This will permanently delete "${deletedRule.ruleName}". This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await DeletedRule.delete(deletedRule.id);
          showToast('Rule permanently deleted', 'success');
          loadDeletedRules();
        } catch (error) {
          console.error('Error deleting rule:', error);
          showToast('Error deleting rule', 'error');
        }
        setConfirmDialog({ isOpen: false });
      },
      onClose: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleEmptyTrash = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Empty Trash Can?',
      message: `This will permanently delete all ${deletedRules.length} rules in the trash. This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Empty Trash',
      onConfirm: async () => {
        try {
          await Promise.all(deletedRules.map(rule => DeletedRule.delete(rule.id)));
          showToast('Trash can emptied', 'success');
          setDeletedRules([]);
        } catch (error) {
          console.error('Error emptying trash:', error);
          showToast('Error emptying trash', 'error');
        }
        setConfirmDialog({ isOpen: false });
      },
      onClose: () => setConfirmDialog({ isOpen: false })
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-6 h-6" />
                Trash Can
              </h2>
              <p className="text-sm text-gray-500">
                {deletedRules.length} deleted rule{deletedRules.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {deletedRules.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="btn btn-secondary btn-sm text-red-600"
                  aria-label="Empty trash can"
                >
                  <Trash2 className="w-4 h-4" />
                  Empty Trash
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close trash can"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="modal-body">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--app-primary)' }}></div>
              </div>
            ) : deletedRules.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Trash is empty</h3>
                <p className="text-gray-500">Deleted rules will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedRules.map((deletedRule) => (
                  <div 
                    key={deletedRule.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{deletedRule.ruleName}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          ID: <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{deletedRule.originalRuleId}</code>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Deleted: {new Date(deletedRule.deletedDate || deletedRule.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(deletedRule)}
                          className="btn btn-secondary btn-sm"
                          title="Restore rule"
                          aria-label={`Restore rule ${deletedRule.ruleName}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(deletedRule)}
                          className="btn btn-ghost btn-sm text-red-500"
                          title="Delete permanently"
                          aria-label={`Permanently delete rule ${deletedRule.ruleName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {deletedRules.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">About the Trash Can</p>
                  <p>Deleted rules are stored here until you empty the trash. You can restore them at any time.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </>
  );
}