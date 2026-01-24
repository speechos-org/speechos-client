/**
 * WebSocket module tests
 *
 * Tests for the Deferred utility class used in WebSocket operations.
 * WebSocketManager integration tests are more complex due to browser API mocking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Deferred, websocket } from './websocket.js';
import { events } from './events.js';
import { setConfig, resetConfig } from './config.js';
import type { WebSocketLike } from './types.js';

describe('WebSocket Deferred', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetConfig();
    events.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    events.clear();
  });

  describe('basic functionality', () => {
    it('should create a promise that can be resolved', async () => {
      const deferred = new Deferred<string>();

      setTimeout(() => deferred.resolve('test value'), 0);
      vi.advanceTimersByTime(0);

      await expect(deferred.promise).resolves.toBe('test value');
    });

    it('should create a promise that can be rejected', async () => {
      const deferred = new Deferred<string>();

      setTimeout(() => deferred.reject(new Error('test error')), 0);
      vi.advanceTimersByTime(0);

      await expect(deferred.promise).rejects.toThrow('test error');
    });

    it('should track settled state after resolve', () => {
      const deferred = new Deferred<string>();

      expect(deferred.isSettled).toBe(false);
      deferred.resolve('value');
      expect(deferred.isSettled).toBe(true);
    });

    it('should track settled state after reject', async () => {
      const deferred = new Deferred<void>();

      expect(deferred.isSettled).toBe(false);
      deferred.reject(new Error('error'));
      expect(deferred.isSettled).toBe(true);

      await expect(deferred.promise).rejects.toThrow('error');
    });
  });

  describe('double-settlement prevention', () => {
    it('should ignore second resolve after first resolve', async () => {
      const deferred = new Deferred<string>();

      deferred.resolve('first');
      deferred.resolve('second');

      await expect(deferred.promise).resolves.toBe('first');
    });

    it('should ignore reject after resolve', async () => {
      const deferred = new Deferred<string>();

      deferred.resolve('value');
      deferred.reject(new Error('error'));

      await expect(deferred.promise).resolves.toBe('value');
    });

    it('should ignore resolve after reject', async () => {
      const deferred = new Deferred<string>();

      deferred.reject(new Error('error'));
      deferred.resolve('value');

      await expect(deferred.promise).rejects.toThrow('error');
    });
  });

  describe('timeout functionality', () => {
    it('should reject with error after timeout expires', async () => {
      const deferred = new Deferred<string>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      deferred.setTimeout(1000, 'Operation timed out', 'timeout_code', 'timeout');

      vi.advanceTimersByTime(1000);

      await expect(deferred.promise).rejects.toThrow('Operation timed out');

      consoleSpy.mockRestore();
    });

    it('should emit error event when timeout occurs', async () => {
      const deferred = new Deferred<string>();
      const errorListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      events.on('error', errorListener);
      deferred.setTimeout(500, 'Test timeout', 'test_timeout', 'timeout');

      vi.advanceTimersByTime(500);

      try {
        await deferred.promise;
      } catch {
        // Expected
      }

      expect(errorListener).toHaveBeenCalledWith({
        code: 'test_timeout',
        message: 'Test timeout',
        source: 'timeout',
      });

      consoleSpy.mockRestore();
    });

    it('should not reject if resolved before timeout', async () => {
      const deferred = new Deferred<string>();

      deferred.setTimeout(1000, 'Should not happen', 'timeout', 'timeout');
      deferred.resolve('success');

      vi.advanceTimersByTime(2000);

      await expect(deferred.promise).resolves.toBe('success');
    });

    it('should clear timeout when resolved', () => {
      const deferred = new Deferred<string>();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      deferred.setTimeout(1000, 'Timeout', 'code', 'timeout');
      deferred.resolve('value');

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should not timeout if already settled', async () => {
      const deferred = new Deferred<string>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      deferred.setTimeout(500, 'Timeout', 'code', 'timeout');
      deferred.resolve('early value');

      vi.advanceTimersByTime(1000);

      // Should still resolve to the early value, not reject
      await expect(deferred.promise).resolves.toBe('early value');

      consoleSpy.mockRestore();
    });

    it('should clear timeout when rejected', () => {
      const deferred = new Deferred<string>();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      deferred.setTimeout(1000, 'Timeout', 'code', 'timeout');
      deferred.reject(new Error('early reject'));

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();

      // Cleanup the rejected promise
      deferred.promise.catch(() => {});
    });
  });

  describe('type safety', () => {
    it('should work with void type', async () => {
      const deferred = new Deferred<void>();
      deferred.resolve();
      await expect(deferred.promise).resolves.toBeUndefined();
    });

    it('should work with object type', async () => {
      const deferred = new Deferred<{ id: number; name: string }>();
      deferred.resolve({ id: 1, name: 'test' });
      await expect(deferred.promise).resolves.toEqual({ id: 1, name: 'test' });
    });

    it('should work with nullable type', async () => {
      const deferred = new Deferred<string | null>();
      deferred.resolve(null);
      await expect(deferred.promise).resolves.toBeNull();
    });

    it('should work with number type', async () => {
      const deferred = new Deferred<number>();
      deferred.resolve(42);
      await expect(deferred.promise).resolves.toBe(42);
    });
  });

  describe('command result type', () => {
    it('should work with CommandResult type', async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      const result = { name: 'search', arguments: { query: 'hello' } };
      deferred.resolve(result);
      await expect(deferred.promise).resolves.toEqual(result);
    });

    it('should work with null CommandResult (no match)', async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      deferred.resolve(null);
      await expect(deferred.promise).resolves.toBeNull();
    });

    it('should reject with timeout for command requests', async () => {
      const deferred = new Deferred<{
        name: string;
        arguments: Record<string, unknown>;
      } | null>();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      deferred.setTimeout(
        15000,
        'Command request timed out. Please try again.',
        'command_timeout',
        'timeout'
      );

      vi.advanceTimersByTime(15000);

      await expect(deferred.promise).rejects.toThrow('Command request timed out');

      consoleSpy.mockRestore();
    });
  });
});

describe('WebSocket protocol messages', () => {
  /**
   * Tests for the protocol message format.
   * These verify the message structure expectations.
   */

  it('should define auth message structure', () => {
    const authMessage = {
      type: 'auth',
      api_key: 'test-key',
      user_id: 'user-123',
      input_language: 'en-US',
      output_language: 'en-US',
      smart_format: true,
      custom_vocabulary: ['term1', 'term2'],
      custom_snippets: [{ trigger: '/sig', expansion: 'Signature' }],
      audio_format: 'webm',
    };

    expect(authMessage.type).toBe('auth');
    expect(authMessage.api_key).toBeDefined();
    expect(JSON.stringify(authMessage)).toContain('"type":"auth"');
  });

  it('should define ready message structure', () => {
    const readyMessage = {
      type: 'ready',
      session_id: 'ws-session-123',
    };

    expect(readyMessage.type).toBe('ready');
    expect(readyMessage.session_id).toBeDefined();
  });

  it('should define error message structure', () => {
    const errorMessage = {
      type: 'error',
      code: 'invalid_api_key',
      message: 'Invalid API key provided',
    };

    expect(errorMessage.type).toBe('error');
    expect(errorMessage.code).toBeDefined();
    expect(errorMessage.message).toBeDefined();
  });

  it('should define transcription message structure', () => {
    const transcriptionMessage = {
      type: 'transcription',
      transcript: 'hello world',
      is_final: false,
    };

    expect(transcriptionMessage.type).toBe('transcription');
    expect(transcriptionMessage.transcript).toBeDefined();
    expect(typeof transcriptionMessage.is_final).toBe('boolean');
  });

  it('should define transcript message structure', () => {
    const transcriptMessage = {
      type: 'transcript',
      transcript: 'Final transcription text',
    };

    expect(transcriptMessage.type).toBe('transcript');
    expect(transcriptMessage.transcript).toBeDefined();
  });

  it('should define edit message structures', () => {
    const editRequest = {
      type: 'edit_text',
      text: 'Original text to edit',
    };

    const editResponse = {
      type: 'edited_text',
      text: 'Edited text result',
    };

    expect(editRequest.type).toBe('edit_text');
    expect(editResponse.type).toBe('edited_text');
  });

  it('should define command message structures', () => {
    const commandRequest = {
      type: 'execute_command',
      commands: [
        { name: 'search', description: 'Search for items' },
        { name: 'delete', description: 'Delete selected item' },
      ],
    };

    const commandResponse = {
      type: 'command_result',
      command: { name: 'search', arguments: { query: 'test' } },
    };

    expect(commandRequest.type).toBe('execute_command');
    expect(Array.isArray(commandRequest.commands)).toBe(true);
    expect(commandResponse.type).toBe('command_result');
  });
});

