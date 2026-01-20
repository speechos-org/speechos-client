/**
 * useSpeechOSWidget - Hook for programmatic widget control
 *
 * Provides methods to show, hide, and position the SpeechOS widget
 * without relying on automatic form field detection.
 */

import { useCallback } from "react";
import { state, type SpeechOSState } from "@speechos/core";
import { useSpeechOSState } from "./useSpeechOSState.js";

/**
 * Result type for useSpeechOSWidget hook
 */
export interface UseSpeechOSWidgetResult {
  /**
   * Show widget positioned for a specific element.
   * On mobile, widget anchors below the element.
   * On desktop, widget stays at center bottom but tracks element for dictation/edit.
   */
  showFor: (element: HTMLElement) => void;

  /**
   * Attach widget to persistently track a specific element.
   * Equivalent to showFor() - widget tracks element until detach() is called.
   */
  attachTo: (element: HTMLElement) => void;

  /**
   * Detach widget from any attached element.
   * Returns widget to default positioning (center bottom of screen).
   */
  detach: () => void;

  /**
   * Show the widget (default position)
   */
  show: () => void;

  /**
   * Hide the widget
   */
  hide: () => void;

  /**
   * Whether the widget is currently visible
   */
  isVisible: boolean;

  /**
   * Whether the widget is currently expanded (showing action bubbles)
   */
  isExpanded: boolean;

  /**
   * The currently focused/attached element, if any
   */
  focusedElement: HTMLElement | null;
}

/**
 * Hook for programmatic widget control
 *
 * Use this hook when you want to control the widget manually instead of
 * relying on automatic form field detection.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showFor, hide, isVisible } = useSpeechOSWidget();
 *   const textareaRef = useRef<HTMLTextAreaElement>(null);
 *
 *   return (
 *     <div>
 *       <textarea ref={textareaRef} />
 *       <button onClick={() => showFor(textareaRef.current!)}>
 *         Enable Voice Input
 *       </button>
 *       {isVisible && (
 *         <button onClick={hide}>Hide Widget</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpeechOSWidget(): UseSpeechOSWidgetResult {
  const speechOSState = useSpeechOSState();

  const showFor = useCallback((element: HTMLElement) => {
    state.setFocusedElement(element);
    state.show();
  }, []);

  const attachTo = useCallback((element: HTMLElement) => {
    state.setFocusedElement(element);
    state.show();
  }, []);

  const detach = useCallback(() => {
    state.setFocusedElement(null);
  }, []);

  const show = useCallback(() => {
    state.show();
  }, []);

  const hide = useCallback(() => {
    state.hide();
  }, []);

  return {
    showFor,
    attachTo,
    detach,
    show,
    hide,
    isVisible: speechOSState.isVisible,
    isExpanded: speechOSState.isExpanded,
    focusedElement: speechOSState.focusedElement,
  };
}
