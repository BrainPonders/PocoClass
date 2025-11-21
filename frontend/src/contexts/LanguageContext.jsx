import React, { createContext, useContext, useState, useEffect } from 'react';
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

// Translation loader
const loadTranslations = async (lang) => {
  try {
    const translations = translationsMap[lang] || translationsMap.en;
    console.log(`Loading translations for ${lang}:`, translations);
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    return translationsMap.en;
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load language from localStorage
    try {
      const saved = localStorage.getItem('pococlass_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const savedLang = settings.language || 'en';
        setLanguage(savedLang);
      }
    } catch (e) {
      console.error('Error loading language:', e);
    }
  }, []);

  useEffect(() => {
    // Load translations when language changes
    const loadLanguageData = async () => {
      setLoading(true);
      const trans = await loadTranslations(language);
      setTranslations(trans);
      setLoading(false);
    };

    loadLanguageData();
  }, [language]);

  const updateLanguage = (newLang) => {
    setLanguage(newLang);
    saveSettings({ language: newLang });
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
      console.error('Error saving language:', e);
    }
  };

  // Translation function with fallback
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        return key;
      }
    }

    // Replace parameters in translation
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      updateLanguage, 
      t,
      loading,
      translations 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}
