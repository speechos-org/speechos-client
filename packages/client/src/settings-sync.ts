/**
 * Settings sync manager
 * Syncs user settings (language, vocabulary, snippets) with the server
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
      if (config.debug) {
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
   * Schedule a debounced sync to server
   */
  scheduleSyncToServer(): void {
    const token = getSettingsToken();
    if (!token) {
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
    if (!token || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    const config = getConfig();

    try {
      const languageSettings = getLanguageSettings();
      const vocabulary = getVocabulary();
      const snippets = getSnippets();

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
      if (config.debug) {
        console.warn("[SpeechOS] Failed to sync settings to server:", errorMessage);
      }
      events.emit("settings:syncFailed", { error: errorMessage });

      // Retry with exponential backoff
      this.scheduleRetry();
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
