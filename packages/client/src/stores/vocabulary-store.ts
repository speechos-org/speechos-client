/**
 * Vocabulary store
 * Persists custom vocabulary terms to localStorage for improved transcription accuracy
 */

import { events } from "@speechos/core";

const STORAGE_KEY = "speechos_vocabulary";
const MAX_TERMS = 50;
const MAX_TERM_LENGTH = 50;

export interface VocabularyTerm {
  id: string;
  /** The term or phrase to recognize (max 50 chars) */
  term: string;
  /** Timestamp when term was added */
  createdAt: number;
}

export interface VocabularyValidationError {
  field: "term" | "limit";
  message: string;
}

export type AddTermResult =
  | { success: true; term: VocabularyTerm }
  | { success: false; error: VocabularyValidationError };

/**
 * Generate a unique ID for vocabulary entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get all vocabulary terms from localStorage
 */
export function getVocabulary(): VocabularyTerm[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const entries = JSON.parse(stored) as VocabularyTerm[];
    // Return newest first
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Save vocabulary to localStorage
 */
function saveVocabulary(terms: VocabularyTerm[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * Validate a term
 */
function validateTerm(
  term: string,
  existingTerms: VocabularyTerm[]
): VocabularyValidationError | null {
  const trimmed = term.trim();

  if (!trimmed) {
    return { field: "term", message: "Term is required." };
  }

  if (trimmed.length > MAX_TERM_LENGTH) {
    return {
      field: "term",
      message: `Term must be ${MAX_TERM_LENGTH} characters or less.`,
    };
  }

  const duplicate = existingTerms.find(
    (t) => t.term.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return {
      field: "term",
      message: "This term is already in your vocabulary.",
    };
  }

  return null;
}

/**
 * Add a new vocabulary term
 */
export function addTerm(term: string): AddTermResult {
  const terms = getVocabulary();

  // Check limit
  if (terms.length >= MAX_TERMS) {
    return {
      success: false,
      error: {
        field: "limit",
        message: `You've reached the ${MAX_TERMS} term limit. Remove unused terms to add more.`,
      },
    };
  }

  // Validate term
  const termError = validateTerm(term, terms);
  if (termError) {
    return { success: false, error: termError };
  }

  const vocabularyTerm: VocabularyTerm = {
    id: generateId(),
    term: term.trim(),
    createdAt: Date.now(),
  };

  terms.unshift(vocabularyTerm);
  saveVocabulary(terms);
  events.emit("settings:changed", { setting: "vocabulary" });

  return { success: true, term: vocabularyTerm };
}

/**
 * Delete a term by ID
 */
export function deleteTerm(id: string): void {
  const terms = getVocabulary().filter((t) => t.id !== id);
  saveVocabulary(terms);
  events.emit("settings:changed", { setting: "vocabulary" });
}

/**
 * Clear all vocabulary
 */
export function clearVocabulary(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    events.emit("settings:changed", { setting: "vocabulary" });
  } catch {
    // Silently fail
  }
}

/**
 * Get vocabulary count info
 */
export function getVocabularyCount(): { current: number; max: number } {
  return { current: getVocabulary().length, max: MAX_TERMS };
}

/**
 * Check if at term limit
 */
export function isAtVocabularyLimit(): boolean {
  return getVocabulary().length >= MAX_TERMS;
}

export const vocabularyStore: {
  getVocabulary: typeof getVocabulary;
  addTerm: typeof addTerm;
  deleteTerm: typeof deleteTerm;
  clearVocabulary: typeof clearVocabulary;
  getVocabularyCount: typeof getVocabularyCount;
  isAtVocabularyLimit: typeof isAtVocabularyLimit;
  MAX_TERMS: typeof MAX_TERMS;
  MAX_TERM_LENGTH: typeof MAX_TERM_LENGTH;
} = {
  getVocabulary,
  addTerm,
  deleteTerm,
  clearVocabulary,
  getVocabularyCount,
  isAtVocabularyLimit,
  MAX_TERMS,
  MAX_TERM_LENGTH,
};
