/**
 * @file Toast.jsx
 * @description Individual toast notification component with auto-dismiss timer.
 * Renders success/error/warning/info variants with matching icons and theme colors.
 */
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const getStyle = (type) => {
    switch(type) {
      case 'success': return { backgroundColor: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success-text)' };
      case 'error': return { backgroundColor: 'var(--error-bg)', borderColor: 'var(--error-border)', color: 'var(--error-text)' };
      case 'warning': return { backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning-text)' };
      case 'info': return { backgroundColor: 'var(--info-bg)', borderColor: 'var(--info-border)', color: 'var(--info-text)' };
      default: return {};
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-in slide-in-from-right" style={getStyle(type)}>
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}