/**
 * Transcript history store
 * Persists transcripts to localStorage for viewing in the settings modal
 */

import { events, type CommandDefinition, type CommandResult } from "@speechos/core";

export type TranscriptAction = "dictate" | "edit" | "command";

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
  action: TranscriptAction;
  /** Original text before edit (only for edit actions) */
  originalText?: string;
  /** The raw transcript of what the user said (for command actions) */
  inputText?: string;
  /** The matched command result (for command actions) */
  commandResult?: CommandResult | null;
  /** The command definitions that were available (for command actions) */
  commandConfig?: CommandDefinition[];
}

const STORAGE_KEY = "speechos_transcripts";
const MAX_ENTRIES = 50;

/**
 * Generate a unique ID for transcript entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all transcripts from localStorage
 */
export function getTranscripts(): TranscriptEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored) as TranscriptEntry[];
    // Return newest first
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/**
 * Options for saving a command transcript
 */
export interface SaveCommandOptions {
  /** The raw transcript of what the user said */
  inputText?: string;
  /** The matched command result */
  commandResult?: CommandResult | null;
  /** The command definitions that were available */
  commandConfig?: CommandDefinition[];
}

/**
 * Save a new transcript entry
 */
export function saveTranscript(
  text: string,
  action: TranscriptAction,
  originalTextOrOptions?: string | SaveCommandOptions
): TranscriptEntry {
  const entry: TranscriptEntry = {
    id: generateId(),
    text,
    timestamp: Date.now(),
    action,
  };

  // Handle edit action with originalText string
  if (action === "edit" && typeof originalTextOrOptions === "string") {
    entry.originalText = originalTextOrOptions;
  }

  // Handle command action with options object
  if (action === "command" && typeof originalTextOrOptions === "object") {
    const options = originalTextOrOptions as SaveCommandOptions;
    if (options.inputText !== undefined) entry.inputText = options.inputText;
    if (options.commandResult !== undefined) entry.commandResult = options.commandResult;
    if (options.commandConfig !== undefined) entry.commandConfig = options.commandConfig;
  }

  const entries = getTranscripts();
  entries.unshift(entry);

  // Prune to max entries
  const pruned = entries.slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    // Emit settings change event to trigger sync
    events.emit("settings:changed", { setting: "history" });
  } catch {
    // localStorage full or unavailable - silently fail
  }

  return entry;
}

/**
 * Clear all transcript history
 */
export function clearTranscripts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Emit settings change event to trigger sync
    events.emit("settings:changed", { setting: "history" });
  } catch {
    // Silently fail
  }
}

/**
 * Delete a single transcript by ID
 */
export function deleteTranscript(id: string): void {
  const entries = getTranscripts().filter((e) => e.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    // Emit settings change event to trigger sync
    events.emit("settings:changed", { setting: "history" });
  } catch {
    // Silently fail
  }
}

export const transcriptStore: {
  getTranscripts: typeof getTranscripts;
  saveTranscript: typeof saveTranscript;
  clearTranscripts: typeof clearTranscripts;
  deleteTranscript: typeof deleteTranscript;
} = {
  getTranscripts: getTranscripts,
  saveTranscript: saveTranscript,
  clearTranscripts: clearTranscripts,
  deleteTranscript: deleteTranscript,
};
