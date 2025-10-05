import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Tooltip from './Tooltip';

export default function ValidatedInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  success,
  required,
  helpText,
  tooltip,
  className = '',
  ...props
}) {
  const hasError = error && error.length > 0;
  const hasSuccess = success && !hasError;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          {tooltip && <Tooltip content={tooltip} />}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`form-input ${
            hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' :
            hasSuccess ? 'border-green-500 focus:border-green-500 focus:ring-green-500' :
            ''
          } ${(hasError || hasSuccess) ? 'pr-10' : ''}`}
          {...props}
        />
        
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
        
        {hasSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>
      
      {helpText && !hasError && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
      
      {hasError && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}