/**
 * Tests for SpeechOSWidget component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeechOSWidget } from "./SpeechOSWidget.js";
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
      on: vi.fn(() => vi.fn()),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
});

// Mock customElements to simulate Web Component registration
const mockCustomElements = {
  get: vi.fn(),
  define: vi.fn(),
};

describe("SpeechOSWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock customElements
    vi.stubGlobal("customElements", mockCustomElements);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should render a container div", () => {
    render(
      <SpeechOSProvider>
        <SpeechOSWidget data-testid="widget" />
      </SpeechOSProvider>
    );

    // The component renders a div container
    const container = document.querySelector("div[style*='display: contents']");
    expect(container).toBeInTheDocument();
  });

  it("should apply className prop", () => {
    render(
      <SpeechOSProvider>
        <SpeechOSWidget className="my-custom-class" />
      </SpeechOSProvider>
    );

    const container = document.querySelector(".my-custom-class");
    expect(container).toBeInTheDocument();
  });

  it("should subscribe to transcription events when onTranscription is provided", () => {
    const onTranscription = vi.fn();

    render(
      <SpeechOSProvider>
        <SpeechOSWidget onTranscription={onTranscription} />
      </SpeechOSProvider>
    );

    expect(events.on).toHaveBeenCalledWith("transcription:inserted", expect.any(Function));
  });

  it("should subscribe to edit events when onEdit is provided", () => {
    const onEdit = vi.fn();

    render(
      <SpeechOSProvider>
        <SpeechOSWidget onEdit={onEdit} />
      </SpeechOSProvider>
    );

    expect(events.on).toHaveBeenCalledWith("edit:applied", expect.any(Function));
  });

  it("should subscribe to error events when onError is provided", () => {
    const onError = vi.fn();

    render(
      <SpeechOSProvider>
        <SpeechOSWidget onError={onError} />
      </SpeechOSProvider>
    );

    expect(events.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("should subscribe to show events when onShow is provided", () => {
    const onShow = vi.fn();

    render(
      <SpeechOSProvider>
        <SpeechOSWidget onShow={onShow} />
      </SpeechOSProvider>
    );

    expect(events.on).toHaveBeenCalledWith("widget:show", expect.any(Function));
  });

  it("should subscribe to hide events when onHide is provided", () => {
    const onHide = vi.fn();

    render(
      <SpeechOSProvider>
        <SpeechOSWidget onHide={onHide} />
      </SpeechOSProvider>
    );

    expect(events.on).toHaveBeenCalledWith("widget:hide", expect.any(Function));
  });

  it("should unsubscribe from events on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(events.on).mockReturnValue(unsubscribe);

    const { unmount } = render(
      <SpeechOSProvider>
        <SpeechOSWidget
          onTranscription={vi.fn()}
          onEdit={vi.fn()}
          onError={vi.fn()}
        />
      </SpeechOSProvider>
    );

    unmount();

    // Should have called unsubscribe for each event
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("should warn when Web Component is not registered", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockCustomElements.get.mockReturnValue(undefined);

    render(
      <SpeechOSProvider>
        <SpeechOSWidget />
      </SpeechOSProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("speechos-widget")
    );

    consoleSpy.mockRestore();
  });

  it("should mount Web Component when registered", () => {
    // Mock that the Web Component is registered
    mockCustomElements.get.mockReturnValue(class MockWidget {});

    render(
      <SpeechOSProvider>
        <SpeechOSWidget />
      </SpeechOSProvider>
    );

    // Should create the element
    const widget = document.querySelector("speechos-widget");
    expect(widget).toBeInTheDocument();
  });
});
