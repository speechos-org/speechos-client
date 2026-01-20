/**
 * SpeechOS React Context
 *
 * Provides React integration for SpeechOS SDK.
 * Uses useSyncExternalStore for efficient state synchronization.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  speechOS,
  state,
  events,
  type SpeechOSCoreConfig,
  type SpeechOSState,
  type SpeechOSEventMap,
  type UnsubscribeFn,
  type CommandDefinition,
  type CommandResult,
} from "@speechos/core";
import type { FormDetectorInterface } from "@speechos/client";
import type { TextInputHandlerInterface } from "@speechos/client";

/**
 * Context value exposed by SpeechOSProvider
 */
export interface SpeechOSContextValue {
  // State
  state: SpeechOSState;
  isInitialized: boolean;

  // High-level API
  init: (config: SpeechOSCoreConfig) => void;
  dictate: () => Promise<string>;
  stopDictation: () => Promise<string>;
  edit: (text: string) => Promise<string>;
  stopEdit: () => Promise<string>;
  command: (commands: CommandDefinition[]) => Promise<CommandResult | null>;
  stopCommand: () => Promise<CommandResult | null>;
  cancel: () => Promise<void>;

  // Events
  on: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => UnsubscribeFn;
  off: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => void;
}

// Create context with undefined default (must be used within provider)
const SpeechOSContext: React.Context<SpeechOSContextValue | undefined> =
  createContext<SpeechOSContextValue | undefined>(undefined);

SpeechOSContext.displayName = "SpeechOSContext";

/**
 * Extended config for React provider
 * Includes client-specific options like form detection and text input handler
 */
export interface SpeechOSReactConfig extends SpeechOSCoreConfig {
  /** Command definitions for voice command matching */
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
 * Props for SpeechOSProvider
 */
export interface SpeechOSProviderProps {
  /**
   * Optional initial configuration.
   * If provided, SDK will be initialized automatically.
   * Supports all core config options plus client-specific options like formDetection.
   */
  config?: SpeechOSReactConfig;
  children: ReactNode;
}

/**
 * SpeechOS Provider component
 *
 * Wraps your app to provide SpeechOS context to all child components.
 * Can optionally auto-initialize with a config.
 *
 * @example
 * ```tsx
 * <SpeechOSProvider config={{ apiKey: 'your-key' }}>
 *   <App />
 * </SpeechOSProvider>
 * ```
 */
export function SpeechOSProvider({
  config,
  children,
}: SpeechOSProviderProps): ReactNode {
  // Subscribe to state changes using useSyncExternalStore
  const currentState = useSyncExternalStore(
    // subscribe function
    useCallback((onStoreChange: () => void) => {
      return state.subscribe(onStoreChange);
    }, []),
    // getSnapshot function
    useCallback(() => state.getState(), []),
    // getServerSnapshot function (for SSR)
    useCallback(() => state.getState(), [])
  );

  // Auto-initialize if config is provided and not already initialized
  const isInitialized = speechOS.isInitialized();
  if (config && !isInitialized) {
    speechOS.init(config);
  }

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<SpeechOSContextValue>(() => {
    return {
      // State
      state: currentState,
      isInitialized: speechOS.isInitialized(),

      // High-level API
      init: (cfg: SpeechOSCoreConfig) => speechOS.init(cfg),
      dictate: () => speechOS.dictate(),
      stopDictation: () => speechOS.stopDictation(),
      edit: (text: string) => speechOS.edit(text),
      stopEdit: () => speechOS.stopEdit(),
      command: (commands: CommandDefinition[]) => speechOS.command(commands),
      stopCommand: () => speechOS.stopCommand(),
      cancel: () => speechOS.cancel(),

      // Events
      on: (event, callback) => events.on(event, callback),
      off: (event, callback) => {
        // Note: The core events system doesn't have a direct 'off' method,
        // so we need to track subscriptions. For now, this is a no-op
        // as users should use the unsubscribe function returned by 'on'.
        console.warn(
          "SpeechOS: Use the unsubscribe function returned by on() instead of off()"
        );
      },
    };
  }, [currentState]);

  return (
    <SpeechOSContext.Provider value={contextValue}>
      {children}
    </SpeechOSContext.Provider>
  );
}

/**
 * Hook to access the SpeechOS context
 *
 * @throws Error if used outside of SpeechOSProvider
 * @returns The SpeechOS context value
 */
export function useSpeechOSContext(): SpeechOSContextValue {
  const context = useContext(SpeechOSContext);
  if (context === undefined) {
    throw new Error(
      "useSpeechOSContext must be used within a SpeechOSProvider"
    );
  }
  return context;
}

export { SpeechOSContext };
