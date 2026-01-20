/**
 * Text input handler for SpeechOS Client SDK
 * Abstracts cursor/selection detection and text insertion/replacement operations
 */

import { state, events } from "@speechos/core";

/**
 * Selection/cursor position info from an element
 */
export interface SelectionInfo {
  /** Start position of cursor/selection */
  start: number | null;
  /** End position of cursor/selection */
  end: number | null;
  /** Selected text (empty string if just cursor) */
  text: string;
}

/**
 * Interface for handling text input operations (cursor detection, text insertion)
 * Allows customization of how the widget interacts with form elements
 */
export interface TextInputHandlerInterface {
  /**
   * Get the current cursor/selection position from an element
   */
  getSelection(element: HTMLElement): SelectionInfo;

  /**
   * Get content from an element (selected portion if selection exists, otherwise full content)
   */
  getContent(element: HTMLElement, selection?: SelectionInfo): string;

  /**
   * Insert text at the cursor position (for dictation)
   */
  insertText(element: HTMLElement, text: string, cursorPosition?: SelectionInfo): void;

  /**
   * Replace content/selection with new text (for edit)
   */
  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void;
}

/**
 * Check if an input element supports selection APIs
 */
function supportsSelection(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (element.tagName.toLowerCase() === "textarea") {
    return true;
  }
  const supportedTypes = ["text", "search", "url", "tel", "password"];
  return supportedTypes.includes((element as HTMLInputElement).type || "text");
}

/**
 * Default implementation of TextInputHandler
 * Handles input, textarea, and contenteditable elements
 */
export class DefaultTextInputHandler implements TextInputHandlerInterface {
  /**
   * Get the current cursor/selection position from an element
   */
  getSelection(element: HTMLElement): SelectionInfo {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input" || tagName === "textarea") {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      if (supportsSelection(inputEl)) {
        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd;
        const text = start !== null && end !== null && start !== end
          ? inputEl.value.substring(start, end)
          : "";
        return { start, end, text };
      } else {
        // For input types that don't support selection, use end of value
        const length = inputEl.value.length;
        return { start: length, end: length, text: "" };
      }
    }

    if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const selectedText = selection.toString();
        return {
          start: 0,
          end: selectedText.length,
          text: selectedText,
        };
      }
      return { start: null, end: null, text: "" };
    }

    return { start: null, end: null, text: "" };
  }

  /**
   * Get content from an element (selected portion if selection exists, otherwise full content)
   */
  getContent(element: HTMLElement, selection?: SelectionInfo): string {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input" || tagName === "textarea") {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      const fullContent = inputEl.value;

      if (selection) {
        const start = selection.start ?? 0;
        const end = selection.end ?? fullContent.length;
        const hasSelection = start !== end;
        if (hasSelection) {
          return fullContent.substring(start, end);
        }
      }
      return fullContent;
    }

    if (element.isContentEditable) {
      const windowSelection = window.getSelection();
      if (windowSelection && windowSelection.toString().length > 0) {
        return windowSelection.toString();
      }
      return element.textContent || "";
    }

    return "";
  }

  /**
   * Insert text at the cursor position (for dictation)
   */
  insertText(element: HTMLElement, text: string, cursorPosition?: SelectionInfo): void {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input" || tagName === "textarea") {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      const start = cursorPosition?.start ?? inputEl.value.length;
      const end = cursorPosition?.end ?? inputEl.value.length;

      const before = inputEl.value.substring(0, start);
      const after = inputEl.value.substring(end);
      inputEl.value = before + text + after;

      if (supportsSelection(inputEl)) {
        const newCursorPos = start + text.length;
        inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }

      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.focus();
      state.setFocusedElement(inputEl);
    } else if (element.isContentEditable) {
      element.focus();
      state.setFocusedElement(element);

      const textNode = document.createTextNode(text);
      element.appendChild(textNode);

      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    events.emit("transcription:inserted", { text, element });
  }

  /**
   * Replace content/selection with new text (for edit)
   */
  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void {
    const tagName = element.tagName.toLowerCase();

    if (tagName === "input" || tagName === "textarea") {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
      inputEl.focus();

      if (supportsSelection(inputEl)) {
        const selectionStart = selection?.start ?? 0;
        const selectionEnd = selection?.end ?? inputEl.value.length;
        const hasSelection = selectionStart !== selectionEnd;

        if (hasSelection) {
          inputEl.setSelectionRange(selectionStart, selectionEnd);
        } else {
          inputEl.setSelectionRange(0, inputEl.value.length);
        }
        document.execCommand("insertText", false, text);
      } else {
        inputEl.value = text;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      }

      state.setFocusedElement(inputEl);
    } else if (element.isContentEditable) {
      element.focus();
      state.setFocusedElement(element);

      const hasSelection =
        selection?.start !== null &&
        selection?.end !== null &&
        selection?.start !== selection?.end;

      if (!hasSelection) {
        const windowSelection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        windowSelection?.removeAllRanges();
        windowSelection?.addRange(range);
      }

      document.execCommand("insertText", false, text);
    }
  }
}

// Export singleton instance
export const defaultTextInputHandler: TextInputHandlerInterface = new DefaultTextInputHandler();

// Current active handler (can be swapped via config)
let currentTextInputHandler: TextInputHandlerInterface = defaultTextInputHandler;

/**
 * Set the text input handler
 */
export function setTextInputHandler(handler: TextInputHandlerInterface): void {
  currentTextInputHandler = handler;
}

/**
 * Get the current text input handler
 */
export function getTextInputHandler(): TextInputHandlerInterface {
  return currentTextInputHandler;
}

/**
 * Reset to default text input handler
 */
export function resetTextInputHandler(): void {
  currentTextInputHandler = defaultTextInputHandler;
}
