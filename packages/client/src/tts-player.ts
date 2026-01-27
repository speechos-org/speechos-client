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
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private streamAbortController: AbortController | null = null;
  private streamObjectUrl: string | null = null;
  private playbackResolve: (() => void) | null = null;
  private playbackReject: ((error: Error) => void) | null = null;
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
      if (this.canStreamPlayback()) {
        await this.streamAndPlay(text, options);
        return;
      }

      await this.playBuffered(text, options);
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
    if (this.playbackResolve) {
      this.playbackResolve();
    }
    this.cleanupStreaming();
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

  private canStreamPlayback(): boolean {
    if (typeof MediaSource === "undefined") {
      return false;
    }
    if (typeof MediaSource.isTypeSupported !== "function") {
      return false;
    }
    return MediaSource.isTypeSupported("audio/mpeg");
  }

  private startPlayback(text: string): void {
    this._isPlaying = true;
    this.currentText = text;
    events.emit("tts:playback:start", { text });
  }

  private finishPlayback(): void {
    this._isPlaying = false;
    this.currentSource = null;

    if (this.currentText) {
      events.emit("tts:playback:complete", { text: this.currentText });
      this.currentText = null;
    }

    this.cleanupStreaming();
  }

  private cleanupStreaming(): void {
    if (this.streamAbortController) {
      this.streamAbortController.abort();
      this.streamAbortController = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch {
        // Ignore pause errors
      }
      this.audioElement.src = "";
      this.audioElement.load();
      this.audioElement = null;
    }

    if (this.streamObjectUrl) {
      URL.revokeObjectURL(this.streamObjectUrl);
      this.streamObjectUrl = null;
    }

    this.mediaSource = null;
    this.playbackResolve = null;
    this.playbackReject = null;
  }

  private async playBuffered(text: string, options?: SpeakOptions): Promise<void> {
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
    this.startPlayback(text);

    // Play audio
    this.currentSource.start();

    // Wait for playback to complete
    return new Promise<void>((resolve, reject) => {
      if (!this.currentSource) {
        resolve();
        return;
      }

      this.currentSource.onended = () => {
        this.finishPlayback();
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
  }

  private async streamAndPlay(text: string, options?: SpeakOptions): Promise<void> {
    const mediaSource = new MediaSource();
    this.mediaSource = mediaSource;

    const audio = new Audio();
    this.audioElement = audio;

    const abortController = new AbortController();
    this.streamAbortController = abortController;

    const objectUrl = URL.createObjectURL(mediaSource);
    this.streamObjectUrl = objectUrl;
    audio.src = objectUrl;
    audio.preload = "auto";

    if (options?.audioDeviceId && "setSinkId" in audio) {
      try {
        await (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(
          options.audioDeviceId
        );
      } catch (err) {
        console.warn("[TTS] Failed to set audio output device:", err);
      }
    }

    const playbackPromise = new Promise<void>((resolve, reject) => {
      this.playbackResolve = resolve;
      this.playbackReject = reject;

      audio.addEventListener(
        "playing",
        () => {
          if (!this._isPlaying) {
            this.startPlayback(text);
          }
        },
        { once: true }
      );

      audio.addEventListener(
        "ended",
        () => {
          this.playbackResolve = null;
          this.playbackReject = null;
          this.finishPlayback();
          resolve();
        },
        { once: true }
      );

      audio.addEventListener(
        "error",
        () => {
          this.playbackResolve = null;
          this.playbackReject = null;
          this._isPlaying = false;
          this.currentText = null;

          const error = {
            code: "playback_failed",
            message: "Audio playback error",
            phase: "playback" as const,
          };
          events.emit("tts:error", error);
          reject(new Error(error.message));
        },
        { once: true }
      );
    });

    const streamPromise = new Promise<void>((resolve, reject) => {
      mediaSource.addEventListener(
        "sourceopen",
        () => {
          if (abortController.signal.aborted) {
            resolve();
            return;
          }

          let sourceBuffer: SourceBuffer;
          try {
            sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
            sourceBuffer.mode = "sequence";
          } catch (err) {
            reject(err instanceof Error ? err : new Error("Failed to create source buffer"));
            return;
          }

          const queue: Uint8Array[] = [];
          let streamDone = false;
          let appendError: Error | null = null;

          const appendNext = () => {
            if (appendError || sourceBuffer.updating || queue.length === 0) {
              return;
            }
            const chunk = queue.shift();
            if (!chunk) {
              return;
            }
            try {
              sourceBuffer.appendBuffer(chunk);
            } catch (err) {
              appendError = err instanceof Error ? err : new Error("Failed to append audio buffer");
            }
          };

          const maybeEndStream = () => {
            if (streamDone && queue.length === 0 && !sourceBuffer.updating && mediaSource.readyState === "open") {
              try {
                mediaSource.endOfStream();
              } catch {
                // Ignore end-of-stream errors
              }
            }
          };

          sourceBuffer.addEventListener("updateend", () => {
            appendNext();
            maybeEndStream();
          });

          const waitForDrain = async () => {
            while (queue.length > 20 && !abortController.signal.aborted) {
              await new Promise((drainResolve) => setTimeout(drainResolve, 0));
            }
          };

          (async () => {
            try {
              for await (const chunk of coreTTS.stream(text, { ...options, signal: abortController.signal })) {
                if (abortController.signal.aborted) {
                  break;
                }
                if (!chunk || chunk.length === 0) {
                  continue;
                }
                queue.push(chunk);
                appendNext();
                if (appendError) {
                  throw appendError;
                }
                await waitForDrain();
              }

              streamDone = true;
              maybeEndStream();
              resolve();
            } catch (err) {
              if (abortController.signal.aborted) {
                resolve();
                return;
              }
              reject(err instanceof Error ? err : new Error("Streaming playback failed"));
            }
          })();
        },
        { once: true }
      );
    });

    try {
      await audio.play();
      await Promise.all([streamPromise, playbackPromise]);
    } catch (err) {
      const playbackError = err instanceof Error ? err : new Error("Streaming playback failed");
      if (this.playbackReject) {
        this.playbackReject(playbackError);
      }
      this.cleanupStreaming();
      throw playbackError;
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
