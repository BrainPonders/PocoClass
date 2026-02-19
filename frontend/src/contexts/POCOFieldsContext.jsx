/**
 * @file POCOFieldsContext.jsx
 * @description Context provider for POCO field visibility settings. Fetches the
 * field configuration from the backend API and exposes an `isFieldVisible()`
 * helper for conditionally rendering UI elements based on admin-configured
 * field visibility preferences.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const POCOFieldsContext = createContext();

export function POCOFieldsProvider({ children }) {
  const [pocoScoreExists, setPocoScoreExists] = useState(true);
  const [pocoOcrExists, setPocoOcrExists] = useState(true);
  const [pocoOcrEnabled, setPocoOcrEnabled] = useState(false);
  const [allMandatoryDataValid, setAllMandatoryDataValid] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const userExists = localStorage.getItem('pococlass_user');
      if (!userExists) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/validation/mandatory-data`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch validation status');
      }

      const data = await response.json();
      
      setPocoScoreExists(data.fields?.poco_score || false);
      setPocoOcrExists(data.fields?.poco_ocr || false);
      setPocoOcrEnabled(data.poco_ocr_enabled || false);
      setAllMandatoryDataValid(data.valid || false);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error refreshing POCO fields status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Refresh on initial mount
    refresh();
    
    // Refresh immediately when tab becomes visible (user returns from another tab/window)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Passive refresh every 5 minutes as a fallback
    // This catches changes made externally without aggressive polling
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, 300000); // 5 minutes
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refresh]);

  const hasMissingFields = !allMandatoryDataValid;

  const value = {
    pocoScoreExists,
    pocoOcrExists,
    pocoOcrEnabled,
    hasMissingFields,
    isLoading,
    lastChecked,
    refresh
  };

  return (
    <POCOFieldsContext.Provider value={value}>
      {children}
    </POCOFieldsContext.Provider>
  );
}

export function usePOCOFields() {
  const context = useContext(POCOFieldsContext);
  if (context === undefined) {
    throw new Error('usePOCOFields must be used within a POCOFieldsProvider');
  }
  return context;
}
