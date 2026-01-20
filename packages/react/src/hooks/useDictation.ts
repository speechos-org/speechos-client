/**
 * useDictation - Simplified hook for dictation workflows
 *
 * Provides a simple start/stop interface for voice-to-text dictation.
 */

import { useState, useCallback } from "react";
import { useSpeechOSContext } from "../context.js";

/**
 * Return type for useDictation hook
 */
export interface UseDictationResult {
  /** Start dictation - begins recording */
  start: () => Promise<void>;
  /** Stop dictation - ends recording and returns transcript */
  stop: () => Promise<string>;
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether processing the recording */
  isProcessing: boolean;
  /** The last transcribed text (null if none yet) */
  transcript: string | null;
  /** Any error that occurred */
  error: string | null;
  /** Clear the transcript and error state */
  clear: () => void;
}

/**
 * Simplified hook for dictation workflows
 *
 * Provides an easy-to-use interface for voice-to-text dictation
 * with automatic state management.
 *
 * @example
 * ```tsx
 * function VoiceInput() {
 *   const { start, stop, isRecording, isProcessing, transcript, error } = useDictation();
 *
 *   return (
 *     <div>
 *       <button onClick={isRecording ? stop : start} disabled={isProcessing}>
 *         {isRecording ? 'Stop' : 'Start'} Recording
 *       </button>
 *       {isProcessing && <span>Processing...</span>}
 *       {transcript && <p>You said: {transcript}</p>}
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Dictation controls and state
 */
export function useDictation(): UseDictationResult {
  const { state, dictate, stopDictation, cancel } = useSpeechOSContext();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRecording = state.recordingState === "recording";
  const isProcessing = state.recordingState === "processing";

  const start = useCallback(async () => {
    setError(null);
    try {
      // dictate() returns a promise that resolves when stopDictation() is called
      await dictate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start dictation";
      setError(message);
    }
  }, [dictate]);

  const stop = useCallback(async (): Promise<string> => {
    try {
      const result = await stopDictation();
      setTranscript(result);
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get transcript";
      setError(message);
      throw err;
    }
  }, [stopDictation]);

  const clear = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  return {
    start,
    stop,
    isRecording,
    isProcessing,
    transcript,
    error,
    clear,
  };
}
