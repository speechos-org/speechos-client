import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConfig,
  setConfig,
  resetConfig,
  updateUserId,
  validateConfig,
  DEFAULT_HOST,
} from "./config.js";

describe("config", () => {
  beforeEach(() => {
    resetConfig();
  });

  describe("DEFAULT_HOST", () => {
    it("should have a default host value", () => {
      expect(DEFAULT_HOST).toBe("https://app.speechos.ai");
    });
  });


  describe("validateConfig", () => {
    it("should throw if apiKey is missing", () => {
      expect(() => validateConfig({ apiKey: "" })).toThrow("requires an apiKey");
    });

    it("should merge with defaults", () => {
      const result = validateConfig({ apiKey: "test-key" });

      expect(result.apiKey).toBe("test-key");
      expect(result.host).toBe(DEFAULT_HOST);
      expect(result.userId).toBe("");
      expect(result.debug).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("should return a copy of the config", () => {
      setConfig({ apiKey: "test-key" });

      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same values
    });

    it("should return defaults before setConfig is called", () => {
      resetConfig();
      const config = getConfig();

      expect(config.apiKey).toBe("");
      expect(config.host).toBe(DEFAULT_HOST);
      expect(config.userId).toBe("");
      expect(config.debug).toBe(false);
    });
  });

  describe("setConfig", () => {
    it("should update the current config", () => {
      setConfig({
        apiKey: "test-key",
        userId: "user-123",
        debug: true,
      });

      const config = getConfig();

      expect(config.apiKey).toBe("test-key");
      expect(config.userId).toBe("user-123");
      expect(config.debug).toBe(true);
    });

    it("should validate the config", () => {
      expect(() => setConfig({ apiKey: "" })).toThrow("requires an apiKey");
    });

    it("should allow setting custom host", () => {
      setConfig({
        apiKey: "test",
        host: "https://custom.speechos.com",
      });

      expect(getConfig().host).toBe("https://custom.speechos.com");
    });
  });

  describe("resetConfig", () => {
    it("should reset to defaults", () => {
      setConfig({
        apiKey: "test-key",
        userId: "user-123",
        debug: true,
      });

      resetConfig();
      const config = getConfig();

      expect(config.apiKey).toBe("");
      expect(config.userId).toBe("");
      expect(config.host).toBe(DEFAULT_HOST);
      expect(config.debug).toBe(false);
    });
  });

  describe("updateUserId", () => {
    it("should update only the userId", () => {
      setConfig({
        apiKey: "test-key",
      });

      updateUserId("new-user-id");

      const config = getConfig();
      expect(config.userId).toBe("new-user-id");
      expect(config.apiKey).toBe("test-key");
    });

    it("should allow setting userId to empty string", () => {
      setConfig({ apiKey: "test", userId: "user-123" });
      updateUserId("");

      expect(getConfig().userId).toBe("");
    });
  });
});
