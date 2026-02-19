/**
 * @file InfoBox.jsx
 * @description Dismissible gradient info box used in wizard steps to display contextual
 * help text. Visibility is controlled per step via the showInfoBoxes state object.
 */

import React from 'react';
import { X } from 'lucide-react';

export default function InfoBox({ stepNumber, showInfoBoxes, setShowInfoBoxes, children }) {
  if (!showInfoBoxes[stepNumber]) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '20px 24px',
      borderRadius: '12px',
      marginBottom: '24px',
      position: 'relative',
      maxWidth: '100%',
      boxShadow: '0 4px 6px rgba(102, 126, 234, 0.2)'
    }}>
      <button
        onClick={() => setShowInfoBoxes(prev => ({ ...prev, [stepNumber]: false }))}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '6px',
          padding: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        title="Close"
      >
        <X className="w-4 h-4" style={{ color: 'white' }} />
      </button>
      <div style={{ paddingRight: '40px' }}>
        {children}
      </div>
    </div>
  );
}