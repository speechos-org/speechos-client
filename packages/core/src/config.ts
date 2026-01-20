/**
 * Configuration management for SpeechOS Core SDK
 */

import type { SpeechOSCoreConfig } from "./types.js";

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
}

/**
 * Default configuration values
 */
const defaultConfig: ResolvedConfig = {
  apiKey: "",
  userId: "",
  host: DEFAULT_HOST,
  debug: false,
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
