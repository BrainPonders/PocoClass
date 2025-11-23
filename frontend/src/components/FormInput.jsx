import React from 'react';

/**
 * FormInput - Reusable input component with consistent styling
 * 
 * Ensures all input fields across PocoClass have:
 * - Consistent 1px border
 * - Dark mode support via CSS variables
 * - Consistent padding and spacing
 * - Single source of truth for input styling
 */
const FormInput = React.forwardRef(({
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={`
        w-full
        px-3 py-2
        border-1
        rounded
        bg-white
        text-gray-900
        placeholder-gray-500
        transition-colors
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        disabled:bg-gray-100
        disabled:text-gray-500
        disabled:cursor-not-allowed
        dark:bg-gray-800
        dark:text-white
        dark:border-gray-600
        dark:placeholder-gray-400
        dark:focus:ring-blue-400
        dark:disabled:bg-gray-700
        dark:disabled:text-gray-400
        ${className}
      `}
      style={{
        borderColor: 'var(--input-border, #d1d5db)',
        borderWidth: '1px',
        backgroundColor: 'var(--input-bg, #ffffff)',
        color: 'var(--input-text, #111827)',
      }}
      {...props}
    />
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
