import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const POCOFieldsContext = createContext();

export function POCOFieldsProvider({ children }) {
  const [pocoScoreExists, setPocoScoreExists] = useState(true);
  const [pocoOcrExists, setPocoOcrExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionToken = localStorage.getItem('pococlass_session');
      if (!sessionToken) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/sync/status`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }

      const data = await response.json();
      
      if (data.poco_fields) {
        setPocoScoreExists(data.poco_fields.poco_score_exists || false);
        setPocoOcrExists(data.poco_fields.poco_ocr_exists || false);
        setLastChecked(new Date());
      }
    } catch (error) {
      console.error('Error refreshing POCO fields status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasMissingFields = !pocoScoreExists || !pocoOcrExists;

  const value = {
    pocoScoreExists,
    pocoOcrExists,
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
