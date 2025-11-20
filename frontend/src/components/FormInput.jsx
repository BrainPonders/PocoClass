import React from 'react';

/**
 * FormInput - Reusable input component with consistent styling
 *
 * Centralizes styling through the shared `pc-input` class so that
 * updates to input presentation propagate everywhere.
 */
const FormInput = React.forwardRef(({ className = '', type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={`pc-input ${className}`.trim()}
      {...props}
    />
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
