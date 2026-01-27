/**
 * Tests for TTS Player
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TTSPlayer, tts } from "./tts-player.js";
import { events, setConfig, resetConfig } from "@speechos/core";

// Mock the core tts module
vi.mock("@speechos/core", async () => {
  const actual = await vi.importActual("@speechos/core");
  return {
    ...actual,
    tts: {
      synthesize: vi.fn(),
      stream: vi.fn(),
    },
  };
});

// Import the mocked tts
import { tts as coreTTS } from "@speechos/core";

// Mock AudioContext
class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  start = vi.fn(() => {
    // Simulate immediate playback completion for tests
    setTimeout(() => this.onended?.(), 0);
  });
  stop = vi.fn();
  addEventListener = vi.fn();
}

class MockAudioContext {
  state = "running";
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 1.0,
    numberOfChannels: 1,
    sampleRate: 44100,
  } as AudioBuffer);
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
}

// Store original AudioContext
const originalAudioContext = globalThis.AudioContext;

describe("TTSPlayer", () => {
  let player: TTSPlayer;

  beforeEach(() => {
    // Reset config
    resetConfig();
    setConfig({ apiKey: "test-key" });

    // Clear events
    events.clear();

    // Mock AudioContext
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    // Reset mocks
    vi.clearAllMocks();

    // Create fresh player
    player = new TTSPlayer();
  });

  afterEach(() => {
    // Clean up
    player.dispose();

    // Restore AudioContext
    globalThis.AudioContext = originalAudioContext;
  });

  describe("isPlaying", () => {
    it("should return false initially", () => {
      expect(player.isPlaying()).toBe(false);
    });
  });

  describe("speak", () => {
    it("should synthesize and play audio", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      const playbackStartHandler = vi.fn();
      const playbackCompleteHandler = vi.fn();
      events.on("tts:playback:start", playbackStartHandler);
      events.on("tts:playback:complete", playbackCompleteHandler);

      await player.speak("Hello");

      expect(coreTTS.synthesize).toHaveBeenCalledWith("Hello", undefined);
      expect(playbackStartHandler).toHaveBeenCalledWith({ text: "Hello" });
      expect(playbackCompleteHandler).toHaveBeenCalledWith({ text: "Hello" });
    });

    it("should pass options to synthesize", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      await player.speak("Bonjour", { voiceId: "custom-voice", language: "fr" });

      expect(coreTTS.synthesize).toHaveBeenCalledWith("Bonjour", {
        voiceId: "custom-voice",
        language: "fr",
      });
    });

    it("should emit tts:error on decode failure", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      // Create a new player with a failing decodeAudioData
      class FailingAudioContext extends MockAudioContext {
        decodeAudioData = vi.fn().mockRejectedValue(new Error("Decode error"));
      }
      globalThis.AudioContext = FailingAudioContext as unknown as typeof AudioContext;
      const failingPlayer = new TTSPlayer();

      const errorHandler = vi.fn();
      events.on("tts:error", errorHandler);

      await expect(failingPlayer.speak("Hello")).rejects.toThrow("Decode error");

      expect(errorHandler).toHaveBeenCalledWith({
        code: "decode_failed",
        message: "Decode error",
        phase: "playback",
      });

      // Clean up
      failingPlayer.dispose();
      // Restore normal mock
      globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    });

    it("should stop previous playback when speak is called again", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      // Start first speak
      const promise1 = player.speak("First");

      // Stop spy
      const stopSpy = vi.spyOn(player, "stop");

      // Start second speak
      const promise2 = player.speak("Second");

      // stop should have been called
      expect(stopSpy).toHaveBeenCalled();

      await Promise.all([promise1, promise2]);
    });
  });

  describe("stop", () => {
    it("should stop current playback", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      // Don't await so we can call stop mid-playback
      const speakPromise = player.speak("Hello");

      // Give it time to start
      await new Promise((r) => setTimeout(r, 0));

      player.stop();

      expect(player.isPlaying()).toBe(false);

      // Wait for speak to complete/reject
      await speakPromise.catch(() => {});
    });

    it("should be safe to call when not playing", () => {
      expect(() => player.stop()).not.toThrow();
    });
  });

  describe("dispose", () => {
    it("should close the AudioContext", async () => {
      const mockAudio = new ArrayBuffer(100);
      (coreTTS.synthesize as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        audio: mockAudio,
        contentType: "audio/mpeg",
      });

      // Play something to create the AudioContext
      await player.speak("Hello");

      // Dispose
      player.dispose();

      expect(player.isPlaying()).toBe(false);
    });

    it("should be safe to call when no AudioContext exists", () => {
      expect(() => player.dispose()).not.toThrow();
    });
  });
});

describe("tts (combined export)", () => {
  beforeEach(() => {
    resetConfig();
    setConfig({ apiKey: "test-key" });
    events.clear();
    vi.clearAllMocks();
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    tts.dispose();
    globalThis.AudioContext = originalAudioContext;
  });

  it("should have synthesize method from core", () => {
    expect(typeof tts.synthesize).toBe("function");
  });

  it("should have stream method from core", () => {
    expect(typeof tts.stream).toBe("function");
  });

  it("should have speak method from player", () => {
    expect(typeof tts.speak).toBe("function");
  });

  it("should have stop method from player", () => {
    expect(typeof tts.stop).toBe("function");
  });

  it("should have isPlaying method from player", () => {
    expect(typeof tts.isPlaying).toBe("function");
    expect(tts.isPlaying()).toBe(false);
  });

  it("should have dispose method from player", () => {
    expect(typeof tts.dispose).toBe("function");
  });
});
