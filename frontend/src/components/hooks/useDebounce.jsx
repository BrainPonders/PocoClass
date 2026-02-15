/**
 * @file useDebounce.jsx
 * @description Custom React hook that debounces a value, delaying updates until
 * the user stops changing it for the specified delay period. Commonly used
 * for search inputs and API call throttling.
 */

import { useState, useEffect } from 'react';
import { UI } from '../constants';

/**
 * Debounce a value - delays updating until user stops changing it
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = UI.DEBOUNCE_DELAY) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}