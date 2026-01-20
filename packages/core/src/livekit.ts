/**
 * LiveKit integration for SpeechOS SDK
 * Handles room connections, audio streaming, and transcription requests
 */

import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type LocalAudioTrack,
  type RemoteParticipant,
} from "livekit-client";
import type {
  LiveKitTokenResponse,
  ServerErrorMessage,
  ErrorSource,
  CommandDefinition,
  CommandResult,
  SpeechOSAction,
  VoiceSessionOptions,
  SessionSettings,
} from "./types.js";
import { getConfig } from "./config.js";
import { events } from "./events.js";
import { state } from "./state.js";

// Protocol constants (matching backend TranscriptionManager)
const MESSAGE_TYPE_REQUEST_TRANSCRIPT = "request_transcript";
const MESSAGE_TYPE_TRANSCRIPT = "transcript";
const MESSAGE_TYPE_EDIT_TEXT = "edit_text";
const MESSAGE_TYPE_EDITED_TEXT = "edited_text";
const MESSAGE_TYPE_EXECUTE_COMMAND = "execute_command";
const MESSAGE_TYPE_COMMAND_RESULT = "command_result";
const MESSAGE_TYPE_ERROR = "error";
const TOPIC_SPEECHOS = "speechos";

// Token cache TTL (4 minutes in milliseconds)
// LiveKit tokens are valid for longer, but we cache for 4 minutes to ensure
// freshness of session settings (language, vocabulary) while still providing
// a latency benefit when user clicks an action shortly after expanding the widget
const TOKEN_CACHE_TTL_MS = 4 * 60 * 1000;

/**
 * A deferred promise with timeout support.
 * Encapsulates resolve/reject/timeout in a single object for cleaner async handling.
 */
export class Deferred<T> {
  readonly promise: Promise<T>;
  private _resolve!: (value: T) => void;
  private _reject!: (error: Error) => void;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _settled = false;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  /**
   * Set a timeout that will reject the promise with the given error
   */
  setTimeout(
    ms: number,
    errorMessage: string,
    errorCode: string,
    errorSource: ErrorSource
  ): void {
    this._timeoutId = setTimeout(() => {
      if (!this._settled) {
        console.error(`[SpeechOS] Error: ${errorMessage} (${errorCode})`);
        events.emit("error", {
          code: errorCode,
          message: errorMessage,
          source: errorSource,
        });
        this.reject(new Error(errorMessage));
      }
    }, ms);
  }

  resolve(value: T): void {
    if (!this._settled) {
      this._settled = true;
      this.clearTimeout();
      this._resolve(value);
    }
  }

  reject(error: Error): void {
    if (!this._settled) {
      this._settled = true;
      this.clearTimeout();
      this._reject(error);
    }
  }

  private clearTimeout(): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  get isSettled(): boolean {
    return this._settled;
  }
}

/**
 * LiveKit connection manager
 */
class LiveKitManager {
  private room: Room | null = null;
  private tokenData: LiveKitTokenResponse | null = null;
  private micTrack: LocalAudioTrack | null = null;

  // Token cache for pre-fetching optimization
  private cachedTokenData: LiveKitTokenResponse | null = null;
  private tokenCacheTimestamp: number | null = null;
  private tokenPrefetchPromise: Promise<LiveKitTokenResponse> | null = null;

  // Auto-refresh timer for keeping token fresh while widget is expanded
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private autoRefreshEnabled = false;

  // Pending async operations using Deferred pattern
  private pendingTranscript: Deferred<string> | null = null;
  private pendingEditText: Deferred<string> | null = null;
  private pendingCommand: Deferred<CommandResult | null> | null = null;
  private pendingTrackSubscribed: Deferred<void> | null = null;

  // Track original text for edit operations (to include in events)
  private editOriginalText: string | null = null;

  // Session settings passed from options
  private sessionSettings: SessionSettings = {};

  /**
   * Check if the cached token is still valid (within TTL)
   */
  private isCachedTokenValid(): boolean {
    if (!this.cachedTokenData || !this.tokenCacheTimestamp) {
      return false;
    }
    const age = Date.now() - this.tokenCacheTimestamp;
    return age < TOKEN_CACHE_TTL_MS;
  }

