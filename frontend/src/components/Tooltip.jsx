/**
 * @file Tooltip.jsx
 * @description Custom tooltip component that auto-positions above or below the
 * trigger based on available viewport space. Renders a help-circle icon by default
 * or wraps arbitrary children when `icon={false}`.
 */
import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ content, children, icon = true }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState('top');
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Auto-position: place tooltip below if it would overflow above the viewport
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (triggerRect.top - tooltipRect.height - 8 < 0 || triggerRect.top < viewportHeight / 2) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isVisible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2',
    bottom: 'bottom-full left-1/2 -translate-x-1/2'
  };

  const arrowStyles = {
    top: { borderTopColor: 'var(--info-bg)' },
    bottom: { borderBottomColor: 'var(--info-bg)' }
  };

  return (
    <div className="relative inline-flex items-center" ref={triggerRef}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {icon ? (
          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
        ) : (
          children
        )}
      </div>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`absolute ${positionClasses[position]} z-50 px-4 py-3 text-white text-sm rounded-lg shadow-lg whitespace-normal`}
          style={{ maxWidth: '400px', minWidth: '250px', backgroundColor: 'var(--info-bg)', color: 'var(--info-text)' }}
        >
          {content}
          <div 
            className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-transparent`}
            style={arrowStyles[position]}
          />
        </div>
      )}
    </div>
  );
}