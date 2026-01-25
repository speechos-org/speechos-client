/**
 * Settings sync manager
 * Syncs user settings (language, vocabulary, snippets, history) with the server
 */

import {
  getConfig,
  getSettingsToken,
  clearSettingsToken,
  getFetchHandler,
  events,
  type FetchOptions,
  type FetchResponse,
} from "@speechos/core";
import {
  getLanguageSettings,
  setLanguageSettings,
} from "./stores/language-settings.js";
import {
  getVocabulary,
  setVocabulary,
  type VocabularyTerm,
} from "./stores/vocabulary-store.js";
import { getSnippets, setSnippets, type Snippet } from "./stores/snippets-store.js";
import { getTranscripts, setTranscripts } from "./stores/transcript-store.js";

// Sync debounce delay in milliseconds
const SYNC_DEBOUNCE_MS = 2000;

// Maximum retry attempts
const MAX_RETRIES = 3;

// Base retry delay in milliseconds (exponential backoff)
const BASE_RETRY_DELAY_MS = 2000;


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
   * Make a fetch request using custom fetchHandler if configured, otherwise native fetch.
   * This allows the Chrome extension to route fetch traffic through the service worker
   * to bypass page CSP restrictions.
   */
  private async doFetch(url: string, options: FetchOptions): Promise<FetchResponse> {
    const config = getConfig();
    const customHandler = getFetchHandler();

    if (customHandler) {
      if (config.debug) {
        console.log("[SpeechOS] Using custom fetch handler (extension proxy)", options.method, url);
      }
      return customHandler(url, options);
    }

    if (config.debug) {
      console.log("[SpeechOS] Using native fetch", options.method, url);
    }
    // Use native fetch and wrap response to match FetchResponse interface
    const response = await fetch(url, options);
    return response;
  }

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
      const response = await this.doFetch(`${config.host}/api/user-settings/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (config.debug) {
        console.log("[SpeechOS] Settings fetch response:", response.status, response.ok ? "OK" : response.statusText);
      }

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

      const serverSettings = (await response.json()) as ServerSettings;

      if (config.debug) {
        console.log("[SpeechOS] Settings received from server:", {
          language: serverSettings.language,
          vocabularyCount: serverSettings.vocabulary?.length ?? 0,
          snippetsCount: serverSettings.snippets?.length ?? 0,
          historyCount: serverSettings.history?.length ?? 0,
          lastSyncedAt: serverSettings.lastSyncedAt,
        });
        if (serverSettings.history?.length > 0) {
          console.log("[SpeechOS] History entries:", serverSettings.history);
        }
      }

      this.mergeSettings(serverSettings);
      events.emit("settings:loaded", undefined);

      if (config.debug) {
        console.log("[SpeechOS] Settings merged and loaded");
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
   * Merge server settings with local (server wins).
   * Uses store setters to update memory cache - localStorage is a fallback.
   */
  private mergeSettings(serverSettings: ServerSettings): void {
    // Language settings - server wins
    if (serverSettings.language) {
      setLanguageSettings(serverSettings.language);
    }

    // Vocabulary - server wins
    if (serverSettings.vocabulary) {
      setVocabulary(serverSettings.vocabulary);
    }

    // Snippets - server wins
    if (serverSettings.snippets) {
      setSnippets(serverSettings.snippets);
    }

    // History - server wins
    if (serverSettings.history) {
      setTranscripts(serverSettings.history);
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

      const response = await this.doFetch(`${config.host}/api/user-settings/`, {
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
