/**
 * @file GuardedLink.jsx
 * @description Navigation link that intercepts clicks when there are unsaved changes
 * in the rule editor. Shows a confirmation dialog before allowing navigation,
 * preventing accidental data loss.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfirmDialog from './ConfirmDialog';

export default function GuardedLink({ to, children, className, ...props }) {
  const navigate = useNavigate();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const { t } = useLanguage();
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
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={t('dialogs.unsavedChanges.title')}
        message={t('dialogs.unsavedChanges.message')}
        confirmText={t('dialogs.unsavedChanges.confirmButton')}
        cancelText={t('dialogs.unsavedChanges.cancelButton')}
        variant="warning"
      />
    </>
  );
}