  /**
   * Pre-fetch a LiveKit token for later use
   * Call this early (e.g., when widget expands) to reduce latency when starting a voice session.
   * If a prefetch is already in progress, returns the existing promise.
   * If a valid cached token exists, returns it immediately.
   */
  async prefetchToken(): Promise<LiveKitTokenResponse> {
    const config = getConfig();

    // If we have a valid cached token, return it
    if (this.isCachedTokenValid() && this.cachedTokenData) {
      if (config.debug) {
        console.log("[SpeechOS] Using cached token (prefetch hit)");
      }
      return this.cachedTokenData;
    }

    // If a prefetch is already in progress, return the existing promise
    if (this.tokenPrefetchPromise) {
      if (config.debug) {
        console.log("[SpeechOS] Prefetch already in progress, awaiting...");
      }
      return this.tokenPrefetchPromise;
    }

    // Start a new prefetch
    if (config.debug) {
      console.log("[SpeechOS] Starting token prefetch...");
    }

    this.tokenPrefetchPromise = this.fetchTokenFromServer()
      .then((data) => {
        // Cache the token
        this.cachedTokenData = data;
        this.tokenCacheTimestamp = Date.now();
        this.tokenPrefetchPromise = null;
        return data;
      })
      .catch((error) => {
        this.tokenPrefetchPromise = null;
        throw error;
      });

    return this.tokenPrefetchPromise;
  }

  /**
   * Fetch a LiveKit token from the backend
   * Uses cached token if valid, otherwise fetches a fresh one.
   * Includes language settings and user vocabulary which are stored in the VoiceSession.
   */
  async fetchToken(): Promise<LiveKitTokenResponse> {
    const config = getConfig();

    // Check if we have a valid cached token
    if (this.isCachedTokenValid() && this.cachedTokenData) {
      if (config.debug) {
        console.log("[SpeechOS] Using cached token");
      }
      this.tokenData = this.cachedTokenData;
      return this.cachedTokenData;
    }

    // If a prefetch is in progress, wait for it
    if (this.tokenPrefetchPromise) {
      if (config.debug) {
        console.log("[SpeechOS] Waiting for prefetch to complete...");
      }
      const data = await this.tokenPrefetchPromise;
      this.tokenData = data;
      return data;
    }

    // No valid cache, fetch fresh token
    const data = await this.fetchTokenFromServer();

    // Cache the token
    this.cachedTokenData = data;
    this.tokenCacheTimestamp = Date.now();
    this.tokenData = data;

    return data;
  }

