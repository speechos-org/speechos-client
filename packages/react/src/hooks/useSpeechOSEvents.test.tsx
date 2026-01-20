/**
 * Tests for useSpeechOSEvents hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSpeechOSEvents } from "./useSpeechOSEvents.js";
import { SpeechOSProvider } from "../context.js";
import { events } from "@speechos/core";

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
      on: vi.fn(() => vi.fn()),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
});

// Wrapper component for testing hooks
function wrapper({ children }: { children: ReactNode }) {
  return <SpeechOSProvider>{children}</SpeechOSProvider>;
}

describe("useSpeechOSEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should subscribe to events on mount", () => {
    const callback = vi.fn();

    renderHook(() => useSpeechOSEvents("transcription:complete", callback), { wrapper });

    expect(events.on).toHaveBeenCalledWith("transcription:complete", callback);
  });

  it("should unsubscribe on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(events.on).mockReturnValue(unsubscribe);

    const callback = vi.fn();
    const { unmount } = renderHook(() => useSpeechOSEvents("transcription:complete", callback), {
      wrapper,
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it("should resubscribe when event name changes", () => {
    const unsubscribe = vi.fn();
    vi.mocked(events.on).mockReturnValue(unsubscribe);

    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ event }) => useSpeechOSEvents(event, callback),
      {
        wrapper,
        initialProps: { event: "transcription:complete" as const },
      }
    );

    expect(events.on).toHaveBeenCalledWith("transcription:complete", callback);

    // Change event name
    rerender({ event: "error" });

    expect(unsubscribe).toHaveBeenCalled();
    expect(events.on).toHaveBeenCalledWith("error", callback);
  });

  it("should resubscribe when callback changes", () => {
    const unsubscribe = vi.fn();
    vi.mocked(events.on).mockReturnValue(unsubscribe);

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => useSpeechOSEvents("transcription:complete", callback),
      {
        wrapper,
        initialProps: { callback: callback1 },
      }
    );

    expect(events.on).toHaveBeenCalledWith("transcription:complete", callback1);

    // Change callback
    rerender({ callback: callback2 });

    expect(unsubscribe).toHaveBeenCalled();
    expect(events.on).toHaveBeenCalledWith("transcription:complete", callback2);
  });
});
