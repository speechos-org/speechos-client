/**
 * @speechos/react
 *
 * React hooks and components for SpeechOS voice integration.
 *
 * @example Basic usage with widget
 * ```tsx
 * import { SpeechOSProvider, SpeechOSWidget } from '@speechos/react';
 * import '@speechos/client'; // Registers Web Component
 *
 * function App() {
 *   return (
 *     <SpeechOSProvider config={{ apiKey: 'your-key' }}>
 *       <MyForm />
 *       <SpeechOSWidget
 *         onTranscription={(text) => console.log(text)}
 *       />
 *     </SpeechOSProvider>
 *   );
 * }
 * ```
 *
 * @example Hook-based usage
 * ```tsx
 * import { SpeechOSProvider, useDictation } from '@speechos/react';
 *
 * function VoiceInput() {
 *   const { start, stop, isRecording, transcript } = useDictation();
 *
 *   return (
 *     <button onClick={isRecording ? stop : start}>
 *       {isRecording ? 'Stop' : 'Start'}
 *     </button>
 *   );
 * }
 * ```
 *
 */

// Context and Provider
export {
  SpeechOSProvider,
  SpeechOSContext,
  useSpeechOSContext,
  type SpeechOSContextValue,
  type SpeechOSProviderProps,
  type SpeechOSReactConfig,
} from "./context.js";

// Hooks
export {
  useSpeechOS,
  useSpeechOSState,
  useSpeechOSEvents,
  useDictation,
  useEdit,
  useCommand,
  useTTS,
  useSpeechOSWidget,
  type UseDictationResult,
  type UseEditResult,
  type UseCommandResult,
  type UseTTSResult,
  type SpeakOptions,
  type UseSpeechOSWidgetResult,
} from "./hooks/index.js";

// Components
export {
  SpeechOSWidget,
  type SpeechOSWidgetProps,
} from "./components/index.js";

// Re-export useful types from core
export type {
  SpeechOSCoreConfig,
  SpeechOSState,
  SpeechOSAction,
  SpeechOSEventMap,
  RecordingState,
  UnsubscribeFn,
  CommandArgument,
  CommandDefinition,
  CommandResult,
  TTSOptions,
  TTSResult,
} from "@speechos/core";

// Legacy alias for backwards compatibility
export type { SpeechOSCoreConfig as SpeechOSConfig } from "@speechos/core";

// Version
export const VERSION = "0.1.0";
