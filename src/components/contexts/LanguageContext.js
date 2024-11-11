import React, { createContext, useContext, useState, useEffect } from "react";

// Define available languages
export const LANGUAGES = {
  SK: "sk",
  VI: "vi",
};

// Create context with default values
const LanguageContext = createContext({
  currentLanguage: LANGUAGES.SK,
  setLanguage: () => {},
  t: () => "",
});

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(
    () => localStorage.getItem("preferredLanguage") || LANGUAGES.SK
  );
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationModule = await import(
          `src/translations/${currentLanguage}.json`
        );
        setTranslations(translationModule.default);
      } catch (error) {
        console.error("Failed to load translations:", error);
        // Fallback to empty translations object
        setTranslations({});
      }
    };

    loadTranslations();
    localStorage.setItem("preferredLanguage", currentLanguage);
  }, [currentLanguage]);

  const setLanguage = (lang) => {
    if (Object.values(LANGUAGES).includes(lang)) {
      setCurrentLanguage(lang);
    }
  };

  const t = (key) => {
    return translations[key] || key;
  };

  const value = {
    currentLanguage,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
