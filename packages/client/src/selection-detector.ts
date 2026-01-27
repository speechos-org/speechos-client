/**
 * Selection detection for SpeechOS Client SDK
 * Detects when users select text and updates state for read-aloud actions
 */

import { events, state } from "@speechos/core";
import { getReadAloudConfig } from "./config.js";
import { getTextInputHandler } from "./text-input-handler.js";

/**
 * Interface for selection detector implementations
 */
export interface SelectionDetectorInterface {
  /** Start detecting selection changes */
  start(): void;
  /** Stop detecting selection changes */
  stop(): void;
  /** Whether the detector is currently active */
  readonly active: boolean;
}

type SelectionSnapshot = {
  text: string;
  element: HTMLElement | null;
};

/**
 * Selection detector class that manages selection tracking
 */
export class SelectionDetector implements SelectionDetectorInterface {
  private isActive = false;
  private selectionChangeHandler: (() => void) | null = null;
  private mouseUpHandler: (() => void) | null = null;
  private keyUpHandler: (() => void) | null = null;
  private selectHandler: ((event: Event) => void) | null = null;
  private lastSelection: SelectionSnapshot = { text: "", element: null };

  /**
   * Start detecting selection changes
   */
  start(): void {
    if (this.isActive) {
      console.warn("SelectionDetector is already active");
      return;
    }

    const updateSelection = () => {
      const config = getReadAloudConfig();
      if (!config.enabled) {
        this.clearSelection();
        return;
      }

      const snapshot = this.getSelectionSnapshot(config.maxLength);
      const trimmedText = snapshot.text.trim();
      const hasSelection = trimmedText.length >= config.minLength;

      if (!hasSelection) {
        this.clearSelection();
        return;
      }

      const nextSnapshot: SelectionSnapshot = {
        text: trimmedText,
        element: snapshot.element,
      };

      if (
        nextSnapshot.text === this.lastSelection.text &&
        nextSnapshot.element === this.lastSelection.element
      ) {
        return;
      }

      this.lastSelection = nextSnapshot;
      state.setSelection(nextSnapshot.text, nextSnapshot.element);
      events.emit("selection:change", {
        text: nextSnapshot.text,
        element: nextSnapshot.element,
      });

      if (config.showOnSelection) {
        state.show();
        if (nextSnapshot.element && this.isEditableElement(nextSnapshot.element)) {
          state.setFocusedElement(nextSnapshot.element);
        }
      }
    };

    this.selectionChangeHandler = () => updateSelection();
    this.mouseUpHandler = () => updateSelection();
    this.keyUpHandler = () => updateSelection();
    this.selectHandler = () => updateSelection();

    document.addEventListener("selectionchange", this.selectionChangeHandler);
    document.addEventListener("mouseup", this.mouseUpHandler);
    document.addEventListener("keyup", this.keyUpHandler);
    document.addEventListener("select", this.selectHandler, true);

    this.isActive = true;

    // Capture any existing selection on start
    updateSelection();
  }

  /**
   * Stop detecting selection changes
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    if (this.selectionChangeHandler) {
      document.removeEventListener("selectionchange", this.selectionChangeHandler);
      this.selectionChangeHandler = null;
    }

    if (this.mouseUpHandler) {
      document.removeEventListener("mouseup", this.mouseUpHandler);
      this.mouseUpHandler = null;
    }

    if (this.keyUpHandler) {
      document.removeEventListener("keyup", this.keyUpHandler);
      this.keyUpHandler = null;
    }

    if (this.selectHandler) {
      document.removeEventListener("select", this.selectHandler, true);
      this.selectHandler = null;
    }

    this.isActive = false;
    this.clearSelection();
  }

  /**
   * Check if the detector is currently active
   */
  get active(): boolean {
    return this.isActive;
  }

  private clearSelection(): void {
    if (this.lastSelection.text === "" && this.lastSelection.element === null) {
      return;
    }
    this.lastSelection = { text: "", element: null };
    state.clearSelection();
    events.emit("selection:change", { text: "", element: null });
  }

  private getSelectionSnapshot(maxLength: number | null): SelectionSnapshot {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement && this.isWidgetElement(activeElement)) {
      return { text: "", element: null };
    }

    if (activeElement instanceof HTMLElement && this.isEditableElement(activeElement)) {
      const handler = getTextInputHandler();
      const selection = handler.getSelection(activeElement);
      const selectedText = selection.text || "";
      return {
        text: this.applyMaxLength(selectedText, maxLength),
        element: activeElement,
      };
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { text: "", element: null };
    }

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const element = this.getSelectionElement(range);

    if (element && this.isWidgetElement(element)) {
      return { text: "", element: null };
    }

    return {
      text: this.applyMaxLength(selectedText, maxLength),
      element,
    };
  }

  private applyMaxLength(text: string, maxLength: number | null): string {
    if (maxLength === null || maxLength <= 0) {
      return text;
    }
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength);
  }

  private isEditableElement(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      return true;
    }
    return element.isContentEditable || element.getAttribute("contenteditable") === "true";
  }

  private getSelectionElement(range: Range): HTMLElement | null {
    const container = range.commonAncestorContainer;
    if (container instanceof HTMLElement) {
      return container;
    }
    if (container.parentElement) {
      return container.parentElement;
    }
    return null;
  }

  private isWidgetElement(element: HTMLElement): boolean {
    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.host?.tagName?.toLowerCase() === "speechos-widget") {
      return true;
    }
    return Boolean(element.closest("speechos-widget"));
  }
}

// Export singleton instance
export const selectionDetector: SelectionDetector = new SelectionDetector();
