/**
 * SpeechOS Core SDK
 *
 * Provides both low-level and high-level APIs for voice interaction.
 * This is the main entry point for headless usage of SpeechOS.
 */

import type {
  SpeechOSCoreConfig,
  CommandDefinition,
  CommandResult,
  VoiceSessionOptions,
} from "./types.js";
import { setConfig, getConfig, resetConfig } from "./config.js";
import { livekit } from "./livekit.js";
import { websocket } from "./websocket.js";
import { state } from "./state.js";
import { events } from "./events.js";

/**
 * Voice backend interface - common methods between LiveKit and WebSocket backends
 */
interface VoiceBackendInterface {
  startVoiceSession(options?: VoiceSessionOptions): Promise<void>;
  stopVoiceSession(): Promise<string>;
  requestEditText(originalText: string): Promise<string>;
  requestCommand(commands: CommandDefinition[]): Promise<CommandResult | null>;
  disconnect(): Promise<void>;
}

/**
 * Get the active voice backend (always websocket now)
 */
function getBackend(): VoiceBackendInterface {
  // Always use websocket backend (livekit is legacy)
  return websocket;
}

/**
 * SpeechOS Core SDK
 *
 * Provides two API layers:
 * 1. Low-level API: Granular control over LiveKit connection lifecycle
 * 2. High-level API: One-shot methods for common voice tasks
 */
class SpeechOSCore {
  private initialized = false;

  /**
   * Initialize the SDK with configuration
   * @param config - Configuration options including apiKey
   */
  init(config: SpeechOSCoreConfig): void {
    setConfig(config);
    this.initialized = true;

    const currentConfig = getConfig();
    if (currentConfig.debug) {
      console.log("[SpeechOS] Initialized with config:", {
        host: currentConfig.host,
        debug: currentConfig.debug,
      });
    }
  }

  /**
   * Check if the SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================
  // Low-level API (granular control)
  // ============================================

  /**
   * Connect to LiveKit (fetches token, establishes connection)
   * Call this before other low-level methods
   */
  async connect(): Promise<void> {
    this.ensureInitialized();
    await livekit.connect();
  }

  /**
   * Wait until the agent is ready to receive audio
   * Resolves when the agent subscribes to our audio track
   */
  async waitUntilReady(): Promise<void> {
    return livekit.waitUntilReady();
  }

  /**
   * Enable microphone (user is now being recorded)
   */
  async enableMicrophone(): Promise<void> {
    await livekit.enableMicrophone();
    state.setRecordingState("recording");
  }

  /**
   * Stop recording and get the transcript
   * @returns The transcribed text
   */
  async stopAndGetTranscript(): Promise<string> {
    state.setRecordingState("processing");
    try {
      const transcript = await livekit.stopAndGetTranscript();
      state.completeRecording();
      return transcript;
    } catch (error) {
      state.setError(
        error instanceof Error ? error.message : "Transcription failed"
      );
      throw error;
    }
  }

  /**
   * Stop recording and get edited text
   * @param originalText - The original text to edit based on voice instructions
   * @returns The edited text
   */
  async stopAndEdit(originalText: string): Promise<string> {
    state.setRecordingState("processing");
    try {
      const editedText = await livekit.stopAndEdit(originalText);
      state.completeRecording();
      return editedText;
    } catch (error) {
      state.setError(
        error instanceof Error ? error.message : "Edit request failed"
      );
      throw error;
    }
  }

  /**
   * Disconnect from LiveKit
   */
  async disconnect(): Promise<void> {
    await livekit.disconnect();
    state.completeRecording();
  }

  // ============================================
  // High-level API (convenience methods)
  // ============================================

