/**
 * Tests for useSpeechOS hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSpeechOS } from "./useSpeechOS.js";
import { SpeechOSProvider } from "../context.js";

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
      command: vi.fn(),
      stopCommand: vi.fn(),
      cancel: vi.fn(),
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

describe("useSpeechOS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the full context value", () => {
    const { result } = renderHook(() => useSpeechOS(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.state).toBeDefined();
    expect(result.current.isInitialized).toBe(false);
  });

  it("should return state properties", () => {
    const { result } = renderHook(() => useSpeechOS(), { wrapper });

    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.isMicEnabled).toBe(false);
    expect(result.current.state.recordingState).toBe("idle");
  });

  it("should return high-level API functions", () => {
    const { result } = renderHook(() => useSpeechOS(), { wrapper });

    expect(typeof result.current.init).toBe("function");
    expect(typeof result.current.dictate).toBe("function");
    expect(typeof result.current.stopDictation).toBe("function");
    expect(typeof result.current.edit).toBe("function");
    expect(typeof result.current.stopEdit).toBe("function");
    expect(typeof result.current.cancel).toBe("function");
  });

  it("should return event functions", () => {
    const { result } = renderHook(() => useSpeechOS(), { wrapper });

    expect(typeof result.current.on).toBe("function");
    expect(typeof result.current.off).toBe("function");
  });
});
