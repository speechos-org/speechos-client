/**
 * useSpeechOSState - Hook for accessing just the SpeechOS state
 *
 * A lightweight hook when you only need to read state,
 * not call any API methods.
 */

import type { SpeechOSState } from "@speechos/core";
import { useSpeechOSContext } from "../context.js";

/**
 * Hook to access just the SpeechOS state
 *
 * Use this when you only need to read state values like
 * isConnected, recordingState, etc. without needing the API methods.
 *
 * @example
 * ```tsx
 * function RecordingIndicator() {
 *   const state = useSpeechOSState();
 *
 *   return (
 *     <div>
 *       {state.recordingState === 'recording' && <span>Recording...</span>}
 *       {state.isConnected && <span>Connected</span>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns The current SpeechOS state
 */
export function useSpeechOSState(): SpeechOSState {
  const context = useSpeechOSContext();
  return context.state;
}
