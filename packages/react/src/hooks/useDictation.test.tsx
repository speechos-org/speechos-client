/**
 * Tests for useDictation hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useDictation } from "./useDictation.js";
import { SpeechOSProvider } from "../context.js";
import { speechOS, state } from "@speechos/core";

// Create a single cached mock state object
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
    speechOS: {
      init: vi.fn(),
      isInitialized: vi.fn(() => false),
      dictate: vi.fn(),
      stopDictation: vi.fn(),
      edit: vi.fn(),
      stopEdit: vi.fn(),
      cancel: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      enableMicrophone: vi.fn(),
      waitUntilReady: vi.fn(),
      stopAndGetTranscript: vi.fn(),
      stopAndEdit: vi.fn(),
    },
    state: {
      // Return the SAME object reference to avoid infinite loops
      getState: vi.fn(() => mockState),
      subscribe: vi.fn(() => () => {}),
    },
    events: {
      on: vi.fn(() => () => {}),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
});

// Wrapper component for testing hooks
function wrapper({ children }: { children: ReactNode }) {
  return <SpeechOSProvider>{children}</SpeechOSProvider>;
}

describe("useDictation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return dictation controls", () => {
    const { result } = renderHook(() => useDictation(), { wrapper });

    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.clear).toBe("function");
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.transcript).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should call speechOS.dictate on start", async () => {
    vi.mocked(speechOS.dictate).mockResolvedValue("test transcript");

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      await result.current.start();
    });

    expect(speechOS.dictate).toHaveBeenCalled();
  });

  it("should call speechOS.stopDictation on stop", async () => {
    vi.mocked(speechOS.stopDictation).mockResolvedValue("test transcript");

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      const text = await result.current.stop();
      expect(text).toBe("test transcript");
    });

    expect(speechOS.stopDictation).toHaveBeenCalled();
  });

  it("should set transcript after stop", async () => {
    vi.mocked(speechOS.stopDictation).mockResolvedValue("hello world");

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.transcript).toBe("hello world");
  });

  it("should set error on start failure", async () => {
    vi.mocked(speechOS.dictate).mockRejectedValue(new Error("Connection failed"));

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("Connection failed");
  });

  it("should set error on stop failure", async () => {
    vi.mocked(speechOS.stopDictation).mockRejectedValue(new Error("Transcription failed"));

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      try {
        await result.current.stop();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Transcription failed");
  });

  it("should clear transcript and error on clear()", async () => {
    vi.mocked(speechOS.stopDictation).mockResolvedValue("hello");

    const { result } = renderHook(() => useDictation(), { wrapper });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.transcript).toBe("hello");

    act(() => {
      result.current.clear();
    });

    expect(result.current.transcript).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
