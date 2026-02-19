/**
 * @file StepProgress.jsx
 * @description Horizontal step progress indicator for the 6-step rule builder wizard.
 * Each step button is color-coded by status (completed, skipped, edited, pending)
 * with a sliding indicator bar under the current step.
 */

import React from 'react';

export default function StepProgress({ currentStep, stepStatus, onStepClick }) {
  return (
    <div className="relative flex items-center justify-start mb-6">
      {[1, 2, 3, 4, 5, 6].map((step) => {
        const isCurrentStep = step === currentStep;
        const stepStatusValue = stepStatus[step];
        
        let buttonStyle = {
          padding: '12px 16px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: '500',
          transition: 'all 0.2s',
          minWidth: '60px',
          color: 'white',
          border: '2px solid',
          cursor: 'pointer',
          position: 'relative'
        };
        
        // Determine color based on status, not whether it's current
        if (stepStatusValue === 'completed') {
          buttonStyle.backgroundColor = '#2563eb';
          buttonStyle.borderColor = '#1d4ed8';
          buttonStyle.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        } else if (stepStatusValue === 'skipped') {
          buttonStyle.backgroundColor = '#f59e0b';
          buttonStyle.borderColor = '#d97706';
          buttonStyle.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        } else if (stepStatusValue === 'edited') {
          buttonStyle.backgroundColor = '#60a5fa';
          buttonStyle.borderColor = '#3b82f6';
          buttonStyle.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        } else {
          buttonStyle.backgroundColor = '#9ca3af';
          buttonStyle.borderColor = '#6b7280';
        }
        
        return (
          <div key={step} className="flex items-center">
            <div className="relative">
              <button
                onClick={() => onStepClick(step)}
                style={buttonStyle}
                title={`Step ${step}: ${stepStatusValue}`}
              >
                Step {step}
              </button>
              {/* Moving indicator bar */}
              {isCurrentStep && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40px',
                    height: '3px',
                    backgroundColor: '#2563eb',
                    borderRadius: '2px',
                    transition: 'all 0.3s ease'
                  }}
                />
              )}
            </div>
            {step < 6 && (
              <div 
                style={{
                  width: '32px',
                  height: '4px',
                  margin: '0 8px',
                  borderRadius: '2px',
                  backgroundColor: (stepStatusValue === 'completed' || stepStatusValue === 'skipped') ? '#2563eb' : '#d1d5db'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}