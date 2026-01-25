/**
 * Language settings store
 * Persists input language preferences to localStorage
 */

import { events } from "@speechos/core";

const STORAGE_KEY = "speechos_language_settings";

/**
 * In-memory cache for language settings. When server sync is enabled, this is the
 * source of truth. localStorage is only used when server sync is disabled.
 */
let memoryCache: LanguageSettings | null = null;

export interface LanguageOption {
  /** Display name of the language */
  name: string;
  /** Primary language code */
  code: string;
  /** All available locale variants */
  variants: string[];
}

/**
 * Supported input languages for speech recognition
 * Each language has a name, primary code, and available variants
 * Sorted alphabetically by name for dropdown display
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { name: "Belarusian", code: "be", variants: ["be"] },
  { name: "Bengali", code: "bn", variants: ["bn"] },
  { name: "Bosnian", code: "bs", variants: ["bs"] },
  { name: "Bulgarian", code: "bg", variants: ["bg"] },
  { name: "Catalan", code: "ca", variants: ["ca"] },
  { name: "Croatian", code: "hr", variants: ["hr"] },
  { name: "Czech", code: "cs", variants: ["cs"] },
  { name: "Danish", code: "da", variants: ["da", "da-DK"] },
  { name: "Dutch", code: "nl", variants: ["nl"] },
  { name: "English (Australia)", code: "en-AU", variants: ["en-AU"] },
  { name: "English (India)", code: "en-IN", variants: ["en-IN"] },
  { name: "English (New Zealand)", code: "en-NZ", variants: ["en-NZ"] },
  { name: "English (UK)", code: "en-GB", variants: ["en-GB"] },
  { name: "English (US)", code: "en-US", variants: ["en", "en-US"] },
  { name: "Estonian", code: "et", variants: ["et"] },
  { name: "Finnish", code: "fi", variants: ["fi"] },
  { name: "Flemish", code: "nl-BE", variants: ["nl-BE"] },
  { name: "French", code: "fr", variants: ["fr", "fr-CA"] },
  { name: "German", code: "de", variants: ["de"] },
  { name: "German (Switzerland)", code: "de-CH", variants: ["de-CH"] },
  { name: "Greek", code: "el", variants: ["el"] },
  { name: "Hindi", code: "hi", variants: ["hi"] },
  { name: "Hungarian", code: "hu", variants: ["hu"] },
  { name: "Indonesian", code: "id", variants: ["id"] },
  { name: "Italian", code: "it", variants: ["it"] },
  { name: "Japanese", code: "ja", variants: ["ja"] },
  { name: "Kannada", code: "kn", variants: ["kn"] },
  { name: "Korean", code: "ko", variants: ["ko", "ko-KR"] },
  { name: "Latvian", code: "lv", variants: ["lv"] },
  { name: "Lithuanian", code: "lt", variants: ["lt"] },
  { name: "Macedonian", code: "mk", variants: ["mk"] },
  { name: "Malay", code: "ms", variants: ["ms"] },
  { name: "Marathi", code: "mr", variants: ["mr"] },
  { name: "Norwegian", code: "no", variants: ["no"] },
  { name: "Polish", code: "pl", variants: ["pl"] },
  { name: "Portuguese", code: "pt", variants: ["pt", "pt-BR", "pt-PT"] },
  { name: "Romanian", code: "ro", variants: ["ro"] },
  { name: "Russian", code: "ru", variants: ["ru"] },
  { name: "Serbian", code: "sr", variants: ["sr"] },
  { name: "Slovak", code: "sk", variants: ["sk"] },
  { name: "Slovenian", code: "sl", variants: ["sl"] },
  { name: "Spanish", code: "es", variants: ["es", "es-419"] },
  { name: "Swedish", code: "sv", variants: ["sv", "sv-SE"] },
  { name: "Tagalog", code: "tl", variants: ["tl"] },
  { name: "Tamil", code: "ta", variants: ["ta"] },
  { name: "Telugu", code: "te", variants: ["te"] },
  { name: "Turkish", code: "tr", variants: ["tr"] },
  { name: "Ukrainian", code: "uk", variants: ["uk"] },
  { name: "Vietnamese", code: "vi", variants: ["vi"] },
];

export interface LanguageSettings {
  /** Selected input language code for speech recognition (e.g., "en-US", "es", "fr") */
  inputLanguageCode: string;
  /** Selected output language code for transcription formatting (e.g., "en-US", "es", "fr") */
  outputLanguageCode: string;
  /** Whether to apply AI formatting to transcripts (removes filler words, adds punctuation) */
  smartFormat: boolean;
}

const defaultSettings: LanguageSettings = {
  inputLanguageCode: "en-US",
  outputLanguageCode: "en-US",
  smartFormat: true,
};

/**
 * Get current language settings. Prefers in-memory cache (from server sync),
 * then falls back to localStorage.
 */
