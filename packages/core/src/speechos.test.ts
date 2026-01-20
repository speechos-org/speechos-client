/**
 * SpeechOS Core module tests
 *
 * Note: Integration tests that require mocking livekit-client are skipped
 * for now due to complex vi.mock hoisting issues. Basic initialization
 * and state management tests work correctly.
 *
 * TODO: Set up proper E2E tests for SpeechOS integration
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { speechOS } from "./speechos.js";
import { state } from "./state.js";
import { events } from "./events.js";
import { resetConfig, setConfig } from "./config.js";

describe("SpeechOS Core", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speechOS.reset();
    resetConfig();
    events.clear();
    state.reset();
  });

  afterEach(() => {
    speechOS.reset();
    events.clear();
  });

  describe("initialization", () => {
    it("should initialize with config", () => {
      speechOS.init({ apiKey: "test-api-key" });

      const config = speechOS.getConfig();
      expect(config.apiKey).toBe("test-api-key");
    });

    it("should expose state and events", () => {
      speechOS.init({ apiKey: "test-key" });

      expect(speechOS.state).toBeDefined();
      expect(speechOS.events).toBeDefined();
      expect(typeof speechOS.state.subscribe).toBe("function");
      expect(typeof speechOS.events.on).toBe("function");
    });

    it("should allow re-initialization with new config", () => {
      speechOS.init({ apiKey: "first-key" });
      expect(speechOS.getConfig().apiKey).toBe("first-key");

      speechOS.reset();
      speechOS.init({ apiKey: "second-key" });
      expect(speechOS.getConfig().apiKey).toBe("second-key");
    });
  });

  describe("state management", () => {
    beforeEach(() => {
      speechOS.init({ apiKey: "test-api-key" });
    });

    it("should provide access to state", () => {
      const currentState = speechOS.state.getState();
      expect(currentState).toHaveProperty("isVisible");
      expect(currentState).toHaveProperty("isExpanded");
      expect(currentState).toHaveProperty("recordingState");
    });

    it("should allow subscribing to state changes", () => {
      const listener = vi.fn();
      const unsubscribe = speechOS.state.subscribe(listener);

      speechOS.state.show();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe("event system", () => {
    beforeEach(() => {
      speechOS.init({ apiKey: "test-api-key" });
    });

    it("should allow subscribing to events", () => {
      const errorListener = vi.fn();
      speechOS.events.on("error", errorListener);

      speechOS.events.emit("error", {
        code: "test_error",
        message: "Test error",
        source: "init",
      });

      expect(errorListener).toHaveBeenCalledWith({
        code: "test_error",
        message: "Test error",
        source: "init",
      });
    });

    it("should support one-time event listeners", () => {
      const listener = vi.fn();
      speechOS.events.once("error", listener);

      speechOS.events.emit("error", {
        code: "first",
        message: "First",
        source: "init",
      });
      speechOS.events.emit("error", {
        code: "second",
        message: "Second",
        source: "init",
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      speechOS.init({ apiKey: "test-key" });

      // Make some state changes
      speechOS.state.show();
      speechOS.state.toggleExpanded();

      // Verify changes took effect
      expect(speechOS.state.getState().isVisible).toBe(true);
      expect(speechOS.state.getState().isExpanded).toBe(true);

      // Reset
      speechOS.reset();

      // Re-init and check state is reset
      speechOS.init({ apiKey: "new-key" });
      const currentState = speechOS.state.getState();
      expect(currentState.isVisible).toBe(false);
      expect(currentState.isExpanded).toBe(false);
    });
  });

  describe("configuration", () => {
    it("should merge config with defaults", () => {
      speechOS.init({
        apiKey: "test-key",
      });

      const config = speechOS.getConfig();
      expect(config.apiKey).toBe("test-key");
      // Default values should be present
      expect(config.host).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it("should use custom host if provided", () => {
      speechOS.init({
        apiKey: "test-key",
        host: "https://custom.example.com",
      });

      const config = speechOS.getConfig();
      expect(config.host).toBe("https://custom.example.com");
    });

    it("should accept userId configuration", () => {
      speechOS.init({
        apiKey: "test-key",
        userId: "user-123",
      });

      const config = speechOS.getConfig();
      expect(config.userId).toBe("user-123");
    });

    it("should default userId to empty string", () => {
      speechOS.init({ apiKey: "test-key" });

      const config = speechOS.getConfig();
      expect(config.userId).toBe("");
    });
  });
});
