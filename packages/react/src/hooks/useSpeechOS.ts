/**
 * useSpeechOS - Main hook for full SpeechOS context access
 *
 * Provides access to all SpeechOS functionality including state,
 * high-level API (dictate, edit), and low-level API (connect, enableMicrophone).
 */

import { useSpeechOSContext, type SpeechOSContextValue } from "../context.js";

/**
 * Main hook for accessing the full SpeechOS context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, dictate, cancel, connect, enableMicrophone } = useSpeechOS();
 *
 *   // High-level usage
 *   const handleDictate = async () => {
 *     const text = await dictate();
 *     console.log('Transcribed:', text);
 *   };
 *
 *   // Low-level usage
 *   const handleCustomFlow = async () => {
 *     await connect();
 *     await waitUntilReady();
 *     await enableMicrophone();
 *     // ... custom logic
 *     const text = await stopAndGetTranscript();
 *   };
 * }
 * ```
 *
 * @returns The full SpeechOS context value
 */
export function useSpeechOS(): SpeechOSContextValue {
  return useSpeechOSContext();
}