export function getLanguageSettings(): LanguageSettings {
  if (memoryCache !== null) {
    return { ...memoryCache };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Set language settings directly (used by settings sync from server data).
 */
export function setLanguageSettings(settings: Partial<LanguageSettings>): void {
  memoryCache = { ...defaultSettings, ...settings };
}

/**
 * Reset memory cache (for testing only)
 */
export function resetMemoryCache(): void {
  memoryCache = null;
}

/**
 * Save language settings (updates memory cache and tries localStorage)
 */
function saveLanguageSettings(settings: LanguageSettings): void {
  memoryCache = settings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable - memory cache still updated
  }
}

/**
 * Get the selected input language code for speech recognition
 * Returns "en-US" (American English) by default
 */
export function getInputLanguageCode(): string {
  return getLanguageSettings().inputLanguageCode;
}

/**
 * Set the selected input language code for speech recognition
 */
export function setInputLanguageCode(languageCode: string): void {
  const settings = getLanguageSettings();
  if (settings.inputLanguageCode !== languageCode) {
    settings.inputLanguageCode = languageCode;
    saveLanguageSettings(settings);
    events.emit("settings:changed", { setting: "language" });
  }
}

/**
 * Get the selected output language code for transcription formatting
 * Returns "en-US" (American English) by default
 */
export function getOutputLanguageCode(): string {
  return getLanguageSettings().outputLanguageCode;
}

/**
 * Set the selected output language code for transcription formatting
 */
export function setOutputLanguageCode(languageCode: string): void {
  const settings = getLanguageSettings();
  if (settings.outputLanguageCode !== languageCode) {
    settings.outputLanguageCode = languageCode;
    saveLanguageSettings(settings);
    events.emit("settings:changed", { setting: "language" });
  }
}

/**
 * Get the language option for a given code
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === code || lang.variants.includes(code)
  );
}

/**
 * Get the display name for the input language
 */
export function getInputLanguageName(): string {
  const code = getInputLanguageCode();
  const lang = getLanguageByCode(code);
  return lang?.name || "English";
}

/**
 * Get the display name for the output language
 */
export function getOutputLanguageName(): string {
  const code = getOutputLanguageCode();
  const lang = getLanguageByCode(code);
  return lang?.name || "English";
}

/**
 * Get whether smart formatting is enabled
 * Returns true by default (AI formatting removes filler words, adds punctuation)
 */
export function getSmartFormatEnabled(): boolean {
  return getLanguageSettings().smartFormat;
}

/**
 * Set whether smart formatting is enabled
 */
export function setSmartFormatEnabled(enabled: boolean): void {
  const settings = getLanguageSettings();
  if (settings.smartFormat !== enabled) {
    settings.smartFormat = enabled;
    saveLanguageSettings(settings);
    events.emit("settings:changed", { setting: "smartFormat" });
  }
}

/**
 * Legacy alias for getInputLanguageCode
 * @deprecated Use getInputLanguageCode instead
 */
export function getLanguageCode(): string {
  return getInputLanguageCode();
}

/**
 * Legacy alias for setInputLanguageCode
 * @deprecated Use setInputLanguageCode instead
 */
export function setLanguageCode(languageCode: string): void {
  setInputLanguageCode(languageCode);
}

/**
 * Legacy alias for getInputLanguageName
 * @deprecated Use getInputLanguageName instead
 */
export function getLanguageName(): string {
  return getInputLanguageName();
}

/**
 * Reset language settings to defaults
 */
export function resetLanguageSettings(): void {
  memoryCache = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

export const languageSettings: {
  getLanguageSettings: typeof getLanguageSettings;
  setLanguageSettings: typeof setLanguageSettings;
  getInputLanguageCode: typeof getInputLanguageCode;
  setInputLanguageCode: typeof setInputLanguageCode;
  getOutputLanguageCode: typeof getOutputLanguageCode;
  setOutputLanguageCode: typeof setOutputLanguageCode;
  getLanguageByCode: typeof getLanguageByCode;
  getInputLanguageName: typeof getInputLanguageName;
  getOutputLanguageName: typeof getOutputLanguageName;
  getSmartFormatEnabled: typeof getSmartFormatEnabled;
  setSmartFormatEnabled: typeof setSmartFormatEnabled;
  resetLanguageSettings: typeof resetLanguageSettings;
  resetMemoryCache: typeof resetMemoryCache;
  SUPPORTED_LANGUAGES: typeof SUPPORTED_LANGUAGES;
  // Legacy aliases
  getLanguageCode: typeof getLanguageCode;
  setLanguageCode: typeof setLanguageCode;
  getLanguageName: typeof getLanguageName;
} = {
  getLanguageSettings,
  setLanguageSettings,
  getInputLanguageCode,
  setInputLanguageCode,
  getOutputLanguageCode,
  setOutputLanguageCode,
  getLanguageByCode,
  getInputLanguageName,
  getOutputLanguageName,
  getSmartFormatEnabled,
  setSmartFormatEnabled,
  resetLanguageSettings,
  resetMemoryCache,
  SUPPORTED_LANGUAGES,
  // Legacy aliases
  getLanguageCode,
  setLanguageCode,
  getLanguageName,
};
