/**
 * Typed event system for SpeechOS SDK
 * Provides a type-safe event emitter for cross-component communication
 */

import type { SpeechOSEventMap, UnsubscribeFn } from "./types.js";

type EventCallback<K extends keyof SpeechOSEventMap> = (
  payload: SpeechOSEventMap[K]
) => void;

/**
 * Type-safe event emitter for SpeechOS events
 */
export class SpeechOSEventEmitter {
  private listeners: Map<keyof SpeechOSEventMap, Set<EventCallback<any>>> =
    new Map();

  /**
   * Subscribe to an event
   * @param event - Event name to listen to
   * @param callback - Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<K extends keyof SpeechOSEventMap>(
    event: K,
    callback: EventCallback<K>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event once (automatically unsubscribes after first call)
   * @param event - Event name to listen to
   * @param callback - Function to call when event is emitted
   * @returns Unsubscribe function
   */
  once<K extends keyof SpeechOSEventMap>(
    event: K,
    callback: EventCallback<K>
  ): UnsubscribeFn {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      callback(payload);
    });
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers
   * @param event - Event name to emit
   * @param payload - Event payload data
   */
  emit<K extends keyof SpeechOSEventMap>(
    event: K,
    payload: SpeechOSEventMap[K]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(
            `Error in event listener for "${String(event)}":`,
            error
          );
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event or all events
   * @param event - Optional event name to clear listeners for
   */
  clear(event?: keyof SpeechOSEventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: keyof SpeechOSEventMap): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// Export singleton instance
export const events: SpeechOSEventEmitter = new SpeechOSEventEmitter();
