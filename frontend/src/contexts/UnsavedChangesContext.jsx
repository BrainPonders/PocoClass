/**
 * @file UnsavedChangesContext.jsx
 * @description Context provider for tracking unsaved changes and guarding navigation.
 * When unsaved changes exist, navigation triggers a confirmation promise that
 * resolves based on user action (confirm/cancel), preventing accidental data loss.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const UnsavedChangesContext = createContext();

export function UnsavedChangesProvider({ children }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmNavigation, setConfirmNavigation] = useState(null);

  const checkNavigation = useCallback((to) => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return new Promise((resolve) => {
      setConfirmNavigation({
        to,
        resolve,
      });
    });
  }, [hasUnsavedChanges]);

  const cancelNavigation = useCallback(() => {
    if (confirmNavigation) {
      confirmNavigation.resolve(false);
      setConfirmNavigation(null);
    }
  }, [confirmNavigation]);

  const confirmNavigationAction = useCallback(() => {
    if (confirmNavigation) {
      confirmNavigation.resolve(true);
      setConfirmNavigation(null);
      setHasUnsavedChanges(false);
    }
  }, [confirmNavigation]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        checkNavigation,
        confirmNavigation,
        cancelNavigation,
        confirmNavigationAction,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}
