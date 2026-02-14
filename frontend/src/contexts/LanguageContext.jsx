/**
 * @file LanguageContext.jsx
 * @description Internationalization (i18n) context provider supporting 5 languages
 * (en, es, fr, de, pt). Provides a translation function `t()` that resolves
 * dot-notation keys against loaded locale JSON files, with English fallback.
 * Language preference is persisted in localStorage.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import enTranslations from '../i18n/locales/en.json';
import esTranslations from '../i18n/locales/es.json';
import frTranslations from '../i18n/locales/fr.json';
import deTranslations from '../i18n/locales/de.json';
import nlTranslations from '../i18n/locales/nl.json';

const LanguageContext = createContext();

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Translation map
const translationsMap = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  de: deTranslations,
  nl: nlTranslations
};

// Translation loader - synchronous since all translations are pre-imported
const loadTranslations = (lang) => {
  try {
    const translations = translationsMap[lang] || translationsMap.en;
    // Unwrap the .default property if it exists (Vite/ESM wraps JSON imports)
    return translations?.default ?? translations;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    const fallback = translationsMap.en;
    return fallback?.default ?? fallback;
  }
};

export function LanguageProvider({ children }) {
  // Initialize both language and translations atomically in a single state
  const [state, setState] = useState(() => {
    let lang = 'en';
    try {
      const saved = localStorage.getItem('pococlass_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        lang = settings.language || 'en';
      }
    } catch (e) {
      console.error('Error loading language:', e);
    }
    return {
      language: lang,
      translations: loadTranslations(lang)
    };
  });

  const [loading, setLoading] = useState(false);

  const saveSettings = useCallback((settings) => {
    try {
      const saved = localStorage.getItem('pococlass_settings');
      const existing = saved ? JSON.parse(saved) : {};
      localStorage.setItem('pococlass_settings', JSON.stringify({
        ...existing,
        ...settings
      }));
    } catch (e) {
      console.error('Error saving language:', e);
    }
  }, []);

  const updateLanguage = useCallback((newLang) => {
    setState({
      language: newLang,
      translations: loadTranslations(newLang)
    });
    saveSettings({ language: newLang });
  }, [saveSettings]);

  // Translation function with fallback - memoized to prevent re-renders
  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let value = state.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    // Replace parameters in translation
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    // If value is not a string, return the key (prevents rendering objects as React children)
    return typeof value === 'string' ? value : key;
  }, [state.translations]);

  // Memoize the context value to prevent infinite re-renders
  const contextValue = useMemo(() => ({
    language: state.language,
    updateLanguage,
    t,
    loading,
    translations: state.translations
  }), [state.language, state.translations, updateLanguage, t, loading]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}
