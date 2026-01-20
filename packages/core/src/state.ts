/**
 * Reactive state management for SpeechOS SDK
 * Provides a centralized state store with subscriptions (similar to Zustand pattern)
 */

import type {
  SpeechOSState,
  StateChangeCallback,
  UnsubscribeFn,
} from "./types.js";
import { events } from "./events.js";

/**
 * Initial state
 */
const initialState: SpeechOSState = {
  isVisible: false,
  isExpanded: false,
  isConnected: false,
  isMicEnabled: false,
  activeAction: null,
  focusedElement: null,
  recordingState: "idle",
  errorMessage: null,
};

/**
 * State manager class
 */
class StateManager {
  private state: SpeechOSState;
  private subscribers: Set<StateChangeCallback> = new Set();
  /** Cached immutable snapshot for useSyncExternalStore compatibility */
  private snapshot: SpeechOSState;

  constructor(initialState: SpeechOSState) {
    this.state = { ...initialState };
    this.snapshot = Object.freeze({ ...this.state });
  }

  /**
   * Get the current state snapshot (returns a stable reference for React)
   * This returns an immutable frozen object that only changes when setState is called.
   */
  getState(): SpeechOSState {
    return this.snapshot;
  }

  /**
   * Update state with partial values
   * @param partial - Partial state to merge with current state
   */
  setState(partial: Partial<SpeechOSState>): void {
    const prevState = this.snapshot;
    this.state = { ...this.state, ...partial };
    // Create a new frozen snapshot
    this.snapshot = Object.freeze({ ...this.state });

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(this.snapshot, prevState);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });

    // Emit state change event
    events.emit("state:change", { state: this.snapshot });
  }

  /**
   * Subscribe to state changes
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: StateChangeCallback): UnsubscribeFn {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    const prevState = this.snapshot;
    this.state = { ...initialState };
    this.snapshot = Object.freeze({ ...this.state });

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(this.snapshot, prevState);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });

    // Emit state change event
    events.emit("state:change", { state: this.snapshot });
  }

  /**
   * Show the widget
   */
  show(): void {
    this.setState({ isVisible: true });
    events.emit("widget:show", undefined);
  }

  /**
   * Hide the widget and reset expanded state
   */
  hide(): void {
    this.setState({
      isVisible: false,
      isExpanded: false,
      activeAction: null,
    });
    events.emit("widget:hide", undefined);
  }

  /**
   * Toggle the action bubbles expansion
   */
  toggleExpanded(): void {
    this.setState({ isExpanded: !this.state.isExpanded });
  }

  /**
   * Set the focused form element
   * @param element - The form element that has focus
   */
  setFocusedElement(element: HTMLElement | null): void {
    this.setState({ focusedElement: element });
  }

  /**
   * Set the active action
   * @param action - The action to set as active
   */
  setActiveAction(action: SpeechOSState["activeAction"]): void {
    this.setState({ activeAction: action });
  }

  /**
   * Set the recording state
   * @param recordingState - The recording state to set
   */
  setRecordingState(recordingState: SpeechOSState["recordingState"]): void {
    this.setState({ recordingState });
  }

  /**
   * Set the connection state
   * @param isConnected - Whether connected to LiveKit
   */
  setConnected(isConnected: boolean): void {
    this.setState({ isConnected });
  }

  /**
   * Set the microphone enabled state
   * @param isMicEnabled - Whether microphone is enabled
   */
  setMicEnabled(isMicEnabled: boolean): void {
    this.setState({ isMicEnabled });
  }

  /**
   * Start recording flow (connecting → recording)
   */
  startRecording(): void {
    this.setState({
      recordingState: "connecting",
      isExpanded: false, // Collapse bubbles when recording starts
    });
  }

  /**
   * Stop recording and start processing
   */
  stopRecording(): void {
    this.setState({ recordingState: "processing", isMicEnabled: false });
  }

  /**
   * Complete the recording flow and return to idle
   */
  completeRecording(): void {
    this.setState({
      recordingState: "idle",
      activeAction: null,
      isConnected: false,
      isMicEnabled: false,
    });
  }

  /**
   * Cancel recording and return to idle
   */
  cancelRecording(): void {
    this.setState({
      recordingState: "idle",
      activeAction: null,
      errorMessage: null,
      isConnected: false,
      isMicEnabled: false,
    });
  }

  /**
   * Set error state with a message
   * @param message - Error message to display
   */
  setError(message: string): void {
    this.setState({
      recordingState: "error",
      errorMessage: message,
    });
  }

  /**
   * Clear error state and return to idle
   */
  clearError(): void {
    this.setState({
      recordingState: "idle",
      errorMessage: null,
    });
  }
}

// Export singleton instance
export const state: StateManager = new StateManager(initialState);

/**
 * Create a new state manager instance (useful for testing)
 */
export function createStateManager(
  initial?: Partial<SpeechOSState>
): StateManager {
  return new StateManager({ ...initialState, ...initial });
}