  /**
   * Internal method to fetch a fresh token from the server
   */
  private async fetchTokenFromServer(): Promise<LiveKitTokenResponse> {
    const config = getConfig();
    const url = `${config.host}/livekit/api/token/`;

    // Use session settings (with defaults)
    const settings = this.sessionSettings;
    const inputLanguage = settings.inputLanguageCode ?? "en-US";
    const outputLanguage = settings.outputLanguageCode ?? "en-US";
    const smartFormat = settings.smartFormat ?? true;
    const vocabulary = settings.vocabulary ?? [];
    const snippets = settings.snippets ?? [];

    if (config.debug) {
      console.log("[SpeechOS] Fetching LiveKit token from:", url);
      console.log("[SpeechOS] Session settings:", {
        inputLanguage,
        outputLanguage,
        smartFormat,
        snippetsCount: snippets.length,
        vocabularyCount: vocabulary.length,
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Api-Key ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        user_id: config.userId || null,
        input_language: inputLanguage,
        output_language: outputLanguage,
        smart_format: smartFormat,
        custom_vocabulary: vocabulary,
        custom_snippets: snippets,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch LiveKit token: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as LiveKitTokenResponse;

    if (config.debug) {
      console.log("[SpeechOS] LiveKit token received:", {
        room: data.room,
        identity: data.identity,
        ws_url: data.ws_url,
      });
    }

    return data;
  }

  /**
   * Connect to a LiveKit room (fresh connection each time)
   */
  async connect(): Promise<Room> {
    const config = getConfig();

    // Fetch a fresh token for this connection
    await this.fetchToken();

    if (!this.tokenData) {
      throw new Error("No token available for LiveKit connection");
    }

    // Create a new room instance
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Set up event listeners
    this.setupRoomEvents();

    if (config.debug) {
      console.log(
        "[SpeechOS] Connecting to LiveKit room:",
        this.tokenData.room
      );
    }

    // Connect to the room
    await this.room.connect(this.tokenData.ws_url, this.tokenData.token);

    // Update state
    state.setConnected(true);

    if (config.debug) {
      console.log("[SpeechOS] Connected to LiveKit room:", this.room.name);
    }

    return this.room;
  }

  /**
   * Wait until the agent is ready to receive audio
   * Resolves when LocalTrackSubscribed event is received
   */
  async waitUntilReady(): Promise<void> {
    if (!this.room || this.room.state !== "connected") {
      throw new Error("Not connected to room");
    }

    // If already set up (from startVoiceSession), just return the existing promise
    if (this.pendingTrackSubscribed) {
      return this.pendingTrackSubscribed.promise;
    }

    // Create a new deferred
    this.pendingTrackSubscribed = new Deferred<void>();
    this.pendingTrackSubscribed.setTimeout(
      15000,
      "Connection timed out - agent not available",
      "connection_timeout",
      "connection"
    );

    return this.pendingTrackSubscribed.promise;
  }

  /**
   * Set up LiveKit room event listeners
   */
  private setupRoomEvents(): void {
    if (!this.room) return;

    const config = getConfig();

    this.room.on(RoomEvent.Connected, () => {
      if (config.debug) {
        console.log("[SpeechOS] Room connected");
      }
      state.setConnected(true);
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      if (config.debug) {
        console.log("[SpeechOS] Room disconnected:", reason);
      }
      state.setConnected(false);
      state.setMicEnabled(false);
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      if (config.debug) {
        console.log("[SpeechOS] Participant connected:", participant.identity);
      }
    });

    // Fired when a remote participant subscribes to our local track
    // This confirms the agent is ready to receive our audio
    this.room.on(RoomEvent.LocalTrackSubscribed, (publication) => {
      if (config.debug) {
        console.log(
          "[SpeechOS] LocalTrackSubscribed event fired:",
          publication.trackSid
        );
      }

      // Resolve the promise when our track is subscribed to
      if (this.pendingTrackSubscribed) {
        this.pendingTrackSubscribed.resolve();
        this.pendingTrackSubscribed = null;
      }
    });

    // Also log all room events for debugging
    this.room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (config.debug) {
        console.log(
          "[SpeechOS] LocalTrackPublished:",
          publication.trackSid,
          publication.source
        );
      }
    });

    // Handle incoming data messages (transcriptions, acks, etc.)
    this.room.on(
      RoomEvent.DataReceived,
      (data: Uint8Array, participant?: RemoteParticipant) => {
        this.handleDataMessage(data, participant);
      }
    );
  }

  /**
   * Handle incoming data messages from the agent
   */
  private handleDataMessage(
    data: Uint8Array,
    _participant?: RemoteParticipant
  ): void {
    const config = getConfig();

    try {
      const message = JSON.parse(new TextDecoder().decode(data));

      if (config.debug) {
        console.log("[SpeechOS] Data received:", message);
      }

      if (message.type === MESSAGE_TYPE_TRANSCRIPT) {
        // Transcript received from agent
        const transcript = message.transcript || "";

        if (config.debug) {
          console.log("[SpeechOS] Transcript received:", transcript);
        }

        // Emit transcription:complete event
        events.emit("transcription:complete", { text: transcript });

        // Resolve the pending transcript promise
        if (this.pendingTranscript) {
          this.pendingTranscript.resolve(transcript);
          this.pendingTranscript = null;
        }
      } else if (message.type === MESSAGE_TYPE_EDITED_TEXT) {
        // Edited text received from agent
        const editedText = message.text || "";

        if (config.debug) {
          console.log("[SpeechOS] Edited text received:", editedText);
        }

        // Emit edit:complete event
        events.emit("edit:complete", {
          text: editedText,
          originalText: this.editOriginalText || "",
        });

        // Resolve the pending edit text promise
        if (this.pendingEditText) {
          this.pendingEditText.resolve(editedText);
          this.pendingEditText = null;
        }

        // Clear stored original text
        this.editOriginalText = null;
      } else if (message.type === MESSAGE_TYPE_COMMAND_RESULT) {
        // Command result received from agent
        const commandResult: CommandResult | null = message.command || null;

        if (config.debug) {
          console.log("[SpeechOS] Command result received:", commandResult);
        }

        // Emit command:complete event
        events.emit("command:complete", { command: commandResult });

        // Resolve the pending command promise
        if (this.pendingCommand) {
          this.pendingCommand.resolve(commandResult);
          this.pendingCommand = null;
        }
      } else if (message.type === MESSAGE_TYPE_ERROR) {
        // Server error received from agent
        const serverError = message as ServerErrorMessage;
        const errorCode = serverError.code || "server_error";
        const errorMessage = serverError.message || "A server error occurred";

        console.error(`[SpeechOS] Error: ${errorMessage} (${errorCode})`);

        if (config.debug && serverError.details) {
          console.error("[SpeechOS] Error details:", serverError.details);
        }

        // Emit error event for UI to handle
        events.emit("error", {
          code: errorCode,
          message: errorMessage,
          source: "server",
        });

        // Reject any pending operations
        const error = new Error(errorMessage);
        if (this.pendingTranscript) {
          this.pendingTranscript.reject(error);
          this.pendingTranscript = null;
        }
        if (this.pendingEditText) {
          this.pendingEditText.reject(error);
          this.pendingEditText = null;
        }
        if (this.pendingCommand) {
          this.pendingCommand.reject(error);
          this.pendingCommand = null;
        }
      }
    } catch (error) {
      console.error("[SpeechOS] Failed to parse data message:", error);
    }
  }

  /**
   * Publish microphone audio track
   * Uses the device ID from session settings if set
   */
  async enableMicrophone(): Promise<void> {
    if (!this.room || this.room.state !== "connected") {
      throw new Error("Not connected to room");
    }

    const config = getConfig();

    if (!this.micTrack) {
      if (config.debug) {
        console.log("[SpeechOS] Creating microphone track...");
      }

      // Get selected device ID from session settings
      const deviceId = this.sessionSettings.audioDeviceId;
      const trackOptions: Parameters<typeof createLocalAudioTrack>[0] = {
        echoCancellation: true,
        noiseSuppression: true,
      };

      // Only set deviceId if user has selected a specific device
      // Use { exact: deviceId } for strict matching per LiveKit best practices
      if (deviceId) {
        trackOptions.deviceId = { exact: deviceId };
        if (config.debug) {
          console.log("[SpeechOS] Using audio device:", deviceId);
        }
      }

      try {
        this.micTrack = await createLocalAudioTrack(trackOptions);
      } catch (error) {
        // If the selected device is unavailable, fall back to default
        if (deviceId && error instanceof Error) {
          console.warn(
            "[SpeechOS] Selected audio device unavailable, falling back to default:",
            error.message
          );
          this.micTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
          });
        } else {
          throw error;
        }
      }

      // Log microphone info
      this.logMicrophoneInfo();
    }

