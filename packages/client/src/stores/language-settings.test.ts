/**
 * Tests for language settings store
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  languageSettings,
  getLanguageSettings,
  setLanguageSettings,
  getInputLanguageCode,
  setInputLanguageCode,
  getOutputLanguageCode,
  setOutputLanguageCode,
  getSmartFormatEnabled,
  setSmartFormatEnabled,
  resetLanguageSettings,
  resetMemoryCache,
  type LanguageSettings,
} from "./language-settings.js";

describe("LanguageSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMemoryCache();
    vi.clearAllMocks();
  });

  describe("default values", () => {
    it("should return default settings when nothing is stored", () => {
      const settings = getLanguageSettings();
      expect(settings.inputLanguageCode).toBe("en-US");
      expect(settings.outputLanguageCode).toBe("en-US");
      expect(settings.smartFormat).toBe(true);
    });

    it("should return en-US as default input language", () => {
      expect(getInputLanguageCode()).toBe("en-US");
    });

    it("should return en-US as default output language", () => {
      expect(getOutputLanguageCode()).toBe("en-US");
    });

    it("should return true as default smart format", () => {
      expect(getSmartFormatEnabled()).toBe(true);
    });
  });

  describe("setInputLanguageCode", () => {
    it("should update input language code", () => {
      setInputLanguageCode("fr");
      expect(getInputLanguageCode()).toBe("fr");
    });

    it("should persist to localStorage", () => {
      setInputLanguageCode("de");
      const stored = JSON.parse(localStorage.getItem("speechos_language_settings")!);
      expect(stored.inputLanguageCode).toBe("de");
    });
  });

  describe("setOutputLanguageCode", () => {
    it("should update output language code", () => {
      setOutputLanguageCode("es");
      expect(getOutputLanguageCode()).toBe("es");
    });

    it("should persist to localStorage", () => {
      setOutputLanguageCode("ja");
      const stored = JSON.parse(localStorage.getItem("speechos_language_settings")!);
      expect(stored.outputLanguageCode).toBe("ja");
    });
  });

  describe("setSmartFormatEnabled", () => {
    it("should update smart format setting", () => {
      setSmartFormatEnabled(false);
      expect(getSmartFormatEnabled()).toBe(false);
    });

    it("should persist to localStorage", () => {
      setSmartFormatEnabled(false);
      const stored = JSON.parse(localStorage.getItem("speechos_language_settings")!);
      expect(stored.smartFormat).toBe(false);
    });
  });

  describe("resetLanguageSettings", () => {
    it("should reset to defaults", () => {
      setInputLanguageCode("fr");
      setOutputLanguageCode("de");
      setSmartFormatEnabled(false);

      resetLanguageSettings();

      expect(getInputLanguageCode()).toBe("en-US");
      expect(getOutputLanguageCode()).toBe("en-US");
      expect(getSmartFormatEnabled()).toBe(true);
    });

    it("should clear localStorage", () => {
      setInputLanguageCode("fr");
      resetLanguageSettings();
      expect(localStorage.getItem("speechos_language_settings")).toBeNull();
    });
  });

  describe("memory cache behavior (server sync)", () => {
    it("setLanguageSettings should populate memory cache", () => {
      const serverSettings = {
        inputLanguageCode: "de",
        outputLanguageCode: "fi",
        smartFormat: false,
      };

      setLanguageSettings(serverSettings);

      expect(getInputLanguageCode()).toBe("de");
      expect(getOutputLanguageCode()).toBe("fi");
      expect(getSmartFormatEnabled()).toBe(false);
    });

    it("memory cache takes precedence over localStorage", () => {
      // First, put something in localStorage
      localStorage.setItem(
        "speechos_language_settings",
        JSON.stringify({
          inputLanguageCode: "fr",
          outputLanguageCode: "fr",
          smartFormat: true,
        })
      );

      // Then set server data via setLanguageSettings
      setLanguageSettings({
        inputLanguageCode: "de",
        outputLanguageCode: "fi",
        smartFormat: false,
      });

      // getLanguageSettings should return server data, not localStorage
      expect(getInputLanguageCode()).toBe("de");
      expect(getOutputLanguageCode()).toBe("fi");
      expect(getSmartFormatEnabled()).toBe(false);
    });

    it("setInputLanguageCode updates memory cache when set", () => {
      // Set initial server data
      setLanguageSettings({
        inputLanguageCode: "de",
        outputLanguageCode: "fi",
        smartFormat: false,
      });

      // Update via setter
      setInputLanguageCode("ja");

      // Should update only input, preserve others
      expect(getInputLanguageCode()).toBe("ja");
      expect(getOutputLanguageCode()).toBe("fi");
      expect(getSmartFormatEnabled()).toBe(false);
    });

    it("setSmartFormatEnabled updates memory cache when set", () => {
      // Set initial server data
      setLanguageSettings({
        inputLanguageCode: "de",
        outputLanguageCode: "fi",
        smartFormat: false,
      });

      // Update via setter
      setSmartFormatEnabled(true);

      // Should update only smartFormat, preserve others
      expect(getInputLanguageCode()).toBe("de");
      expect(getOutputLanguageCode()).toBe("fi");
      expect(getSmartFormatEnabled()).toBe(true);
    });

    it("resetMemoryCache allows localStorage to be used again", () => {
      // Set server data
      setLanguageSettings({
        inputLanguageCode: "de",
        outputLanguageCode: "fi",
        smartFormat: false,
      });

      // Put different data in localStorage
      localStorage.setItem(
        "speechos_language_settings",
        JSON.stringify({
          inputLanguageCode: "ja",
          outputLanguageCode: "ko",
          smartFormat: true,
        })
      );

      // Memory cache still takes precedence
      expect(getInputLanguageCode()).toBe("de");

      // Reset memory cache
      resetMemoryCache();

      // Now localStorage should be used
      expect(getInputLanguageCode()).toBe("ja");
      expect(getOutputLanguageCode()).toBe("ko");
      expect(getSmartFormatEnabled()).toBe(true);
    });
  });

  describe("localStorage error handling", () => {
    it("should handle localStorage.setItem failure gracefully", () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      // Should not throw - memory cache still updated
      expect(() => setInputLanguageCode("fr")).not.toThrow();
      // Memory cache should still work
      expect(getInputLanguageCode()).toBe("fr");

      setItemSpy.mockRestore();
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("speechos_language_settings", "invalid json{");

      // Should return defaults
      const settings = getLanguageSettings();
      expect(settings.inputLanguageCode).toBe("en-US");
    });
  });

  describe("languageSettings object", () => {
    it("should export all functions", () => {
      expect(languageSettings.getLanguageSettings).toBe(getLanguageSettings);
      expect(languageSettings.setLanguageSettings).toBe(setLanguageSettings);
      expect(languageSettings.getInputLanguageCode).toBe(getInputLanguageCode);
      expect(languageSettings.setInputLanguageCode).toBe(setInputLanguageCode);
      expect(languageSettings.getSmartFormatEnabled).toBe(getSmartFormatEnabled);
      expect(languageSettings.setSmartFormatEnabled).toBe(setSmartFormatEnabled);
      expect(languageSettings.resetLanguageSettings).toBe(resetLanguageSettings);
      expect(languageSettings.resetMemoryCache).toBe(resetMemoryCache);
    });
  });
});
