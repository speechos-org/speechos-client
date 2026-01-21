/**
 * Tests for form field focus detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formDetector, FormDetector } from "./form-detector.js";
import { events, state } from "@speechos/core";
import * as config from "./config.js";

// Helper to create and dispatch focus events
function focusElement(element: HTMLElement): void {
  element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
}

function blurElement(element: HTMLElement, relatedTarget?: HTMLElement): void {
  element.dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, relatedTarget })
  );
}

describe("FormDetector", () => {
  let detector: FormDetector;

  beforeEach(() => {
    // Create fresh detector for each test
    detector = new FormDetector();
    vi.clearAllMocks();
    state.reset();
    events.clear();
  });

  afterEach(() => {
    // Clean up
    detector.stop();
    // Clean up any elements added to document
    document.body.innerHTML = "";
  });

  describe("active state", () => {
    it("should not be active initially", () => {
      expect(detector.active).toBe(false);
    });

    it("should be active after start()", () => {
      detector.start();
      expect(detector.active).toBe(true);
    });

    it("should not be active after stop()", () => {
      detector.start();
      detector.stop();
      expect(detector.active).toBe(false);
    });

    it("should warn when starting twice", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      detector.start();
      detector.start();

      expect(warnSpy).toHaveBeenCalledWith("FormDetector is already active");
      warnSpy.mockRestore();
    });
  });

  describe("form field detection", () => {
    beforeEach(() => {
      detector.start();
    });

    it("should detect text input focus", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).toHaveBeenCalledWith({ element: input });
      expect(state.getState().isVisible).toBe(true);
    });

    it("should detect textarea focus", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(textarea);

      expect(focusListener).toHaveBeenCalledWith({ element: textarea });
    });

    it("should detect contenteditable focus", () => {
      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      document.body.appendChild(div);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(div);

      expect(focusListener).toHaveBeenCalledWith({ element: div });
    });

    it("should detect email input focus", () => {
      const input = document.createElement("input");
      input.type = "email";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).toHaveBeenCalled();
    });

    it("should detect search input focus", () => {
      const input = document.createElement("input");
      input.type = "search";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).toHaveBeenCalled();
    });

    it("should NOT detect checkbox input focus", () => {
      const input = document.createElement("input");
      input.type = "checkbox";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).not.toHaveBeenCalled();
    });

    it("should NOT detect radio input focus", () => {
      const input = document.createElement("input");
      input.type = "radio";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).not.toHaveBeenCalled();
    });

    it("should NOT detect submit button focus", () => {
      const input = document.createElement("input");
      input.type = "submit";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).not.toHaveBeenCalled();
    });

    it("should NOT detect hidden input focus", () => {
      const input = document.createElement("input");
      input.type = "hidden";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).not.toHaveBeenCalled();
    });

    it("should NOT detect file input focus", () => {
      const input = document.createElement("input");
      input.type = "file";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      expect(focusListener).not.toHaveBeenCalled();
    });

    it("should NOT detect regular div focus", () => {
      const div = document.createElement("div");
      document.body.appendChild(div);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(div);

      expect(focusListener).not.toHaveBeenCalled();
    });
  });

  describe("state management", () => {
    beforeEach(() => {
      detector.start();
    });

    it("should set focusedElement on focus", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      focusElement(input);

      expect(state.getState().focusedElement).toBe(input);
    });

    it("should show widget on focus", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      expect(state.getState().isVisible).toBe(false);

      focusElement(input);

      expect(state.getState().isVisible).toBe(true);
    });

    it("should reset state on stop()", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      focusElement(input);
      expect(state.getState().isVisible).toBe(true);

      detector.stop();

      expect(state.getState().isVisible).toBe(false);
      expect(state.getState().focusedElement).toBe(null);
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton formDetector", () => {
      expect(formDetector).toBeInstanceOf(FormDetector);
    });
  });

  describe("alwaysVisible behavior", () => {
    let isAlwaysVisibleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      isAlwaysVisibleSpy = vi.spyOn(config, "isAlwaysVisible").mockReturnValue(false);
      detector.start();
    });

    afterEach(() => {
      isAlwaysVisibleSpy.mockRestore();
      vi.useRealTimers();
    });

    it("should NOT hide widget on blur when alwaysVisible is true", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      // Focus then blur
      focusElement(input);
      expect(state.getState().isVisible).toBe(true);

      // Blur to a non-form element
      const div = document.createElement("div");
      document.body.appendChild(div);
      blurElement(input, div);

      // Advance timers past the 150ms delay in blur handler
      vi.advanceTimersByTime(200);

      // Widget should remain visible when alwaysVisible is true
      expect(state.getState().isVisible).toBe(true);
    });

    it("should hide widget on blur when alwaysVisible is false", () => {
      isAlwaysVisibleSpy.mockReturnValue(false);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      // Focus then blur
      focusElement(input);
      expect(state.getState().isVisible).toBe(true);

      // Blur to a non-form element - need to blur directly without relatedTarget
      // since the blur handler checks if relatedTarget is a form field
      blurElement(input);

      // Advance timers past the 150ms delay in blur handler
      vi.advanceTimersByTime(200);

      // Widget should hide when alwaysVisible is false
      expect(state.getState().isVisible).toBe(false);
    });

    it("should still emit form:blur event when alwaysVisible is true", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      const blurListener = vi.fn();
      events.on("form:blur", blurListener);

      focusElement(input);

      // Blur without related target
      blurElement(input);

      // Advance timers past the 150ms delay in blur handler
      vi.advanceTimersByTime(200);

      // Event should still fire even when widget stays visible
      expect(blurListener).toHaveBeenCalledWith({ element: null });
    });

    it("should NOT hide widget on stop() when alwaysVisible is true", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      focusElement(input);
      expect(state.getState().isVisible).toBe(true);

      detector.stop();

      // Widget should remain visible when alwaysVisible is true
      expect(state.getState().isVisible).toBe(true);
    });

    it("should still track focusedElement when alwaysVisible is true", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      // Initially no focused element
      expect(state.getState().focusedElement).toBe(null);

      // Focus the input
      focusElement(input);

      // focusedElement should be tracked even in alwaysVisible mode
      expect(state.getState().focusedElement).toBe(input);
    });

    it("should update focusedElement when switching fields in alwaysVisible mode", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input1 = document.createElement("input");
      input1.type = "text";
      document.body.appendChild(input1);

      const input2 = document.createElement("textarea");
      document.body.appendChild(input2);

      // Focus first input
      focusElement(input1);
      expect(state.getState().focusedElement).toBe(input1);

      // Focus second input (simulates user tapping another field)
      focusElement(input2);
      expect(state.getState().focusedElement).toBe(input2);

      // Widget should still be visible
      expect(state.getState().isVisible).toBe(true);
    });

    it("should clear focusedElement on blur but keep widget visible in alwaysVisible mode", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      // Focus then blur
      focusElement(input);
      expect(state.getState().focusedElement).toBe(input);

      blurElement(input);

      // Advance timers past the 150ms delay
      vi.advanceTimersByTime(200);

      // focusedElement should be cleared
      expect(state.getState().focusedElement).toBe(null);
      // But widget should remain visible
      expect(state.getState().isVisible).toBe(true);
    });

    it("should emit form:focus event with element when focusing in alwaysVisible mode", () => {
      isAlwaysVisibleSpy.mockReturnValue(true);

      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      const focusListener = vi.fn();
      events.on("form:focus", focusListener);

      focusElement(input);

      // Event should fire with the focused element
      expect(focusListener).toHaveBeenCalledWith({ element: input });
    });
  });
});
