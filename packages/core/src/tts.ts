/**
 * TTS (Text-to-Speech) client for SpeechOS SDK
 *
 * Provides methods to synthesize speech from text using the SpeechOS TTS API.
 * This is a headless module - audio playback is handled by @speechos/client.
 */

import { getConfig } from "./config.js";
import { events } from "./events.js";

/**
 * Default TTS voice ID (matches server default).
 * The server validates voice IDs - pass any valid voice ID or omit to use default.
 */
export const DEFAULT_TTS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

/**
 * Options for TTS synthesis
 */
export interface TTSOptions {
  /** Voice ID. Server uses its default if not specified. */
  voiceId?: string;
  /** Language code (e.g., 'en', 'es', 'fr'). Defaults to 'en'. */
  language?: string;
  /** Optional abort signal for cancelling the request. */
  signal?: AbortSignal;
}

/**
 * Result of TTS synthesis
 */
export interface TTSResult {
  /** Audio data as ArrayBuffer (MP3 format) */
  audio: ArrayBuffer;
  /** Content type of the audio (e.g., 'audio/mpeg') */
  contentType: string;
}

/**
 * TTS error codes
 */
export type TTSErrorCode =
  | "invalid_request"
  | "usage_limit_exceeded"
  | "authentication_failed"
  | "network_error"
  | "unknown_error";

/**
 * Map HTTP status codes to TTS error codes
 */
function mapHttpStatusToErrorCode(status: number): TTSErrorCode {
  switch (status) {
    case 400:
      return "invalid_request";
    case 402:
      return "usage_limit_exceeded";
    case 403:
      return "authentication_failed";
    default:
      return "unknown_error";
  }
}

/**
 * TTS Client for synthesizing speech from text
 */
export class TTSClient {
  /**
   * Synthesize text to speech and return audio bytes
   *
   * @param text - Text to synthesize (max 1000 chars)
   * @param options - Optional synthesis options
   * @returns Audio data and content type
   *
   * @example
   * ```typescript
   * const result = await tts.synthesize('Hello world');
   * console.log(result.audio); // ArrayBuffer
   * console.log(result.contentType); // 'audio/mpeg'
   * ```
   */
  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    const config = getConfig();

    if (!config.apiKey) {
      const error = {
        code: "authentication_failed" as TTSErrorCode,
        message: "API key not configured. Call SpeechOS.init() first.",
        phase: "synthesize" as const,
      };
      events.emit("tts:error", error);
      throw new Error(error.message);
    }

    // Emit start event
    events.emit("tts:synthesize:start", { text });

    try {
      const response = await fetch(`${config.host}/api/tts/`, {
        method: "POST",
        headers: {
          "Authorization": `Api-Key ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: options?.signal,
        body: JSON.stringify({
          text,
          voice_id: options?.voiceId,
          language: options?.language ?? "en",
          user_id: config.userId || undefined,
        }),
      });

      if (!response.ok) {
        const errorCode = mapHttpStatusToErrorCode(response.status);
        let errorMessage: string;

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        const error = {
          code: errorCode,
          message: errorMessage,
          phase: "synthesize" as const,
        };
        events.emit("tts:error", error);
        throw new Error(errorMessage);
      }

      // Read the streaming response into an ArrayBuffer
      const contentType = response.headers.get("Content-Type") || "audio/mpeg";
      const arrayBuffer = await response.arrayBuffer();

      // Emit completion event
      events.emit("tts:synthesize:complete", { text });

      return {
        audio: arrayBuffer,
        contentType,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      // Re-throw if it's already our error
      if (error instanceof Error && error.message.includes("HTTP")) {
        throw error;
      }

      // Handle network errors
      const networkError = {
        code: "network_error" as TTSErrorCode,
        message: error instanceof Error ? error.message : "Network request failed",
        phase: "synthesize" as const,
      };
      events.emit("tts:error", networkError);
      throw new Error(networkError.message);
    }
  }

  /**
   * Stream TTS audio chunks as they arrive from the server
   *
   * Useful for progressive playback or processing large texts.
   *
   * @param text - Text to synthesize (max 1000 chars)
   * @param options - Optional synthesis options
   * @yields Audio chunks as Uint8Array
   *
   * @example
   * ```typescript
   * const chunks: Uint8Array[] = [];
   * for await (const chunk of tts.stream('Hello world')) {
   *   chunks.push(chunk);
   * }
   * ```
   */
  async *stream(text: string, options?: TTSOptions): AsyncGenerator<Uint8Array> {
    const config = getConfig();

    if (!config.apiKey) {
      const error = {
        code: "authentication_failed" as TTSErrorCode,
        message: "API key not configured. Call SpeechOS.init() first.",
        phase: "synthesize" as const,
      };
      events.emit("tts:error", error);
      throw new Error(error.message);
    }

    // Emit start event
    events.emit("tts:synthesize:start", { text });

    try {
      const response = await fetch(`${config.host}/api/tts/`, {
        method: "POST",
        headers: {
          "Authorization": `Api-Key ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: options?.signal,
        body: JSON.stringify({
          text,
          voice_id: options?.voiceId,
          language: options?.language ?? "en",
          user_id: config.userId || undefined,
        }),
      });

      if (!response.ok) {
        const errorCode = mapHttpStatusToErrorCode(response.status);
        let errorMessage: string;

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        const error = {
          code: errorCode,
          message: errorMessage,
          phase: "synthesize" as const,
        };
        events.emit("tts:error", error);
        throw new Error(errorMessage);
      }

      // Stream the response body
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }

      // Emit completion event
      events.emit("tts:synthesize:complete", { text });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      // Re-throw if it's already our error
      if (error instanceof Error && error.message.includes("HTTP")) {
        throw error;
      }

      // Handle network errors
      const networkError = {
        code: "network_error" as TTSErrorCode,
        message: error instanceof Error ? error.message : "Network request failed",
        phase: "synthesize" as const,
      };
      events.emit("tts:error", networkError);
      throw new Error(networkError.message);
    }
  }
}

// Export singleton instance
export const tts: TTSClient = new TTSClient();
