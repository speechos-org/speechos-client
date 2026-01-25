/**
 * Settings sync manager
 * Syncs user settings (language, vocabulary, snippets, history) with the server
 */

import {
  getConfig,
  getSettingsToken,
  clearSettingsToken,
  events,
} from "@speechos/core";
import {
  getLanguageSettings,
  setInputLanguageCode,
  setOutputLanguageCode,
  setSmartFormatEnabled,
} from "./stores/language-settings.js";
import {
  getVocabulary,
  type VocabularyTerm,
} from "./stores/vocabulary-store.js";
import { getSnippets, type Snippet } from "./stores/snippets-store.js";
import { getTranscripts } from "./stores/transcript-store.js";

// Sync debounce delay in milliseconds
const SYNC_DEBOUNCE_MS = 2000;

// Maximum retry attempts
const MAX_RETRIES = 3;

// Base retry delay in milliseconds (exponential backoff)
const BASE_RETRY_DELAY_MS = 2000;

// localStorage keys for storing synced data (used to detect local changes)
const VOCABULARY_STORAGE_KEY = "speechos_vocabulary";
const SNIPPETS_STORAGE_KEY = "speechos_snippets";
const LANGUAGE_STORAGE_KEY = "speechos_language_settings";
const HISTORY_STORAGE_KEY = "speechos_transcripts";

/**
 * Synced history entry (excludes commandConfig to reduce payload size)
 */
interface SyncedHistoryEntry {
  id: string;
  text: string;
  timestamp: number;
  action: "dictate" | "edit" | "command";
  originalText?: string;
  inputText?: string;
  commandResult?: { name: string; arguments: Record<string, unknown> } | null;
}

/**
 * Server settings response format
 */
interface ServerSettings {
  language: {
    inputLanguageCode: string;
    outputLanguageCode: string;
    smartFormat: boolean;
  };
  vocabulary: VocabularyTerm[];
  snippets: Snippet[];
  history: SyncedHistoryEntry[];
  lastSyncedAt: string;
}

/**
 * Settings sync manager singleton
 */
class SettingsSync {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private retryCount = 0;
  private isInitialized = false;
  private unsubscribe: (() => void) | null = null;
  /** When true, sync is disabled due to CSP or network restrictions */
  private syncDisabled = false;