    // Publish the track if not already published
    const existingPub = this.room.localParticipant.getTrackPublication(
      Track.Source.Microphone
    );
    if (!existingPub) {
      await this.room.localParticipant.publishTrack(this.micTrack, {
        source: Track.Source.Microphone,
      });

      // Update state
      state.setMicEnabled(true);

      if (config.debug) {
        console.log("[SpeechOS] Microphone track published");
      }
    }
  }

  /**
   * Log information about the current microphone track
   */
  private logMicrophoneInfo(): void {
    if (!this.micTrack) return;

    const config = getConfig();
    const mediaTrack = this.micTrack.mediaStreamTrack;
    const settings = mediaTrack.getSettings();

    // Always log basic mic info (useful for debugging)
    console.log("[SpeechOS] Microphone active:", {
      deviceId: settings.deviceId || "unknown",
      label: mediaTrack.label || "Unknown device",
      sampleRate: settings.sampleRate,
      channelCount: settings.channelCount,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
    });

    if (config.debug) {
      // Log full settings in debug mode
      console.log("[SpeechOS] Full audio track settings:", settings);
    }
  }

  /**
   * Disable microphone audio track
   */
  async disableMicrophone(): Promise<void> {
    const config = getConfig();

    if (this.micTrack) {
      if (config.debug) {
        console.log("[SpeechOS] Disabling microphone track...");
      }

      // Unpublish from room if connected
      if (this.room?.state === "connected") {
        try {
          await this.room.localParticipant.unpublishTrack(this.micTrack);
          if (config.debug) {
            console.log("[SpeechOS] Microphone track unpublished");
          }
        } catch (error) {
          console.warn("[SpeechOS] Error unpublishing track:", error);
        }
      }

      // Stop the track to release the microphone
      this.micTrack.stop();

      // Detach from any elements (per LiveKit best practices)
      this.micTrack.detach();

      this.micTrack = null;

      // Update state
      state.setMicEnabled(false);

      if (config.debug) {
        console.log("[SpeechOS] Microphone track stopped and detached");
      }
    }
  }

  /**
   * Send a data message to the room
   */
  async sendDataMessage(message: object): Promise<void> {
    if (!this.room || this.room.state !== "connected") {
      throw new Error("Not connected to room");
    }

    const data = new TextEncoder().encode(JSON.stringify(message));
    await this.room.localParticipant.publishData(data, {
      reliable: true,
      topic: TOPIC_SPEECHOS,
    });
  }

  /**
   * Start a voice session with pre-connect audio buffering
   * Fetches a fresh token, then enables mic with preConnectBuffer to capture audio while connecting.
   * Agent subscription happens in the background - we don't block on it.
   *
   * @param options - Session options including action type and parameters
   */
  async startVoiceSession(options?: VoiceSessionOptions): Promise<void> {
    const config = getConfig();
    if (config.debug) {
      console.log("[SpeechOS] Starting voice session...");
    }

    // Store session settings from options
    this.sessionSettings = options?.settings || {};

    // Fetch a fresh token for this session
    await this.fetchToken();

    if (!this.tokenData) {
      throw new Error("No token available for LiveKit connection");
    }

    // Set up the deferred BEFORE connecting so we don't miss the event
    // Agent subscription happens in the background - we don't block on it
    this.pendingTrackSubscribed = new Deferred<void>();
    this.pendingTrackSubscribed.setTimeout(
      15000,
      "Connection timed out - agent not available",
      "connection_timeout",
      "connection"
    );

    // Create the room instance
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Set up event listeners before enabling mic
    this.setupRoomEvents();

    if (config.debug) {
      console.log(
        "[SpeechOS] Connecting to LiveKit room:",
        this.tokenData.room,
        "at",
        this.tokenData.ws_url
      );
    }

    // Connect to the room first
    await this.room.connect(this.tokenData.ws_url, this.tokenData.token);

    if (config.debug) {
      console.log(
        "[SpeechOS] Connected, enabling microphone with preConnectBuffer..."
      );
    }

    // Enable microphone with preConnectBuffer after connection
    // This buffers audio until the agent subscribes to our track
    await this.enableMicrophoneWithPreConnectBuffer();

    // Notify that mic is ready - UI can show "recording" state now
    // Audio is being captured even though room connection may still be in progress
    if (options?.onMicReady) {
      options.onMicReady();
    }

    // Update state
    state.setConnected(true);

    if (config.debug) {
      console.log("[SpeechOS] Voice session ready - microphone active");
    }

    // Wait for agent subscription in the background
    // This allows the UI to show "recording" immediately while the agent connects
    this.waitForAgentSubscription();
  }

  /**
   * Wait for the agent to subscribe to our audio track in the background
   * Handles timeout errors without blocking the main flow
   */
  private waitForAgentSubscription(): void {
    const config = getConfig();

    if (!this.pendingTrackSubscribed) {
      return;
    }

    // Handle the subscription in the background
    this.pendingTrackSubscribed.promise
      .then(() => {
        if (config.debug) {
          console.log(
            "[SpeechOS] Agent subscribed to audio track - full duplex established"
          );
        }
        this.pendingTrackSubscribed = null;
      })
      .catch((error) => {
        // Agent subscription timed out - the buffered audio will still be sent
        // but ongoing audio may not be processed if agent never connects
        console.warn("[SpeechOS] Agent subscription timeout:", error.message);
        this.pendingTrackSubscribed = null;
        // Note: We don't set error state here because the session may still work
        // if the agent connects late. The timeout error event was already emitted
        // by the Deferred class.
      });
  }

  /**
   * Enable microphone with pre-connect buffering
   * This starts capturing audio locally before the room is connected,
   * buffering it until the connection is established.
   */
  private async enableMicrophoneWithPreConnectBuffer(): Promise<void> {
    if (!this.room) {
      throw new Error("Room not initialized");
    }

    const config = getConfig();

    // Get selected device ID from session settings
    const deviceId = this.sessionSettings.audioDeviceId;

    // Build constraints for the microphone
    const constraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
    };

    // Only set deviceId if user has selected a specific device
    if (deviceId) {
      constraints.deviceId = { exact: deviceId };
      if (config.debug) {
        console.log("[SpeechOS] Using audio device:", deviceId);
      }
    }

    try {
      // Enable microphone with preConnectBuffer: true
      // This tells LiveKit to start capturing audio locally and buffer it
      // until the room connection is established
      await this.room.localParticipant.setMicrophoneEnabled(true, constraints, {
        preConnectBuffer: true,
      });

      // Update state
      state.setMicEnabled(true);

      // Get the mic track for logging
      const micPub = this.room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      if (micPub?.track) {
        this.micTrack = micPub.track as LocalAudioTrack;
        this.logMicrophoneInfo();
      }

      if (config.debug) {
        console.log(
          "[SpeechOS] Microphone enabled with pre-connect buffer - audio is being captured"
        );
      }
    } catch (error) {
      // If the selected device is unavailable, fall back to default
      if (deviceId && error instanceof Error) {
        console.warn(
          "[SpeechOS] Selected audio device unavailable, falling back to default:",
          error.message
        );
        await this.room.localParticipant.setMicrophoneEnabled(
          true,
          {
            echoCancellation: true,
            noiseSuppression: true,
          },
          {
            preConnectBuffer: true,
          }
        );
        state.setMicEnabled(true);
      } else {
        throw error;
      }
    }
  }

  /**
   * Stop the voice session and request the transcript
   * Returns a promise that resolves with the transcript text
   * @throws Error if timeout occurs waiting for transcript
   */
  async stopVoiceSession(): Promise<string> {
    const config = getConfig();
    const settings = this.sessionSettings;
    const inputLanguage = settings.inputLanguageCode ?? "en-US";
    const outputLanguage = settings.outputLanguageCode ?? "en-US";

    // Always log dictate command with language settings
    console.log("[SpeechOS] Dictate command:", {
      inputLanguage,
      outputLanguage,
    });

    if (config.debug) {
      console.log(
        "[SpeechOS] Stopping voice session, requesting transcript..."
      );
    }

    // Disable microphone
    await this.disableMicrophone();

    if (config.debug) {
      console.log("[SpeechOS] Requesting transcript from agent...");
    }

    // Create deferred for transcript (resolved when transcript message is received)
    this.pendingTranscript = new Deferred<string>();
    this.pendingTranscript.setTimeout(
      10000,
      "Transcription timed out. Please try again.",
      "transcription_timeout",
      "timeout"
    );

    // Request the transcript from the agent
    await this.sendDataMessage({
      type: MESSAGE_TYPE_REQUEST_TRANSCRIPT,
    });

    const result = await this.pendingTranscript.promise;
    this.pendingTranscript = null;
    return result;
  }

  /**
   * Alias for stopVoiceSession - granular API naming
   */
  async stopAndGetTranscript(): Promise<string> {
    return this.stopVoiceSession();
  }

  /**
   * Request text editing using the transcript as instructions
   * Sends the original text to the backend, which applies the spoken instructions
   * Returns a promise that resolves with the edited text
   * @throws Error if timeout occurs waiting for edited text
   */
  async requestEditText(originalText: string): Promise<string> {
    const config = getConfig();
    const settings = this.sessionSettings;
    const inputLanguage = settings.inputLanguageCode ?? "en-US";
    const outputLanguage = settings.outputLanguageCode ?? "en-US";

    // Always log edit command with language settings
    console.log("[SpeechOS] Edit command:", {
      inputLanguage,
      outputLanguage,
      originalTextLength: originalText.length,
    });

    if (config.debug) {
      console.log("[SpeechOS] Requesting text edit...");
    }

    // Store original text for the event
    this.editOriginalText = originalText;

    // Disable microphone first
    await this.disableMicrophone();

    if (config.debug) {
      console.log("[SpeechOS] Sending edit_text request to agent...");
    }

    // Create deferred for edited text (resolved when edited_text message is received)
    this.pendingEditText = new Deferred<string>();
    this.pendingEditText.setTimeout(
      15000,
      "Edit request timed out. Please try again.",
      "edit_timeout",
      "timeout"
    );

    // Send the edit request to the agent
    await this.sendDataMessage({
      type: MESSAGE_TYPE_EDIT_TEXT,
      text: originalText,
    });

    const result = await this.pendingEditText.promise;
    this.pendingEditText = null;
    return result;
  }

  /**
   * Alias for requestEditText - granular API naming
   */
  async stopAndEdit(originalText: string): Promise<string> {
    return this.requestEditText(originalText);
  }

  /**
   * Request command matching using the transcript as input
   * Sends command definitions to the backend, which matches the user's speech against them
   * Returns a promise that resolves with the matched command or null if no match
   * @throws Error if timeout occurs waiting for command result
   */
  async requestCommand(
    commands: CommandDefinition[]
  ): Promise<CommandResult | null> {
    const config = getConfig();
    const settings = this.sessionSettings;
    const inputLanguage = settings.inputLanguageCode ?? "en-US";

    // Always log command request
    console.log("[SpeechOS] Command request:", {
      inputLanguage,
      commandCount: commands.length,
    });

    if (config.debug) {
      console.log("[SpeechOS] Requesting command match...");
    }

    // Disable microphone first
    await this.disableMicrophone();

    if (config.debug) {
      console.log("[SpeechOS] Sending execute_command request to agent...");
    }

    // Create deferred for command result (resolved when command_result message is received)
    this.pendingCommand = new Deferred<CommandResult | null>();
    this.pendingCommand.setTimeout(
      15000,
      "Command request timed out. Please try again.",
      "command_timeout",
      "timeout"
    );

    // Send the command request to the agent with command definitions
    await this.sendDataMessage({
      type: MESSAGE_TYPE_EXECUTE_COMMAND,
      commands: commands,
    });

    const result = await this.pendingCommand.promise;
    this.pendingCommand = null;
    return result;
  }

  /**
   * Alias for requestCommand - granular API naming
   */
  async stopAndCommand(
    commands: CommandDefinition[]
  ): Promise<CommandResult | null> {
    return this.requestCommand(commands);
  }

  /**
   * Disconnect from the current room
   * Clears the token so a fresh one is fetched for the next session
   */
  async disconnect(): Promise<void> {
    const config = getConfig();

    if (config.debug) {
      console.log("[SpeechOS] Disconnecting from room...");
    }

    // Disable and cleanup microphone track
    await this.disableMicrophone();

    if (this.room) {
      // Remove all event listeners before disconnecting
      this.room.removeAllListeners();

      // Disconnect from the room
      await this.room.disconnect();
      this.room = null;

      // Update state
      state.setConnected(false);

      if (config.debug) {
        console.log("[SpeechOS] Room disconnected and cleaned up");
      }
    }

    // Reject any pending operations (so callers don't hang)
    if (this.pendingTranscript) {
      this.pendingTranscript.reject(new Error("Disconnected"));
      this.pendingTranscript = null;
    }
    if (this.pendingEditText) {
      this.pendingEditText.reject(new Error("Disconnected"));
      this.pendingEditText = null;
    }
    if (this.pendingCommand) {
      this.pendingCommand.reject(new Error("Disconnected"));
      this.pendingCommand = null;
    }
    if (this.pendingTrackSubscribed) {
      this.pendingTrackSubscribed.reject(new Error("Disconnected"));
      this.pendingTrackSubscribed = null;
    }

    // Clear all session state including token
    // Note: We intentionally keep the cached token (cachedTokenData) valid
    // so it can be reused for the next session if within TTL.
    // The cache will naturally expire based on TOKEN_CACHE_TTL_MS.
    this.tokenData = null;
    this.editOriginalText = null;
    this.sessionSettings = {};

    if (config.debug) {
      console.log("[SpeechOS] Session state cleared");
    }
  }

  /**
   * Invalidate the cached token
   * Call this when settings change that would affect the token (language, vocabulary)
   */
  invalidateTokenCache(): void {
    const config = getConfig();
    if (config.debug) {
      console.log("[SpeechOS] Token cache invalidated");
    }
    this.cachedTokenData = null;
    this.tokenCacheTimestamp = null;
  }

  /**
   * Start auto-refreshing the token while the widget is expanded.
   * Call this after a voice session completes to immediately fetch a fresh token
   * (since each command requires its own token) and keep it fresh for subsequent commands.
   */
  startAutoRefresh(): void {
    const config = getConfig();
    this.autoRefreshEnabled = true;

    if (config.debug) {
      console.log("[SpeechOS] Token auto-refresh enabled");
    }

    // Invalidate the token we just used (each command needs a fresh token)
    this.invalidateTokenCache();

    // Immediately fetch a fresh token for the next command, then schedule refresh
    this.prefetchToken()
      .then(() => {
        // Now that we have a fresh token, schedule the next refresh
        this.scheduleTokenRefresh();
      })
      .catch((error) => {
        if (config.debug) {
          console.warn(
            "[SpeechOS] Failed to prefetch token after command:",
            error
          );
        }
        // Even on failure, try again later
        if (this.autoRefreshEnabled) {
          this.tokenRefreshTimer = setTimeout(() => {
            this.performAutoRefresh();
          }, 5 * 1000); // Retry in 5 seconds
        }
      });
  }

  /**
   * Stop auto-refreshing the token.
   * Call this when the widget collapses or user navigates away.
   */
  stopAutoRefresh(): void {
    const config = getConfig();
    this.autoRefreshEnabled = false;

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (config.debug) {
      console.log("[SpeechOS] Token auto-refresh disabled");
    }
  }

  /**
   * Schedule a token refresh before the current cache expires.
   * Handles computer sleep by checking elapsed time on each refresh attempt.
   */
  private scheduleTokenRefresh(): void {
    if (!this.autoRefreshEnabled) {
      return;
    }

    // Clear any existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    const config = getConfig();

    // Calculate time until refresh needed
    // Refresh 30 seconds before expiry to ensure smooth transition
    const refreshBuffer = 30 * 1000;
    let timeUntilRefresh: number;

    if (this.tokenCacheTimestamp) {
      const age = Date.now() - this.tokenCacheTimestamp;
      const timeRemaining = TOKEN_CACHE_TTL_MS - age;
      timeUntilRefresh = Math.max(0, timeRemaining - refreshBuffer);
    } else {
      // No cached token, refresh immediately
      timeUntilRefresh = 0;
    }

    if (config.debug) {
      console.log(
        `[SpeechOS] Scheduling token refresh in ${Math.round(
          timeUntilRefresh / 1000
        )}s`
      );
    }

    this.tokenRefreshTimer = setTimeout(() => {
      this.performAutoRefresh();
    }, timeUntilRefresh);
  }

  /**
   * Perform the auto-refresh, handling computer sleep scenarios.
   */
  private async performAutoRefresh(): Promise<void> {
    if (!this.autoRefreshEnabled) {
      return;
    }

    const config = getConfig();

    // Check if token is still valid (handles computer sleep where timer fired late)
    // If token expired during sleep, we'll fetch a fresh one
    if (this.isCachedTokenValid()) {
      if (config.debug) {
        console.log(
          "[SpeechOS] Token still valid on refresh check, rescheduling"
        );
      }
      this.scheduleTokenRefresh();
      return;
    }

    if (config.debug) {
      console.log("[SpeechOS] Auto-refreshing token...");
    }

    try {
      // Fetch fresh token
      const data = await this.fetchTokenFromServer();
      this.cachedTokenData = data;
      this.tokenCacheTimestamp = Date.now();

      if (config.debug) {
        console.log("[SpeechOS] Token auto-refreshed successfully");
      }

      // Schedule next refresh
      this.scheduleTokenRefresh();
    } catch (error) {
      // Log but don't show error to user - they haven't started an action
      console.warn("[SpeechOS] Token auto-refresh failed:", error);

      // Retry in 30 seconds
      if (this.autoRefreshEnabled) {
        this.tokenRefreshTimer = setTimeout(() => {
          this.performAutoRefresh();
        }, 30 * 1000);
      }
    }
  }

  /**
   * Get the current room instance
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Get the current token data
   */
  getTokenData(): LiveKitTokenResponse | null {
    return this.tokenData;
  }

  /**
   * Check if connected to a room
   */
  isConnected(): boolean {
    return this.room?.state === "connected";
  }

  /**
   * Check if microphone is enabled
   */
  isMicrophoneEnabled(): boolean {
    return this.micTrack !== null;
  }
}

// Export singleton instance
export const livekit: LiveKitManager = new LiveKitManager();

// Invalidate token cache when settings change (language, snippets, vocabulary)
// These settings are embedded in the token, so a new token is needed if they change
events.on("settings:changed", () => {
  livekit.invalidateTokenCache();
});
