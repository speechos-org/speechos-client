/**
 * Client-side stores for SpeechOS settings and data persistence
 * All stores use localStorage for browser-based persistence
 */

export {
  snippetsStore,
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  clearSnippets,
  getSnippetCount,
  isAtSnippetLimit,
} from "./snippets-store.js";
export type {
  Snippet,
  SnippetValidationError,
  AddSnippetResult,
} from "./snippets-store.js";

export {
  vocabularyStore,
  getVocabulary,
  addTerm,
  deleteTerm,
  clearVocabulary,
  getVocabularyCount,
  isAtVocabularyLimit,
} from "./vocabulary-store.js";
export type {
  VocabularyTerm,
  VocabularyValidationError,
  AddTermResult,
} from "./vocabulary-store.js";

export {
  audioSettings,
  getAudioSettings,
  getAudioDeviceId,
  setAudioDeviceId,
  getAudioInputDevices,
  isSelectedDeviceAvailable,
  resetAudioSettings,
} from "./audio-settings.js";
export type { AudioSettings } from "./audio-settings.js";

export {
  getVoiceSettings,
  setVoiceSettings,
  getVoiceId,
  setVoiceId,
  getVoiceById,
  getVoiceName,
  resetVoiceSettings,
  SUPPORTED_VOICES,
} from "./voice-settings.js";
export type { VoiceSettings, VoiceOption } from "./voice-settings.js";

export {
  languageSettings,
  getLanguageSettings,
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
  SUPPORTED_LANGUAGES,
  // Legacy aliases
  getLanguageCode,
  setLanguageCode,
  getLanguageName,
} from "./language-settings.js";
export type { LanguageSettings, LanguageOption } from "./language-settings.js";

export { transcriptStore } from "./transcript-store.js";
export type { TranscriptEntry, TranscriptAction, SaveCommandOptions } from "./transcript-store.js";