  /**
   * Initialize the settings sync manager
   * If a settingsToken is configured, loads settings from server
   */
  async init(): Promise<void> {
    const token = getSettingsToken();
    if (!token) {
      // No token configured, sync is disabled
      return;
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Subscribe to settings changes
    this.unsubscribe = events.on("settings:changed", () => {
      this.scheduleSyncToServer();
    });

    // Load settings from server
    await this.loadFromServer();
  }

  /**
   * Stop the sync manager and clean up
   */
  destroy(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
    this.retryCount = 0;
    this.syncDisabled = false;
  }

  /**
   * Load settings from the server and merge with local
   */
  async loadFromServer(): Promise<void> {
    const token = getSettingsToken();
    if (!token) {
      return;
    }

    const config = getConfig();

    try {
      const response = await fetch(`${config.host}/api/user-settings/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        // No settings on server yet (new user) - sync local settings to server
        if (config.debug) {
          console.log("[SpeechOS] No server settings found, syncing local to server");
        }
        await this.syncToServer();
        return;
      }

      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        this.handleTokenExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const serverSettings: ServerSettings = await response.json();
      this.mergeSettings(serverSettings);
      events.emit("settings:loaded", undefined);

      if (config.debug) {
        console.log("[SpeechOS] Settings loaded from server");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if this is a CSP/network restriction - disable sync permanently for this session
      if (this.isNetworkRestrictionError(error)) {
        this.syncDisabled = true;
        if (config.debug) {
          console.log("[SpeechOS] Settings sync disabled (CSP/network restriction), using localStorage only");
        }
      } else if (config.debug) {
        console.warn("[SpeechOS] Failed to load settings from server:", errorMessage);
      }

      events.emit("settings:syncFailed", { error: errorMessage });
      // Continue with local settings on error
    }
  }

  /**
   * Merge server settings with local (server wins, except deviceId)
   */
  private mergeSettings(serverSettings: ServerSettings): void {
    // Language settings - server wins
    if (serverSettings.language) {
      const lang = serverSettings.language;
      // Directly update localStorage to avoid triggering sync events
      this.updateLanguageSettingsDirectly(lang);
    }

    // Vocabulary - server wins
    if (serverSettings.vocabulary) {
      this.updateVocabularyDirectly(serverSettings.vocabulary);
    }

    // Snippets - server wins
    if (serverSettings.snippets) {
      this.updateSnippetsDirectly(serverSettings.snippets);
    }

    // History - server wins
    if (serverSettings.history) {
      this.updateHistoryDirectly(serverSettings.history);
    }
  }

  /**
   * Update language settings directly in localStorage without triggering events
   */
  private updateLanguageSettingsDirectly(lang: ServerSettings["language"]): void {
    try {
      const settings = {
        inputLanguageCode: lang.inputLanguageCode,
        outputLanguageCode: lang.outputLanguageCode,
        smartFormat: lang.smartFormat,
      };
      localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Update vocabulary directly in localStorage without triggering events
   */
  private updateVocabularyDirectly(vocabulary: VocabularyTerm[]): void {
    try {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(vocabulary));
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Update snippets directly in localStorage without triggering events
   */
  private updateSnippetsDirectly(snippets: Snippet[]): void {
    try {
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets));
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Update history directly in localStorage without triggering events
   */
  private updateHistoryDirectly(history: SyncedHistoryEntry[]): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Schedule a debounced sync to server
   */
  scheduleSyncToServer(): void {
    const token = getSettingsToken();
    if (!token || this.syncDisabled) {
      return;
    }

    // Cancel any pending sync
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    // Schedule new sync
    this.syncTimer = setTimeout(() => {
      this.syncToServer();
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * Sync current settings to server
   */
  async syncToServer(): Promise<void> {
    const token = getSettingsToken();
    if (!token || this.isSyncing || this.syncDisabled) {
      return;
    }

    this.isSyncing = true;
    const config = getConfig();

    try {
      const languageSettings = getLanguageSettings();
      const vocabulary = getVocabulary();
      const snippets = getSnippets();
      const transcripts = getTranscripts();

      const payload = {
        language: {
          inputLanguageCode: languageSettings.inputLanguageCode,
          outputLanguageCode: languageSettings.outputLanguageCode,
          smartFormat: languageSettings.smartFormat,
        },
        vocabulary: vocabulary.map((v) => ({
          id: v.id,
          term: v.term,
          createdAt: v.createdAt,
        })),
        snippets: snippets.map((s) => ({
          id: s.id,
          trigger: s.trigger,
          expansion: s.expansion,
          createdAt: s.createdAt,
        })),
        // Sync history (excluding commandConfig to reduce payload size)
        history: transcripts.map((t) => ({
          id: t.id,
          text: t.text,
          timestamp: t.timestamp,
          action: t.action,
          ...(t.originalText && { originalText: t.originalText }),
          ...(t.inputText && { inputText: t.inputText }),
          ...(t.commandResult !== undefined && { commandResult: t.commandResult }),
        })),
      };

      const response = await fetch(`${config.host}/api/user-settings/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        this.handleTokenExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Reset retry count on success
      this.retryCount = 0;
      events.emit("settings:synced", undefined);

      if (config.debug) {
        console.log("[SpeechOS] Settings synced to server");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Check if this is a CSP/network restriction - disable sync permanently for this session
      if (this.isNetworkRestrictionError(error)) {
        this.syncDisabled = true;
        if (config.debug) {
          console.log("[SpeechOS] Settings sync disabled (CSP/network restriction), using localStorage only");
        }
        events.emit("settings:syncFailed", { error: errorMessage });
        // Don't retry - CSP errors are permanent
      } else {
        if (config.debug) {
          console.warn("[SpeechOS] Failed to sync settings to server:", errorMessage);
        }
        events.emit("settings:syncFailed", { error: errorMessage });

        // Retry with exponential backoff (only for transient errors)
        this.scheduleRetry();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (this.retryCount >= MAX_RETRIES) {
      const config = getConfig();
      if (config.debug) {
        console.warn("[SpeechOS] Max retries reached, giving up sync");
      }
      this.retryCount = 0;
      return;
    }

    this.retryCount++;
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1);

    this.syncTimer = setTimeout(() => {
      this.syncToServer();
    }, delay);
  }

  /**
   * Check if an error is a CSP or network restriction error
   * These errors are permanent and shouldn't trigger retries
   */
  private isNetworkRestrictionError(error: unknown): boolean {
    if (error instanceof TypeError) {
      const message = error.message.toLowerCase();
      // Common CSP/network error messages
      return (
        message.includes("failed to fetch") ||
        message.includes("network request failed") ||
        message.includes("content security policy") ||
        message.includes("csp") ||
        message.includes("blocked")
      );
    }
    return false;
  }

  /**
   * Handle token expiration
   */
  private handleTokenExpired(): void {
    clearSettingsToken();
    events.emit("settings:tokenExpired", undefined);

    const config = getConfig();
    if (config.debug) {
      console.warn("[SpeechOS] Settings token expired");
    }
  }

  /**
   * Check if sync is enabled (token is configured)
   */
  isEnabled(): boolean {
    return !!getSettingsToken();
  }
}

// Singleton instance
export const settingsSync = new SettingsSync();
