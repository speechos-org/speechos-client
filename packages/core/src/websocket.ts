/**
 * WebSocket integration for SpeechOS SDK.
 *
 * Provides a direct WebSocket connection to the backend for voice sessions.
 * Uses audio buffering to capture
 * audio immediately while the connection is being established.
 */

import type {
  CommandDefinition,
  CommandResult,
  ServerErrorMessage,
  ErrorSource,
  SpeechOSAction,
  VoiceSessionOptions,
  SessionSettings,
  WebSocketLike,
} from './types.js';
import { getConfig, getAnonymousId } from './config.js';
import { events } from './events.js';
import { state } from './state.js';
import { AudioCapture, createAudioCapture, getSupportedAudioFormat } from './audio-capture.js';

// Protocol message types (matching backend)
const MESSAGE_TYPE_AUTH = 'auth';
const MESSAGE_TYPE_READY = 'ready';
const MESSAGE_TYPE_TRANSCRIPTION = 'transcription';
const MESSAGE_TYPE_REQUEST_TRANSCRIPT = 'request_transcript';
const MESSAGE_TYPE_TRANSCRIPT = 'transcript';
const MESSAGE_TYPE_EDIT_TEXT = 'edit_text';
const MESSAGE_TYPE_EDITED_TEXT = 'edited_text';
const MESSAGE_TYPE_EXECUTE_COMMAND = 'execute_command';
const MESSAGE_TYPE_COMMAND_RESULT = 'command_result';
const MESSAGE_TYPE_ERROR = 'error';

// WebSocket readyState constants (for use with WebSocketLike interface)
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

/**
 * Response timeout in milliseconds.
 */
const RESPONSE_TIMEOUT_MS = 15000;

/**
 * A deferred promise with timeout support.
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

  setTimeout(ms: number, errorMessage: string, errorCode: string, errorSource: ErrorSource): void {
    this._timeoutId = setTimeout(() => {
      if (!this._settled) {
        console.error(`[SpeechOS] Error: ${errorMessage} (${errorCode})`);
        events.emit('error', {
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
 * Maximum time to wait for WebSocket buffer to drain.
 */
const BUFFER_DRAIN_TIMEOUT_MS = 5000;

/**
 * Polling interval for checking WebSocket buffer.
 */
const BUFFER_CHECK_INTERVAL_MS = 50;

/**
 * WebSocket connection manager for voice sessions.
 */
class WebSocketManager {
  private ws: WebSocketLike | null = null;
  private audioCapture: AudioCapture | null = null;
  private sessionId: string | null = null;

  // Pending operations
  private pendingAuth: Deferred<void> | null = null;
  private pendingTranscript: Deferred<string> | null = null;
  private pendingEditText: Deferred<string> | null = null;
  private pendingCommand: Deferred<CommandResult[]> | null = null;

  // Track pending audio chunk sends (for waiting before transcript request)
  private pendingAudioSends: Set<Promise<void>> = new Set();

  // Track original text for edit operations
  private editOriginalText: string | null = null;

  // Track the last input text from command results
  private lastInputText: string | undefined = undefined;

  // Session parameters (set at start, used in auth message)
  private sessionAction: SpeechOSAction = 'dictate';
  private sessionInputText: string = '';
  private sessionCommands: CommandDefinition[] = [];
  private sessionSettings: SessionSettings = {};

  /**
   * Get the WebSocket URL for voice sessions.
   */
  private getWebSocketUrl(): string {
    const config = getConfig();
    const host = config.host || 'https://app.speechos.ai';

    // Convert HTTP(S) to WS(S)
    const wsUrl = host.replace(/^http/, 'ws');

    return `${wsUrl}/ws/voice/`;
  }

