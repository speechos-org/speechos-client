/**
 * useTTS - React hook for text-to-speech
 *
 * Provides a simple interface for TTS synthesis and playback.
 */

import { useState, useCallback, useEffect } from "react";
import { tts, events, type TTSOptions, type TTSResult } from "@speechos/core";

/**
 * Return type for useTTS hook
 */
export interface UseTTSResult {
  /** Synthesize text and play audio immediately */
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  /** Synthesize text and return audio bytes */
  synthesize: (text: string, options?: TTSOptions) => Promise<TTSResult>;
  /** Stop current playback */
  stop: () => void;
  /** Whether currently synthesizing (HTTP request in progress) */
  isSynthesizing: boolean;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** The last synthesized audio result (from synthesize()) */
  audioResult: TTSResult | null;
  /** Any error that occurred */
  error: string | null;
  /** Clear error and audio result state */
  clear: () => void;
}

/**
 * Options for speaking text (extends TTSOptions with playback options)
 */
export interface SpeakOptions extends TTSOptions {
  /** Output audio device ID (if supported by browser) */
  audioDeviceId?: string;
}

// Dynamic import for client-side TTS player
let clientTTS: typeof import("@speechos/client").tts | null = null;

async function getClientTTS() {
  if (clientTTS) return clientTTS;
  try {
    const client = await import("@speechos/client");
    clientTTS = client.tts;
    return clientTTS;
  } catch {
    // Fallback to core-only if client not available
    return null;
  }
}

/**
 * React hook for text-to-speech
 *
 * Provides an easy-to-use interface for TTS synthesis and playback
 * with automatic state management.
 *
 * @example
 * ```tsx
 * function TTSButton() {
 *   const { speak, stop, isSynthesizing, isPlaying, error } = useTTS();
 *
 *   return (
 *     <div>
 *       <button onClick={() => speak('Hello!')}>
 *         {isSynthesizing ? 'Loading...' : isPlaying ? 'Stop' : 'Speak'}
 *       </button>
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns TTS controls and state
 */
export function useTTS(): UseTTSResult {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioResult, setAudioResult] = useState<TTSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to playback events
  useEffect(() => {
    const unsubStart = events.on("tts:playback:start", () => {
      setIsPlaying(true);
    });

    const unsubComplete = events.on("tts:playback:complete", () => {
      setIsPlaying(false);
    });

    const unsubError = events.on("tts:error", ({ message, phase }) => {
      if (phase === "playback") {
        setIsPlaying(false);
      }
      setError(message);
    });

    return () => {
      unsubStart();
      unsubComplete();
      unsubError();
    };
  }, []);

  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    setError(null);
    setIsSynthesizing(true);

    try {
      // Try to use client TTS for playback
      const client = await getClientTTS();
      if (client) {
        await client.speak(text, options);
      } else {
        // Fallback: synthesize only (no playback)
        await tts.synthesize(text, options);
        console.warn("[useTTS] @speechos/client not available, audio not played");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "TTS failed";
      setError(message);
      throw err;
    } finally {
      setIsSynthesizing(false);
    }
  }, []);

  const synthesize = useCallback(async (text: string, options?: TTSOptions) => {
    setError(null);
    setIsSynthesizing(true);

    try {
      const result = await tts.synthesize(text, options);
      setAudioResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Synthesis failed";
      setError(message);
      throw err;
    } finally {
      setIsSynthesizing(false);
    }
  }, []);

  const stop = useCallback(async () => {
    const client = await getClientTTS();
    if (client) {
      client.stop();
    }
    setIsPlaying(false);
  }, []);

  const clear = useCallback(() => {
    setAudioResult(null);
    setError(null);
  }, []);

  return {
    speak,
    synthesize,
    stop,
    isSynthesizing,
    isPlaying,
    audioResult,
    error,
    clear,
  };
}
