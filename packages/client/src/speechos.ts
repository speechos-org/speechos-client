/**
 * Main SpeechOS Client SDK class
 * Composes core logic with UI components
 */

import type {
  SpeechOSState,
  SessionSettings,
} from "@speechos/core";
import {
  setConfig,
  getConfig,
  updateUserId,
  state,
  events,
  getBackend,
  SpeechOSEventEmitter,
} from "@speechos/core";
import { formDetector, type FormDetectorInterface } from "./form-detector.js";
import { setClientConfig, getClientConfig, resetClientConfig, isAlwaysVisible } from "./config.js";
import type { SpeechOSClientConfig } from "./config.js";
import { setTextInputHandler, resetTextInputHandler } from "./text-input-handler.js";
import {
  getInputLanguageCode,
  getOutputLanguageCode,
  getSmartFormatEnabled,
} from "./stores/language-settings.js";
import { getSnippets } from "./stores/snippets-store.js";
import { getVocabulary } from "./stores/vocabulary-store.js";
import { getAudioDeviceId } from "./stores/audio-settings.js";
import "./ui/index.js"; // Auto-registers components

/**
 * Gather current user settings from stores into SessionSettings
 * Used when starting voice sessions to pass settings to core
 */
export function getSessionSettings(): SessionSettings {
  return {
    inputLanguageCode: getInputLanguageCode(),
    outputLanguageCode: getOutputLanguageCode(),
    smartFormat: getSmartFormatEnabled(),
    vocabulary: getVocabulary().map((v) => v.term),
    snippets: getSnippets().map((s) => ({ trigger: s.trigger, expansion: s.expansion })),
    audioDeviceId: getAudioDeviceId(),
  };
}

/**
 * Main SpeechOS class for initializing and managing the SDK with UI
 */
export class SpeechOS {
  private static instance: SpeechOS | null = null;
  private static widgetElement: HTMLElement | null = null;
  private static isInitialized = false;
  private static activeFormDetector: FormDetectorInterface | null = null;

  /**
   * Initialize the SpeechOS SDK
   * @param config - Configuration options
   * @throws Error if configuration is invalid (e.g., missing apiKey)
   */
  static init(config: SpeechOSClientConfig): void {
    if (this.isInitialized) {
      console.warn("SpeechOS is already initialized");
      return;
    }

    try {
      // Validate and set core configuration
      setConfig(config);
      // Validate and set client-specific configuration
      setClientConfig(config);
    } catch (error) {
      // Configuration errors are fatal - log and re-throw
      const errorMessage =
        error instanceof Error ? error.message : "Invalid configuration";
      console.error(`[SpeechOS] Error: ${errorMessage} (init_config)`);

      // Emit error event before throwing
      events.emit("error", {
        code: "init_config",
        message: errorMessage,
        source: "init",
      });

      throw error;
    }

    const finalConfig = getConfig();

    // Create singleton instance
    this.instance = new SpeechOS();

    // Handle form detection configuration
    const formDetection = config.formDetection ?? true;
    if (formDetection === true) {
      // Use default form detector
      formDetector.start();
      this.activeFormDetector = formDetector;
    } else if (typeof formDetection === "object") {
      // Use custom form detector implementation
      formDetection.start();
      this.activeFormDetector = formDetection;
    }
    // If formDetection === false, don't start any form detector

    // Handle custom text input handler
    if (config.textInputHandler) {
      setTextInputHandler(config.textInputHandler);
    }

    // Create and mount widget
    this.mountWidget();

    // If alwaysVisible is enabled, show the widget immediately
    if (isAlwaysVisible()) {
      state.show();
    }

    this.isInitialized = true;

    // Log initialization in debug mode
    if (finalConfig.debug) {
      console.log("[SpeechOS] Initialized with config:", finalConfig);
    }
  }

