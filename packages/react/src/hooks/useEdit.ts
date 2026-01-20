/**
 * useEdit - Simplified hook for voice editing workflows
 *
 * Provides a simple start/stop interface for voice-based text editing.
 */

import { useState, useCallback, useRef } from "react";
import { useSpeechOSContext } from "../context.js";

/**
 * Return type for useEdit hook
 */
export interface UseEditResult {
  /** Start edit - begins recording voice instructions */
  start: (textToEdit: string) => Promise<void>;
  /** Stop edit - ends recording and returns edited text */
  stop: () => Promise<string>;
  /** Whether currently recording */
  isEditing: boolean;
  /** Whether processing the edit */
  isProcessing: boolean;
  /** The original text being edited */
  originalText: string | null;
  /** The edited result (null if none yet) */
  result: string | null;
  /** Any error that occurred */
  error: string | null;
  /** Clear the result and error state */
  clear: () => void;
}

/**
 * Simplified hook for voice editing workflows
 *
 * Provides an easy-to-use interface for voice-based text editing
 * with automatic state management.
 *
 * @example
 * ```tsx
 * function TextEditor() {
 *   const [text, setText] = useState('Hello world');
 *   const { start, stop, isEditing, isProcessing, result, error } = useEdit();
 *
 *   const handleEdit = async () => {
 *     await start(text);
 *   };
 *
 *   const handleStop = async () => {
 *     const edited = await stop();
 *     setText(edited);
 *   };
 *
 *   return (
 *     <div>
 *       <textarea value={text} onChange={(e) => setText(e.target.value)} />
 *       <button onClick={isEditing ? handleStop : handleEdit} disabled={isProcessing}>
 *         {isEditing ? 'Apply Edit' : 'Edit with Voice'}
 *       </button>
 *       {isProcessing && <span>Processing...</span>}
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns Edit controls and state
 */
export function useEdit(): UseEditResult {
  const { state, edit, stopEdit, cancel } = useSpeechOSContext();
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditing = state.recordingState === "recording" && state.activeAction === "edit";
  const isProcessing = state.recordingState === "processing";

  const start = useCallback(async (textToEdit: string) => {
    setError(null);
    setOriginalText(textToEdit);
    try {
      // edit() returns a promise that resolves when stopEdit() is called
      await edit(textToEdit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start edit";
      setError(message);
    }
  }, [edit]);

  const stop = useCallback(async (): Promise<string> => {
    try {
      const editedResult = await stopEdit();
      setResult(editedResult);
      setError(null);
      return editedResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply edit";
      setError(message);
      throw err;
    }
  }, [stopEdit]);

  const clear = useCallback(() => {
    setOriginalText(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    start,
    stop,
    isEditing,
    isProcessing,
    originalText,
    result,
    error,
    clear,
  };
}
