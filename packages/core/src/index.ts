/**
 * @speechos/core
 *
 * Headless core SDK for SpeechOS - state management, events, and backend integration.
 * No DOM dependencies - can be used in any JavaScript environment.
 */

// Main SDK class
export { speechOS } from "./speechos.js";

// Core modules
export { events, SpeechOSEventEmitter } from "./events.js";
export { state, createStateManager } from "./state.js";
export {
  getConfig,
  setConfig,
  resetConfig,
  updateUserId,
  validateConfig,
  getSettingsToken,
  clearSettingsToken,
  DEFAULT_HOST,
} from "./config.js";
export { livekit, Deferred } from "./livekit.js";
export { websocket } from "./websocket.js";
export { getBackend } from "./backend.js";
export type { VoiceBackend } from "./backend.js";

// Types
export type {
  SpeechOSCoreConfig,
  SpeechOSState,
  SpeechOSAction,
  SpeechOSEventMap,
  StateChangeCallback,
  UnsubscribeFn,
  RecordingState,
  LiveKitTokenResponse,
  ServerErrorMessage,
  ErrorSource,
  UserVocabularyData,
  CommandArgument,
  CommandDefinition,
  CommandResult,
  SessionSettings,
  VoiceSessionOptions,
  WebSocketLike,
  WebSocketFactory,
} from "./types.js";

// Version
export const VERSION = "0.1.0";
