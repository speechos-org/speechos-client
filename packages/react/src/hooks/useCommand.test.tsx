/**
 * Tests for useCommand hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useCommand } from "./useCommand.js";
import { SpeechOSProvider } from "../context.js";
import { speechOS } from "@speechos/core";
import type { CommandDefinition, CommandResult } from "@speechos/core";

// Create a single cached mock state object
const mockState = {
  isVisible: false,
  isExpanded: false,
  isConnected: false,
  isMicEnabled: false,
  activeAction: null as "dictate" | "edit" | "command" | null,
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

// Sample commands for testing
const testCommands: CommandDefinition[] = [
  { name: "scroll_down", description: "Scroll the page down" },
  { name: "open_settings", description: "Open the settings modal" },
  {
    name: "search",
    description: "Search for something",
    arguments: [{ name: "query", description: "The search query" }],
  },
];

// Sample command result
const testResult: CommandResult = {
  name: "search",
  arguments: { query: "hello world" },
};

describe("useCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockState.activeAction = null;
    mockState.recordingState = "idle";
  });

  it("should return command controls", () => {
    const { result } = renderHook(() => useCommand(), { wrapper });

    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.clear).toBe("function");
    expect(result.current.isListening).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should call speechOS.command on start with commands", async () => {
    vi.mocked(speechOS.command).mockResolvedValue(testResult);

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      await result.current.start(testCommands);
    });

    expect(speechOS.command).toHaveBeenCalledWith(testCommands);
  });

  it("should call speechOS.stopCommand on stop", async () => {
    vi.mocked(speechOS.stopCommand).mockResolvedValue(testResult);

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      const commandResult = await result.current.stop();
      expect(commandResult).toEqual(testResult);
    });

    expect(speechOS.stopCommand).toHaveBeenCalled();
  });

  it("should set result after stop", async () => {
    vi.mocked(speechOS.stopCommand).mockResolvedValue(testResult);

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.result).toEqual(testResult);
  });

  it("should handle null result (no command matched)", async () => {
    vi.mocked(speechOS.stopCommand).mockResolvedValue(null);

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      const commandResult = await result.current.stop();
      expect(commandResult).toBeNull();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should set error on start failure", async () => {
    vi.mocked(speechOS.command).mockRejectedValue(
      new Error("Connection failed")
    );

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      await result.current.start(testCommands);
    });

    expect(result.current.error).toBe("Connection failed");
  });

  it("should set error on stop failure", async () => {
    vi.mocked(speechOS.stopCommand).mockRejectedValue(
      new Error("Command processing failed")
    );

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      try {
        await result.current.stop();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Command processing failed");
  });

  it("should clear result and error on clear()", async () => {
    vi.mocked(speechOS.stopCommand).mockResolvedValue(testResult);

    const { result } = renderHook(() => useCommand(), { wrapper });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.result).toEqual(testResult);

    act(() => {
      result.current.clear();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should derive isListening from state when recording command", () => {
    // Update mock state to simulate command recording
    mockState.recordingState = "recording";
    mockState.activeAction = "command";

    const { result } = renderHook(() => useCommand(), { wrapper });

    expect(result.current.isListening).toBe(true);
    expect(result.current.isProcessing).toBe(false);

    // Reset
    mockState.recordingState = "idle";
    mockState.activeAction = null;
  });

  it("should derive isProcessing from state", () => {
    // Update mock state to simulate processing
    mockState.recordingState = "processing";

    const { result } = renderHook(() => useCommand(), { wrapper });

    expect(result.current.isProcessing).toBe(true);

    // Reset
    mockState.recordingState = "idle";
  });

  it("should not be listening when action is dictate", () => {
    // Update mock state to simulate dictation recording
    mockState.recordingState = "recording";
    mockState.activeAction = "dictate";

    const { result } = renderHook(() => useCommand(), { wrapper });

    expect(result.current.isListening).toBe(false);

    // Reset
    mockState.recordingState = "idle";
    mockState.activeAction = null;
  });
});
