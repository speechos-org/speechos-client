/**
 * Snippets store
 * Persists text snippets to localStorage for voice-triggered text expansion
 */

import { events } from "@speechos/core";

const STORAGE_KEY = "speechos_snippets";
const MAX_SNIPPETS = 25;
const MAX_TRIGGER_LENGTH = 30;
const MAX_EXPANSION_LENGTH = 300;

/**
 * In-memory cache for snippets. When server sync is enabled, this is the
 * source of truth. localStorage is only used when server sync is disabled.
 */
let memoryCache: Snippet[] | null = null;

export interface Snippet {
  id: string;
  /** Trigger phrase spoken to activate the snippet (max 30 chars) */
  trigger: string;
  /** Text that replaces the trigger phrase (max 300 chars) */
  expansion: string;
  /** Timestamp when snippet was created */
  createdAt: number;
}

export interface SnippetValidationError {
  field: "trigger" | "expansion" | "limit";
  message: string;
}

export type AddSnippetResult =
  | { success: true; snippet: Snippet }
  | { success: false; error: SnippetValidationError };

/**
 * Generate a unique ID for snippet entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all snippets. Prefers in-memory cache (from server sync),
 * then falls back to localStorage.
 */
export function getSnippets(): Snippet[] {
  if (memoryCache !== null) {
    return [...memoryCache].sort((a, b) => b.createdAt - a.createdAt);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored) as Snippet[];
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Set snippets directly (used by settings sync from server data).
 */
export function setSnippets(snippets: Snippet[]): void {
  memoryCache = snippets.slice(0, MAX_SNIPPETS);
}

/**
 * Reset memory cache (for testing only)
 */
export function resetMemoryCache(): void {
  memoryCache = null;
}

/**
 * Save snippets (updates memory cache and tries localStorage)
 */
function saveSnippets(snippets: Snippet[]): void {
  memoryCache = snippets;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // localStorage full or unavailable - memory cache still updated
  }
}

/**
 * Validate a trigger phrase
 */
function validateTrigger(
  trigger: string,
  existingSnippets: Snippet[],
  excludeId?: string
): SnippetValidationError | null {
  const trimmed = trigger.trim();

  if (!trimmed) {
    return { field: "trigger", message: "Trigger phrase is required." };
  }

  if (trimmed.length > MAX_TRIGGER_LENGTH) {
    return {
      field: "trigger",
      message: `Trigger must be ${MAX_TRIGGER_LENGTH} characters or less.`,
    };
  }

  const duplicate = existingSnippets.find(
    (s) =>
      s.trigger.toLowerCase() === trimmed.toLowerCase() && s.id !== excludeId
  );
  if (duplicate) {
    return { field: "trigger", message: "This trigger phrase already exists." };
  }

  return null;
}

/**
 * Validate expansion text
 */
function validateExpansion(expansion: string): SnippetValidationError | null {
  const trimmed = expansion.trim();

  if (!trimmed) {
    return { field: "expansion", message: "Expansion text is required." };
  }

  if (trimmed.length > MAX_EXPANSION_LENGTH) {
    return {
      field: "expansion",
      message: `Expansion must be ${MAX_EXPANSION_LENGTH} characters or less.`,
    };
  }

  return null;
}

/**
 * Add a new snippet
 */
export function addSnippet(
  trigger: string,
  expansion: string
): AddSnippetResult {
  const snippets = getSnippets();

  // Check limit
  if (snippets.length >= MAX_SNIPPETS) {
    return {
      success: false,
      error: {
        field: "limit",
        message: `You've reached the ${MAX_SNIPPETS} snippet limit. Delete unused snippets to add more.`,
      },
    };
  }

  // Validate trigger
  const triggerError = validateTrigger(trigger, snippets);
  if (triggerError) {
    return { success: false, error: triggerError };
  }

  // Validate expansion
  const expansionError = validateExpansion(expansion);
  if (expansionError) {
    return { success: false, error: expansionError };
  }

  const snippet: Snippet = {
    id: generateId(),
    trigger: trigger.trim(),
    expansion: expansion.trim(),
    createdAt: Date.now(),
  };

  snippets.unshift(snippet);
  saveSnippets(snippets);
  events.emit("settings:changed", { setting: "snippets" });

  return { success: true, snippet };
}

/**
 * Update an existing snippet
 */
export function updateSnippet(
  id: string,
  trigger: string,
  expansion: string
): AddSnippetResult {
  const snippets = getSnippets();
  const index = snippets.findIndex((s) => s.id === id);

  if (index === -1) {
    return {
      success: false,
      error: { field: "trigger", message: "Snippet not found." },
    };
  }

  // Validate trigger (exclude current snippet from duplicate check)
  const triggerError = validateTrigger(trigger, snippets, id);
  if (triggerError) {
    return { success: false, error: triggerError };
  }

  // Validate expansion
  const expansionError = validateExpansion(expansion);
  if (expansionError) {
    return { success: false, error: expansionError };
  }

  snippets[index] = {
    ...snippets[index],
    trigger: trigger.trim(),
    expansion: expansion.trim(),
  };

  saveSnippets(snippets);
  events.emit("settings:changed", { setting: "snippets" });

  return { success: true, snippet: snippets[index] };
}

/**
 * Delete a snippet by ID
 */
export function deleteSnippet(id: string): void {
  const snippets = getSnippets().filter((s) => s.id !== id);
  saveSnippets(snippets);
  events.emit("settings:changed", { setting: "snippets" });
}

/**
 * Clear all snippets
 */
export function clearSnippets(): void {
  memoryCache = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
  events.emit("settings:changed", { setting: "snippets" });
}

/**
 * Get snippet count info
 */
export function getSnippetCount(): { current: number; max: number } {
  return { current: getSnippets().length, max: MAX_SNIPPETS };
}

/**
 * Check if at snippet limit
 */
export function isAtSnippetLimit(): boolean {
  return getSnippets().length >= MAX_SNIPPETS;
}

export const snippetsStore: {
  getSnippets: typeof getSnippets;
  setSnippets: typeof setSnippets;
  addSnippet: typeof addSnippet;
  updateSnippet: typeof updateSnippet;
  deleteSnippet: typeof deleteSnippet;
  clearSnippets: typeof clearSnippets;
  getSnippetCount: typeof getSnippetCount;
  isAtSnippetLimit: typeof isAtSnippetLimit;
  resetMemoryCache: typeof resetMemoryCache;
  MAX_SNIPPETS: typeof MAX_SNIPPETS;
  MAX_TRIGGER_LENGTH: typeof MAX_TRIGGER_LENGTH;
  MAX_EXPANSION_LENGTH: typeof MAX_EXPANSION_LENGTH;
} = {
  getSnippets,
  setSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  clearSnippets,
  getSnippetCount,
  isAtSnippetLimit,
  resetMemoryCache,
  MAX_SNIPPETS,
  MAX_TRIGGER_LENGTH,
  MAX_EXPANSION_LENGTH,
};
