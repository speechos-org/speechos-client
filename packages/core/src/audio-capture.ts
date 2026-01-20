/**
 * Audio capture module for SpeechOS WebSocket integration.
 *
 * Provides MediaRecorder-based audio capture with:
 * - Format detection for cross-browser compatibility
 * - Buffering for instant start (audio captured before connection is ready)
 * - Atomic buffer swap pattern to prevent chunk reordering
 */

import { getConfig } from './config.js';

/**
 * Supported audio formats with their MIME types and whether
 * Deepgram needs explicit encoding parameters.
 */
export interface AudioFormat {
  /** MIME type for MediaRecorder */
  mimeType: string;
  /** Short identifier for the format */
  format: 'webm' | 'mp4' | 'pcm';
  /** Whether Deepgram needs encoding/sample_rate params */
  needsEncodingParams: boolean;
}

/**
 * Detect if running in Safari.
 */
function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const vendor = navigator.vendor?.toLowerCase() || '';
  const hasSafariUA = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
  const isAppleVendor = vendor.includes('apple');
  return hasSafariUA && isAppleVendor;
}

/**
 * Detect the best supported audio format for the current browser.
 *
 * IMPORTANT: Safari must use MP4/AAC. Its WebM/Opus implementation is buggy
 * and produces truncated/incomplete audio.
 */
export function getSupportedAudioFormat(): AudioFormat {
  // Safari: Force MP4/AAC
  if (isSafari()) {
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return {
        mimeType: 'audio/mp4',
        format: 'mp4',
        needsEncodingParams: false,
      };
    }
    return {
      mimeType: '',
      format: 'mp4',
      needsEncodingParams: true,
    };
  }

  // Chrome, Firefox, Edge: Use WebM/Opus
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return {
      mimeType: 'audio/webm;codecs=opus',
      format: 'webm',
      needsEncodingParams: false,
    };
  }

  // Fallback to WebM without codec spec
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return {
      mimeType: 'audio/webm',
      format: 'webm',
      needsEncodingParams: false,
    };
  }

  // Fallback to MP4 (for browsers that support MP4 but not WebM)
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return {
      mimeType: 'audio/mp4',
      format: 'mp4',
      needsEncodingParams: false,
    };
  }

  // Last resort - let browser choose
  return {
    mimeType: '',
    format: 'webm',
    needsEncodingParams: true,
  };
}

/**
 * Callback for receiving audio chunks.
 */
export type AudioChunkCallback = (chunk: Blob) => void;

/**
 * Audio capture manager with buffering support.
 *
 * Usage:
 * 1. Create instance with onChunk callback
 * 2. Call start() - immediately begins capturing
 * 3. Call setReady() when connection is established - flushes buffer
 * 4. Call stop() when done
 */
