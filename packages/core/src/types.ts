/**
 * Shared TypeScript types for SpeechOS Core SDK
 */

/**
 * Server error message structure received via LiveKit data channel
 */
export interface ServerErrorMessage {
  type: "error";
  /** Error code identifying the type of error (e.g., "transcription_failed", "edit_failed") */
  code?: string;
  /** User-facing error message */
  message: string;
  /** Optional technical details for debugging */
  details?: string;
}

/**
 * Error source indicating where the error originated
 */
export type ErrorSource = "init" | "connection" | "timeout" | "server";

/**
 * Backend type for voice sessions
 * - 'websocket': Direct WebSocket connection (lower latency, recommended)
 * - 'livekit': LiveKit WebRTC connection (legacy)
 */
export type VoiceBackend = "websocket" | "livekit";

/**
 * Configuration options for initializing SpeechOS Core
 */
export interface SpeechOSCoreConfig {
  /** API key for authentication with SpeechOS backend (required) */
  apiKey: string;

  /** Optional user identifier for tracking which end user is using the SDK */
  userId?: string;

  /** Backend host URL for API calls (default: https://app.speechos.ai) */
  host?: string;

  /** Enable debug logging */
  debug?: boolean;

  /**
   * Custom WebSocket factory for creating connections.
   * Used by the Chrome extension to route WebSocket traffic through the
   * service worker, bypassing page CSP restrictions.
   * If not provided, uses the native WebSocket constructor.
   */
  webSocketFactory?: WebSocketFactory;

  /**
   * Custom fetch handler for making HTTP requests.
   * Used by the Chrome extension to route fetch traffic through the
   * service worker, bypassing page CSP restrictions.
   * If not provided, uses the native fetch function.
   */
  fetchHandler?: FetchHandler;

  /**
   * JWT token for server-side settings persistence.
   * When provided, user settings (language, vocabulary, snippets) are synced to the server.
   * Generate this token server-side via POST /api/user-settings-token/ with your UserAPIKey.
   */
  settingsToken?: string;
}

/**
 * Session settings passed when starting a voice session
 * Contains user preferences for transcription and processing
 */
export interface SessionSettings {
  /** Input language code for speech recognition (e.g., "en-US", "es", "fr") */
  inputLanguageCode?: string;
  /** Output language code for transcription formatting */
  outputLanguageCode?: string;
  /** Whether to apply AI formatting (removes filler words, adds punctuation) */
  smartFormat?: boolean;
  /** Custom vocabulary terms to improve transcription accuracy */
  vocabulary?: string[];
  /** Text snippets with trigger phrases that expand to full text */
  snippets?: Array<{ trigger: string; expansion: string }>;
  /** Audio input device ID (empty string for system default) */
  audioDeviceId?: string;
}

/**
 * Options for starting a voice session
 */
export interface VoiceSessionOptions {
  /** Callback when microphone is ready and capturing */
  onMicReady?: () => void;
  /** Action type for this session */
  action?: SpeechOSAction;
  /** Text to edit (for edit action) */
  inputText?: string;
  /** Command definitions (for command action) */
  commands?: CommandDefinition[];
  /** User settings for this session */
  settings?: SessionSettings;
}

/**
 * LiveKit token response from the backend
 */
export interface LiveKitTokenResponse {
  token: string;
  ws_url: string;
  room: string;
  identity: string;
}

/**
 * User vocabulary data sent with transcription/edit requests
 * Includes custom vocabulary terms for improved transcription accuracy
 * and text snippets that can be expanded from trigger phrases
 */
export interface UserVocabularyData {
  /** Custom vocabulary terms to improve transcription of domain-specific words */
  vocabulary: string[];
  /** Text snippets with trigger phrases that expand to full text */
  snippets: Array<{
    /** Short trigger phrase the user speaks */
    trigger: string;
    /** Full text to expand the trigger into */
    expansion: string;
  }>;
}

/**
 * Available actions that can be triggered from the widget
 */
export type SpeechOSAction = "dictate" | "edit" | "command";

// ============================================
// Command types for voice command matching
// ============================================

/**
 * Definition of a command argument
 */
export interface CommandArgument {
  /** Name of the argument (used as key in the result) */
  name: string;
  /** Description of what this argument represents */
  description: string;
  /** Type of the argument value */
  type?: "string" | "number" | "integer" | "boolean";
  /** Whether this argument is required (default: true) */
  required?: boolean;
}

/**
 * Definition of a command that can be matched
 */
export interface CommandDefinition {
  /** Unique name/identifier for the command */
  name: string;
  /** Description of what this command does (helps LLM match intent) */
  description: string;
  /** Arguments that can be extracted from the user's speech */
  arguments?: CommandArgument[];
}

/**
 * Result of a successful command match
 */
export interface CommandResult {
  /** Name of the matched command */
  name: string;
  /** Extracted argument values */
  arguments: Record<string, unknown>;
}

/**
 * Recording/dictation states
 */
export type RecordingState =
  | "idle" // Normal state, not recording
  | "connecting" // Connecting to backend
  | "recording" // Actively recording audio
  | "processing" // Processing/transcribing audio
  | "error"; // Connection or processing error

/**
 * Internal state of the SpeechOS SDK
 */
export interface SpeechOSState {
  /** Whether the widget is visible on screen */
  isVisible: boolean;

  /** Whether the action bubbles are expanded */
  isExpanded: boolean;

  /** Whether connected to LiveKit room */
  isConnected: boolean;

  /** Whether microphone is enabled and publishing */
  isMicEnabled: boolean;

