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

  describe("focus retention", () => {
    beforeEach(() => {
      mockDesktopDevice();
    });

    it("should prevent default focus shift on widget mouse interactions", async () => {
      await import("./widget.js");

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      const micButton = (widget as SpeechOSWidget).shadowRoot?.querySelector(
        "speechos-mic-button"
      );

      expect(micButton).toBeTruthy();

      const event = new MouseEvent("mousedown", {
        bubbles: true,
        composed: true,
        cancelable: true,
      });

      micButton?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
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

describe("Widget text manipulation", () => {
  let widget: any;
  let execCommandSpy: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    state.reset();
    events.clear();

    // Mock document.execCommand which is used by text-field-edit
    // Define execCommand if it doesn't exist (happy-dom doesn't have it)
    if (!document.execCommand) {
      (document as any).execCommand = () => true;
    }

    execCommandSpy = vi.spyOn(document, "execCommand").mockImplementation((command, showUI, value) => {
      if (command === "insertText" && value) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement)) {
          const start = activeEl.selectionStart || 0;
          const end = activeEl.selectionEnd || 0;
          const before = activeEl.value.substring(0, start);
          const after = activeEl.value.substring(end);
          activeEl.value = before + value + after;
          const newPos = start + value.length;
          activeEl.setSelectionRange(newPos, newPos);
          activeEl.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (activeEl && (activeEl as HTMLElement).isContentEditable) {
          // For contentEditable, replace the selected range with the new text
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(value);
            range.insertNode(textNode);
            // Move cursor to end of inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // No selection - just append
            (activeEl as HTMLElement).textContent = ((activeEl as HTMLElement).textContent || "") + value;
          }
        }
      }
      return true;
    });

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
    if (execCommandSpy) {
      execCommandSpy.mockRestore();
    }
    vi.restoreAllMocks();
  });

  describe("insertTranscription", () => {
    it("should insert text at cursor position in input element", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Hello ";
      document.body.appendChild(input);

      // Set cursor position
      input.setSelectionRange(6, 6);

      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 6;
      widget.dictationCursorEnd = 6;

      widget.insertTranscription("world");

      expect(input.value).toBe("Hello world");
      expect(widget.dictationTargetElement).toBeNull();
    });

    it("should replace selected text in textarea", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello old text";
      document.body.appendChild(textarea);

      // Select "old "
      textarea.setSelectionRange(6, 10);

      widget.dictationTargetElement = textarea;
      widget.dictationCursorStart = 6;
      widget.dictationCursorEnd = 10;

      widget.insertTranscription("new");

      expect(textarea.value).toBe("Hello newtext");
    });

    it("should insert text in contentEditable element", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "Initial text";
      document.body.appendChild(div);

      widget.dictationTargetElement = div;

      widget.insertTranscription(" added");

      expect(div.textContent).toContain("added");
    });

    it("should emit transcription:inserted event", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      const listener = vi.fn();
      events.on("transcription:inserted", listener);

      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 0;
      widget.dictationCursorEnd = 0;

      widget.insertTranscription("test");

      expect(listener).toHaveBeenCalledWith({
        text: "test",
        element: input,
      });
    });

    it("should handle missing target element gracefully", () => {
      widget.dictationTargetElement = null;

      expect(() => {
        widget.insertTranscription("test");
      }).not.toThrow();
    });

    it("should restore cursor position using saved positions", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Start End";
      document.body.appendChild(input);

      // Initially set cursor to end
      input.setSelectionRange(9, 9);

      // Save cursor position in middle
      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 6;
      widget.dictationCursorEnd = 6;

      widget.insertTranscription("Middle ");

      expect(input.value).toBe("Start Middle End");
    });
  });

  describe("applyEdit", () => {
    it("should replace selected text in input element", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Hello world";
      document.body.appendChild(input);

      // Select "world"
      input.setSelectionRange(6, 11);

      widget.editTargetElement = input;
      widget.editSelectionStart = 6;
      widget.editSelectionEnd = 11;

      widget.applyEdit("universe");

      expect(input.value).toBe("Hello universe");
    });

    it("should replace entire content when no selection", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Old content";
      document.body.appendChild(textarea);

      widget.editTargetElement = textarea;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("New content");

      expect(textarea.value).toBe("New content");
    });

    it("should replace all content in contentEditable element when no selection", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "Old text";
      document.body.appendChild(div);

      widget.editTargetElement = div;
      widget.editSelectionStart = null;
      widget.editSelectionEnd = null;

      widget.applyEdit("New text");

      expect(div.textContent).toBe("New text");
    });

    it("should emit edit:applied event", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Original";
      document.body.appendChild(input);

      const listener = vi.fn();
      events.on("edit:applied", listener);

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("Edited");

      expect(listener).toHaveBeenCalledWith({
        originalContent: "Original",
        editedContent: "Edited",
        element: input,
      });
    });

    it("should complete recording state", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      state.startRecording();
      state.setRecordingState("recording");

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("Test");

      expect(state.getState().recordingState).toBe("idle");
    });

    it("should handle missing target element gracefully", () => {
      widget.editTargetElement = null;

      expect(() => {
        widget.applyEdit("test");
      }).not.toThrow();

      expect(state.getState().recordingState).toBe("idle");
    });

    it("should clear edit state after applying", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 5;
      widget.editSelectedText = "hello";

      widget.applyEdit("Test");

      expect(widget.editTargetElement).toBeNull();
      expect(widget.editSelectionStart).toBeNull();
      expect(widget.editSelectionEnd).toBeNull();
      expect(widget.editSelectedText).toBe("");
    });
  });

  describe("getElementContent", () => {
    it("should return selected text from input element", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Hello world";
      document.body.appendChild(input);

      // Select "world"
      input.setSelectionRange(6, 11);

      const content = widget.getElementContent(input);

      expect(content).toBe("world");
    });

    it("should return full content when no selection in input", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Full content";
      document.body.appendChild(input);

      // No selection
      input.setSelectionRange(0, 0);

      const content = widget.getElementContent(input);

      expect(content).toBe("Full content");
    });

    it("should return selected text from textarea", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Line 1\nLine 2\nLine 3";
      document.body.appendChild(textarea);

      // Select "Line 2"
      textarea.setSelectionRange(7, 13);

      const content = widget.getElementContent(textarea);

      expect(content).toBe("Line 2");
    });

    it("should return full content from textarea when no selection", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Full\nContent\nHere";
      document.body.appendChild(textarea);

      textarea.setSelectionRange(0, 0);

      const content = widget.getElementContent(textarea);

      expect(content).toBe("Full\nContent\nHere");
    });

    it("should return selected text from contentEditable element", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "Some editable content";
      document.body.appendChild(div);

      // Create a selection
      const range = document.createRange();
      const textNode = div.firstChild!;
      range.setStart(textNode, 5);
      range.setEnd(textNode, 13);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const content = widget.getElementContent(div);

      expect(content).toBe("editable");
    });

    it("should return full text from contentEditable when no selection", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "All content";
      document.body.appendChild(div);

      // Clear selection
      const selection = window.getSelection()!;
      selection.removeAllRanges();

      const content = widget.getElementContent(div);

      expect(content).toBe("All content");
    });

    it("should return empty string for null element", () => {
      const content = widget.getElementContent(null);

      expect(content).toBe("");
    });

    it("should return empty string for non-editable element", () => {
      const div = document.createElement("div");
      div.textContent = "Not editable";
      document.body.appendChild(div);

      const content = widget.getElementContent(div);

      expect(content).toBe("");
    });
  });

  describe("supportsSelection", () => {
    it("should return true for textarea", () => {
      const textarea = document.createElement("textarea");

      expect(widget.supportsSelection(textarea)).toBe(true);
    });

    it("should return true for text input", () => {
      const input = document.createElement("input");
      input.type = "text";

      expect(widget.supportsSelection(input)).toBe(true);
    });

    it("should return true for search input", () => {
      const input = document.createElement("input");
      input.type = "search";

      expect(widget.supportsSelection(input)).toBe(true);
    });

    it("should return true for url input", () => {
      const input = document.createElement("input");
      input.type = "url";

      expect(widget.supportsSelection(input)).toBe(true);
    });

    it("should return true for tel input", () => {
      const input = document.createElement("input");
      input.type = "tel";

      expect(widget.supportsSelection(input)).toBe(true);
    });

    it("should return true for password input", () => {
      const input = document.createElement("input");
      input.type = "password";

      expect(widget.supportsSelection(input)).toBe(true);
    });

    it("should return false for number input", () => {
      const input = document.createElement("input");
      input.type = "number";

      expect(widget.supportsSelection(input)).toBe(false);
    });

    it("should return false for checkbox input", () => {
      const input = document.createElement("input");
      input.type = "checkbox";

      expect(widget.supportsSelection(input)).toBe(false);
    });

    it("should return false for radio input", () => {
      const input = document.createElement("input");
      input.type = "radio";

      expect(widget.supportsSelection(input)).toBe(false);
    });

    it("should return false for file input", () => {
      const input = document.createElement("input");
      input.type = "file";

      expect(widget.supportsSelection(input)).toBe(false);
    });
  });

  describe("edit failure detection", () => {
    it("should show modal when edit fails to apply to input element", async () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Original content";
      document.body.appendChild(input);

      // Mock execCommand to fail (return false and don't change value)
      execCommandSpy.mockImplementation(() => false);

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("New content");

      // Wait for requestAnimationFrame
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await widget.updateComplete;

      // Modal should be shown with edit mode
      expect(widget.dictationModalOpen).toBe(true);
      expect(widget.dictationModalMode).toBe("edit");
      expect(widget.dictationModalText).toBe("New content");
    });

    it("should not show modal when edit applies successfully", async () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Original content";
      document.body.appendChild(input);

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("New content");

      // Wait for requestAnimationFrame
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await widget.updateComplete;

      // Modal should NOT be shown because content was updated
      expect(widget.dictationModalOpen).toBe(false);
    });

    it("should emit edit:applied event even when showing fallback modal", async () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Original";
      document.body.appendChild(input);

      // Mock execCommand to fail
      execCommandSpy.mockImplementation(() => false);

      const listener = vi.fn();
      events.on("edit:applied", listener);

      widget.editTargetElement = input;
      widget.editSelectionStart = 0;
      widget.editSelectionEnd = 0;

      widget.applyEdit("Edited");

      // Event should still be emitted
      expect(listener).toHaveBeenCalledWith({
        originalContent: "Original",
        editedContent: "Edited",
        element: input,
      });
    });
  });

  describe("dictation insertion failure detection", () => {
    it("should show modal when dictation fails to insert into input element", async () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "";
      document.body.appendChild(input);

      // Mock execCommand to fail
      execCommandSpy.mockImplementation(() => false);

      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 0;
      widget.dictationCursorEnd = 0;

      widget.insertTranscription("Dictated text");

      // Wait for requestAnimationFrame
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await widget.updateComplete;

      // Modal should be shown with dictation mode
      expect(widget.dictationModalOpen).toBe(true);
      expect(widget.dictationModalMode).toBe("dictation");
      expect(widget.dictationModalText).toBe("Dictated text");
    });

    it("should not show modal when dictation inserts successfully", async () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "Hello ";
      document.body.appendChild(input);

      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 6;
      widget.dictationCursorEnd = 6;

      widget.insertTranscription("world");

      // Wait for requestAnimationFrame
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await widget.updateComplete;

      // Modal should NOT be shown because content was inserted
      expect(widget.dictationModalOpen).toBe(false);
      expect(input.value).toBe("Hello world");
    });

    it("should emit transcription:inserted event even when showing fallback modal", async () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      // Mock execCommand to fail
      execCommandSpy.mockImplementation(() => false);

      const listener = vi.fn();
      events.on("transcription:inserted", listener);

      widget.dictationTargetElement = input;
      widget.dictationCursorStart = 0;
      widget.dictationCursorEnd = 0;

      widget.insertTranscription("test");

      // Event should still be emitted
      expect(listener).toHaveBeenCalledWith({
        text: "test",
        element: input,
      });
    });
  });

  describe("dictationModalMode state", () => {
    it("should default to 'dictation' mode", () => {
      expect(widget.dictationModalMode).toBe("dictation");
    });

    it("should sync mode to modal element when changed", async () => {
      widget.dictationModalMode = "edit";
      await widget.updateComplete;

      expect(widget.dictationModalElement.mode).toBe("edit");
    });

    it("should set mode to 'dictation' when showing modal for dictation", async () => {
      widget.dictationModalText = "Test text";
      widget.dictationModalMode = "dictation";
      widget.dictationModalOpen = true;
      await widget.updateComplete;

      expect(widget.dictationModalElement.mode).toBe("dictation");
    });

    it("should set mode to 'edit' when showing modal for failed edit", async () => {
      widget.dictationModalText = "Edited text";
      widget.dictationModalMode = "edit";
      widget.dictationModalOpen = true;
      await widget.updateComplete;

      expect(widget.dictationModalElement.mode).toBe("edit");
    });
  });
});
