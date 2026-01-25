/**
 * Tests for settings sync manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { settingsSync } from "./settings-sync.js";
import { resetMemoryCache as resetVocabularyCache } from "./stores/vocabulary-store.js";
import { resetMemoryCache as resetSnippetsCache } from "./stores/snippets-store.js";
import { resetMemoryCache as resetLanguageCache } from "./stores/language-settings.js";
import { resetMemoryCache as resetTranscriptCache } from "./stores/transcript-store.js";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock core module
vi.mock("@speechos/core", () => ({
  getConfig: vi.fn(() => ({
    host: "https://app.speechos.ai",
    debug: false,
  })),
  getSettingsToken: vi.fn(() => "mock-token"),
  clearSettingsToken: vi.fn(),
  getFetchHandler: vi.fn(() => undefined),
  events: {
    on: vi.fn(() => vi.fn()), // Return unsubscribe function
    emit: vi.fn(),
  },
}));

// Import mocked modules
import { getSettingsToken, clearSettingsToken, getFetchHandler, events } from "@speechos/core";

describe("SettingsSync", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset all store memory caches
    resetVocabularyCache();
    resetSnippetsCache();
    resetLanguageCache();
    resetTranscriptCache();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    settingsSync.destroy();
    vi.useRealTimers();
  });

  describe("init", () => {
    it("should not fetch if no settings token is configured", async () => {
      vi.mocked(getSettingsToken).mockReturnValue(undefined);

      await settingsSync.init();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch settings from server when token is configured", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          language: {
            inputLanguageCode: "es",
            outputLanguageCode: "es",
            smartFormat: true,
          },
          vocabulary: [],
          snippets: [],
          lastSyncedAt: "2024-01-01T00:00:00Z",
        }),
      });

      await settingsSync.init();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.speechos.ai/api/user-settings/",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        })
      );
    });

    it("should emit settings:loaded after loading from server", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          language: {
            inputLanguageCode: "en-US",
            outputLanguageCode: "en-US",
            smartFormat: true,
          },
          vocabulary: [],
          snippets: [],
          lastSyncedAt: "2024-01-01T00:00:00Z",
        }),
      });

      await settingsSync.init();

      expect(events.emit).toHaveBeenCalledWith("settings:loaded", undefined);
    });

    it("should sync local to server for new user (404)", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");

      // First call returns 404 (no settings on server)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second call is the PUT to sync local settings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
      });

      await settingsSync.init();

      // Should have made two calls: GET (404) and PUT
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://app.speechos.ai/api/user-settings/",
        expect.objectContaining({
          method: "PUT",
        })
      );
    });

    it("should handle token expiration (401)", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await settingsSync.init();

      expect(clearSettingsToken).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith("settings:tokenExpired", undefined);
    });

    it("should handle token expiration (403)", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await settingsSync.init();

      expect(clearSettingsToken).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith("settings:tokenExpired", undefined);
    });

    it("should emit syncFailed on network error", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await settingsSync.init();

      expect(events.emit).toHaveBeenCalledWith("settings:syncFailed", {
        error: "Network error",
      });
    });
  });

  describe("scheduleSyncToServer", () => {
    it("should debounce sync calls", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      // Schedule multiple syncs rapidly
      settingsSync.scheduleSyncToServer();
      settingsSync.scheduleSyncToServer();
      settingsSync.scheduleSyncToServer();

      // No calls yet (debounce)
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance time past debounce delay (2000ms)
      await vi.advanceTimersByTimeAsync(2000);

      // Only one call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not sync if no token is configured", async () => {
      vi.mocked(getSettingsToken).mockReturnValue(undefined);

      settingsSync.scheduleSyncToServer();
      await vi.advanceTimersByTimeAsync(2000);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("syncToServer", () => {
    it("should send current settings to server", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");

      // Set up localStorage with test data
      localStorage.setItem(
        "speechos_language_settings",
        JSON.stringify({
          inputLanguageCode: "fr",
          outputLanguageCode: "fr",
          smartFormat: false,
        })
      );
      localStorage.setItem(
        "speechos_vocabulary",
        JSON.stringify([{ id: "1", term: "test", createdAt: 123 }])
      );
      localStorage.setItem(
        "speechos_snippets",
        JSON.stringify([{ id: "2", trigger: "sig", expansion: "Signature", createdAt: 456 }])
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      settingsSync.scheduleSyncToServer();
      await vi.advanceTimersByTimeAsync(2000);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.speechos.ai/api/user-settings/",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );

      // Verify the body contains the settings
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.language.inputLanguageCode).toBe("fr");
      expect(callBody.vocabulary).toHaveLength(1);
      expect(callBody.snippets).toHaveLength(1);
    });

    it("should emit settings:synced on success", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      settingsSync.scheduleSyncToServer();
      await vi.advanceTimersByTimeAsync(2000);

      expect(events.emit).toHaveBeenCalledWith("settings:synced", undefined);
    });

    it("should handle token expiration during sync", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      settingsSync.scheduleSyncToServer();
      await vi.advanceTimersByTimeAsync(2000);

      expect(clearSettingsToken).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith("settings:tokenExpired", undefined);
    });

    it("should retry on failure with exponential backoff", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");

      // All 4 calls fail (1 initial + 3 retries)
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      settingsSync.scheduleSyncToServer();

      // Initial debounce (2s)
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // First retry (2s delay, retryCount=1)
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second retry (4s delay, retryCount=2)
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Third retry (8s delay, retryCount=3)
      await vi.advanceTimersByTimeAsync(8000);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // No more retries after max (3) is reached
      await vi.advanceTimersByTimeAsync(16000);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe("isEnabled", () => {
    it("should return true when token is configured", () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      expect(settingsSync.isEnabled()).toBe(true);
    });

    it("should return false when no token is configured", () => {
      vi.mocked(getSettingsToken).mockReturnValue(undefined);
      expect(settingsSync.isEnabled()).toBe(false);
    });
  });

  describe("destroy", () => {
    it("should cancel pending sync timer", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      settingsSync.scheduleSyncToServer();

      // Destroy before debounce completes
      settingsSync.destroy();

      await vi.advanceTimersByTimeAsync(2000);

      // No call should have been made
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("custom fetchHandler", () => {
    it("should use custom fetchHandler when configured", async () => {
      const mockFetchHandler = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          language: {
            inputLanguageCode: "en-US",
            outputLanguageCode: "en-US",
            smartFormat: true,
          },
          vocabulary: [],
          snippets: [],
          history: [],
          lastSyncedAt: "2024-01-01T00:00:00Z",
        }),
      });

      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      vi.mocked(getFetchHandler).mockReturnValue(mockFetchHandler);

      await settingsSync.init();

      // Custom fetchHandler should be called
      expect(mockFetchHandler).toHaveBeenCalledWith(
        "https://app.speechos.ai/api/user-settings/",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        })
      );

      // Native fetch should NOT be called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fall back to native fetch when fetchHandler not configured", async () => {
      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      vi.mocked(getFetchHandler).mockReturnValue(undefined);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          language: {
            inputLanguageCode: "en-US",
            outputLanguageCode: "en-US",
            smartFormat: true,
          },
          vocabulary: [],
          snippets: [],
          history: [],
          lastSyncedAt: "2024-01-01T00:00:00Z",
        }),
      });

      await settingsSync.init();

      // Native fetch should be called
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should use custom fetchHandler for PUT requests (syncToServer)", async () => {
      const mockFetchHandler = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      vi.mocked(getSettingsToken).mockReturnValue("mock-token");
      vi.mocked(getFetchHandler).mockReturnValue(mockFetchHandler);

      settingsSync.scheduleSyncToServer();
      await vi.advanceTimersByTimeAsync(2000);

      // Custom fetchHandler should be called with PUT
      expect(mockFetchHandler).toHaveBeenCalledWith(
        "https://app.speechos.ai/api/user-settings/",
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );

      // Native fetch should NOT be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
