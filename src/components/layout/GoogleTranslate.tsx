import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    google?: any;
    semkatInitGoogleTranslate?: () => void;
  }
}

const STORAGE_KEY = "semkat_translate_lang";
const DEFAULT_LANG = "en";

const languages = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh-CN", label: "Chinese" },
];

function setGoogleTranslateCookie(lang: string) {
  const next = `/auto/${lang}`;
  document.cookie = `googtrans=${next}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=${next}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
}

const GoogleTranslate = () => {
  const location = useLocation();
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const applyLanguageToGoogleCombo = (lang: string, retries = 8) => {
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));
      return;
    }
    if (retries <= 0) return;
    window.setTimeout(() => applyLanguageToGoogleCombo(lang, retries - 1), 300);
  };

  useEffect(() => {
    setGoogleTranslateCookie(selectedLang);

    window.semkatInitGoogleTranslate = () => {
      if (!window.google?.translate?.TranslateElement) return;
      const host = document.getElementById("google_translate_element");
      if (host) host.innerHTML = "";
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: languages.map((l) => l.value).join(","),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
      applyLanguageToGoogleCombo(selectedLang);
    };

    if (window.google?.translate?.TranslateElement) {
      window.semkatInitGoogleTranslate();
      return;
    }

    if (document.getElementById("google-translate-script")) return;

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=semkatInitGoogleTranslate";
    script.async = true;
    document.body.appendChild(script);
  }, [selectedLang]);

  useEffect(() => {
    setGoogleTranslateCookie(selectedLang);
    applyLanguageToGoogleCombo(selectedLang);
  }, [location.pathname, location.search, selectedLang]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setGoogleTranslateCookie(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage failures
    }

    applyLanguageToGoogleCombo(lang);
  };

  return (
    <div className="fixed top-20 right-2 z-[120] sm:right-4">
      <div className="glass-strong glass-border rounded-xl px-2 py-1.5 shadow-md flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <select
          aria-label="Select language"
          value={selectedLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent text-xs sm:text-sm text-foreground outline-none"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value} className="text-foreground bg-background">
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div id="google_translate_element" className="sr-only" />
    </div>
  );
};

export default GoogleTranslate;
