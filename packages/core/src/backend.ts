/**
 * Backend abstraction for voice sessions.
 *
 * Provides a unified interface for voice backends.
 * Currently always uses WebSocket backend.
 */

import type { CommandDefinition, CommandResult, VoiceSessionOptions } from './types.js';
import { livekit } from './livekit.js';
import { websocket } from './websocket.js';

/**
 * Voice backend interface - common methods between backends
 */
export interface VoiceBackend {
  startVoiceSession(options?: VoiceSessionOptions): Promise<void>;
  stopVoiceSession(): Promise<string>;
  requestEditText(originalText: string): Promise<string>;
  requestCommand(commands: CommandDefinition[]): Promise<CommandResult | null>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  /** Get the last input text (transcript) from a command result */
  getLastInputText?(): string | undefined;

  // LiveKit-specific methods (available on both, but may be no-ops on websocket)
  prefetchToken?(): Promise<unknown>;
  startAutoRefresh?(): void;
  stopAutoRefresh?(): void;
  invalidateTokenCache?(): void;
}

/**
 * LiveKit backend adapter - wraps the livekit module to match the VoiceBackend interface
 * @internal Legacy backend, kept for potential future use
 */
const livekitBackend: VoiceBackend = {
  startVoiceSession: (options) => livekit.startVoiceSession(options),
  stopVoiceSession: () => livekit.stopVoiceSession(),
  requestEditText: (text) => livekit.requestEditText(text),
  requestCommand: (commands) => livekit.requestCommand(commands),
  disconnect: () => livekit.disconnect(),
  isConnected: () => livekit.isConnected(),
  prefetchToken: () => livekit.prefetchToken(),
  startAutoRefresh: () => livekit.startAutoRefresh(),
  stopAutoRefresh: () => livekit.stopAutoRefresh(),
  invalidateTokenCache: () => livekit.invalidateTokenCache(),
};

/**
 * WebSocket backend adapter - wraps the websocket module to match the VoiceBackend interface
 */
const websocketBackend: VoiceBackend = {
  startVoiceSession: (options) => websocket.startVoiceSession(options),
  stopVoiceSession: () => websocket.stopVoiceSession(),
  requestEditText: (text) => websocket.requestEditText(text),
  requestCommand: (commands) => websocket.requestCommand(commands),
  disconnect: () => websocket.disconnect(),
  isConnected: () => websocket.isConnected(),
  getLastInputText: () => websocket.getLastInputText(),
  // No-op methods for LiveKit-specific features
  prefetchToken: () => Promise.resolve({}),
  startAutoRefresh: () => {},
  stopAutoRefresh: () => {},
  invalidateTokenCache: () => {},
};

/**
 * Get the active voice backend.
 * Always returns WebSocket backend (LiveKit is legacy).
 *
 * @returns The websocket backend
 */
export function getBackend(): VoiceBackend {
  return websocketBackend;
}

/**
 * Check if the current backend is LiveKit.
 * @deprecated Always returns false - LiveKit is legacy
 */
export function isLiveKitBackend(): boolean {
  return false;
}

/**
 * Check if the current backend is WebSocket.
 * @deprecated Always returns true - WebSocket is the only backend
 */
export function isWebSocketBackend(): boolean {
  return true;
}

// Keep livekitBackend reference to prevent unused variable warning
void livekitBackend;
