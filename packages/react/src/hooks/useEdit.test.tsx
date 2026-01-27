/**
 * Tests for useEdit hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEdit } from "./useEdit.js";
import { SpeechOSProvider } from "../context.js";
import { speechOS } from "@speechos/core";

// Create a single cached mock state object
const mockState = {
  isVisible: false,
  isExpanded: false,
  isConnected: false,
  isMicEnabled: false,
  activeAction: null,
  focusedElement: null,
  selectionText: null,
  selectionElement: null,
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

describe("useEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return edit controls", () => {
    const { result } = renderHook(() => useEdit(), { wrapper });

    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.clear).toBe("function");
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.originalText).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should call speechOS.edit on start", async () => {
    vi.mocked(speechOS.edit).mockResolvedValue("edited text");

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      await result.current.start("original text");
    });

    expect(speechOS.edit).toHaveBeenCalledWith("original text");
  });

  it("should store original text on start", async () => {
    vi.mocked(speechOS.edit).mockResolvedValue("edited");

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      await result.current.start("my original text");
    });

    expect(result.current.originalText).toBe("my original text");
  });

  it("should call speechOS.stopEdit on stop", async () => {
    vi.mocked(speechOS.stopEdit).mockResolvedValue("edited text");

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      const text = await result.current.stop();
      expect(text).toBe("edited text");
    });

    expect(speechOS.stopEdit).toHaveBeenCalled();
  });

  it("should set result after stop", async () => {
    vi.mocked(speechOS.stopEdit).mockResolvedValue("the edited result");

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.result).toBe("the edited result");
  });

  it("should set error on start failure", async () => {
    vi.mocked(speechOS.edit).mockRejectedValue(new Error("Edit failed"));

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      await result.current.start("text");
    });

    expect(result.current.error).toBe("Edit failed");
  });

  it("should set error on stop failure", async () => {
    vi.mocked(speechOS.stopEdit).mockRejectedValue(new Error("Apply failed"));

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      try {
        await result.current.stop();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Apply failed");
  });

  it("should clear state on clear()", async () => {
    vi.mocked(speechOS.edit).mockResolvedValue("edited");
    vi.mocked(speechOS.stopEdit).mockResolvedValue("result");

    const { result } = renderHook(() => useEdit(), { wrapper });

    await act(async () => {
      await result.current.start("original");
      await result.current.stop();
    });

    expect(result.current.originalText).toBe("original");
    expect(result.current.result).toBe("result");

    act(() => {
      result.current.clear();
    });

    expect(result.current.originalText).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
