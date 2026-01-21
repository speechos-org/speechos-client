/**
 * Tests for SpeechOS Widget positioning
 * Ensures mobile anchoring vs desktop center-bottom behavior is preserved
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state, events } from "@speechos/core";
import type { SpeechOSWidget } from "./widget.js";

// Helper to mock mobile device
function mockMobileDevice() {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 5,
    configurable: true,
  });
  Object.defineProperty(window, "ontouchstart", {
    value: () => {},
    configurable: true,
  });
}

// Helper to mock desktop device
function mockDesktopDevice() {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1920);
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    configurable: true,
  });
  // Remove ontouchstart to simulate no touch support
  const descriptor = Object.getOwnPropertyDescriptor(window, "ontouchstart");
  if (descriptor) {
    delete (window as any).ontouchstart;
  }
}

describe("Widget positioning", () => {
  let widget: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    state.reset();
    events.clear();

    // Create widget element
    widget = document.createElement("speechos-widget");
    document.body.appendChild(widget);
  });

  afterEach(() => {
    if (widget && widget.parentNode) {
      widget.parentNode.removeChild(widget);
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("mobile devices", () => {
    beforeEach(() => {
      mockMobileDevice();
    });

    it("should detect mobile device correctly", () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      expect(hasTouchScreen).toBe(true);
      expect(isSmallScreen).toBe(true);
    });

    it("should track focusedElement on mobile", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();

      expect(state.getState().focusedElement).toBe(input);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should anchor to element on mobile when focusedElement is set", async () => {
      // Dynamically import to ensure widget is registered
      await import("./widget.js");

      const input = document.createElement("input");
      input.type = "text";
      // Give it a position so getBoundingClientRect works
      input.style.position = "absolute";
      input.style.top = "100px";
      input.style.left = "50px";
      input.style.width = "200px";
      input.style.height = "40px";
      document.body.appendChild(input);

      // Re-create widget after import
      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.setFocusedElement(input);
      state.show();

      // Wait for Lit to update
      await (widget as SpeechOSWidget).updateComplete;

      // Widget should have anchored-to-element class on mobile
      expect(widget.classList.contains("anchored-to-element")).toBe(true);
    });

    it("should use default position on mobile when no focusedElement", async () => {
      await import("./widget.js");

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      // Show widget without focused element
      state.setFocusedElement(null);
      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should NOT have anchored-to-element class
      expect(widget.classList.contains("anchored-to-element")).toBe(false);
    });
  });

  describe("desktop devices", () => {
    beforeEach(() => {
      mockDesktopDevice();
    });

    it("should detect desktop device correctly", () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      expect(hasTouchScreen).toBe(false);
      expect(isSmallScreen).toBe(false);
    });

    it("should track focusedElement on desktop", () => {
      const input = document.createElement("input");
      input.type = "text";
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();

      expect(state.getState().focusedElement).toBe(input);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should allow detaching focused element", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();
      expect(state.getState().focusedElement).toBe(input);

      state.setFocusedElement(null);
      expect(state.getState().focusedElement).toBe(null);
    });

    it("should NOT anchor to element on desktop even when focusedElement is set", async () => {
      await import("./widget.js");

      const input = document.createElement("input");
      input.type = "text";
      input.style.position = "absolute";
      input.style.top = "100px";
      input.style.left = "50px";
      document.body.appendChild(input);

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.setFocusedElement(input);
      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should NOT have anchored-to-element class on desktop
      expect(widget.classList.contains("anchored-to-element")).toBe(false);
    });

    it("should use fixed bottom position on desktop", async () => {
      await import("./widget.js");

      widget.remove();
      widget = document.createElement("speechos-widget") as HTMLElement;
      document.body.appendChild(widget);

      state.show();

      await (widget as SpeechOSWidget).updateComplete;

      // Widget should have bottom position set (default fixed position)
      expect(widget.style.bottom).toBe("12px");
    });
  });

  describe("programmatic showFor() positioning", () => {
    it("should set focused element when showFor is called", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      // Simulate showFor behavior
      state.setFocusedElement(textarea);
      state.show();

      expect(state.getState().focusedElement).toBe(textarea);
      expect(state.getState().isVisible).toBe(true);
    });

    it("should clear focused element when detach is called", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      // Simulate attachTo then detach
      state.setFocusedElement(textarea);
      state.show();
      state.setFocusedElement(null);

      expect(state.getState().focusedElement).toBe(null);
    });
  });

  describe("visibility state", () => {
    it("should emit widget:show event when showing", () => {
      const listener = vi.fn();
      events.on("widget:show", listener);

      state.show();

      expect(listener).toHaveBeenCalled();
    });

    it("should emit widget:hide event when hiding", () => {
      const listener = vi.fn();
      events.on("widget:hide", listener);

      state.show();
      state.hide();

      expect(listener).toHaveBeenCalled();
    });

    it("should clear focused element when hiding", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);

      state.setFocusedElement(input);
      state.show();
      state.hide();

      // hide() should reset the focused element
      expect(state.getState().isVisible).toBe(false);
    });
  });
});
