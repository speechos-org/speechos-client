/**
 * Tests for form field focus detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formDetector, FormDetector } from "./form-detector.js";
import { events, state } from "@speechos/core";

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
});
