/**
 * Tests for SpeechOS React Context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SpeechOSProvider, useSpeechOSContext, type SpeechOSContextValue } from "./context.js";
import { speechOS, state, events } from "@speechos/core";

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

// Test component that uses the context
function TestConsumer({ onContext }: { onContext?: (ctx: SpeechOSContextValue) => void }) {
  const context = useSpeechOSContext();
  onContext?.(context);
  return (
    <div>
      <span data-testid="is-connected">{context.state.isConnected ? "yes" : "no"}</span>
      <span data-testid="recording-state">{context.state.recordingState}</span>
      <span data-testid="is-initialized">{context.isInitialized ? "yes" : "no"}</span>
    </div>
  );
}

describe("SpeechOSProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render children", () => {
    render(
      <SpeechOSProvider>
        <div data-testid="child">Hello</div>
      </SpeechOSProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should provide context to children", () => {
    let capturedContext: SpeechOSContextValue | undefined;

    render(
      <SpeechOSProvider>
        <TestConsumer onContext={(ctx) => (capturedContext = ctx)} />
      </SpeechOSProvider>
    );

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.state).toBeDefined();
    expect(capturedContext?.dictate).toBeDefined();
  });

  it("should auto-initialize when config is provided", () => {
    render(
      <SpeechOSProvider config={{ apiKey: "test-key" }}>
        <TestConsumer />
      </SpeechOSProvider>
    );

    expect(speechOS.init).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("should not auto-initialize if already initialized", () => {
    vi.mocked(speechOS.isInitialized).mockReturnValue(true);

    render(
      <SpeechOSProvider config={{ apiKey: "test-key" }}>
        <TestConsumer />
      </SpeechOSProvider>
    );

    expect(speechOS.init).not.toHaveBeenCalled();
  });

  it("should expose state from core", () => {
    render(
      <SpeechOSProvider>
        <TestConsumer />
      </SpeechOSProvider>
    );

    expect(screen.getByTestId("is-connected")).toHaveTextContent("no");
    expect(screen.getByTestId("recording-state")).toHaveTextContent("idle");
  });

  it("should expose init function", () => {
    let capturedContext: SpeechOSContextValue | undefined;

    render(
      <SpeechOSProvider>
        <TestConsumer onContext={(ctx) => (capturedContext = ctx)} />
      </SpeechOSProvider>
    );

    capturedContext?.init({ apiKey: "manual-key" });
    expect(speechOS.init).toHaveBeenCalledWith({ apiKey: "manual-key" });
  });

  it("should expose high-level API methods", () => {
    let capturedContext: SpeechOSContextValue | undefined;

    render(
      <SpeechOSProvider>
        <TestConsumer onContext={(ctx) => (capturedContext = ctx)} />
      </SpeechOSProvider>
    );

    expect(typeof capturedContext?.dictate).toBe("function");
    expect(typeof capturedContext?.stopDictation).toBe("function");
    expect(typeof capturedContext?.edit).toBe("function");
    expect(typeof capturedContext?.stopEdit).toBe("function");
    expect(typeof capturedContext?.cancel).toBe("function");
  });

  it("should subscribe to state changes", () => {
    render(
      <SpeechOSProvider>
        <TestConsumer />
      </SpeechOSProvider>
    );

    expect(state.subscribe).toHaveBeenCalled();
  });
});

describe("useSpeechOSContext", () => {
  it("should throw when used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useSpeechOSContext must be used within a SpeechOSProvider");

    consoleError.mockRestore();
  });
});
