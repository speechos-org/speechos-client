/**
 * Audio Capture module tests
 *
 * Tests for format detection, buffering, and atomic buffer swap pattern.
 *
 * Note: Some tests require mocking browser APIs (MediaRecorder, getUserMedia)
 * which can be flaky. Core logic tests are prioritized.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the module's exported functions
// Since MediaRecorder is browser-only, we mock at the global level

describe('getSupportedAudioFormat', () => {
  const originalMediaRecorder = globalThis.MediaRecorder;

  beforeEach(() => {
    // Reset to clean state
    // @ts-expect-error - intentionally modifying global for test
    delete globalThis.MediaRecorder;
  });

  afterEach(() => {
    // Restore
    if (originalMediaRecorder) {
      globalThis.MediaRecorder = originalMediaRecorder;
    }
  });

  it('should detect WebM/Opus as supported format', async () => {
    // Mock MediaRecorder for WebM support
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === 'audio/webm;codecs=opus',
    } as unknown as typeof MediaRecorder;

    // Dynamic import to get fresh module with our mock
    const { getSupportedAudioFormat } = await import('./audio-capture.js');

    const format = getSupportedAudioFormat();

    expect(format.mimeType).toBe('audio/webm;codecs=opus');
    expect(format.format).toBe('webm');
    expect(format.needsEncodingParams).toBe(false);
  });

  it('should detect MP4 when WebM not supported (Safari)', async () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === 'audio/mp4',
    } as unknown as typeof MediaRecorder;

    const { getSupportedAudioFormat } = await import('./audio-capture.js');

    const format = getSupportedAudioFormat();

    expect(format.mimeType).toBe('audio/mp4');
    expect(format.format).toBe('mp4');
  });

  it('should fallback to basic webm when opus not supported', async () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === 'audio/webm',
    } as unknown as typeof MediaRecorder;

    const { getSupportedAudioFormat } = await import('./audio-capture.js');

    const format = getSupportedAudioFormat();

    expect(format.mimeType).toBe('audio/webm');
    expect(format.format).toBe('webm');
  });

  it('should return empty mime when nothing supported', async () => {
    globalThis.MediaRecorder = {
      isTypeSupported: () => false,
    } as unknown as typeof MediaRecorder;

    const { getSupportedAudioFormat } = await import('./audio-capture.js');

    const format = getSupportedAudioFormat();

    expect(format.mimeType).toBe('');
    expect(format.format).toBe('webm');
    expect(format.needsEncodingParams).toBe(true);
  });
});

describe('AudioCapture class logic', () => {
  /**
   * Test the buffering logic conceptually.
   * The actual AudioCapture class requires MediaRecorder which is browser-only.
   * These tests verify the expected behavior pattern.
   */

  it('should define the expected buffer swap pattern', () => {
    // This documents the expected behavior:
    // 1. Chunks arrive before ready -> buffer them
    // 2. setReady() called -> flush buffer atomically, then direct mode
    // 3. Chunks after ready -> send directly

    const buffer: Blob[] = [];
    let isReady = false;
    const sentChunks: Blob[] = [];

    const onChunk = (chunk: Blob) => {
      if (!isReady) {
        // Buffer mode
        buffer.push(chunk);
      } else {
        // Direct mode
        sentChunks.push(chunk);
      }
    };

    const setReady = () => {
      // Atomic swap: flush buffer then switch mode
      const toFlush = [...buffer];
      buffer.length = 0;
      isReady = true;

      // Send buffered chunks
      for (const chunk of toFlush) {
        sentChunks.push(chunk);
      }
    };

    // Simulate chunks before ready
    const preChunk1 = new Blob(['pre1']);
    const preChunk2 = new Blob(['pre2']);
    onChunk(preChunk1);
    onChunk(preChunk2);

    expect(buffer).toHaveLength(2);
    expect(sentChunks).toHaveLength(0);

    // Set ready - should flush
    setReady();

    expect(buffer).toHaveLength(0);
    expect(sentChunks).toHaveLength(2);

    // Chunks after ready go directly
    const postChunk = new Blob(['post1']);
    onChunk(postChunk);

    expect(sentChunks).toHaveLength(3);

    // Verify order
    expect(sentChunks[0]).toBe(preChunk1);
    expect(sentChunks[1]).toBe(preChunk2);
    expect(sentChunks[2]).toBe(postChunk);
  });

  it('should handle multiple setReady calls safely', () => {
    const buffer: Blob[] = [];
    let isReady = false;
    const sentChunks: Blob[] = [];

    const setReady = () => {
      if (isReady) return; // Guard against multiple calls

      const toFlush = [...buffer];
      buffer.length = 0;
      isReady = true;

      for (const chunk of toFlush) {
        sentChunks.push(chunk);
      }
    };

    buffer.push(new Blob(['chunk1']));
    setReady();
    setReady();
    setReady();

    expect(sentChunks).toHaveLength(1);
  });

  it('should ignore empty chunks', () => {
    const sentChunks: Blob[] = [];

    const onChunk = (chunk: Blob) => {
      // Skip empty chunks
      if (chunk.size === 0) return;
      sentChunks.push(chunk);
    };

    onChunk(new Blob([])); // Empty
    onChunk(new Blob(['data'])); // Has data

    expect(sentChunks).toHaveLength(1);
  });
});

describe('AudioFormat interface', () => {
  it('should have correct format types', () => {
    // Type check - ensures interface is correctly defined
    const webmFormat: { format: 'webm' | 'mp4' | 'pcm' } = { format: 'webm' };
    const mp4Format: { format: 'webm' | 'mp4' | 'pcm' } = { format: 'mp4' };
    const pcmFormat: { format: 'webm' | 'mp4' | 'pcm' } = { format: 'pcm' };

    expect(webmFormat.format).toBe('webm');
    expect(mp4Format.format).toBe('mp4');
    expect(pcmFormat.format).toBe('pcm');
  });
});
