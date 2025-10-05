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
  const [theme, setTheme] = useState('light');
  const [colorBlindMode, setColorBlindMode] = useState('none');

  useEffect(() => {
    // Load theme from localStorage
    try {
      const saved = localStorage.getItem('pococlass_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setTheme(settings.theme || 'light');
        setColorBlindMode(settings.colorBlindMode || 'none');
      }
    } catch (e) {
      console.error('Error loading theme:', e);
    }
  }, []);

  useEffect(() => {
    // Apply theme classes to document
    document.documentElement.classList.remove('light', 'dark', 'protanopia', 'deuteranopia', 'tritanopia');
    document.documentElement.classList.add(theme);
    
    if (colorBlindMode !== 'none') {
      document.documentElement.classList.add(colorBlindMode);
    }
  }, [theme, colorBlindMode]);

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    saveSettings({ theme: newTheme, colorBlindMode });
  };

  const updateColorBlindMode = (mode) => {
    setColorBlindMode(mode);
    saveSettings({ theme, colorBlindMode: mode });
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
    <ThemeContext.Provider value={{ theme, colorBlindMode, updateTheme, updateColorBlindMode }}>
      {children}
    </ThemeContext.Provider>
  );
}