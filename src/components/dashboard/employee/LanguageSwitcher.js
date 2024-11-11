// src/components/LanguageSwitcher.js
import React from "react";
import { Button } from "src/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "src/components/contexts/LanguageContext";
import { LANGUAGES } from "src/components/contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <Languages className="h-4 w-4 text-gray-500" />
      <Button
        variant={currentLanguage === LANGUAGES.SK ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage(LANGUAGES.SK)}
      >
        SK
      </Button>
      <Button
        variant={currentLanguage === LANGUAGES.VI ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage(LANGUAGES.VI)}
      >
        VI
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
