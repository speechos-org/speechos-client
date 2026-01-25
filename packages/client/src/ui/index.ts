/**
 * UI module exports
 * Lit-based Shadow DOM components
 */

// Patch customElements.define to silently ignore duplicate registrations for speechos-* elements.
// This prevents errors when the extension loads on a page that already has SpeechOS.
// The patch is scoped to only affect speechos-* tags to avoid unintended effects on host pages.
const originalDefine = customElements.define.bind(customElements);
customElements.define = (name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions) => {
  // Only intercept speechos-* elements
  if (name.startsWith("speechos-")) {
    if (customElements.get(name) === undefined) {
      originalDefine(name, constructor, options);
    }
    // Skip silently if already registered
  } else {
    // Pass through for non-speechos elements
    originalDefine(name, constructor, options);
  }
};

// Import components to register them
import "./widget.js";
import "./mic-button.js";
import "./action-bubbles.js";
import "./settings-button.js";
import "./settings-modal.js";
import "./audio-level-meter.js";
import "./audio-visualizer.js";
import "./dictation-output-modal.js";
import "./edit-help-modal.js";

// Restore original customElements.define after our components are registered
customElements.define = originalDefine;

// Re-export component classes for programmatic use
export { SpeechOSWidget } from "./widget.js";
export { SpeechOSMicButton } from "./mic-button.js";
export { SpeechOSActionBubbles } from "./action-bubbles.js";
export { SpeechOSSettingsButton } from "./settings-button.js";
export { SpeechOSSettingsModal } from "./settings-modal.js";
export { SpeechOSAudioLevelMeter } from "./audio-level-meter.js";
export { SpeechOSAudioVisualizer } from "./audio-visualizer.js";
export { SpeechOSDictationOutputModal } from "./dictation-output-modal.js";
export { SpeechOSEditHelpModal } from "./edit-help-modal.js";

/**
 * Register all custom elements
 * This is automatically called when importing this module,
 * but can be called explicitly if needed
 */
export function registerComponents(): void {
  // Components are auto-registered via @customElement decorator
  // This function is here for explicit control if needed
  if (!customElements.get("speechos-widget")) {
    console.warn("SpeechOS components not yet registered");
  }
}
