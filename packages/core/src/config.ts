/**
 * Configuration management for SpeechOS Core SDK
 */

import type { SpeechOSCoreConfig, WebSocketFactory } from "./types.js";

/**
 * Default host - can be overridden by SPEECHOS_HOST env var at build time
 */
export const DEFAULT_HOST: string =
  (typeof process !== "undefined" && process.env?.SPEECHOS_HOST) ||
  "https://app.speechos.ai";

/**
 * Configuration with defaults applied (all fields required internally)
 */
interface ResolvedConfig {
  apiKey: string;
  userId: string;
  host: string;
  debug: boolean;
  /** Custom WebSocket factory (undefined means use native WebSocket) */
  webSocketFactory: WebSocketFactory | undefined;
}

/**
 * Default configuration values
 */
const defaultConfig: ResolvedConfig = {
  apiKey: "",
  userId: "",
  host: DEFAULT_HOST,
  debug: false,
  webSocketFactory: undefined,
};

/**
 * Validates and merges user config with defaults
 * @param userConfig - User-provided configuration
 * @returns Validated and merged configuration
 */
export function validateConfig(userConfig: SpeechOSCoreConfig): ResolvedConfig {
  // Validate apiKey is provided
  if (!userConfig.apiKey) {
    throw new Error(
      "SpeechOS requires an apiKey. Get one from your team dashboard at /a/<team-slug>/."
    );
  }

  return {
    apiKey: userConfig.apiKey,
    userId: userConfig.userId ?? defaultConfig.userId,
    host: userConfig.host ?? defaultConfig.host,
    debug: userConfig.debug ?? defaultConfig.debug,
    webSocketFactory: userConfig.webSocketFactory ?? defaultConfig.webSocketFactory,
  };
}

/**
 * Current active configuration (singleton)
 */
let currentConfig: ResolvedConfig = { ...defaultConfig };

/**
 * Get the current configuration
 */
export function getConfig(): ResolvedConfig {
  return { ...currentConfig };
}

/**
 * Set the current configuration
 * @param config - Configuration to set
 */
export function setConfig(config: SpeechOSCoreConfig): void {
  currentConfig = validateConfig(config);
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * Update the userId in the current configuration
 * @param userId - The user identifier to set
 */
export function updateUserId(userId: string): void {
  currentConfig = { ...currentConfig, userId };
}

/**
 * LocalStorage key for anonymous ID persistence
 */
const ANONYMOUS_ID_KEY = 'speechos_anonymous_id';

/**
 * Get or generate a persistent anonymous ID for Mixpanel tracking.
 *
 * This ID is stored in localStorage to persist across sessions,
 * allowing consistent anonymous user tracking without identifying
 * the account owner's customers.
 *
 * @returns A UUID string for anonymous identification
 */
export function getAnonymousId(): string {
  // Only available in browser environments with localStorage
  if (typeof localStorage === 'undefined') {
    return crypto.randomUUID();
  }

  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }
  return anonymousId;
}
