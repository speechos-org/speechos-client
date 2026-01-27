/**
 * @speechos/client
 *
 * Vanilla JS client SDK for embedding SpeechOS into web applications.
 * Includes Web Components UI and DOM-based form detection.
 */

import { SpeechOS as SpeechOSClass, getSessionSettings } from "./speechos.js";

// Re-export core essentials
export {
  events,
  state,
  getConfig,
  setConfig,
  resetConfig,
  DEFAULT_HOST,
  DEFAULT_TTS_VOICE_ID,
} from "@speechos/core";

// TTS with browser playback support
export { tts, TTSPlayer } from "./tts-player.js";
export type { SpeakOptions, TTSOptions, TTSResult, TTSErrorCode, CombinedTTS } from "./tts-player.js";

// Re-export core types
export type {
  SpeechOSCoreConfig,
  SpeechOSState,
  SpeechOSAction,
  SpeechOSEventMap,
  StateChangeCallback,
  UnsubscribeFn,
  RecordingState,
  SessionSettings,
  VoiceSessionOptions,
  CommandDefinition,
  CommandResult,
} from "@speechos/core";

// Export stores from local client package
export {
  transcriptStore,
  getTranscripts,
  saveTranscript,
  clearTranscripts,
  deleteTranscript,
} from "./stores/transcript-store.js";
export type {
  TranscriptEntry,
  TranscriptAction,
  SaveCommandOptions,
} from "./stores/transcript-store.js";

export {
  audioSettings,
  getAudioSettings,
  getAudioDeviceId,
  setAudioDeviceId,
  getAudioInputDevices,
  isSelectedDeviceAvailable,
  resetAudioSettings,
} from "./stores/audio-settings.js";
export type { AudioSettings } from "./stores/audio-settings.js";

export {
  getVoiceSettings,
  setVoiceSettings,
  getVoiceId,
  setVoiceId,
  getVoiceById,
  getVoiceName,
  resetVoiceSettings,
  SUPPORTED_VOICES,
} from "./stores/voice-settings.js";
export type { VoiceSettings, VoiceOption } from "./stores/voice-settings.js";

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
} from "./stores/language-settings.js";
export type { LanguageSettings, LanguageOption } from "./stores/language-settings.js";

export {
  snippetsStore,
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  clearSnippets,
  getSnippetCount,
  isAtSnippetLimit,
} from "./stores/snippets-store.js";
export type {
  Snippet,
  SnippetValidationError,
  AddSnippetResult,
} from "./stores/snippets-store.js";

export {
  vocabularyStore,
  getVocabulary,
  addTerm,
  deleteTerm,
  clearVocabulary,
  getVocabularyCount,
  isAtVocabularyLimit,
} from "./stores/vocabulary-store.js";
export type {
  VocabularyTerm,
  VocabularyValidationError,
  AddTermResult,
} from "./stores/vocabulary-store.js";

// Export client config
export {
  getClientConfig,
  setClientConfig,
  resetClientConfig,
  hasCommands,
  getCommands,
  getZIndex,
  useExternalSettings,
  getReadAloudConfig,
  isReadAloudEnabled,
} from "./config.js";
export type {
  SpeechOSClientConfig,
  ResolvedClientConfig,
  ReadAloudConfig,
  ResolvedReadAloudConfig,
} from "./config.js";

// Client-specific exports
export { formDetector, FormDetector } from "./form-detector.js";
export type { FormDetectorInterface } from "./form-detector.js";

export { selectionDetector, SelectionDetector } from "./selection-detector.js";
export type { SelectionDetectorInterface } from "./selection-detector.js";

export {
  defaultTextInputHandler,
  DefaultTextInputHandler,
  getTextInputHandler,
  setTextInputHandler,
  resetTextInputHandler,
} from "./text-input-handler.js";
export type {
  TextInputHandlerInterface,
  SelectionInfo,
} from "./text-input-handler.js";

export { getSessionSettings };

// Settings sync
export { settingsSync } from "./settings-sync.js";

// Version
export const VERSION = "0.1.0";

// Main SDK class
export { SpeechOSClass as SpeechOS };
export default SpeechOSClass;