describe('WebSocket error handling', () => {
  it('should define connection_blocked error for CSP violations', () => {
    // When WebSocket fails immediately due to CSP, readyState will be CLOSED
    const errorPayload = {
      code: 'connection_blocked',
      message: "This site's CSP blocks the extension. Try embedded mode instead.",
      source: 'connection',
    };

    expect(errorPayload.code).toBe('connection_blocked');
    expect(errorPayload.message).toContain('CSP blocks the extension');
    expect(errorPayload.source).toBe('connection');
  });

  it('should define websocket_error for general WebSocket errors', () => {
    const errorPayload = {
      code: 'websocket_error',
      message: 'WebSocket connection error',
      source: 'connection',
    };

    expect(errorPayload.code).toBe('websocket_error');
    expect(errorPayload.message).toBe('WebSocket connection error');
  });

  it('should distinguish between blocked and general errors based on readyState', () => {
    // Simulate the logic from websocket.ts onerror handler
    const checkIsBlocked = (readyState: number) => {
      return readyState === WebSocket.CLOSED;
    };

    // CLOSED (3) means connection was blocked/failed immediately
    expect(checkIsBlocked(WebSocket.CLOSED)).toBe(true);
    // CONNECTING (0), OPEN (1), CLOSING (2) are not blocked states
    expect(checkIsBlocked(WebSocket.CONNECTING)).toBe(false);
    expect(checkIsBlocked(WebSocket.OPEN)).toBe(false);
    expect(checkIsBlocked(WebSocket.CLOSING)).toBe(false);
  });

  it('should emit error event with connection_blocked code when blocked', async () => {
    const errorListener = vi.fn();
    events.on('error', errorListener);

    // Simulate what happens in onerror when connection is blocked
    const isConnectionBlocked = true;
    const errorCode = isConnectionBlocked ? 'connection_blocked' : 'websocket_error';
    const errorMessage = isConnectionBlocked
      ? "This site's CSP blocks the extension. Try embedded mode instead."
      : 'WebSocket connection error';

    events.emit('error', {
      code: errorCode,
      message: errorMessage,
      source: 'connection',
    });

    expect(errorListener).toHaveBeenCalledWith({
      code: 'connection_blocked',
      message: "This site's CSP blocks the extension. Try embedded mode instead.",
      source: 'connection',
    });
  });

  it('should reject pending auth immediately when connection is blocked', async () => {
    const deferred = new Deferred<void>();
    const errorMessage = "This site's CSP blocks the extension. Try embedded mode instead.";

    // Set a long timeout that should never fire
    deferred.setTimeout(30000, 'Connection timed out', 'connection_timeout', 'connection');

    // Immediately reject (simulating onerror handler)
    deferred.reject(new Error(errorMessage));

    // Should reject with our message, not timeout
    await expect(deferred.promise).rejects.toThrow(errorMessage);
  });
});

