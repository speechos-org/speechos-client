/**
 * Backend abstraction for voice sessions.
 *
 * Provides a unified interface for voice backends.
 * Currently always uses WebSocket backend.
 */

import type { CommandDefinition, CommandResult, VoiceSessionOptions } from './types.js';
import { websocket } from './websocket.js';

/**
 * Voice backend interface - common methods between backends
 */
export interface VoiceBackend {
  startVoiceSession(options?: VoiceSessionOptions): Promise<void>;
  stopVoiceSession(): Promise<string>;
  requestEditText(originalText: string): Promise<string>;
  requestCommand(commands: CommandDefinition[]): Promise<CommandResult[]>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  /** Get the last input text (transcript) from a command result */
  getLastInputText?(): string | undefined;
}

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
};

/**
 * Get the active voice backend.
 *
 * @returns The websocket backend
 */
export function getBackend(): VoiceBackend {
  return websocketBackend;
}
