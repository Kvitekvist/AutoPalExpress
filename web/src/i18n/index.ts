import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zhHans from "./locales/zh-Hans.json";
import ja from "./locales/ja.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import { DEFAULT_LANGUAGE } from "./languages";

export const LANGUAGE_STORAGE_KEY = "autopalexpress:language";

const resources = {
  en: { translation: en },
  "zh-Hans": { translation: zhHans },
  ja: { translation: ja },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
};

// Remembers the last language shown in this browser so a page reload
// doesn't flash English before the logged-in user's saved preference loads.
const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage ?? DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

export function setLanguage(code: string): void {
  i18n.changeLanguage(code);
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

export default i18n;
