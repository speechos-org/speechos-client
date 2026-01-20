/**
 * useCommand - Simplified hook for voice command workflows
 *
 * Provides a simple start/stop interface for voice command matching.
 */

import { useState, useCallback } from "react";
import { useSpeechOSContext } from "../context.js";
import type { CommandDefinition, CommandResult } from "@speechos/core";

/**
 * Return type for useCommand hook
 */
export interface UseCommandResult {
  /** Start command listening - begins recording */
  start: (commands: CommandDefinition[]) => Promise<void>;
  /** Stop command listening - ends recording and returns matched command */
  stop: () => Promise<CommandResult | null>;
  /** Whether currently listening for commands */
  isListening: boolean;
  /** Whether processing the command */
  isProcessing: boolean;
  /** The matched command result (null if no match or not yet processed) */
  result: CommandResult | null;
  /** Any error that occurred */
  error: string | null;
  /** Clear the result and error state */
  clear: () => void;
}

/**
 * Simplified hook for voice command workflows
 *
 * Provides an easy-to-use interface for voice command matching
 * with automatic state management.
 *
 * @example
 * ```tsx
 * const commands = [
 *   { name: 'scroll_down', description: 'Scroll the page down' },
 *   { name: 'open_settings', description: 'Open the settings modal' },
 *   {
 *     name: 'search',
 *     description: 'Search for something',
 *     arguments: [{ name: 'query', description: 'The search query' }]
 *   },
 * ];
 *
 * function VoiceCommands() {
 *   const { start, stop, isListening, isProcessing, result, error } = useCommand();
 *
 *   const handleCommand = async () => {
 *     await start(commands);
 *   };
 *
 *   const handleStop = async () => {
 *     const matched = await stop();
 *     if (matched) {
 *       console.log('Matched command:', matched.name, matched.arguments);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={isListening ? handleStop : handleCommand} disabled={isProcessing}>
 *         {isListening ? 'Execute' : 'Say Command'}
 *       </button>
 *       {isProcessing && <span>Processing...</span>}
 *       {result && <p>Command: {result.name}</p>}
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Command controls and state
 */
export function useCommand(): UseCommandResult {
  const { state, command, stopCommand } = useSpeechOSContext();
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isListening =
    state.recordingState === "recording" && state.activeAction === "command";
  const isProcessing = state.recordingState === "processing";

  const start = useCallback(
    async (commands: CommandDefinition[]) => {
      setError(null);
      try {
        // command() returns a promise that resolves when stopCommand() is called
        await command(commands);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start command";
        setError(message);
      }
    },
    [command]
  );

  const stop = useCallback(async (): Promise<CommandResult | null> => {
    try {
      const commandResult = await stopCommand();
      setResult(commandResult);
      setError(null);
      return commandResult;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process command";
      setError(message);
      throw err;
    }
  }, [stopCommand]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    start,
    stop,
    isListening,
    isProcessing,
    result,
    error,
    clear,
  };
}
