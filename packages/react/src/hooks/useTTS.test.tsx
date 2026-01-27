/**
 * Tests for useTTS hook
 */

import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTTS } from "./useTTS.js";
import { SpeechOSProvider } from "../context.js";

// Mock event listeners storage - declared at module scope
const eventListeners: Record<string, Set<(payload: unknown) => void>> = {};

// Create a single cached mock state object to avoid infinite loops
const mockState = {
  isVisible: false,
  isExpanded: false,
  isConnected: false,
  isMicEnabled: false,
  activeAction: null,
  focusedElement: null,
  recordingState: "idle" as const,
  errorMessage: null,
};

// Mock @speechos/core
vi.mock("@speechos/core", () => {
  return {
    tts: {
      synthesize: vi.fn(),
      stream: vi.fn(),
    },
    events: {
      on: vi.fn(),
      emit: vi.fn(),
    },
    speechOS: {
      init: vi.fn(),
      isInitialized: vi.fn(() => false),
      dictate: vi.fn(),
      stopDictation: vi.fn(),
      edit: vi.fn(),
      stopEdit: vi.fn(),
      command: vi.fn(),
      stopCommand: vi.fn(),
      cancel: vi.fn(),
    },
    state: {
      // Return the SAME object reference to avoid infinite loops
      getState: vi.fn(() => mockState),
      subscribe: vi.fn(() => () => {}),
    },
  };
});

// Mock @speechos/client dynamic import
vi.mock("@speechos/client", () => {
  return {
    tts: {
      speak: vi.fn(),
      stop: vi.fn(),
      synthesize: vi.fn(),
      stream: vi.fn(),
      isPlaying: vi.fn(() => false),
    },
  };
});

// Get the mocked modules
import { tts as mockCoreTTS, events as mockEvents } from "@speechos/core";
import { tts as mockClientTTS } from "@speechos/client";

// Wrapper component for testing hooks
function wrapper({ children }: { children: ReactNode }) {
  return <SpeechOSProvider>{children}</SpeechOSProvider>;
}

describe("useTTS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear event listeners
    Object.keys(eventListeners).forEach((key) => {
      eventListeners[key]?.clear();
    });

    // Set up mock event handlers
    vi.mocked(mockEvents.on).mockImplementation((event: string, callback: (payload: unknown) => void) => {
      if (!eventListeners[event]) {
        eventListeners[event] = new Set();
      }
      eventListeners[event].add(callback);
      return () => {
        eventListeners[event]?.delete(callback);
      };
    });

    vi.mocked(mockEvents.emit).mockImplementation((event: string, payload: unknown) => {
      eventListeners[event]?.forEach((cb) => cb(payload));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return TTS controls and state", () => {
    const { result } = renderHook(() => useTTS(), { wrapper });

    expect(typeof result.current.speak).toBe("function");
    expect(typeof result.current.synthesize).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.clear).toBe("function");
    expect(result.current.isSynthesizing).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.audioResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  describe("synthesize", () => {
    it("should call core tts.synthesize", async () => {
      const mockResult = {
        audio: new ArrayBuffer(100),
        contentType: "audio/mpeg",
      };
      mockCoreTTS.synthesize.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTTS(), { wrapper });

      let synthesizeResult: unknown;
      await act(async () => {
        synthesizeResult = await result.current.synthesize("Hello");
      });

      expect(mockCoreTTS.synthesize).toHaveBeenCalledWith("Hello", undefined);
      expect(synthesizeResult).toBe(mockResult);
      expect(result.current.audioResult).toBe(mockResult);
    });

    it("should pass options to synthesize", async () => {
      const mockResult = {
        audio: new ArrayBuffer(100),
        contentType: "audio/mpeg",
      };
      mockCoreTTS.synthesize.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        await result.current.synthesize("Bonjour", { voiceId: "custom", language: "fr" });
      });

      expect(mockCoreTTS.synthesize).toHaveBeenCalledWith("Bonjour", {
        voiceId: "custom",
        language: "fr",
      });
    });

    it("should set isSynthesizing during request", async () => {
      let resolvePromise: (value: unknown) => void;
      mockCoreTTS.synthesize.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useTTS(), { wrapper });

      let synthesizePromise: Promise<any>;
      act(() => {
        synthesizePromise = result.current.synthesize("Hello");
      });

      expect(result.current.isSynthesizing).toBe(true);

      await act(async () => {
        resolvePromise({ audio: new ArrayBuffer(100), contentType: "audio/mpeg" });
        await synthesizePromise;
      });

      expect(result.current.isSynthesizing).toBe(false);
    });

    it("should set error on failure", async () => {
      mockCoreTTS.synthesize.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        try {
          await result.current.synthesize("Hello");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.isSynthesizing).toBe(false);
    });
  });

  describe("speak", () => {
    it("should call client tts.speak", async () => {
      mockClientTTS.speak.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        await result.current.speak("Hello");
      });

      expect(mockClientTTS.speak).toHaveBeenCalledWith("Hello", undefined);
    });

    it("should set error on failure", async () => {
      mockClientTTS.speak.mockRejectedValue(new Error("Playback failed"));

      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        try {
          await result.current.speak("Hello");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Playback failed");
    });
  });

  describe("stop", () => {
    it("should call client tts.stop", async () => {
      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        await result.current.stop();
      });

      expect(mockClientTTS.stop).toHaveBeenCalled();
    });

    it("should set isPlaying to false", async () => {
      const { result } = renderHook(() => useTTS(), { wrapper });

      // Simulate playback started
      act(() => {
        mockEvents.emit("tts:playback:start", { text: "Hello" });
      });

      expect(result.current.isPlaying).toBe(true);

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear audioResult and error", async () => {
      const mockResult = {
        audio: new ArrayBuffer(100),
        contentType: "audio/mpeg",
      };
      mockCoreTTS.synthesize.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTTS(), { wrapper });

      await act(async () => {
        await result.current.synthesize("Hello");
      });

      expect(result.current.audioResult).toBe(mockResult);

      act(() => {
        result.current.clear();
      });

      expect(result.current.audioResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("event handling", () => {
    it("should set isPlaying true on tts:playback:start", () => {
      const { result } = renderHook(() => useTTS(), { wrapper });

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        mockEvents.emit("tts:playback:start", { text: "Hello" });
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it("should set isPlaying false on tts:playback:complete", () => {
      const { result } = renderHook(() => useTTS(), { wrapper });

      // Simulate playback started
      act(() => {
        mockEvents.emit("tts:playback:start", { text: "Hello" });
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        mockEvents.emit("tts:playback:complete", { text: "Hello" });
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it("should set error on tts:error event", () => {
      const { result } = renderHook(() => useTTS(), { wrapper });

      act(() => {
        mockEvents.emit("tts:error", {
          code: "playback_failed",
          message: "Audio playback error",
          phase: "playback",
        });
      });

      expect(result.current.error).toBe("Audio playback error");
      expect(result.current.isPlaying).toBe(false);
    });
  });
});
