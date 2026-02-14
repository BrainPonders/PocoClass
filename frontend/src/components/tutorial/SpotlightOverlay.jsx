import React, { useState, useEffect, useCallback } from 'react';

export default function SpotlightOverlay({ targetSelector }) {
  const [rect, setRect] = useState(null);

  const updateRect = useCallback(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - 8,
      left: r.left - 8,
      width: r.width + 16,
      height: r.height + 16,
    });
  }, [targetSelector]);

  useEffect(() => {
    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const scrollTimeout = setTimeout(() => updateRect(), 400);

    const rafId = requestAnimationFrame(updateRect);

    let observer = null;
    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) {
        observer = new ResizeObserver(() => updateRect());
        observer.observe(el);
      }
    }

    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(scrollTimeout);
      cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [targetSelector, updateRect]);

  if (!targetSelector || !rect) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 15px 2px rgba(37, 99, 235, 0.4)',
          border: '2px solid rgba(37, 99, 235, 0.6)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
