/**
 * @speechos/react hooks
 *
 * React hooks for integrating SpeechOS into your application.
 */

// Main hook - full context access
export { useSpeechOS } from "./useSpeechOS.js";

// State-only hook
export { useSpeechOSState } from "./useSpeechOSState.js";

// Event subscription hook
export { useSpeechOSEvents } from "./useSpeechOSEvents.js";

// High-level workflow hooks
export { useDictation, type UseDictationResult } from "./useDictation.js";
export { useEdit, type UseEditResult } from "./useEdit.js";
export { useCommand, type UseCommandResult } from "./useCommand.js";
export { useTTS, type UseTTSResult, type SpeakOptions } from "./useTTS.js";

// Widget control hook
export { useSpeechOSWidget, type UseSpeechOSWidgetResult } from "./useSpeechOSWidget.js";
