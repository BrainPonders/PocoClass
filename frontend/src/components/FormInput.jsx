/**
 * @file FormInput.jsx
 * @description Reusable form input component with consistent styling. Centralizes
 * styling through the shared `pc-input` CSS class so that updates to input
 * presentation propagate everywhere. Forwards refs for external focus management.
 */
import React from 'react';
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
