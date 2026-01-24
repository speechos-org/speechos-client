import { describe, it, expect, beforeEach } from "vitest";
import { createStateManager } from "./state.js";
import type { SpeechOSState } from "./types.js";

describe("StateManager", () => {
  let state: ReturnType<typeof createStateManager>;

  beforeEach(() => {
    state = createStateManager();
  });

  describe("initial state", () => {
    it("should have correct default values", () => {
      const s = state.getState();
      expect(s.isVisible).toBe(false);
      expect(s.isExpanded).toBe(false);
      expect(s.isConnected).toBe(false);
      expect(s.isMicEnabled).toBe(false);
      expect(s.activeAction).toBe(null);
      expect(s.focusedElement).toBe(null);
      expect(s.recordingState).toBe("idle");
      expect(s.errorMessage).toBe(null);
    });
  });

  describe("show/hide", () => {
    it("should show the widget", () => {
      state.show();
      expect(state.getState().isVisible).toBe(true);
    });

    it("should hide the widget and reset expanded state", () => {
      state.show();
      state.setState({ isExpanded: true });
      state.hide();

      const s = state.getState();
      expect(s.isVisible).toBe(false);
      expect(s.isExpanded).toBe(false);
    });
  });

  describe("toggleExpanded", () => {
    it("should toggle expanded state", () => {
      expect(state.getState().isExpanded).toBe(false);
      state.toggleExpanded();
      expect(state.getState().isExpanded).toBe(true);
      state.toggleExpanded();
      expect(state.getState().isExpanded).toBe(false);
    });
  });

  describe("connection state", () => {
    it("should set connected state", () => {
      expect(state.getState().isConnected).toBe(false);
      state.setConnected(true);
      expect(state.getState().isConnected).toBe(true);
      state.setConnected(false);
      expect(state.getState().isConnected).toBe(false);
    });

    it("should set mic enabled state", () => {
      expect(state.getState().isMicEnabled).toBe(false);
      state.setMicEnabled(true);
      expect(state.getState().isMicEnabled).toBe(true);
      state.setMicEnabled(false);
      expect(state.getState().isMicEnabled).toBe(false);
    });
  });

  describe("recording flow", () => {
    it("should transition through recording states", () => {
      // Start recording
      state.startRecording();
      expect(state.getState().recordingState).toBe("connecting");
      expect(state.getState().isExpanded).toBe(false);

      // Move to recording
      state.setRecordingState("recording");
      expect(state.getState().recordingState).toBe("recording");

      // Stop recording (processing)
      state.stopRecording();
      expect(state.getState().recordingState).toBe("processing");
      expect(state.getState().isMicEnabled).toBe(false);

      // Complete
      state.completeRecording();
      expect(state.getState().recordingState).toBe("idle");
      expect(state.getState().isConnected).toBe(false);
      expect(state.getState().isMicEnabled).toBe(false);
      expect(state.getState().isExpanded).toBe(false);
    });

    it("should collapse expanded widget when completing recording", () => {
      // Start with expanded widget
      state.show();
      state.setState({ isExpanded: true });
      expect(state.getState().isExpanded).toBe(true);

      // Start and complete a recording
      state.startRecording();
      state.setRecordingState("recording");
      state.completeRecording();

      // Widget should be collapsed but still visible
      expect(state.getState().isExpanded).toBe(false);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should allow canceling recording", () => {
      state.startRecording();
      state.setRecordingState("recording");
      state.setConnected(true);
      state.setMicEnabled(true);

      state.cancelRecording();

      const s = state.getState();
      expect(s.recordingState).toBe("idle");
      expect(s.activeAction).toBe(null);
      expect(s.isConnected).toBe(false);
      expect(s.isMicEnabled).toBe(false);
    });
  });

  describe("subscriptions", () => {
    it("should notify subscribers on state change", () => {
      let callCount = 0;
      let lastState: SpeechOSState | undefined;

      state.subscribe((newState) => {
        callCount++;
        lastState = newState;
      });

      state.show();
      expect(callCount).toBe(1);
      expect(lastState).toBeDefined();
      expect(lastState!.isVisible).toBe(true);
    });

    it("should allow unsubscribing", () => {
      let callCount = 0;
      const unsubscribe = state.subscribe(() => {
        callCount++;
      });

      state.show();
      expect(callCount).toBe(1);

      unsubscribe();
      state.hide();
      expect(callCount).toBe(1); // Should not increase
    });

    it("should provide previous state to subscribers", () => {
      let prevStateCapture: SpeechOSState | undefined;

      state.subscribe((_newState, prevState) => {
        prevStateCapture = prevState;
      });

      state.show();

      expect(prevStateCapture).toBeDefined();
      expect(prevStateCapture!.isVisible).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset to initial state", () => {
      state.show();
      state.setState({
        isExpanded: true,
        activeAction: "dictate",
        isConnected: true,
        isMicEnabled: true,
      });
      state.startRecording();

      state.reset();

      const s = state.getState();
      expect(s.isVisible).toBe(false);
      expect(s.isExpanded).toBe(false);
      expect(s.isConnected).toBe(false);
      expect(s.isMicEnabled).toBe(false);
      expect(s.activeAction).toBe(null);
      expect(s.recordingState).toBe("idle");
    });
  });

  describe("error state", () => {
    it("should set error state with message", () => {
      state.setError("Connection failed");

      const s = state.getState();
      expect(s.recordingState).toBe("error");
      expect(s.errorMessage).toBe("Connection failed");
    });

    it("should clear error state and return to idle", () => {
      state.setError("Connection failed");
      state.clearError();

      const s = state.getState();
      expect(s.recordingState).toBe("idle");
      expect(s.errorMessage).toBe(null);
    });

    it("should persist error state until explicitly cleared", () => {
      state.setError("Connection failed");

      // Calling show() shouldn't clear the error
      state.show();
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toBe("Connection failed");

      // Calling toggleExpanded() shouldn't clear the error
      state.toggleExpanded();
      expect(state.getState().recordingState).toBe("error");
      expect(state.getState().errorMessage).toBe("Connection failed");
    });

    it("should clear error message when cancelRecording is called", () => {
      state.setError("Connection failed");
      state.cancelRecording();

      const s = state.getState();
      expect(s.recordingState).toBe("idle");
      expect(s.errorMessage).toBe(null);
    });

    it("should have null errorMessage in initial state", () => {
      const s = state.getState();
      expect(s.errorMessage).toBe(null);
    });
  });
});