  /**
   * Destroy the SpeechOS SDK and clean up resources
   */
  static async destroy(): Promise<void> {
    if (!this.isInitialized) {
      console.warn("SpeechOS is not initialized");
      return;
    }

    // Stop form detection (whichever detector is active)
    if (this.activeFormDetector) {
      this.activeFormDetector.stop();
      this.activeFormDetector = null;
    }

    // Disconnect from voice backend
    await getBackend().disconnect();

    // Remove widget from DOM
    this.unmountWidget();

    // Clear all event listeners
    events.clear();

    // Reset state
    state.reset();

    // Reset client config
    resetClientConfig();

    // Reset text input handler to default
    resetTextInputHandler();

    // Clear instance
    this.instance = null;
    this.isInitialized = false;

    const config = getConfig();
    if (config.debug) {
      console.log("[SpeechOS] Destroyed and cleaned up");
    }
  }

  /**
   * Check if SpeechOS is initialized
   */
  static get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the current state
   */
  static getState(): SpeechOSState {
    return state.getState();
  }

  /**
   * Get the event emitter for external listeners
   */
  static get events(): SpeechOSEventEmitter {
    return events;
  }

  /**
   * Get the current client configuration
   */
  static getClientConfig(): ReturnType<typeof getClientConfig> {
    return getClientConfig();
  }

  /**
   * Mount the widget to the DOM
   */
  private static mountWidget(): void {
    if (this.widgetElement) {
      console.warn("Widget is already mounted");
      return;
    }

    // Create widget element
    const widget = document.createElement("speechos-widget");
    this.widgetElement = widget;

    // Append to body
    document.body.appendChild(widget);
  }

  /**
   * Unmount the widget from the DOM
   */
  private static unmountWidget(): void {
    if (this.widgetElement) {
      this.widgetElement.remove();
      this.widgetElement = null;
    }
  }

  /**
   * Show the widget programmatically
   */
  static show(): void {
    state.show();
  }

  /**
   * Hide the widget programmatically
   */
  static hide(): void {
    state.hide();
  }

  /**
   * Show the widget positioned for a specific element.
   * On mobile, the widget will anchor below the element.
   * On desktop, the widget stays at center bottom but tracks the element for dictation/edit.
   *
   * @param element - The element to show the widget for
   *
   * @example
   * const textarea = document.querySelector('textarea');
   * SpeechOS.showFor(textarea);
   */
  static showFor(element: HTMLElement): void {
    if (!this.isInitialized) {
      console.warn("SpeechOS.showFor() called before init(). Call init() first.");
      return;
    }
    state.setFocusedElement(element);
    state.show();
  }

  /**
   * Attach the widget to persistently track a specific element.
   * The widget will show and position relative to this element.
   * Equivalent to showFor() - the widget tracks the element until detach() is called.
   *
   * @param element - The element to attach to
   *
   * @example
   * const input = document.querySelector('input');
   * SpeechOS.attachTo(input);
   */
  static attachTo(element: HTMLElement): void {
    if (!this.isInitialized) {
      console.warn("SpeechOS.attachTo() called before init(). Call init() first.");
      return;
    }
    state.setFocusedElement(element);
    state.show();
  }

  /**
   * Detach the widget from any attached element.
   * Returns the widget to default positioning (center bottom of screen).
   *
   * @example
   * SpeechOS.detach();
   */
  static detach(): void {
    if (!this.isInitialized) {
      console.warn("SpeechOS.detach() called before init(). Call init() first.");
      return;
    }
    state.setFocusedElement(null);
  }

  /**
   * Identify the current user
   * Can be called after init() to associate sessions with a user identifier.
   *
   * @param userId - User identifier from your system (e.g., user ID, email)
   *
   * @example
   * // Initialize SDK
   * SpeechOS.init({ apiKey: 'xxx' });
   *
   * // Later, after user logs in
   * SpeechOS.identify('user_123');
   */
  static identify(userId: string): void {
    if (!this.isInitialized) {
      console.warn(
        "SpeechOS.identify() called before init(). Call init() first."
      );
      return;
    }

    const config = getConfig();

    // Update the userId in config
    updateUserId(userId);

    if (config.debug) {
      console.log(`[SpeechOS] User identified: ${userId}`);
    }
  }

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Singleton pattern - use SpeechOS.init() instead
  }
}

// Export singleton class as default
export default SpeechOS;
