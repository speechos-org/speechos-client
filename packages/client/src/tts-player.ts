/**
 * TTS Player for browser-based audio playback
 *
 * Extends the core TTS functionality with Web Audio API playback capabilities.
 */

import { tts as coreTTS, events, type TTSOptions } from "@speechos/core";

/**
 * Options for speaking text (extends TTSOptions with playback options)
 */
export interface SpeakOptions extends TTSOptions {
  /** Output audio device ID (if supported by browser) */
  audioDeviceId?: string;
}

/**
 * TTS Player class for audio playback
 *
 * Provides methods to play TTS audio through the browser's audio system.
 */
export class TTSPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private _isPlaying = false;
  private currentText: string | null = null;

  /**
   * Synthesize text and play it immediately
   *
   * @param text - Text to speak
   * @param options - Synthesis and playback options
   *
   * @example
   * ```typescript
   * await tts.speak('Hello world');
   * ```
   */
  async speak(text: string, options?: SpeakOptions): Promise<void> {
    // Stop any current playback
    this.stop();

    try {
      // Get audio bytes from core TTS
      const result = await coreTTS.synthesize(text, options);

      // Create or resume AudioContext
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioContext();
      }

      // Resume context if suspended (autoplay policy)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Set output device if supported and specified
      if (options?.audioDeviceId && "setSinkId" in this.audioContext) {
        try {
          await (this.audioContext as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(
            options.audioDeviceId
          );
        } catch (err) {
          // Silently ignore setSinkId errors - not all browsers support it
          console.warn("[TTS] Failed to set audio output device:", err);
        }
      }

      // Decode audio data
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await this.audioContext.decodeAudioData(result.audio.slice(0));
      } catch (err) {
        const error = {
          code: "decode_failed",
          message: err instanceof Error ? err.message : "Failed to decode audio",
          phase: "playback" as const,
        };
        events.emit("tts:error", error);
        throw new Error(error.message);
      }

      // Create source node
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      // Track state
      this._isPlaying = true;
      this.currentText = text;

      // Emit playback start event
      events.emit("tts:playback:start", { text });

      // Play audio
      this.currentSource.start();

      // Wait for playback to complete
      return new Promise<void>((resolve, reject) => {
        if (!this.currentSource) {
          resolve();
          return;
        }

        this.currentSource.onended = () => {
          this._isPlaying = false;
          this.currentSource = null;

          // Emit playback complete event
          if (this.currentText) {
            events.emit("tts:playback:complete", { text: this.currentText });
            this.currentText = null;
          }

          resolve();
        };

        // Handle errors (rare but possible)
        this.currentSource.addEventListener("error", () => {
          this._isPlaying = false;
          this.currentSource = null;
          this.currentText = null;

          const error = {
            code: "playback_failed",
            message: "Audio playback error",
            phase: "playback" as const,
          };
          events.emit("tts:error", error);
          reject(new Error(error.message));
        });
      });
    } catch (err) {
      this._isPlaying = false;
      this.currentSource = null;
      this.currentText = null;

      // Re-throw if it's already a handled error
      if (err instanceof Error) {
        throw err;
      }

      // Handle unexpected errors
      const error = {
        code: "playback_failed",
        message: "Unexpected playback error",
        phase: "playback" as const,
      };
      events.emit("tts:error", error);
      throw new Error(error.message);
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }
    this._isPlaying = false;
    this.currentText = null;
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {
        // Ignore close errors
      });
      this.audioContext = null;
    }
  }
}

// Create singleton player instance
const ttsPlayer: TTSPlayer = new TTSPlayer();

/**
 * Combined TTS interface with core synthesis and browser playback
 */
export interface CombinedTTS {
  /** Synthesize text and return audio bytes */
  synthesize: typeof coreTTS.synthesize;
  /** Stream audio chunks as they arrive */
  stream: typeof coreTTS.stream;
  /** Synthesize and play audio immediately */
  speak: TTSPlayer["speak"];
  /** Stop current playback */
  stop: TTSPlayer["stop"];
  /** Check if audio is playing */
  isPlaying: TTSPlayer["isPlaying"];
  /** Clean up audio resources */
  dispose: TTSPlayer["dispose"];
}

/**
 * Combined TTS client that includes both core synthesis and browser playback
 */
export const tts: CombinedTTS = {
  // Core TTS methods
  synthesize: coreTTS.synthesize.bind(coreTTS),
  stream: coreTTS.stream.bind(coreTTS),

  // Player methods
  speak: ttsPlayer.speak.bind(ttsPlayer),
  stop: ttsPlayer.stop.bind(ttsPlayer),
  isPlaying: ttsPlayer.isPlaying.bind(ttsPlayer),
  dispose: ttsPlayer.dispose.bind(ttsPlayer),
};

// Re-export types from core
export type { TTSOptions, TTSResult, TTSErrorCode } from "@speechos/core";