  /**
   * One-shot dictation: connect, wait for agent, record, and get transcript
   * Automatically handles the full voice session lifecycle
   *
   * @returns The transcribed text
   */
  async dictate(): Promise<string> {
    this.ensureInitialized();

    state.setActiveAction("dictate");
    state.startRecording();

    try {
      const backend = getBackend();

      // Start voice session with action=dictate
      await backend.startVoiceSession({
        action: "dictate",
        onMicReady: () => {
          // Transition to recording state as soon as mic is capturing
          state.setRecordingState("recording");
        },
      });

      // User is now being recorded...
      // The caller should call stopDictation() when done
      // Or they can just await this if they want to handle it themselves

      // For this high-level API, we return immediately after setup
      // The UI should handle when to stop
      return new Promise<string>((resolve, reject) => {
        // Store resolvers for stopDictation to use
        this._dictateResolve = resolve;
        this._dictateReject = reject;
      });
    } catch (error) {
      state.setError(
        error instanceof Error ? error.message : "Failed to start dictation"
      );
      await this.cleanup();
      throw error;
    }
  }

  private _dictateResolve?: (transcript: string) => void;
  private _dictateReject?: (error: Error) => void;

  /**
   * Stop dictation and get the transcript
   * Call this after dictate() when user stops speaking
   */
  async stopDictation(): Promise<string> {
    state.setRecordingState("processing");

    try {
      const backend = getBackend();
      const transcript = await backend.stopVoiceSession();

      state.completeRecording();

      // Resolve the dictate promise if it exists
      if (this._dictateResolve) {
        this._dictateResolve(transcript);
        this._dictateResolve = undefined;
        this._dictateReject = undefined;
      }

      return transcript;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Transcription failed");
      state.setError(err.message);

      // Reject the dictate promise if it exists
      if (this._dictateReject) {
        this._dictateReject(err);
        this._dictateResolve = undefined;
        this._dictateReject = undefined;
      }

      throw err;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * One-shot edit: connect, wait for agent, record voice instructions, apply to text
   * Automatically handles the full voice session lifecycle
   *
   * @param originalText - The text to edit
   * @returns The edited text
   */
  async edit(originalText: string): Promise<string> {
    this.ensureInitialized();

    state.setActiveAction("edit");
    state.startRecording();
    this._editOriginalText = originalText;

    try {
      const backend = getBackend();

      // Start voice session with action=edit and inputText
      await backend.startVoiceSession({
        action: "edit",
        inputText: originalText,
        onMicReady: () => {
          // Transition to recording state as soon as mic is capturing
          state.setRecordingState("recording");
        },
      });

      // Return a promise that will be resolved when stopEdit is called
      return new Promise<string>((resolve, reject) => {
        this._editResolve = resolve;
        this._editReject = reject;
      });
    } catch (error) {
      state.setError(
        error instanceof Error ? error.message : "Failed to start edit"
      );
      await this.cleanup();
      throw error;
    }
  }

  private _editOriginalText?: string;
  private _editResolve?: (editedText: string) => void;
  private _editReject?: (error: Error) => void;

  /**
   * Stop edit recording and get the edited text
   * Call this after edit() when user stops speaking
   */
  async stopEdit(): Promise<string> {
    state.setRecordingState("processing");

    try {
      const backend = getBackend();
      const originalText = this._editOriginalText || "";
      const editedText = await backend.requestEditText(originalText);

      state.completeRecording();

      // Resolve the edit promise if it exists
      if (this._editResolve) {
        this._editResolve(editedText);
        this._editResolve = undefined;
        this._editReject = undefined;
      }

      return editedText;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Edit request failed");
      state.setError(err.message);

      // Reject the edit promise if it exists
      if (this._editReject) {
        this._editReject(err);
        this._editResolve = undefined;
        this._editReject = undefined;
      }

      throw err;
    } finally {
      this._editOriginalText = undefined;
      await this.cleanup();
    }
  }

  /**
   * One-shot command: connect, wait for agent, record voice, match against commands
   * Automatically handles the full voice session lifecycle
   *
   * @param commands - Array of command definitions to match against
   * @returns The matched command result or null if no match
   */
  async command(commands: CommandDefinition[]): Promise<CommandResult | null> {
    this.ensureInitialized();

    state.setActiveAction("command");
    state.startRecording();
    this._commandCommands = commands;

    try {
      const backend = getBackend();

      // Start voice session with action=command and command definitions
      await backend.startVoiceSession({
        action: "command",
        commands: commands,
        onMicReady: () => {
          // Transition to recording state as soon as mic is capturing
          state.setRecordingState("recording");
        },
      });

      // Return a promise that will be resolved when stopCommand is called
      return new Promise<CommandResult | null>((resolve, reject) => {
        this._commandResolve = resolve;
        this._commandReject = reject;
      });
    } catch (error) {
      state.setError(
        error instanceof Error ? error.message : "Failed to start command"
      );
      await this.cleanup();
      throw error;
    }
  }

  private _commandCommands?: CommandDefinition[];
  private _commandResolve?: (result: CommandResult | null) => void;
  private _commandReject?: (error: Error) => void;

  /**
   * Stop command recording and get the matched command
   * Call this after command() when user stops speaking
   */
  async stopCommand(): Promise<CommandResult | null> {
    state.setRecordingState("processing");

    try {
      const backend = getBackend();
      const commands = this._commandCommands || [];
      const result = await backend.requestCommand(commands);

      state.completeRecording();

      // Resolve the command promise if it exists
      if (this._commandResolve) {
        this._commandResolve(result);
        this._commandResolve = undefined;
        this._commandReject = undefined;
      }

      return result;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Command request failed");
      state.setError(err.message);

      // Reject the command promise if it exists
      if (this._commandReject) {
        this._commandReject(err);
        this._commandResolve = undefined;
        this._commandReject = undefined;
      }

      throw err;
    } finally {
      this._commandCommands = undefined;
      await this.cleanup();
    }
  }

  /**
   * Cancel the current operation
   */
  async cancel(): Promise<void> {
    const err = new Error("Operation cancelled");

    if (this._dictateReject) {
      this._dictateReject(err);
      this._dictateResolve = undefined;
      this._dictateReject = undefined;
    }

    if (this._editReject) {
      this._editReject(err);
      this._editResolve = undefined;
      this._editReject = undefined;
    }

    if (this._commandReject) {
      this._commandReject(err);
      this._commandResolve = undefined;
      this._commandReject = undefined;
    }

    this._editOriginalText = undefined;
    this._commandCommands = undefined;

    await this.cleanup();
    state.cancelRecording();
  }

  // ============================================
  // State and Events access
  // ============================================

  /**
   * Access the state manager for subscribing to state changes
   */
  get state(): typeof state {
    return state;
  }

  /**
   * Access the event emitter for listening to events
   */
  get events(): typeof events {
    return events;
  }

  /**
   * Get the current config
   */
  getConfig(): SpeechOSCoreConfig {
    return getConfig();
  }

  // ============================================
  // Private helpers
  // ============================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "SpeechOS not initialized. Call speechOS.init({ apiKey: ... }) first."
      );
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const backend = getBackend();
      await backend.disconnect();
    } catch (error) {
      // Ignore disconnect errors during cleanup
      const config = getConfig();
      if (config.debug) {
        console.warn("[SpeechOS] Cleanup disconnect error:", error);
      }
    }
  }

  /**
   * Reset the SDK (useful for testing)
   */
  reset(): void {
    this.initialized = false;
    this._dictateResolve = undefined;
    this._dictateReject = undefined;
    this._editResolve = undefined;
    this._editReject = undefined;
    this._editOriginalText = undefined;
    this._commandResolve = undefined;
    this._commandReject = undefined;
    this._commandCommands = undefined;
    resetConfig();
    state.reset();
    events.clear();
  }
}

// Export singleton instance
export const speechOS: SpeechOSCore = new SpeechOSCore();
