/**
 * Form field focus detection for SpeechOS Client SDK
 * Detects when users focus on form fields and manages widget visibility
 */

import { events, state } from "@speechos/core";
import { isAlwaysVisible } from "./config.js";

/**
 * Check if an element is a form field that we should track
 */
function isFormField(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  // Check for input, textarea
  if (tagName === "input" || tagName === "textarea") {
    // Exclude certain input types that don't accept text
    if (tagName === "input") {
      const type = (element as HTMLInputElement).type.toLowerCase();
      const excludedTypes = ["checkbox", "radio", "submit", "button", "reset", "file", "hidden"];
      if (excludedTypes.includes(type)) {
        return false;
      }
    }
    return true;
  }

  // Check for contenteditable
  if (element.isContentEditable || element.getAttribute("contenteditable") === "true") {
    return true;
  }

  return false;
}

/**
 * Interface for form detector implementations
 * Allows swapping out the default form detection behavior
 */
export interface FormDetectorInterface {
  /** Start detecting form field focus events */
  start(): void;
  /** Stop detecting form field focus events */
  stop(): void;
  /** Whether the detector is currently active */
  readonly active: boolean;
}

/**
 * Form detector class that manages focus tracking
 */
export class FormDetector implements FormDetectorInterface {
  private isActive = false;
  private focusHandler: ((event: FocusEvent) => void) | null = null;
  private blurHandler: ((event: FocusEvent) => void) | null = null;
  private touchHandler: ((event: TouchEvent) => void) | null = null;
  private mouseDownHandler: ((event: MouseEvent) => void) | null = null;
  private isWidgetBeingInteracted = false;

  /**
   * Start detecting form field focus events
   */
  start(): void {
    if (this.isActive) {
      console.warn("FormDetector is already active");
      return;
    }

    // Create event handlers
    this.focusHandler = (event: FocusEvent) => {
      const target = event.target as Element | null;

      if (isFormField(target)) {
        // console.log("[SpeechOS] FormDetector: focus on form field", {
        //   element: target,
        //   tagName: target?.tagName,
        // });
        state.setFocusedElement(target);
        state.show();
        events.emit("form:focus", { element: target });
      }
    };

    this.blurHandler = (event: FocusEvent) => {
      const target = event.target as Element | null;

      if (isFormField(target)) {
        // If widget is being interacted with (touch or mouse), don't process blur
        if (this.isWidgetBeingInteracted) {
          console.log("[SpeechOS] blurHandler: widget being interacted, skipping");
          return;
        }

        // Check relatedTarget (where focus is going) immediately
        const relatedTarget = event.relatedTarget as Element | null;
        const widget = document.querySelector("speechos-widget");

        // If focus is going to another form field or the widget, don't hide
        const goingToFormField = isFormField(relatedTarget);
        const goingToWidget = widget && (widget.contains(relatedTarget) || widget.shadowRoot?.contains(relatedTarget) || relatedTarget === widget);
        // If focus is going to an element with data-speechos-no-close, don't hide
        const goingToNoCloseElement = Boolean(relatedTarget?.closest("[data-speechos-no-close]"));

        // console.log("[SpeechOS] blurHandler:", {
        //   relatedTarget,
        //   goingToFormField,
        //   goingToWidget,
        //   goingToNoCloseElement,
        // });

        if (goingToFormField || goingToWidget || goingToNoCloseElement) {
          console.log("[SpeechOS] blurHandler: early return, not hiding");
          return;
        }

        // Delay hiding to allow for any edge cases
        setTimeout(() => {
          // If widget is being interacted with, don't hide
          if (this.isWidgetBeingInteracted) {
            return;
          }

          // Double-check: verify focus is still not on a form field or widget
          const activeElement = document.activeElement;
          const isWidgetFocused = widget && (widget.contains(activeElement) || widget.shadowRoot?.contains(activeElement));
          // Check if focus is on an element with data-speechos-no-close
          const isNoCloseElementFocused = Boolean(activeElement?.closest("[data-speechos-no-close]"));
          const hasSelection = Boolean(state.getState().selectionText);

          // Only hide if no form field is focused AND widget isn't focused AND not a no-close element
          // AND alwaysVisible is not enabled
          if (!isFormField(activeElement) && !isWidgetFocused && !isNoCloseElementFocused && !hasSelection) {
            state.setFocusedElement(null);
            // Don't hide if alwaysVisible is enabled
            if (!isAlwaysVisible()) {
              state.hide();
            }
            events.emit("form:blur", { element: null });
          }
        }, 150);
      }
    };

    // Helper to check if event is on the widget
    const isWidgetInteraction = (target: Node | null, composedPath: EventTarget[]): boolean => {
      const widget = document.querySelector("speechos-widget");
      if (!widget) return false;

      return composedPath.includes(widget) || widget.contains(target) || widget.shadowRoot?.contains(target) || false;
    };

    // Track touch interactions with the widget (mobile support)
    this.touchHandler = (event: TouchEvent) => {
      const target = event.target as Node | null;
      const composedPath = event.composedPath ? event.composedPath() : [];

      if (isWidgetInteraction(target, composedPath)) {
        this.isWidgetBeingInteracted = true;
        // Reset flag after a delay to allow click/tap to process
        setTimeout(() => {
          this.isWidgetBeingInteracted = false;
        }, 300);
      }
    };

    // Track mouse interactions with the widget (desktop support)
    this.mouseDownHandler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const composedPath = event.composedPath ? event.composedPath() : [];

      if (isWidgetInteraction(target, composedPath)) {
        this.isWidgetBeingInteracted = true;
        // Reset flag after a delay to allow click to process
        setTimeout(() => {
          this.isWidgetBeingInteracted = false;
        }, 300);
      }
    };

    // Attach listeners to document
    document.addEventListener("focusin", this.focusHandler, true);
    document.addEventListener("focusout", this.blurHandler, true);
    document.addEventListener("touchstart", this.touchHandler, true);
    document.addEventListener("mousedown", this.mouseDownHandler, true);

    this.isActive = true;

    // Check for already-focused form field (e.g., page loaded with autofocus)
    const activeElement = document.activeElement;
    if (isFormField(activeElement)) {
      // console.log("[SpeechOS] FormDetector: found initially focused form field", {
      //   element: activeElement,
      //   tagName: activeElement?.tagName,
      // });
      state.setFocusedElement(activeElement);
      state.show();
      events.emit("form:focus", { element: activeElement });
    }
  }

  /**
   * Stop detecting form field focus events
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    // Remove event listeners
    if (this.focusHandler) {
      document.removeEventListener("focusin", this.focusHandler, true);
      this.focusHandler = null;
    }

    if (this.blurHandler) {
      document.removeEventListener("focusout", this.blurHandler, true);
      this.blurHandler = null;
    }

    if (this.touchHandler) {
      document.removeEventListener("touchstart", this.touchHandler, true);
      this.touchHandler = null;
    }

    if (this.mouseDownHandler) {
      document.removeEventListener("mousedown", this.mouseDownHandler, true);
      this.mouseDownHandler = null;
    }

    // Reset state
    this.isWidgetBeingInteracted = false;
    state.setFocusedElement(null);
    // Don't hide if alwaysVisible is enabled
    if (!isAlwaysVisible()) {
      state.hide();
    }

    this.isActive = false;
  }

  /**
   * Check if the detector is currently active
   */
  get active(): boolean {
    return this.isActive;
  }
}

// Export singleton instance
export const formDetector: FormDetector = new FormDetector();
