import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  variant = "danger",
  showDontShowAgain = false,
  warningKey = null
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Reset checkbox state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showDontShowAgain && dontShowAgain && warningKey) {
      sessionStorage.setItem(`hideWarning_${warningKey}`, 'true');
    }
    onConfirm();
  };

  const getVariantStyles = () => {
    if (variant === 'danger') {
      return {
        bg: { backgroundColor: 'var(--app-danger-bg)', borderColor: 'var(--app-danger-border)' },
        icon: { color: 'var(--app-danger)' },
        button: { backgroundColor: 'var(--app-danger)', color: 'white' }
      };
    }
    if (variant === 'warning') {
      return {
        bg: { backgroundColor: 'var(--app-warning-bg)', borderColor: 'var(--app-warning-border)' },
        icon: { color: 'var(--app-warning)' },
        button: { backgroundColor: 'var(--app-warning)', color: 'white' }
      };
    }
    if (variant === 'info') {
      return {
        bg: { backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)' },
        icon: { color: 'var(--info-text)' },
        button: { backgroundColor: 'var(--app-primary)', color: 'white' }
      };
    }
    return {
      bg: {},
      icon: {},
      button: {}
    };
  };

  const variantInlineStyles = getVariantStyles();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border rounded-t-xl" style={variantInlineStyles.bg}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0" style={variantInlineStyles.icon}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--app-text)' }}>{title}</h3>
              <p className="text-sm" style={{ color: 'var(--app-text-secondary)' }}>{message}</p>
            </div>
            <button 
              onClick={onClose}
              className="transition-colors flex-shrink-0"
              style={{ color: 'var(--app-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--app-text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--app-text-muted)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {showDontShowAgain && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--app-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ 
                    accentColor: 'var(--app-primary)',
                    borderColor: 'var(--app-border)'
                  }}
                  onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px var(--app-primary)'}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                />
                <span>Don't show this again during this session</span>
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-secondary">
              {cancelText}
            </button>
            <button onClick={handleConfirm} className="btn" style={variantInlineStyles.button}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}