/**
 * @file useTabVisibility.jsx
 * @description Custom React hook that tracks browser tab visibility using the
 * Page Visibility API. Triggers an optional callback when the tab becomes
 * visible again, useful for refreshing stale data on tab focus.
 */

import { useState, useEffect } from 'react';

export function useTabVisibility(onVisibilityChange) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible && onVisibilityChange) {
        onVisibilityChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisibilityChange]);

  return isVisible;
}
