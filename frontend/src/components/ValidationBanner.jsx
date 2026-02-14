/**
 * @file ValidationBanner.jsx
 * @description Dismissable warning banner displayed at the top of the app when
 * required POCO custom fields (POCO Score, POCO OCR) are missing from the
 * Paperless-ngx instance. Provides a "Fix Now" button that navigates to the
 * Settings validation tab.
 */
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePOCOFields } from '@/contexts/POCOFieldsContext';

export default function ValidationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Consume validation state from shared context instead of polling independently
  const { hasMissingFields, pocoScoreExists, pocoOcrExists } = usePOCOFields();

  // Navigate to the Settings page validation tab, or switch tabs if already there
  const handleFixNow = () => {
    const settingsPath = createPageUrl('Settings');
    const isOnSettings = location.pathname === settingsPath;
    
    if (isOnSettings) {
      window.dispatchEvent(new CustomEvent('switchSettingsTab', { detail: { tab: 'validation' } }));
    } else {
      sessionStorage.setItem('settings_active_tab', 'validation');
      navigate(settingsPath);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if valid or dismissed
  if (!hasMissingFields || dismissed) {
    return null;
  }

  // Calculate missing items
  const missingItems = [];
  if (!pocoScoreExists) missingItems.push('POCO Score');
  if (!pocoOcrExists) missingItems.push('POCO OCR');
  
  const totalMissing = missingItems.length;

  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">
            PocoClass requires {totalMissing} missing custom {totalMissing === 1 ? 'field' : 'fields'} to function correctly
          </p>
          <p className="text-xs text-red-700 mt-0.5">
            {missingItems.length > 0 && (
              <span>Missing fields: {missingItems.join(', ')}</span>
            )}
          </p>
        </div>
        <button
          onClick={handleFixNow}
          className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex-shrink-0"
        >
          Fix Now
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-red-600 hover:text-red-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
