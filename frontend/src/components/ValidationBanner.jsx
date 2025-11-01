import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '@/config/api';

export default function ValidationBanner() {
  const [validationData, setValidationData] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkValidation();
    
    // Check every 30 seconds
    const interval = setInterval(checkValidation, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkValidation = async () => {
    try {
      const sessionToken = localStorage.getItem('pococlass_session');
      if (!sessionToken) return;

      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setValidationData(data);
        
        // Reset dismissed state if data becomes valid
        if (data.valid && dismissed) {
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error('Error checking validation:', error);
    }
  };

  const handleFixNow = () => {
    navigate('/Settings');
    // Store tab selection in sessionStorage for Settings page to read
    sessionStorage.setItem('settings_active_tab', 'validation');
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show if valid, still loading, or dismissed
  if (!validationData || validationData.valid || dismissed) {
    return null;
  }

  const totalMissing = (validationData.missing_fields?.length || 0) + (validationData.missing_tags?.length || 0);

  return (
    <div className="bg-red-50 border-b border-red-200 px-6 py-3">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">
            PocoClass requires {totalMissing} missing {totalMissing === 1 ? 'item' : 'items'} to function correctly
          </p>
          <p className="text-xs text-red-700 mt-0.5">
            {validationData.missing_fields?.length > 0 && (
              <span>Missing fields: {validationData.missing_fields.join(', ')}. </span>
            )}
            {validationData.missing_tags?.length > 0 && (
              <span>Missing tags: {validationData.missing_tags.join(', ')}.</span>
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
