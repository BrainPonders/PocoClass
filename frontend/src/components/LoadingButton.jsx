/**
 * @file LoadingButton.jsx
 * @description Button component that shows a spinning loader icon and optional
 * loading text while an async operation is in progress. Automatically disables
 * itself when loading or explicitly disabled.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingButton({
  loading,
  disabled,
  children,
  loadingText,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`${className} ${loading || disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  );
}