  /**
   * Start a voice session with the WebSocket backend.
   *
   * This method:
   * 1. Starts audio capture immediately (buffering)
   * 2. Opens WebSocket connection
   * 3. Authenticates with API key and action parameters
   * 4. Flushes buffered audio and continues streaming
   *
   * @param options - Session options including action type and parameters
   */
  async startVoiceSession(options?: VoiceSessionOptions): Promise<void> {
    const config = getConfig();

    // Store session parameters for auth message
    this.sessionAction = options?.action || 'dictate';
    this.sessionInputText = options?.inputText || '';
    this.sessionCommands = options?.commands || [];
    this.sessionSettings = options?.settings || {};

    // Also store for event emission
    if (this.sessionAction === 'edit') {
      this.editOriginalText = this.sessionInputText;
    }

    if (config.debug) {
      console.log('[SpeechOS] Starting WebSocket voice session...');
    }

    // Create audio capture that buffers until ready
    this.audioCapture = createAudioCapture(
      (chunk) => {
        this.sendAudioChunk(chunk);
      },
      this.sessionSettings.audioDeviceId
    );

    // Start capturing immediately (will buffer)
    await this.audioCapture.start();

    // Notify that mic is ready (recording to buffer)
    if (options?.onMicReady) {
      options.onMicReady();
    }

    state.setMicEnabled(true);

    // Connect to WebSocket
    const wsUrl = this.getWebSocketUrl();

    if (config.debug) {
      console.log('[SpeechOS] Connecting to WebSocket:', wsUrl);
    }

    // Prepare auth promise before creating WebSocket so early errors can reject it
    this.pendingAuth = new Deferred<void>();
    this.pendingAuth.setTimeout(
      RESPONSE_TIMEOUT_MS,
      'Connection timed out',
      'connection_timeout',
      'connection'
    );

    // Use custom factory if provided (for extension CSP bypass), otherwise native WebSocket
    const factory = config.webSocketFactory ?? ((url: string) => new WebSocket(url));
    this.ws = factory(wsUrl);

    // Set up event handlers
    this.ws.onopen = () => {
      if (config.debug) {
        console.log('[SpeechOS] WebSocket connected, authenticating...');
      }
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (event) => {
      // Check if connection was blocked (e.g., by CSP) - readyState will be CLOSED
      // without ever successfully connecting
      const isConnectionBlocked = this.ws?.readyState === WS_CLOSED;
      const errorCode = isConnectionBlocked ? 'connection_blocked' : 'websocket_error';
      const errorMessage = isConnectionBlocked
        ? "This site's CSP blocks the extension. Try embedded mode instead."
        : 'WebSocket connection error';

      console.error('[SpeechOS] WebSocket error:', event, { isConnectionBlocked });
      events.emit('error', {
        code: errorCode,
        message: errorMessage,
        source: 'connection',
      });

      // Immediately reject pending auth to stop the connection attempt
      if (this.pendingAuth) {
        this.pendingAuth.reject(new Error(errorMessage));
      }
    };

    this.ws.onclose = (event) => {
      if (config.debug) {
        console.log('[SpeechOS] WebSocket closed:', event.code, event.reason);
      }
      state.setConnected(false);
    };

    await this.pendingAuth.promise;
    this.pendingAuth = null;

    // Now ready - flush buffered audio
    if (this.audioCapture) {
      this.audioCapture.setReady();
    }

    state.setConnected(true);

    if (config.debug) {
      console.log('[SpeechOS] WebSocket voice session ready');
    }
  }

  /**
   * Send authentication message with action parameters.
   * All session parameters are now sent upfront in the auth message.
   */
  private authenticate(): void {
    const config = getConfig();
    const audioFormat = getSupportedAudioFormat();
    const settings = this.sessionSettings;
    const anonymousId = getAnonymousId();

    const authMessage = {
      type: MESSAGE_TYPE_AUTH,
      api_key: config.apiKey,
      user_id: config.userId || null,
      anonymous_id: anonymousId,
      input_language: settings.inputLanguageCode ?? 'en-US',
      output_language: settings.outputLanguageCode ?? 'en-US',
      smart_format: settings.smartFormat ?? true,
      custom_vocabulary: settings.vocabulary ?? [],
      custom_snippets: settings.snippets ?? [],
      audio_format: audioFormat.format,
      // Action parameters (sent upfront in auth)
      action: this.sessionAction,
      input_text: this.sessionInputText,
      commands: this.sessionCommands,
    };

    if (config.debug) {
      console.log('[SpeechOS] Sending auth message with action:', this.sessionAction);
    }

    this.ws?.send(JSON.stringify(authMessage));
  }

  /**
   * Send an audio chunk over the WebSocket.
   * Tracks the promise so we can wait for all sends to complete.
   */
  private sendAudioChunk(chunk: Blob): void {
    const sendPromise = this.doSendAudioChunk(chunk);
    this.pendingAudioSends.add(sendPromise);
    sendPromise.finally(() => {
      this.pendingAudioSends.delete(sendPromise);
    });
  }

  /**
   * Actually send the audio chunk (async operation).
   */
  private async doSendAudioChunk(chunk: Blob): Promise<void> {
    if (this.ws && this.ws.readyState === WS_OPEN) {
      const arrayBuffer = await chunk.arrayBuffer();
      this.ws.send(arrayBuffer);
    }
  }

  /**
   * Handle incoming WebSocket messages.
   */
  private handleMessage(data: string): void {
    const config = getConfig();

    try {
      const message = JSON.parse(data);

      if (config.debug) {
        console.log('[SpeechOS] WebSocket message:', message);
      }

      switch (message.type) {
        case MESSAGE_TYPE_READY:
          this.handleReady(message);
          break;

        case MESSAGE_TYPE_TRANSCRIPTION:
          this.handleIntermediateTranscription(message);
          break;

        case MESSAGE_TYPE_TRANSCRIPT:
          this.handleFinalTranscript(message);
          break;

        case MESSAGE_TYPE_EDITED_TEXT:
          this.handleEditedText(message);
          break;

        case MESSAGE_TYPE_COMMAND_RESULT:
          this.handleCommandResult(message);
          break;

        case MESSAGE_TYPE_ERROR:
          this.handleError(message);
          break;

        default:
          if (config.debug) {
            console.log('[SpeechOS] Unknown message type:', message.type);
          }
      }
    } catch (error) {
      console.error('[SpeechOS] Failed to parse message:', error);
    }
  }

  private handleReady(message: { session_id: string }): void {
    const config = getConfig();

    this.sessionId = message.session_id;

    if (config.debug) {
      console.log('[SpeechOS] Session ready:', this.sessionId);
    }

    // Resolve auth promise
    if (this.pendingAuth) {
      this.pendingAuth.resolve();
    }
  }

  private handleIntermediateTranscription(message: {
    transcript: string;
    is_final: boolean;
  }): void {
    const config = getConfig();

    // Emit transcription:interim event for UI feedback (e.g., no-audio warning detection)
    events.emit('transcription:interim', {
      transcript: message.transcript,
      isFinal: message.is_final,
    });

    if (config.debug) {
      console.log(
        '[SpeechOS] Intermediate transcription:',
        message.transcript,
        'final:',
        message.is_final
      );
    }
  }

  private handleFinalTranscript(message: { transcript: string }): void {
    const transcript = message.transcript || '';

    // Emit transcription:complete event
    events.emit('transcription:complete', { text: transcript });

    // Resolve pending promise
    if (this.pendingTranscript) {
      this.pendingTranscript.resolve(transcript);
      this.pendingTranscript = null;
    }
  }

  private handleEditedText(message: { text: string }): void {
    const editedText = message.text || '';

    // Emit edit:complete event
    events.emit('edit:complete', {
      text: editedText,
      originalText: this.editOriginalText || '',
    });

    // Resolve pending promise
    if (this.pendingEditText) {
      this.pendingEditText.resolve(editedText);
      this.pendingEditText = null;
    }

    this.editOriginalText = null;
  }

  private handleCommandResult(message: { commands: CommandResult[]; transcript?: string }): void {
    const commands = message.commands || [];

    // Store the input text (what the user said) if provided by the backend
    this.lastInputText = message.transcript;

    // Emit command:complete event
    events.emit('command:complete', { commands });

    // Resolve pending promise
    if (this.pendingCommand) {
      this.pendingCommand.resolve(commands);
      this.pendingCommand = null;
    }
  }

  private handleError(message: ServerErrorMessage): void {
    const errorCode = message.code || 'server_error';
    const errorMessage = message.message || 'A server error occurred';

    console.error(`[SpeechOS] Error: ${errorMessage} (${errorCode})`);

    events.emit('error', {
      code: errorCode,
      message: errorMessage,
      source: 'server',
    });

    // Reject any pending operations
    const error = new Error(errorMessage);
    if (this.pendingAuth) {
      this.pendingAuth.reject(error);
      this.pendingAuth = null;
    }
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

  /**
   * Stop the voice session and request the transcript.
   */
  async stopVoiceSession(): Promise<string> {
    const config = getConfig();

    if (config.debug) {
      console.log('[SpeechOS] Stopping voice session, requesting transcript...');
    }

    // Stop audio capture and wait for final chunk to be sent
    await this.stopAudioCapture();

    // Create deferred for transcript
    this.pendingTranscript = new Deferred<string>();
    this.pendingTranscript.setTimeout(
      RESPONSE_TIMEOUT_MS,
      'Transcription timed out. Please try again.',
      'transcription_timeout',
      'timeout'
    );

    // Request transcript
    this.sendMessage({ type: MESSAGE_TYPE_REQUEST_TRANSCRIPT });

    const result = await this.pendingTranscript.promise;
    this.pendingTranscript = null;

    return result;
  }

  /**
   * Request text editing using the transcript as instructions.
   * Note: The input text was already sent in the auth message via startVoiceSession.
   */
  async requestEditText(_originalText: string): Promise<string> {
    const config = getConfig();

    if (config.debug) {
      console.log('[SpeechOS] Requesting text edit...');
    }

    // Stop audio capture and wait for final chunk
    await this.stopAudioCapture();

    // Create deferred for edited text
    this.pendingEditText = new Deferred<string>();
    this.pendingEditText.setTimeout(
      RESPONSE_TIMEOUT_MS,
      'Edit request timed out. Please try again.',
      'edit_timeout',
      'timeout'
    );

    // Send edit request (params already sent in auth message)
    this.sendMessage({
      type: MESSAGE_TYPE_EDIT_TEXT,
    });

    const result = await this.pendingEditText.promise;
    this.pendingEditText = null;

    return result;
  }

  /**
   * Request command matching using the transcript as input.
   * Note: The command definitions were already sent in the auth message via startVoiceSession.
   * Returns an array of matched commands (empty array if no matches).
   */
  async requestCommand(_commands: CommandDefinition[]): Promise<CommandResult[]> {
    const config = getConfig();

    if (config.debug) {
      console.log('[SpeechOS] Requesting command match...');
    }

    // Stop audio capture and wait for final chunk
    await this.stopAudioCapture();

    // Create deferred for command result
    this.pendingCommand = new Deferred<CommandResult[]>();
    this.pendingCommand.setTimeout(
      RESPONSE_TIMEOUT_MS,
      'Command request timed out. Please try again.',
      'command_timeout',
      'timeout'
    );

    // Send command request (params already sent in auth message)
    this.sendMessage({
      type: MESSAGE_TYPE_EXECUTE_COMMAND,
    });

    const result = await this.pendingCommand.promise;
    this.pendingCommand = null;

    return result;
  }

  /**
   * Stop audio capture and wait for all data to be sent.
   *
   * Waits for:
   * 1. All pending sendAudioChunk calls to complete (arrayBuffer conversion)
   * 2. WebSocket buffer to drain (all data transmitted)
   *
   * WebSocket message ordering ensures server receives all audio before transcript request.
   */
  private async stopAudioCapture(): Promise<void> {
    const config = getConfig();
    const startTime = Date.now();

    if (config.debug) {
      console.log('[SpeechOS] stopAudioCapture: starting...');
    }

    if (this.audioCapture) {
      await this.audioCapture.stop();
      this.audioCapture = null;
      if (config.debug) {
        console.log(`[SpeechOS] stopAudioCapture: recorder stopped after ${Date.now() - startTime}ms`);
      }
    }
    state.setMicEnabled(false);

    // Wait for all pending audio chunk sends to complete
    // This ensures all arrayBuffer() conversions finish and data is queued to WebSocket
    if (this.pendingAudioSends.size > 0) {
      if (config.debug) {
        console.log(`[SpeechOS] stopAudioCapture: waiting for ${this.pendingAudioSends.size} pending audio sends...`);
      }
      await Promise.all(this.pendingAudioSends);
      if (config.debug) {
        console.log(`[SpeechOS] stopAudioCapture: all sends complete after ${Date.now() - startTime}ms`);
      }
    } else if (config.debug) {
      console.log('[SpeechOS] stopAudioCapture: no pending sends');
    }

    // Wait for WebSocket buffer to drain (all audio data sent)
    await this.waitForBufferDrain();

    if (config.debug) {
      console.log(`[SpeechOS] stopAudioCapture: complete after ${Date.now() - startTime}ms`);
    }
  }

  /**
   * Wait for the WebSocket send buffer to drain.
   *
   * This ensures all audio data has been transmitted before we request
   * the transcript.
   */
  private async waitForBufferDrain(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WS_OPEN) {
      return;
    }

    const config = getConfig();
    const startTime = Date.now();

    while (this.ws.bufferedAmount > 0) {
      if (Date.now() - startTime > BUFFER_DRAIN_TIMEOUT_MS) {
        console.warn(
          `[SpeechOS] Buffer drain timeout, ${this.ws.bufferedAmount} bytes still pending`
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, BUFFER_CHECK_INTERVAL_MS));
    }

    if (config.debug) {
      console.log(`[SpeechOS] Buffer drained in ${Date.now() - startTime}ms`);
    }
  }

  /**
   * Send a JSON message over the WebSocket.
   */
  private sendMessage(message: object): void {
    if (this.ws && this.ws.readyState === WS_OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Disconnect from the WebSocket.
   */
  async disconnect(): Promise<void> {
    const config = getConfig();

    if (config.debug) {
      console.log('[SpeechOS] Disconnecting WebSocket...');
    }

    // Stop audio capture (don't wait for final chunk on disconnect)
    await this.stopAudioCapture();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject any pending operations
    const error = new Error('Disconnected');
    if (this.pendingAuth) {
      this.pendingAuth.reject(error);
      this.pendingAuth = null;
    }
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

    // Reset state
    this.sessionId = null;
    this.editOriginalText = null;
    this.lastInputText = undefined;
    this.sessionSettings = {};

    state.setConnected(false);
    state.setMicEnabled(false);

    if (config.debug) {
      console.log('[SpeechOS] WebSocket disconnected');
    }
  }

  /**
   * Check if connected to WebSocket.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WS_OPEN;
  }

  /**
   * Get the last input text from a command result.
   * This is the raw transcript of what the user said.
   */
  getLastInputText(): string | undefined {
    return this.lastInputText;
  }
}

// Export singleton instance
export const websocket: WebSocketManager = new WebSocketManager();