  /** Currently active action, if any */
  activeAction: SpeechOSAction | null;

  /** The form field element that currently has focus (set by client) */
  focusedElement: HTMLElement | null;

  /** Current recording state */
  recordingState: RecordingState;

  /** Error message to display (if any) */
  errorMessage: string | null;
}

/**
 * Event payload types for SpeechOS events
 *
 * Events are organized into categories:
 * - Core events: Emitted by @speechos/core (no DOM dependencies)
 * - Client events: Emitted by @speechos/client (DOM-specific)
 */
export interface SpeechOSEventMap {
  // ============================================
  // Form detection events (client only)
  // ============================================
  /** Emitted when a text input field receives focus */
  "form:focus": { element: HTMLElement };
  /** Emitted when focus leaves a text input field */
  "form:blur": { element: HTMLElement | null };

  // ============================================
  // Widget visibility events (client only)
  // ============================================
  /** Emitted when the widget becomes visible */
  "widget:show": void;
  /** Emitted when the widget is hidden */
  "widget:hide": void;

  // ============================================
  // Action events
  // ============================================
  /** Emitted when user selects an action (dictate/edit) */
  "action:select": { action: SpeechOSAction };

  // ============================================
  // State events
  // ============================================
  /** Emitted when internal state changes */
  "state:change": { state: SpeechOSState };

  // ============================================
  // Core transcription/edit/command events
  // These are emitted by @speechos/core when LiveKit returns data
  // ============================================
  /** Emitted when intermediate transcription is received from server (indicates audio is being processed) */
  "transcription:interim": { transcript: string; isFinal: boolean };
  /** Emitted when final transcription is received from the server */
  "transcription:complete": { text: string };
  /** Emitted when edited text is received from the server */
  "edit:complete": { text: string; originalText: string };
  /** Emitted when command matching completes (null if no command matched) */
  "command:complete": { command: CommandResult | null };

  // ============================================
  // Client DOM events
  // These are emitted by @speechos/client when text is applied to the DOM
  // ============================================
  /** Emitted when transcribed text is inserted into a form field */
  "transcription:inserted": { text: string; element: HTMLElement };
  /** Emitted when edited text is applied to a form field */
  "edit:applied": {
    originalContent: string;
    editedContent: string;
    element: HTMLElement;
  };

  // ============================================
  // Settings events
  // ============================================
  /** Emitted when user settings change (language, snippets, vocabulary, smartFormat, history) */
  "settings:changed": {
    /** Type of setting that changed */
    setting: "language" | "snippets" | "vocabulary" | "smartFormat" | "history";
  };

  // ============================================
  // Settings sync events
  // ============================================
  /** Emitted when settings are loaded from the server */
  "settings:loaded": void;
  /** Emitted when settings are synced to the server */
  "settings:synced": void;
  /** Emitted when settings sync fails */
  "settings:syncFailed": { error: string };
  /** Emitted when the settings token expires (user should request a new one) */
  "settings:tokenExpired": void;

  // ============================================
  // Error events
  // ============================================
  /** Emitted when an error occurs */
  error: {
    code: string;
    message: string;
    source: ErrorSource;
  };
}

/**
 * Callback function for state changes
 */
export type StateChangeCallback = (
  newState: SpeechOSState,
  prevState: SpeechOSState
) => void;

/**
 * Unsubscribe function returned by event listeners
 */
export type UnsubscribeFn = () => void;

// ============================================
// WebSocket abstraction for extension support
// ============================================

/**
 * Minimal WebSocket-like interface used by the SDK.
 * This allows the extension to provide a proxy WebSocket that routes
 * traffic through the service worker to bypass page CSP restrictions.
 */
export interface WebSocketLike {
  /** Current connection state (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED) */
  readonly readyState: number;

  /** Number of bytes of data queued for transmission */
  readonly bufferedAmount: number;

  /** Send data over the connection */
  send(data: string | ArrayBuffer | Blob): void;

  /** Close the connection */
  close(code?: number, reason?: string): void;

  /** Called when connection opens */
  onopen: ((event: Event) => void) | null;

  /** Called when a message is received */
  onmessage: ((event: MessageEvent) => void) | null;

  /** Called when an error occurs */
  onerror: ((event: Event) => void) | null;

  /** Called when connection closes */
  onclose: ((event: CloseEvent) => void) | null;
}

/**
 * Factory function type for creating WebSocket-like connections.
 * Used by extensions to provide a proxy WebSocket that bypasses page CSP.
 */
export type WebSocketFactory = (url: string) => WebSocketLike;

// ============================================
// Fetch abstraction for extension support
// ============================================

/**
 * Options for fetch requests (subset of RequestInit used by settings sync).
 * Used by extensions to route fetch traffic through the service worker.
 */
export interface FetchOptions {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (JSON string) */
  body?: string;
}

/**
 * Response from fetch handler (subset of Response used by settings sync).
 * Provides a Response-like interface that can be serialized through message passing.
 */
export interface FetchResponse {
  /** Whether the response was successful (status 200-299) */
  ok: boolean;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Parse response body as JSON */
  json(): Promise<unknown>;
  /** Get response body as text */
  text(): Promise<string>;
}

/**
 * Custom fetch handler for making HTTP requests.
 * Used by the Chrome extension to route fetch traffic through the
 * service worker, bypassing page CSP restrictions.
 * If not provided, uses the native fetch function.
 */
export type FetchHandler = (url: string, options?: FetchOptions) => Promise<FetchResponse>;
