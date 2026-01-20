/**
 * Tests for TextInputHandler
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DefaultTextInputHandler,
  getTextInputHandler,
  setTextInputHandler,
  resetTextInputHandler,
  type TextInputHandlerInterface,
  type SelectionInfo,
} from "./text-input-handler.js";
import { state, events } from "@speechos/core";

describe("DefaultTextInputHandler", () => {
  let handler: DefaultTextInputHandler;

  beforeEach(() => {
    handler = new DefaultTextInputHandler();
    vi.clearAllMocks();
    state.reset();
    events.clear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("getSelection()", () => {
    it("should get cursor position from text input", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "hello world";
      document.body.appendChild(input);
      input.focus();
      input.setSelectionRange(5, 5);

      const selection = handler.getSelection(input);

      expect(selection.start).toBe(5);
      expect(selection.end).toBe(5);
      expect(selection.text).toBe("");
    });

    it("should get selection range from text input", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = "hello world";
      document.body.appendChild(input);
      input.focus();
      input.setSelectionRange(0, 5);

      const selection = handler.getSelection(input);

      expect(selection.start).toBe(0);
      expect(selection.end).toBe(5);
      expect(selection.text).toBe("hello");
    });

    it("should get selection range from textarea", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "hello world";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.setSelectionRange(0, 5);

      const selection = handler.getSelection(textarea);

      expect(selection.start).toBe(0);
      expect(selection.end).toBe(5);
      expect(selection.text).toBe("hello");
    });

    it("should handle contenteditable elements", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "hello world";
      document.body.appendChild(div);

      const selection = handler.getSelection(div);

      // Should return valid SelectionInfo
      expect(selection).toHaveProperty("start");
      expect(selection).toHaveProperty("end");
      expect(selection).toHaveProperty("text");
    });

    it("should handle input types without selection support", () => {
      const input = document.createElement("input");
      input.type = "email";
      input.value = "test@example.com";
      document.body.appendChild(input);

      const selection = handler.getSelection(input);

      // Should fallback to end of value
      expect(selection.start).toBe(input.value.length);
      expect(selection.end).toBe(input.value.length);
      expect(selection.text).toBe("");
    });
  });

  describe("getContent()", () => {
    it("should get full content from input without selection", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);

      const content = handler.getContent(input);

      expect(content).toBe("hello world");
    });

    it("should get selected content from input with selection", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);

      const selection: SelectionInfo = { start: 0, end: 5, text: "hello" };
      const content = handler.getContent(input, selection);

      expect(content).toBe("hello");
    });

    it("should get full content from textarea without selection", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "hello world";
      document.body.appendChild(textarea);

      const content = handler.getContent(textarea);

      expect(content).toBe("hello world");
    });

    it("should get full content from contenteditable", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.textContent = "hello world";
      document.body.appendChild(div);

      const content = handler.getContent(div);

      expect(content).toBe("hello world");
    });
  });

  describe("insertText()", () => {
    it("should insert text at cursor position in input", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);

      handler.insertText(input, " beautiful", { start: 5, end: 5, text: "" });

      expect(input.value).toBe("hello beautiful world");
    });

    it("should replace selection when inserting", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);

      handler.insertText(input, "beautiful", { start: 6, end: 11, text: "world" });

      expect(input.value).toBe("hello beautiful");
    });

    it("should insert at end when no cursor position provided", () => {
      const input = document.createElement("input");
      input.value = "hello";
      document.body.appendChild(input);

      handler.insertText(input, " world");

      expect(input.value).toBe("hello world");
    });

    it("should emit transcription:inserted event", () => {
      const input = document.createElement("input");
      input.value = "hello";
      document.body.appendChild(input);

      const listener = vi.fn();
      events.on("transcription:inserted", listener);

      handler.insertText(input, " world");

      expect(listener).toHaveBeenCalledWith({
        text: " world",
        element: input,
      });
    });
  });

  describe("replaceContent()", () => {
    beforeEach(() => {
      // Mock execCommand since it's not available in jsdom
      document.execCommand = vi.fn().mockImplementation((command, showUI, value) => {
        // Simulate insertText behavior on the focused element
        const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
          const start = activeEl.selectionStart ?? 0;
          const end = activeEl.selectionEnd ?? activeEl.value.length;
          const before = activeEl.value.substring(0, start);
          const after = activeEl.value.substring(end);
          activeEl.value = before + value + after;
        }
        return true;
      });
    });

    it("should replace selected text in input", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);
      input.focus();

      handler.replaceContent(input, "universe", { start: 6, end: 11, text: "world" });

      expect(input.value).toBe("hello universe");
    });

    it("should replace all content when no selection", () => {
      const input = document.createElement("input");
      input.value = "hello world";
      document.body.appendChild(input);
      input.focus();

      handler.replaceContent(input, "goodbye", { start: 0, end: 0, text: "" });

      expect(input.value).toBe("goodbye");
    });
  });
});

describe("TextInputHandler singleton", () => {
  beforeEach(() => {
    resetTextInputHandler();
  });

  afterEach(() => {
    resetTextInputHandler();
  });

  it("should return default handler initially", () => {
    const handler = getTextInputHandler();
    expect(handler).toBeInstanceOf(DefaultTextInputHandler);
  });

  it("should use custom handler when set", () => {
    const customHandler: TextInputHandlerInterface = {
      getSelection: vi.fn().mockReturnValue({ start: 0, end: 0, text: "" }),
      getContent: vi.fn().mockReturnValue("custom content"),
      insertText: vi.fn(),
      replaceContent: vi.fn(),
    };

    setTextInputHandler(customHandler);
    const handler = getTextInputHandler();

    expect(handler).toBe(customHandler);
  });

  it("should reset to default handler", () => {
    const customHandler: TextInputHandlerInterface = {
      getSelection: vi.fn().mockReturnValue({ start: 0, end: 0, text: "" }),
      getContent: vi.fn().mockReturnValue("custom content"),
      insertText: vi.fn(),
      replaceContent: vi.fn(),
    };

    setTextInputHandler(customHandler);
    resetTextInputHandler();
    const handler = getTextInputHandler();

    expect(handler).toBeInstanceOf(DefaultTextInputHandler);
  });
});
