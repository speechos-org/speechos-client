/**
 * Tests for selection detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SelectionDetector } from "./selection-detector.js";
import { events, state } from "@speechos/core";
import { resetClientConfig, setClientConfig } from "./config.js";

describe("SelectionDetector", () => {
  let detector: SelectionDetector;

  beforeEach(() => {
    detector = new SelectionDetector();
    vi.clearAllMocks();
    state.reset();
    events.clear();
    resetClientConfig();
    setClientConfig({ apiKey: "test-key" });
  });

  afterEach(() => {
    detector.stop();
    document.body.innerHTML = "";
    resetClientConfig();
  });

  it("should capture selected text from inputs and show widget", () => {
    detector.start();

    const input = document.createElement("input");
    input.type = "text";
    input.value = "Hello world";
    document.body.appendChild(input);

    input.focus();
    input.setSelectionRange(0, 5);
    input.dispatchEvent(new Event("select", { bubbles: true }));

    expect(state.getState().selectionText).toBe("Hello");
    expect(state.getState().selectionElement).toBe(input);
    expect(state.getState().isVisible).toBe(true);
  });

  it("should clear selection when no text is selected", () => {
    detector.start();

    const input = document.createElement("input");
    input.type = "text";
    input.value = "Hello world";
    document.body.appendChild(input);

    input.focus();
    input.setSelectionRange(0, 5);
    input.dispatchEvent(new Event("select", { bubbles: true }));

    input.setSelectionRange(0, 0);
    input.dispatchEvent(new Event("select", { bubbles: true }));

    expect(state.getState().selectionText).toBe(null);
    expect(state.getState().selectionElement).toBe(null);
  });

  it("should respect showOnSelection=false", () => {
    resetClientConfig();
    setClientConfig({
      apiKey: "test-key",
      readAloud: { enabled: true, showOnSelection: false },
    });

    detector.start();

    const input = document.createElement("input");
    input.type = "text";
    input.value = "Hello world";
    document.body.appendChild(input);

    input.focus();
    input.setSelectionRange(0, 5);
    input.dispatchEvent(new Event("select", { bubbles: true }));

    expect(state.getState().selectionText).toBe("Hello");
    expect(state.getState().isVisible).toBe(false);
  });

  it("should emit selection:change events", () => {
    detector.start();

    const input = document.createElement("input");
    input.type = "text";
    input.value = "Hello world";
    document.body.appendChild(input);

    const listener = vi.fn();
    events.on("selection:change", listener);

    input.focus();
    input.setSelectionRange(0, 5);
    input.dispatchEvent(new Event("select", { bubbles: true }));

    expect(listener).toHaveBeenCalledWith({ text: "Hello", element: input });
  });
});
