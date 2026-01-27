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
  /** API key for authentication with SpeechOS backend (required) */
  apiKey: string;
  /** Optional user identifier for tracking which end user is using the SDK */
  userId?: string;
  /** Backend host URL for API calls (default: https://app.speechos.ai) */
  host?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom WebSocket factory for creating connections */
  webSocketFactory?: SpeechOSCoreConfig["webSocketFactory"];
  /** JWT token for server-side settings persistence */
  settingsToken?: string;
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
  /**
   * Keep widget always visible regardless of form focus.
   * When true, the widget remains visible even when no form field is focused.
   * Default: false
   */
  alwaysVisible?: boolean;
  /**
   * Use external settings page instead of built-in settings modal.
   * When true, clicking the settings button opens /a/extension-settings
   * at the configured host URL in a new tab.
   *
   * Default: false
   */
  useExternalSettings?: boolean;
  /**
   * Read-aloud behavior for selected text.
   * - true (default): enable with defaults
   * - false: disable read-aloud
   * - ReadAloudConfig: customize behavior
   */
  readAloud?: boolean | ReadAloudConfig;
}

/**
 * Configuration for read-aloud behavior
 */
export interface ReadAloudConfig {
  /** Enable read-aloud (default: true) */
  enabled?: boolean;
  /** Minimum selected text length to enable read button (default: 1) */
  minLength?: number;
  /** Maximum characters to read (default: no limit) */
  maxLength?: number;
  /** Auto-show widget when text is selected (default: true) */
  showOnSelection?: boolean;
}

/**
 * Resolved read-aloud configuration
 */
export interface ResolvedReadAloudConfig {
  enabled: boolean;
  minLength: number;
  maxLength: number | null;
  showOnSelection: boolean;
}

/**
 * Resolved client config with defaults applied
 */
export interface ResolvedClientConfig {
  commands: CommandDefinition[];
  zIndex: number;
  alwaysVisible: boolean;
  useExternalSettings: boolean;
  readAloud: ResolvedReadAloudConfig;
}

/**
 * Default client configuration values
 */
const defaultClientConfig: ResolvedClientConfig = {
  commands: [],
  zIndex: 999999,
  alwaysVisible: false,
  useExternalSettings: false,
  readAloud: {
    enabled: true,
    minLength: 1,
    maxLength: null,
    showOnSelection: true,
  },
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
  const resolvedReadAloud = resolveReadAloudConfig(config.readAloud);
  const resolved: ResolvedClientConfig = {
    commands: config.commands ?? defaultClientConfig.commands,
    zIndex: config.zIndex ?? defaultClientConfig.zIndex,
    alwaysVisible: config.alwaysVisible ?? defaultClientConfig.alwaysVisible,
    useExternalSettings: config.useExternalSettings ?? defaultClientConfig.useExternalSettings,
    readAloud: resolvedReadAloud,
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

function resolveReadAloudConfig(
  config?: boolean | ReadAloudConfig
): ResolvedReadAloudConfig {
  if (config === false) {
    return {
      ...defaultClientConfig.readAloud,
      enabled: false,
    };
  }

  if (config === true || config === undefined) {
    return { ...defaultClientConfig.readAloud };
  }

  const resolved: ResolvedReadAloudConfig = {
    enabled: config.enabled ?? defaultClientConfig.readAloud.enabled,
    minLength: config.minLength ?? defaultClientConfig.readAloud.minLength,
    maxLength:
      typeof config.maxLength === "number" ? config.maxLength : defaultClientConfig.readAloud.maxLength,
    showOnSelection:
      config.showOnSelection ?? defaultClientConfig.readAloud.showOnSelection,
  };

  if (resolved.minLength < 1) {
    resolved.minLength = 1;
  }

  if (resolved.maxLength !== null && resolved.maxLength < resolved.minLength) {
    resolved.maxLength = resolved.minLength;
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

/**
 * Check if widget should always be visible
 */
export function isAlwaysVisible(): boolean {
  return currentClientConfig.alwaysVisible;
}

/**
 * Check if external settings page should be used
 */
export function useExternalSettings(): boolean {
  return currentClientConfig.useExternalSettings;
}

/**
 * Get read-aloud configuration
 */
export function getReadAloudConfig(): ResolvedReadAloudConfig {
  return { ...currentClientConfig.readAloud };
}

/**
 * Check if read-aloud is enabled
 */
export function isReadAloudEnabled(): boolean {
  return currentClientConfig.readAloud.enabled;
}
