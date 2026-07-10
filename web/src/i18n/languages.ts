export interface LanguageOption {
  code: string;
  englishName: string;
  nativeName: string;
  flag: string;
}

// Codes must match the backend's SUPPORTED_LANGUAGES (app/services/auth.py).
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", englishName: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "zh-Hans", englishName: "Chinese (Simplified)", nativeName: "中文（简体）", flag: "🇨🇳" },
  { code: "ja", englishName: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "de", englishName: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "fr", englishName: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", englishName: "Spanish", nativeName: "Español", flag: "🇪🇸" },
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageOption(code: string): LanguageOption {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}
