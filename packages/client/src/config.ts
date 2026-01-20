/**
 * Client configuration for SpeechOS
 * Extends core config with UI/widget-specific options
 */

import type { SpeechOSCoreConfig, CommandDefinition } from "@speechos/core";
import type { FormDetectorInterface } from "./form-detector.js";
import type { TextInputHandlerInterface } from "./text-input-handler.js";

/**
 * Configuration options for SpeechOS Client
 * Extends core config with widget-specific options
 */
export interface SpeechOSClientConfig extends SpeechOSCoreConfig {
  /** Command definitions for voice command matching. If provided, shows Command button in widget. */
  commands?: CommandDefinition[];
  /** Custom z-index for widget overlay (default: 999999) */
  zIndex?: number;
  /**
   * Form detection behavior:
   * - true (default): Enable automatic form field detection
   * - false: Disable automatic detection (manual control only)
   * - FormDetectorInterface: Custom implementation
   */
  formDetection?: boolean | FormDetectorInterface;
  /**
   * Custom text input handler for cursor/selection detection and text operations.
   * Default: handles input, textarea, and contenteditable elements.
   */
  textInputHandler?: TextInputHandlerInterface;
}

/**
 * Resolved client config with defaults applied
 */
export interface ResolvedClientConfig {
  commands: CommandDefinition[];
  zIndex: number;
}

/**
 * Default client configuration values
 */
const defaultClientConfig: ResolvedClientConfig = {
  commands: [],
  zIndex: 999999,
};

/**
 * Current client configuration singleton
 */
let currentClientConfig: ResolvedClientConfig = { ...defaultClientConfig };

/**
 * Validate and resolve client-specific config
 * @param config - User-provided configuration
 * @returns Resolved client configuration
 */
export function validateClientConfig(config: SpeechOSClientConfig): ResolvedClientConfig {
  const resolved: ResolvedClientConfig = {
    commands: config.commands ?? defaultClientConfig.commands,
    zIndex: config.zIndex ?? defaultClientConfig.zIndex,
  };

  // Validate zIndex
  if (typeof resolved.zIndex !== "number" || resolved.zIndex < 0) {
    console.warn(
      `Invalid zIndex "${resolved.zIndex}". Using default ${defaultClientConfig.zIndex}.`
    );
    resolved.zIndex = defaultClientConfig.zIndex;
  }

  return resolved;
}

/**
 * Set the client configuration
 * @param config - Client configuration to set
 */
export function setClientConfig(config: SpeechOSClientConfig): void {
  currentClientConfig = validateClientConfig(config);
}

/**
 * Get the current client configuration
 */
export function getClientConfig(): ResolvedClientConfig {
  return { ...currentClientConfig };
}

/**
 * Reset client configuration to defaults
 */
export function resetClientConfig(): void {
  currentClientConfig = { ...defaultClientConfig };
}

/**
 * Check if commands are configured (for showing Command button in widget)
 */
export function hasCommands(): boolean {
  return currentClientConfig.commands.length > 0;
}

/**
 * Get configured commands
 */
export function getCommands(): CommandDefinition[] {
  return [...currentClientConfig.commands];
}

/**
 * Get widget z-index
 */
export function getZIndex(): number {
  return currentClientConfig.zIndex;
}
