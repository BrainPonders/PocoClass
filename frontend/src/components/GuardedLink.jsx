/**
 * @file GuardedLink.jsx
 * @description Navigation link that intercepts clicks when there are unsaved changes
 * in the rule editor. Shows a confirmation dialog before allowing navigation,
 * preventing accidental data loss.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import ConfirmDialog from './ConfirmDialog';

export default function GuardedLink({ to, children, className, ...props }) {
  const navigate = useNavigate();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    navigate(to);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <Link to={to} onClick={handleClick} className={className} {...props}>
        {children}
      </Link>
      {showConfirm && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes in the rule editor. Are you sure you want to leave without saving?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmText="Leave"
          cancelText="Stay"
        />
      )}
    </>
  );
}
