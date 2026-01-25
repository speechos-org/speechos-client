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
 * In-memory cache for transcripts. When server sync is enabled, this is the
 * source of truth. localStorage is only used when server sync is disabled.
 */
let memoryCache: TranscriptEntry[] | null = null;

/**
 * Generate a unique ID for transcript entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all transcripts. Prefers in-memory cache (from server sync),
 * then falls back to localStorage.
 */
export function getTranscripts(): TranscriptEntry[] {
  // If we have in-memory data (from server sync), use it
  if (memoryCache !== null) {
    return [...memoryCache].sort((a, b) => b.timestamp - a.timestamp);
  }

  // Fall back to localStorage (when server sync is disabled)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored) as TranscriptEntry[];
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/**
 * Set transcripts directly (used by settings sync from server data).
 * Server data is the source of truth - just update memory cache.
 */
export function setTranscripts(entries: TranscriptEntry[]): void {
  memoryCache = entries.slice(0, MAX_ENTRIES);
}

/**
 * Reset memory cache (for testing only)
 */
export function resetMemoryCache(): void {
  memoryCache = null;
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

  // Update memory cache (always)
  memoryCache = pruned;

  // Try to persist to localStorage (for when server sync is disabled)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Quota exceeded - memory cache is still updated
  }

  // Emit settings change event to trigger sync
  events.emit("settings:changed", { setting: "history" });

  return entry;
}

/**
 * Clear all transcript history
 */
export function clearTranscripts(): void {
  memoryCache = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
  events.emit("settings:changed", { setting: "history" });
}

/**
 * Delete a single transcript by ID
 */
export function deleteTranscript(id: string): void {
  const entries = getTranscripts().filter((e) => e.id !== id);
  memoryCache = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Silently fail
  }
  events.emit("settings:changed", { setting: "history" });
}

export const transcriptStore: {
  getTranscripts: typeof getTranscripts;
  setTranscripts: typeof setTranscripts;
  saveTranscript: typeof saveTranscript;
  clearTranscripts: typeof clearTranscripts;
  deleteTranscript: typeof deleteTranscript;
} = {
  getTranscripts,
  setTranscripts,
  saveTranscript,
  clearTranscripts,
  deleteTranscript,
};
