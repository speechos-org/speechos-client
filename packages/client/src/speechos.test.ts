/**
 * Tests for SpeechOS class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SpeechOS } from "./speechos.js";
import { formDetector, type FormDetectorInterface } from "./form-detector.js";
import { selectionDetector } from "./selection-detector.js";
import { state, events, resetConfig } from "@speechos/core";
import { resetClientConfig } from "./config.js";
import { resetTextInputHandler, type TextInputHandlerInterface } from "./text-input-handler.js";

// Mock the UI components to avoid DOM complexity
vi.mock("./ui/index.js", () => ({}));

describe("SpeechOS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reset();
    events.clear();
    resetConfig();
    resetClientConfig();
    resetTextInputHandler();
  });

  afterEach(async () => {
    // Clean up any initialized instance
    if (SpeechOS.initialized) {
      await SpeechOS.destroy();
    }
    document.body.innerHTML = "";
  });

  describe("init() form detection config", () => {
    it("should start default form detector when formDetection is true", () => {
      const startSpy = vi.spyOn(formDetector, "start");
      const stopSpy = vi.spyOn(formDetector, "stop");

      SpeechOS.init({ apiKey: "test-key", formDetection: true });

      expect(startSpy).toHaveBeenCalled();
      expect(formDetector.active).toBe(true);

      startSpy.mockRestore();
      stopSpy.mockRestore();
    });

    it("should start default form detector when formDetection is undefined", () => {
      const startSpy = vi.spyOn(formDetector, "start");

      SpeechOS.init({ apiKey: "test-key" });

      expect(startSpy).toHaveBeenCalled();
      expect(formDetector.active).toBe(true);

      startSpy.mockRestore();
    });

    it("should NOT start form detector when formDetection is false", () => {
      const startSpy = vi.spyOn(formDetector, "start");

      SpeechOS.init({ apiKey: "test-key", formDetection: false });

      expect(startSpy).not.toHaveBeenCalled();
      expect(formDetector.active).toBe(false);

      startSpy.mockRestore();
    });

    it("should start custom form detector when provided", () => {
      const customDetector: FormDetectorInterface = {
        start: vi.fn(),
        stop: vi.fn(),
        get active() {
          return true;
        },
      };

      SpeechOS.init({ apiKey: "test-key", formDetection: customDetector });

      expect(customDetector.start).toHaveBeenCalled();
      expect(formDetector.active).toBe(false); // Default detector not started
    });

    it("should stop custom form detector on destroy", async () => {
      const customDetector: FormDetectorInterface = {
        start: vi.fn(),
        stop: vi.fn(),
        get active() {
          return true;
        },
      };

      SpeechOS.init({ apiKey: "test-key", formDetection: customDetector });
      await SpeechOS.destroy();

      expect(customDetector.stop).toHaveBeenCalled();
    });
  });

  describe("init() read aloud config", () => {
    it("should start selection detector when readAloud is enabled by default", () => {
      const startSpy = vi.spyOn(selectionDetector, "start");

      SpeechOS.init({ apiKey: "test-key" });

      expect(startSpy).toHaveBeenCalled();
      startSpy.mockRestore();
    });

    it("should NOT start selection detector when readAloud is false", () => {
      const startSpy = vi.spyOn(selectionDetector, "start");

      SpeechOS.init({ apiKey: "test-key", readAloud: false });

      expect(startSpy).not.toHaveBeenCalled();
      startSpy.mockRestore();
    });
  });

  describe("init() text input handler config", () => {
    it("should use custom text input handler when provided", () => {
      const customHandler: TextInputHandlerInterface = {
        getSelection: vi.fn().mockReturnValue({ start: 0, end: 0, text: "" }),
        getContent: vi.fn().mockReturnValue("custom"),
        insertText: vi.fn(),
        replaceContent: vi.fn(),
      };

      SpeechOS.init({ apiKey: "test-key", textInputHandler: customHandler });

      // The custom handler should be set (we can't easily verify this without exposing it)
      expect(SpeechOS.initialized).toBe(true);
    });
  });

  describe("programmatic widget control", () => {
    beforeEach(() => {
      SpeechOS.init({ apiKey: "test-key", formDetection: false });
    });

    it("showFor() should set focused element and show widget", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      SpeechOS.showFor(input);

      expect(state.getState().focusedElement).toBe(input);
      expect(state.getState().isVisible).toBe(true);
    });

    it("attachTo() should set focused element and show widget", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      SpeechOS.attachTo(textarea);

      expect(state.getState().focusedElement).toBe(textarea);
      expect(state.getState().isVisible).toBe(true);
    });

    it("detach() should clear focused element", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      SpeechOS.attachTo(input);
      expect(state.getState().focusedElement).toBe(input);

      SpeechOS.detach();

      expect(state.getState().focusedElement).toBe(null);
    });

    it("show() should make widget visible", () => {
      SpeechOS.show();

      expect(state.getState().isVisible).toBe(true);
    });

    it("hide() should hide widget", () => {
      SpeechOS.show();
      SpeechOS.hide();

      expect(state.getState().isVisible).toBe(false);
    });

    it("showFor() should warn if not initialized", async () => {
      await SpeechOS.destroy();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const input = document.createElement("input");

      SpeechOS.showFor(input);

      expect(warnSpy).toHaveBeenCalledWith(
        "SpeechOS.showFor() called before init(). Call init() first."
      );
      warnSpy.mockRestore();
    });

    it("attachTo() should warn if not initialized", async () => {
      await SpeechOS.destroy();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const input = document.createElement("input");

      SpeechOS.attachTo(input);

      expect(warnSpy).toHaveBeenCalledWith(
        "SpeechOS.attachTo() called before init(). Call init() first."
      );
      warnSpy.mockRestore();
    });

    it("detach() should warn if not initialized", async () => {
      await SpeechOS.destroy();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      SpeechOS.detach();

      expect(warnSpy).toHaveBeenCalledWith(
        "SpeechOS.detach() called before init(). Call init() first."
      );
      warnSpy.mockRestore();
    });
  });

  describe("destroy()", () => {
    it("should stop default form detector", async () => {
      const stopSpy = vi.spyOn(formDetector, "stop");

      SpeechOS.init({ apiKey: "test-key" });
      await SpeechOS.destroy();

      expect(stopSpy).toHaveBeenCalled();
      stopSpy.mockRestore();
    });

    it("should reset text input handler", async () => {
      const customHandler: TextInputHandlerInterface = {
        getSelection: vi.fn().mockReturnValue({ start: 0, end: 0, text: "" }),
        getContent: vi.fn().mockReturnValue("custom"),
        insertText: vi.fn(),
        replaceContent: vi.fn(),
      };

      SpeechOS.init({ apiKey: "test-key", textInputHandler: customHandler });
      await SpeechOS.destroy();

      expect(SpeechOS.initialized).toBe(false);
    });
  });

  describe("alwaysVisible config", () => {
    it("should show widget on init when alwaysVisible is true", () => {
      SpeechOS.init({ apiKey: "test-key", alwaysVisible: true });

      expect(state.getState().isVisible).toBe(true);
    });

    it("should NOT auto-show widget on init when alwaysVisible is false", () => {
      SpeechOS.init({ apiKey: "test-key", alwaysVisible: false });

      expect(state.getState().isVisible).toBe(false);
    });

    it("should NOT auto-show widget on init when alwaysVisible is undefined", () => {
      SpeechOS.init({ apiKey: "test-key" });

      expect(state.getState().isVisible).toBe(false);
    });
  });
});