export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private buffer: Blob[] = [];
  private isReady = false;
  private isRecording = false;
  private onChunk: AudioChunkCallback;
  private audioFormat: AudioFormat;
  private deviceId: string | undefined;

  /**
   * Time slice for MediaRecorder in milliseconds.
   *
   * Safari requires a larger timeslice (1000ms) to properly flush its internal
   * audio buffers. Smaller values cause Safari to drop or truncate audio data.
   * See: https://community.openai.com/t/whisper-problem-with-audio-mp4-blobs-from-safari/
   *
   * Other browsers (Chrome, Firefox, Edge) work well with smaller timeslices
   * which provide lower latency for real-time transcription.
   */
  private static readonly TIME_SLICE_MS = 100;
  private static readonly SAFARI_TIME_SLICE_MS = 1000;

  /**
   * @param onChunk - Callback for receiving audio chunks
   * @param deviceId - Optional audio device ID (empty string or undefined for system default)
   */
  constructor(onChunk: AudioChunkCallback, deviceId?: string) {
    this.onChunk = onChunk;
    this.audioFormat = getSupportedAudioFormat();
    this.deviceId = deviceId;
  }

  /**
   * Get the appropriate timeslice for the current browser.
   * Safari needs a larger timeslice to avoid dropping audio data.
   */
  private getTimeSlice(): number {
    return isSafari() ? AudioCapture.SAFARI_TIME_SLICE_MS : AudioCapture.TIME_SLICE_MS;
  }

  /**
   * Get the timeslice being used (in milliseconds).
   * Useful for callers that need to wait for audio processing.
   */
  getTimeSliceMs(): number {
    return this.getTimeSlice();
  }

  /**
   * Get the audio format being used.
   */
  getFormat(): AudioFormat {
    return this.audioFormat;
  }

  /**
   * Start capturing audio immediately.
   *
   * Audio chunks will be buffered until setReady() is called.
   */
  async start(): Promise<void> {
    const config = getConfig();

    if (this.isRecording) {
      if (config.debug) {
        console.log('[SpeechOS] AudioCapture already recording');
      }
      return;
    }

    // Reset state
    this.buffer = [];
    this.isReady = false;

    // Build constraints using deviceId from constructor
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        ...(this.deviceId ? { deviceId: { exact: this.deviceId } } : {}),
      },
    };

    if (config.debug) {
      console.log('[SpeechOS] AudioCapture starting with format:', this.audioFormat.mimeType);
      console.log('[SpeechOS] Detected Safari:', isSafari());
      if (this.deviceId) {
        console.log('[SpeechOS] Using audio device:', this.deviceId);
      }
    }

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create MediaRecorder with detected format
      const recorderOptions: MediaRecorderOptions = {};
      if (this.audioFormat.mimeType) {
        recorderOptions.mimeType = this.audioFormat.mimeType;
      }

      this.recorder = new MediaRecorder(this.mediaStream, recorderOptions);

      // Handle audio data
      this.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.handleChunk(event.data);
        }
      };

      this.recorder.onerror = (event) => {
        console.error('[SpeechOS] MediaRecorder error:', event);
      };

      // Start recording with time slicing
      // Safari needs larger timeslice (1000ms) to avoid dropping audio
      const timeSlice = this.getTimeSlice();
      this.recorder.start(timeSlice);
      this.isRecording = true;

      if (config.debug) {
        console.log(`[SpeechOS] AudioCapture started with ${timeSlice}ms timeslice, buffering until ready`);
      }
    } catch (error) {
      // If specific device failed, try without device constraint
      if (this.deviceId && error instanceof Error) {
        console.warn('[SpeechOS] Selected device unavailable, trying default:', error.message);

        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        const recorderOptions: MediaRecorderOptions = {};
        if (this.audioFormat.mimeType) {
          recorderOptions.mimeType = this.audioFormat.mimeType;
        }

        this.recorder = new MediaRecorder(this.mediaStream, recorderOptions);

        this.recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.handleChunk(event.data);
          }
        };

        this.recorder.start(this.getTimeSlice());
        this.isRecording = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle an audio chunk with atomic buffer swap pattern.
   *
   * If not ready: buffer the chunk.
   * If ready: send directly via callback.
   */
  private handleChunk(chunk: Blob): void {
    if (this.isReady) {
      // Direct send mode
      this.onChunk(chunk);
    } else {
      // Buffer mode
      this.buffer.push(chunk);
    }
  }

  /**
   * Mark the capture as ready (connection established).
   *
   * This flushes any buffered chunks and switches to direct mode.
   * Uses atomic swap to prevent chunk reordering.
   */
  setReady(): void {
    const config = getConfig();

    if (this.isReady) {
      return;
    }

    // Atomic swap: grab buffer, clear it, then set ready flag
    const toFlush = this.buffer;
    this.buffer = [];

    // Flush all buffered chunks in order
    for (const chunk of toFlush) {
      this.onChunk(chunk);
    }

    // Now enable direct mode
    this.isReady = true;

    if (config.debug) {
      console.log(`[SpeechOS] AudioCapture ready, flushed ${toFlush.length} buffered chunks`);
    }
  }

  /**
   * Stop capturing audio and wait for final chunk.
   *
   * Uses requestData() before stop() to force the MediaRecorder to flush
   * any buffered audio immediately. This is critical for Safari which
   * may hold audio data in internal buffers.
   *
   * Safari requires an additional delay after stopping to ensure all audio
   * from its internal encoding pipeline has been fully processed and emitted.
   */
  async stop(): Promise<void> {
    const config = getConfig();
    const safari = isSafari();

    if (this.recorder && this.recorder.state !== 'inactive') {
      // Force flush any buffered audio before stopping
      // This is critical for Safari which may hold data in internal buffers
      if (this.recorder.state === 'recording') {
        try {
          // Set up promise to wait for the dataavailable event (event-driven)
          const dataPromise = new Promise<void>((resolve) => {
            const handler = (event: BlobEvent) => {
              this.recorder?.removeEventListener('dataavailable', handler);
              if (config.debug) {
                console.log(`[SpeechOS] requestData flush received: ${event.data.size} bytes`);
              }
              resolve();
            };
            this.recorder?.addEventListener('dataavailable', handler);
          });

          // requestData() forces an immediate dataavailable event with buffered data
          this.recorder.requestData();
          if (config.debug) {
            console.log('[SpeechOS] Requested data flush before stop');
          }

          // Wait for the actual dataavailable event
          await dataPromise;
        } catch (e) {
          // requestData() may not be supported on all browsers, continue anyway
          if (config.debug) {
            console.log('[SpeechOS] requestData() not supported or failed:', e);
          }
        }
      }

      // Create a promise that resolves when the recorder fully stops
      const stopPromise = new Promise<void>((resolve) => {
        if (!this.recorder) {
          resolve();
          return;
        }

        // onstop fires AFTER the final ondataavailable, so we wait for it
        this.recorder.onstop = () => {
          if (config.debug) {
            console.log('[SpeechOS] MediaRecorder onstop fired');
          }
          resolve();
        };
      });

      // Stop the recorder
      this.recorder.stop();

      // Wait for onstop event
      await stopPromise;

      // Safari needs extra time for its internal encoding pipeline to fully flush
      // Without this delay, the last portion of audio may be truncated
      if (safari) {
        if (config.debug) {
          console.log('[SpeechOS] Safari: waiting 2s for encoding pipeline to flush');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Now safe to clean up
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    this.recorder = null;
    this.isRecording = false;
    this.isReady = false;
    this.buffer = [];

    if (config.debug) {
      console.log('[SpeechOS] AudioCapture stopped');
    }
  }

  /**
   * Check if currently recording.
   */
  get recording(): boolean {
    return this.isRecording;
  }

  /**
   * Check if ready (connection established, direct mode active).
   */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * Get the number of buffered chunks waiting to be sent.
   */
  get bufferedChunks(): number {
    return this.buffer.length;
  }
}

/**
 * Factory function to create an AudioCapture instance.
 * @param onChunk - Callback for receiving audio chunks
 * @param deviceId - Optional audio device ID (empty string or undefined for system default)
 */
export function createAudioCapture(onChunk: AudioChunkCallback, deviceId?: string): AudioCapture {
  return new AudioCapture(onChunk, deviceId);
}
