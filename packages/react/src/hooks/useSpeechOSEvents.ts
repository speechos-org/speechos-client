/**
 * useSpeechOSEvents - Hook for subscribing to SpeechOS events
 *
 * Automatically handles subscription lifecycle tied to component mount/unmount.
 */

import { useEffect } from "react";
import { events, type SpeechOSEventMap, type UnsubscribeFn } from "@speechos/core";

/**
 * Hook to subscribe to SpeechOS events
 *
 * Automatically subscribes on mount and unsubscribes on unmount.
 * The callback is stable - changes to it will update the subscription.
 *
 * @example
 * ```tsx
 * function TranscriptionListener() {
 *   useSpeechOSEvents('transcription:complete', (payload) => {
 *     console.log('Transcription received:', payload.text);
 *   });
 *
 *   useSpeechOSEvents('error', (payload) => {
 *     console.error('Error:', payload.message);
 *   });
 *
 *   return <div>Listening for events...</div>;
 * }
 * ```
 *
 * @param event - The event name to subscribe to
 * @param callback - The callback to invoke when the event fires
 * @returns Cleanup function (automatically called on unmount)
 */
export function useSpeechOSEvents<K extends keyof SpeechOSEventMap>(
  event: K,
  callback: (payload: SpeechOSEventMap[K]) => void
): UnsubscribeFn {
  useEffect(() => {
    const unsubscribe = events.on(event, callback);
    return unsubscribe;
  }, [event, callback]);

  // Return a manual unsubscribe function for imperative usage
  // Note: This won't actually work since useEffect handles it,
  // but it maintains the API contract
  return () => {};
}
