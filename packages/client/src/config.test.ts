/**
 * Tests for client config
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validateClientConfig,
  getClientConfig,
  setClientConfig,
  resetClientConfig,
  isAlwaysVisible,
  useExternalSettings,
  getReadAloudConfig,
  isReadAloudEnabled,
} from "./config.js";

describe("client config", () => {
  beforeEach(() => {
    resetClientConfig();
  });

  describe("validateClientConfig", () => {
    it("should return defaults when no options provided", () => {
      const result = validateClientConfig({} as any);

      expect(result.commands).toEqual([]);
      expect(result.zIndex).toBe(999999);
      expect(result.alwaysVisible).toBe(false);
      expect(result.useExternalSettings).toBe(false);
    });

    it("should preserve provided alwaysVisible value", () => {
      const result = validateClientConfig({ alwaysVisible: true } as any);

      expect(result.alwaysVisible).toBe(true);
    });

    it("should default alwaysVisible to false", () => {
      const result = validateClientConfig({ commands: [] } as any);

      expect(result.alwaysVisible).toBe(false);
    });

    it("should preserve commands array", () => {
      const commands = [
        { name: "test", description: "Test command" },
      ];
      const result = validateClientConfig({ commands } as any);

      expect(result.commands).toEqual(commands);
    });

    it("should preserve custom zIndex", () => {
      const result = validateClientConfig({ zIndex: 1000 } as any);

      expect(result.zIndex).toBe(1000);
    });

    it("should use default zIndex for invalid values", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = validateClientConfig({ zIndex: -1 } as any);

      expect(result.zIndex).toBe(999999);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should preserve provided useExternalSettings value", () => {
      const result = validateClientConfig({ useExternalSettings: true } as any);

      expect(result.useExternalSettings).toBe(true);
    });

    it("should default useExternalSettings to false", () => {
      const result = validateClientConfig({ commands: [] } as any);

      expect(result.useExternalSettings).toBe(false);
    });
  });

  describe("setClientConfig and getClientConfig", () => {
    it("should set and get config with alwaysVisible", () => {
      setClientConfig({ alwaysVisible: true } as any);

      const config = getClientConfig();
      expect(config.alwaysVisible).toBe(true);
    });

    it("should reset to defaults", () => {
      setClientConfig({ alwaysVisible: true } as any);
      resetClientConfig();

      const config = getClientConfig();
      expect(config.alwaysVisible).toBe(false);
    });
  });

  describe("isAlwaysVisible", () => {
    it("should return false by default", () => {
      expect(isAlwaysVisible()).toBe(false);
    });

    it("should return true when alwaysVisible is set", () => {
      setClientConfig({ alwaysVisible: true } as any);

      expect(isAlwaysVisible()).toBe(true);
    });

    it("should return false after reset", () => {
      setClientConfig({ alwaysVisible: true } as any);
      resetClientConfig();

      expect(isAlwaysVisible()).toBe(false);
    });
  });

  describe("useExternalSettings", () => {
    it("should return false by default", () => {
      expect(useExternalSettings()).toBe(false);
    });

    it("should return true when useExternalSettings is set", () => {
      setClientConfig({ useExternalSettings: true } as any);

      expect(useExternalSettings()).toBe(true);
    });

    it("should return false after reset", () => {
      setClientConfig({ useExternalSettings: true } as any);
      resetClientConfig();

      expect(useExternalSettings()).toBe(false);
    });
  });

  describe("getReadAloudConfig", () => {
    it("should return default config", () => {
      const config = getReadAloudConfig();

      expect(config.enabled).toBe(true);
      expect(config.minLength).toBe(1);
      expect(config.maxLength).toBe(null);
      expect(config.showOnSelection).toBe(true);
    });

    it("should return disabled config when readAloud is false", () => {
      setClientConfig({ readAloud: false } as any);

      const config = getReadAloudConfig();
      expect(config.enabled).toBe(false);
      expect(config.minLength).toBe(1);
      expect(config.maxLength).toBe(null);
      expect(config.showOnSelection).toBe(true);
    });

    it("should return custom config when readAloud object is provided", () => {
      setClientConfig({
        readAloud: {
          enabled: true,
          minLength: 5,
          maxLength: 1000,
          showOnSelection: false,
        },
      } as any);

      const config = getReadAloudConfig();
      expect(config.enabled).toBe(true);
      expect(config.minLength).toBe(5);
      expect(config.maxLength).toBe(1000);
      expect(config.showOnSelection).toBe(false);
    });

    it("should return default config after reset", () => {
      setClientConfig({
        readAloud: {
          enabled: false,
          minLength: 10,
        },
      } as any);
      resetClientConfig();

      const config = getReadAloudConfig();
      expect(config.enabled).toBe(true);
      expect(config.minLength).toBe(1);
      expect(config.maxLength).toBe(null);
      expect(config.showOnSelection).toBe(true);
    });
  });

  describe("isReadAloudEnabled", () => {
    it("should return true by default", () => {
      expect(isReadAloudEnabled()).toBe(true);
    });

    it("should return false when readAloud is disabled", () => {
      setClientConfig({ readAloud: false } as any);

      expect(isReadAloudEnabled()).toBe(false);
    });

    it("should return false when readAloud.enabled is false", () => {
      setClientConfig({
        readAloud: {
          enabled: false,
        },
      } as any);

      expect(isReadAloudEnabled()).toBe(false);
    });

    it("should return true when readAloud is true", () => {
      setClientConfig({ readAloud: true } as any);

      expect(isReadAloudEnabled()).toBe(true);
    });

    it("should return true when readAloud.enabled is true", () => {
      setClientConfig({
        readAloud: {
          enabled: true,
        },
      } as any);

      expect(isReadAloudEnabled()).toBe(true);
    });

    it("should return true after reset", () => {
      setClientConfig({ readAloud: false } as any);
      resetClientConfig();

      expect(isReadAloudEnabled()).toBe(true);
    });
  });
});

// Need to import vi for spying
import { vi } from "vitest";
