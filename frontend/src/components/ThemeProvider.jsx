/**
 * @file ThemeProvider.jsx
 * @description React context provider for application theming. Manages light/dark/auto
 * theme modes (auto follows OS preference) and color-blind accessibility modes.
 * Persists settings in localStorage and applies CSS classes to the document root.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState('light'); // 'light', 'dark', or 'auto'
  const [effectiveTheme, setEffectiveTheme] = useState('light'); // actual applied theme
  const [colorBlindMode, setColorBlindMode] = useState('none');

  // Detect system theme preference
  const getSystemTheme = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  useEffect(() => {
    // Load theme from localStorage
    try {
      const saved = localStorage.getItem('pococlass_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const savedTheme = settings.theme || 'light';
        setThemeMode(savedTheme);
        setColorBlindMode(settings.colorBlindMode || 'none');
        
        // Set effective theme based on mode
        if (savedTheme === 'auto') {
          setEffectiveTheme(getSystemTheme());
        } else {
          setEffectiveTheme(savedTheme);
        }
      }
    } catch (e) {
      console.error('Error loading theme:', e);
    }
  }, []);

  useEffect(() => {
    // Listen for system theme changes when in auto mode
    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      setEffectiveTheme(getSystemTheme());
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setEffectiveTheme(themeMode);
    }
  }, [themeMode]);

  // Sync CSS classes on <html> whenever the effective theme or accessibility mode changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'protanopia', 'deuteranopia', 'tritanopia');
    document.documentElement.classList.add(effectiveTheme);
    
    if (colorBlindMode !== 'none') {
      document.documentElement.classList.add(colorBlindMode);
    }
  }, [effectiveTheme, colorBlindMode]);

  const updateTheme = (newTheme) => {
    setThemeMode(newTheme);
    saveSettings({ theme: newTheme, colorBlindMode });
  };

  const updateColorBlindMode = (mode) => {
    setColorBlindMode(mode);
    saveSettings({ theme: themeMode, colorBlindMode: mode });
  };

  const saveSettings = (settings) => {
    try {
      const saved = localStorage.getItem('pococlass_settings');
      const existing = saved ? JSON.parse(saved) : {};
      localStorage.setItem('pococlass_settings', JSON.stringify({
        ...existing,
        ...settings
      }));
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: themeMode, 
      effectiveTheme,
      colorBlindMode, 
      updateTheme, 
      updateColorBlindMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}