describe('WebSocket URL construction', () => {
  it('should convert https to wss', () => {
    const host = 'https://app.speechos.ai';
    const wsUrl = host.replace(/^http/, 'ws');

    expect(wsUrl).toBe('wss://app.speechos.ai');
  });

  it('should convert http to ws', () => {
    const host = 'http://localhost:8000';
    const wsUrl = host.replace(/^http/, 'ws');

    expect(wsUrl).toBe('ws://localhost:8000');
  });

  it('should append voice endpoint', () => {
    const host = 'https://app.speechos.ai';
    const wsUrl = host.replace(/^http/, 'ws') + '/ws/voice/';

    expect(wsUrl).toBe('wss://app.speechos.ai/ws/voice/');
  });
});

describe('WebSocket factory', () => {
  /**
   * Helper to create a mock WebSocketLike object
   */
  function createMockWebSocket(): WebSocketLike & {
    triggerOpen: () => void;
    triggerMessage: (data: string) => void;
    triggerError: () => void;
    triggerClose: () => void;
  } {
    const ws: WebSocketLike & {
      triggerOpen: () => void;
      triggerMessage: (data: string) => void;
      triggerError: () => void;
      triggerClose: () => void;
    } = {
      readyState: 0, // CONNECTING
      bufferedAmount: 0,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      triggerOpen() {
        (this as { readyState: number }).readyState = 1; // OPEN
        if (this.onopen) this.onopen(new Event('open'));
      },
      triggerMessage(data: string) {
        if (this.onmessage) this.onmessage(new MessageEvent('message', { data }));
      },
      triggerError() {
        (this as { readyState: number }).readyState = 3; // CLOSED
        if (this.onerror) this.onerror(new Event('error'));
      },
      triggerClose() {
        (this as { readyState: number }).readyState = 3; // CLOSED
        if (this.onclose) this.onclose(new CloseEvent('close'));
      },
    };
    return ws;
  }

  /**
   * Helper to set up browser API mocks needed for WebSocket tests
   */
  function setupBrowserMocks() {
    // Mock navigator with all required properties
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      vendor: 'Google Inc.',
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    // Mock MediaRecorder - returns a fresh instance each time
    const MockMediaRecorder = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
      this.start = vi.fn();
      this.stop = vi.fn().mockImplementation(() => {
        this.state = 'inactive';
        if (typeof this.onstop === 'function') this.onstop();
      });
      this.ondataavailable = null;
      this.onerror = null;
      this.onstop = null;
      this.state = 'inactive';
      this.requestData = vi.fn();
      return this;
    });
    MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    resetConfig();
    events.clear();
    setupBrowserMocks();
  });

  afterEach(() => {
    // Use real timers first so cleanup doesn't hang
    vi.useRealTimers();
    events.clear();
    // Reset config but don't try to disconnect - it causes unhandled rejections
    // Each test is responsible for proper cleanup of its own session
    resetConfig();
    vi.unstubAllGlobals();
  });

  describe('factory invocation', () => {
    it('should call webSocketFactory when provided in config', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);

      setConfig({
        apiKey: 'test-key',
        host: 'https://test.speechos.ai',
        webSocketFactory: mockFactory,
      });

      // Start voice session (this will create the WebSocket)
      const sessionPromise = websocket.startVoiceSession();

      // Allow async operations to run
      await vi.advanceTimersByTimeAsync(100);

      // Factory should have been called with the correct URL
      expect(mockFactory).toHaveBeenCalledTimes(1);
      expect(mockFactory).toHaveBeenCalledWith('wss://test.speechos.ai/ws/voice/');

      // Simulate successful connection
      mockWs.triggerOpen();

      // Simulate ready message from server
      mockWs.triggerMessage(JSON.stringify({
        type: 'ready',
        session_id: 'test-session-123',
      }));

      await vi.advanceTimersByTimeAsync(100);

      // Session should complete successfully
      await sessionPromise;

      // Verify the mock WebSocket's send was called (for auth message)
      expect(mockWs.send).toHaveBeenCalled();
      const authCall = (mockWs.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const authMessage = JSON.parse(authCall);
      expect(authMessage.type).toBe('auth');
      expect(authMessage.api_key).toBe('test-key');
    });

    it('should pass correct URL to factory based on host config', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);

      // Test with localhost (http -> ws)
      setConfig({
        apiKey: 'test-key',
        host: 'http://localhost:8000',
        webSocketFactory: mockFactory,
      });

      websocket.startVoiceSession();
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFactory).toHaveBeenCalledWith('ws://localhost:8000/ws/voice/');
    });

    it('should handle factory-created socket events correctly', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);
      const errorListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      events.on('error', errorListener);

      setConfig({
        apiKey: 'test-key',
        host: 'https://test.speechos.ai',
        webSocketFactory: mockFactory,
      });

      const sessionPromise = websocket.startVoiceSession();
      await vi.advanceTimersByTimeAsync(100);

      // Set up the rejection expectation BEFORE triggering error to catch it properly
      const rejectPromise = expect(sessionPromise).rejects.toThrow("This site's CSP blocks the extension");

      // Simulate connection error (CSP blocked)
      mockWs.triggerError();

      // Wait for the rejection to propagate
      await rejectPromise;

      // Should have emitted error event
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'connection_blocked',
          source: 'connection',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should use native WebSocket when factory is not provided', async () => {
      const nativeWebSocketSpy = vi.fn();
      vi.stubGlobal('WebSocket', nativeWebSocketSpy);

      setConfig({
        apiKey: 'test-key',
        host: 'https://test.speechos.ai',
        // No webSocketFactory provided
      });

      // This will fail because our mock WebSocket doesn't have the right interface,
      // but we just want to verify native WebSocket was called
      try {
        websocket.startVoiceSession();
        await vi.advanceTimersByTimeAsync(100);
      } catch {
        // Expected to fail due to mock limitations
      }

      // Native WebSocket should have been called
      expect(nativeWebSocketSpy).toHaveBeenCalledWith('wss://test.speechos.ai/ws/voice/');
    });
  });

  describe('message handling with factory socket', () => {
    it('should send auth message after connection opens', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);

      setConfig({
        apiKey: 'test-api-key',
        userId: 'test-user-id',
        host: 'https://test.speechos.ai',
        webSocketFactory: mockFactory,
      });

      websocket.startVoiceSession({
        action: 'dictate',
        settings: {
          inputLanguageCode: 'en-US',
          outputLanguageCode: 'en-US',
          smartFormat: true,
        },
      });

      await vi.advanceTimersByTimeAsync(100);

      // Trigger connection open
      mockWs.triggerOpen();

      await vi.advanceTimersByTimeAsync(100);

      // Verify auth message was sent
      expect(mockWs.send).toHaveBeenCalled();
      const authCall = (mockWs.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const authMessage = JSON.parse(authCall);

      expect(authMessage.type).toBe('auth');
      expect(authMessage.api_key).toBe('test-api-key');
      expect(authMessage.user_id).toBe('test-user-id');
      expect(authMessage.action).toBe('dictate');
      expect(authMessage.input_language).toBe('en-US');
      expect(authMessage.output_language).toBe('en-US');
      expect(authMessage.smart_format).toBe(true);
    });

    it('should handle transcript response from factory socket', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);
      const transcriptListener = vi.fn();

      events.on('transcription:complete', transcriptListener);

      setConfig({
        apiKey: 'test-key',
        host: 'https://test.speechos.ai',
        webSocketFactory: mockFactory,
      });

      const sessionPromise = websocket.startVoiceSession();
      await vi.advanceTimersByTimeAsync(100);

      // Complete connection
      mockWs.triggerOpen();
      mockWs.triggerMessage(JSON.stringify({ type: 'ready', session_id: 'test-123' }));
      await vi.advanceTimersByTimeAsync(100);
      await sessionPromise;

      // Now stop and request transcript
      const stopPromise = websocket.stopVoiceSession();
      await vi.advanceTimersByTimeAsync(100);

      // Server sends transcript
      mockWs.triggerMessage(JSON.stringify({
        type: 'transcript',
        transcript: 'Hello world',
      }));

      await vi.advanceTimersByTimeAsync(100);

      const transcript = await stopPromise;

      expect(transcript).toBe('Hello world');
      expect(transcriptListener).toHaveBeenCalledWith({ text: 'Hello world' });
    });
  });

  describe('disconnect with factory socket', () => {
    it('should call close on factory-created socket', async () => {
      const mockWs = createMockWebSocket();
      const mockFactory = vi.fn().mockReturnValue(mockWs);

      setConfig({
        apiKey: 'test-key',
        host: 'https://test.speechos.ai',
        webSocketFactory: mockFactory,
      });

      const sessionPromise = websocket.startVoiceSession();
      await vi.advanceTimersByTimeAsync(100);

      // Complete connection
      mockWs.triggerOpen();
      mockWs.triggerMessage(JSON.stringify({ type: 'ready', session_id: 'test-123' }));
      await vi.advanceTimersByTimeAsync(100);
      await sessionPromise;

      // Disconnect
      await websocket.disconnect();

      // Close should have been called on the mock socket
      expect(mockWs.close).toHaveBeenCalled();
    });
  });
});
