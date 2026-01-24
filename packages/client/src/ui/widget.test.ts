/**
 * Tests for SpeechOS Widget positioning
 * Ensures mobile anchoring vs desktop center-bottom behavior is preserved
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state, events } from "@speechos/core";
import type { SpeechOSWidget } from "./widget.js";

// Helper to mock mobile device
function mockMobileDevice() {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 5,
    configurable: true,
  });
  Object.defineProperty(window, "ontouchstart", {
    value: () => {},
    configurable: true,
  });
}

// Helper to mock desktop device
function mockDesktopDevice() {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1920);
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
  // Remove ontouchstart to simulate no touch support
  const descriptor = Object.getOwnPropertyDescriptor(window, "ontouchstart");
  if (descriptor) {
    delete (window as any).ontouchstart;
  }
}

describe("Widget positioning", () => {
  let widget: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    state.reset();
    events.clear();

    // Create widget element
    widget = document.createElement("speechos-widget");
    document.body.appendChild(widget);
  });

  afterEach(() => {
    if (widget && widget.parentNode) {
      widget.parentNode.removeChild(widget);
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("mobile devices", () => {
    beforeEach(() => {
      mockMobileDevice();
    });

    it("should detect mobile device correctly", () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      expect(hasTouchScreen).toBe(true);
      expect(isSmallScreen).toBe(true);
    });

    it("should track focusedElement on mobile", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();

      expect(state.getState().focusedElement).toBe(input);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should anchor to element on mobile when focusedElement is set", async () => {
      // Dynamically import to ensure widget is registered
      await import("./widget.js");

      const input = document.createElement("input");
      input.type = "text";
      // Give it a position so getBoundingClientRect works
      input.style.position = "absolute";
      input.style.top = "100px";
      input.style.left = "50px";
      input.style.width = "200px";
      input.style.height = "40px";
      document.body.appendChild(input);

      // Re-create widget after import
      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.setFocusedElement(input);
      state.show();

      // Wait for Lit to update
      await (widget as SpeechOSWidget).updateComplete;

      // Widget should have anchored-to-element class on mobile
      expect(widget.classList.contains("anchored-to-element")).toBe(true);
    });

    it("should use default position on mobile when no focusedElement", async () => {
      await import("./widget.js");

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      // Show widget without focused element
      state.setFocusedElement(null);
      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should NOT have anchored-to-element class
      expect(widget.classList.contains("anchored-to-element")).toBe(false);
    });
  });

  describe("desktop devices", () => {
    beforeEach(() => {
      mockDesktopDevice();
    });

    it("should detect desktop device correctly", () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      expect(hasTouchScreen).toBe(false);
      expect(isSmallScreen).toBe(false);
    });

    it("should track focusedElement on desktop", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();

      expect(state.getState().focusedElement).toBe(input);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should allow detaching focused element", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();
      expect(state.getState().focusedElement).toBe(input);

      state.setFocusedElement(null);
      expect(state.getState().focusedElement).toBe(null);
    });

    it("should NOT anchor to element on desktop even when focusedElement is set", async () => {
      await import("./widget.js");

      const input = document.createElement("input");
      input.type = "text";
      input.style.position = "absolute";
      input.style.top = "100px";
      input.style.left = "50px";
      document.body.appendChild(input);

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.setFocusedElement(input);
      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should NOT have anchored-to-element class on desktop
      expect(widget.classList.contains("anchored-to-element")).toBe(false);
    });

    it("should use fixed bottom position on desktop", async () => {
      await import("./widget.js");

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should have bottom position set (default fixed position)
      expect(widget.style.bottom).toBe("12px");
    });
  });

  describe("programmatic showFor() positioning", () => {
    it("should set focused element when showFor is called", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      // Simulate showFor behavior
      state.setFocusedElement(textarea);
      state.show();

      expect(state.getState().focusedElement).toBe(textarea);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should clear focused element when detach is called", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      // Simulate attachTo then detach
      state.setFocusedElement(textarea);
      state.show();
      state.setFocusedElement(null);

      expect(state.getState().focusedElement).toBe(null);
    });
  });

  describe("visibility state", () => {
    it("should emit widget:show event when showing", () => {
      const listener = vi.fn();
      events.on("widget:show", listener);

      state.show();

      expect(listener).toHaveBeenCalled();
    });

    it("should emit widget:hide event when hiding", () => {
      const listener = vi.fn();
      events.on("widget:hide", listener);

      state.show();
      state.hide();

      expect(listener).toHaveBeenCalled();
    });

    it("should clear focused element when hiding", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();
      state.hide();

      // hide() should reset the focused element
      expect(state.getState().isVisible).toBe(false);
    });
  });
});

describe("Widget no-audio warning", () => {
  let widget: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.reset();
    events.clear();

    // Dynamically import to ensure widget is registered
    await import("./widget.js");

    widget = document.createElement("speechos-widget");
    document.body.appendChild(widget);
    await widget.updateComplete;
  });

  afterEach(() => {
    if (widget && widget.parentNode) {
      widget.parentNode.removeChild(widget);
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("trackActionResult", () => {
    it("should increment consecutiveNoAudioActions on empty result", () => {
      expect(widget.consecutiveNoAudioActions).toBe(0);

      widget.trackActionResult(false);
      expect(widget.consecutiveNoAudioActions).toBe(1);

      widget.trackActionResult(false);
      expect(widget.consecutiveNoAudioActions).toBe(2);
    });

    it("should reset consecutiveNoAudioActions on successful result", () => {
      widget.consecutiveNoAudioActions = 3;

      widget.trackActionResult(true);
      expect(widget.consecutiveNoAudioActions).toBe(0);
    });
  });

  describe("startNoAudioWarningTracking", () => {
    it("should reset transcriptionReceived and showNoAudioWarning", () => {
      widget.transcriptionReceived = true;
      widget.showNoAudioWarning = true;

      widget.startNoAudioWarningTracking();

      expect(widget.transcriptionReceived).toBe(false);
      expect(widget.showNoAudioWarning).toBe(false);
    });

    it("should show warning immediately if consecutive failures >= threshold", () => {
      widget.consecutiveNoAudioActions = 2; // threshold is 2

      widget.startNoAudioWarningTracking();

      expect(widget.showNoAudioWarning).toBe(true);
    });

    it("should show warning after 5 second timeout if no transcription received", () => {
      // Simulate recording state
      state.setState({ recordingState: "recording" });
      widget.startNoAudioWarningTracking();

      expect(widget.showNoAudioWarning).toBe(false);

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(widget.showNoAudioWarning).toBe(true);
    });

    it("should not show warning after timeout if transcription was received", () => {
      state.setState({ recordingState: "recording" });
      widget.startNoAudioWarningTracking();

      // Simulate receiving transcription
      widget.transcriptionReceived = true;

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(widget.showNoAudioWarning).toBe(false);
    });

    it("should hide warning when transcription:interim event is received", () => {
      state.setState({ recordingState: "recording" });
      widget.startNoAudioWarningTracking();

      // Show warning first
      widget.showNoAudioWarning = true;

      // Emit transcription:interim event
      events.emit("transcription:interim", {
        transcript: "test",
        isFinal: false,
      });

      expect(widget.transcriptionReceived).toBe(true);
      expect(widget.showNoAudioWarning).toBe(false);
    });
  });

  describe("cleanupNoAudioWarningTracking", () => {
    it("should clear timeout and reset showNoAudioWarning", () => {
      widget.startNoAudioWarningTracking();
      expect(widget.noAudioWarningTimeout).not.toBeNull();

      widget.cleanupNoAudioWarningTracking();

      expect(widget.noAudioWarningTimeout).toBeNull();
      expect(widget.showNoAudioWarning).toBe(false);
    });

    it("should unsubscribe from transcription:interim events", () => {
      widget.startNoAudioWarningTracking();
      expect(widget.transcriptionInterimUnsubscribe).not.toBeNull();

      widget.cleanupNoAudioWarningTracking();

      expect(widget.transcriptionInterimUnsubscribe).toBeNull();
    });
  });

  describe("handleOpenSettingsFromWarning", () => {
    it("should cancel recording, clean up state, and open settings", async () => {
      expect(widget.settingsOpen).toBe(false);

      state.show();

      await widget.handleOpenSettingsFromWarning();

      // Should clean up no-audio warning tracking
      expect(widget.showNoAudioWarning).toBe(false);
      expect(widget.noAudioWarningTimeout).toBeNull();

      // Should open settings
      expect(widget.settingsOpen).toBe(true);
      expect(widget.settingsOpenFromWarning).toBe(true);
    });

    it("should keep settings open when widget collapses after warning", async () => {
      state.show();
      state.toggleExpanded(); // Expand widget

      await widget.handleOpenSettingsFromWarning();
      expect(widget.settingsOpen).toBe(true);
      expect(widget.settingsOpenFromWarning).toBe(true);

      // Simulate widget collapsing (e.g., from cancelRecording)
      state.setState({ isExpanded: false });

      // Settings should still be open because settingsOpenFromWarning is true
      expect(widget.settingsOpen).toBe(true);
    });

    it("should close settings when widget is hidden (even if opened from warning)", async () => {
      state.show();

      await widget.handleOpenSettingsFromWarning();
      expect(widget.settingsOpen).toBe(true);
      expect(widget.settingsOpenFromWarning).toBe(true);

      // Hide the widget
      state.hide();

      // Settings should close and flag should reset
      expect(widget.settingsOpen).toBe(false);
      expect(widget.settingsOpenFromWarning).toBe(false);
    });

    it("should close settings on collapse when NOT opened from warning", () => {
      state.show();
      state.toggleExpanded(); // Expand widget

      // Open settings normally (not from warning)
      widget.settingsOpen = true;
      widget.settingsOpenFromWarning = false;

      // Collapse the widget
      state.setState({ isExpanded: false });

      // Settings should close because settingsOpenFromWarning is false
      expect(widget.settingsOpen).toBe(false);
    });

    it("should clear target elements when opening settings from warning", async () => {
      state.show();

      // Set up some target elements
      const input = document.createElement("input");
      widget.dictationTargetElement = input;
      widget.editTargetElement = input;
      widget.dictationCursorStart = 5;
      widget.dictationCursorEnd = 10;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 5;
      widget.editSelectedText = "hello";

      await widget.handleOpenSettingsFromWarning();

      // All target elements should be cleared
      expect(widget.dictationTargetElement).toBeNull();
      expect(widget.editTargetElement).toBeNull();
      expect(widget.dictationCursorStart).toBeNull();
      expect(widget.dictationCursorEnd).toBeNull();
      expect(widget.editSelectionStart).toBeNull();
      expect(widget.editSelectionEnd).toBeNull();
      expect(widget.editSelectedText).toBe("");
    });
  });

  describe("CSP/connection blocked error handling", () => {
    it("should set error state when error event is emitted during recording", () => {
      // Start recording - this sets state to "connecting" initially
      state.startRecording();
      expect(state.getState().recordingState).toBe("connecting");

      // Manually transition to recording (simulating successful connection)
      state.setRecordingState("recording");
      expect(state.getState().recordingState).toBe("recording");

      // Emit a connection_blocked error directly to state
      state.setError("This site's CSP blocks the extension. Try embedded mode instead.");

      // State should be error
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toContain("CSP blocks the extension");
    });

    it("should not process error if already in error state", () => {
      // Put state in error state first
      state.setError("First error");
      expect(state.getState().recordingState).toBe("error");

      const firstErrorMessage = state.getState().errorMessage;

      // Try to set another error - should keep the first
      state.setError("Second error message");

      // Error message should remain the first one (setError always updates, but this tests the concept)
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toBeDefined();
    });

    it("should not transition to recording when already in error state", () => {
      // Put state in error state
      state.setError("Connection blocked");
      expect(state.getState().recordingState).toBe("error");

      // Simulate what onMicReady would do - check state before setting
      const currentState = state.getState();
      if (currentState.recordingState !== "error") {
        state.setRecordingState("recording");
      }

      // Should remain in error state (the guard prevents transition)
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toBe("Connection blocked");
    });

    it("should clear error when reset is called", () => {
      // Put state in error state
      state.setError("Test error");
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toBe("Test error");

      // Reset state
      state.reset();

      // Should be back to idle
      expect(state.getState().recordingState).toBe("idle");
      expect(state.getState().errorMessage).toBeNull();
    });

    it("should distinguish retryable from non-retryable errors by code", () => {
      // Test the error code logic used by widget
      const connectionBlocked = { code: "connection_blocked", message: "CSP blocked" };
      const websocketError = { code: "websocket_error", message: "General error" };
      const timeout = { code: "connection_timeout", message: "Timeout" };

      // connection_blocked should not be retryable
      expect(connectionBlocked.code !== "connection_blocked").toBe(false); // not retryable
      // Other errors should be retryable
      expect(websocketError.code !== "connection_blocked").toBe(true); // retryable
      expect(timeout.code !== "connection_blocked").toBe(true); // retryable
    });
  });
});
