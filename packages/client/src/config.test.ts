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
});

// Need to import vi for spying
import { vi } from "vitest";
