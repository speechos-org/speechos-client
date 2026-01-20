/**
 * Shared utilities for SpeechOS test pages
 *
 * Provides localStorage helper functions to share configuration
 * between the main test page (index.html) and React hooks test page (react.html).
 */

import type { SpeechOSConfig } from '@speechos/core';

// localStorage keys (shared with index.html)
const STORAGE_KEYS = {
  API_KEY: 'speechos-api-key',
  USER_ID: 'speechos-user-id',
  ENVIRONMENT: 'speechos-environment',
  ACTIVE_TAB: 'speechos-react-active-tab',
} as const;

// Environment URLs
const ENVIRONMENTS = {
  local: 'http://localhost:8000',
  prod: 'https://app.speechos.ai',
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

/**
 * Load SpeechOS configuration from localStorage
 */
export function loadConfig(): SpeechOSConfig {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || undefined;
  const userId = localStorage.getItem(STORAGE_KEYS.USER_ID) || undefined;
  const environment = getEnvironment();

  return {
    apiKey,
    userId,
    host: ENVIRONMENTS[environment],
    debug: true,
  };
}

/**
 * Save API key to localStorage
 */
export function saveApiKey(apiKey: string): void {
  if (apiKey) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }
}

/**
 * Get API key from localStorage
 */
export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

/**
 * Save user ID to localStorage
 */
export function saveUserId(userId: string): void {
  if (userId) {
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  }
}

/**
 * Get user ID from localStorage
 */
export function getUserId(): string {
  return localStorage.getItem(STORAGE_KEYS.USER_ID) || '';
}

/**
 * Save environment to localStorage
 */
export function saveEnvironment(env: Environment): void {
  localStorage.setItem(STORAGE_KEYS.ENVIRONMENT, env);
}

/**
 * Get environment from localStorage
 */
export function getEnvironment(): Environment {
  const env = localStorage.getItem(STORAGE_KEYS.ENVIRONMENT);
  return (env === 'prod' || env === 'local') ? env : 'local';
}

/**
 * Get the host URL for the current environment
 */
export function getHost(): string {
  return ENVIRONMENTS[getEnvironment()];
}

/**
 * Save active tab to localStorage
 */
export function saveActiveTab(tab: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tab);
}

/**
 * Get active tab from localStorage
 */
export function getActiveTab(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB) || 'dictation';
}

/**
 * Check if configuration is valid (has API key)
 */
export function hasValidConfig(): boolean {
  const apiKey = getApiKey();
  return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Format a timestamp for display
 */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * Format JSON for display with syntax highlighting classes
 */
export function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
