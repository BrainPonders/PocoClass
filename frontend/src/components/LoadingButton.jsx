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