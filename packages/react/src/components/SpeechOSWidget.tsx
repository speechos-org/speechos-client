/**
 * SpeechOSWidget - React wrapper for the Lit Web Component widget
 *
 * Mounts the existing <speechos-widget> Web Component and forwards
 * React props as attributes and event handlers.
 */

import { useEffect, useRef, useCallback } from "react";
import { useSpeechOSContext } from "../context.js";
import { events, type SpeechOSEventMap } from "@speechos/core";

/**
 * Props for SpeechOSWidget
 */
export interface SpeechOSWidgetProps {
  /**
   * API key for SpeechOS authentication.
   * If not provided, must be set via SpeechOSProvider config.
   */
  apiKey?: string;

  /**
   * Optional user identifier for tracking
   */
  userId?: string;

  /**
   * Backend host URL (for development/testing)
   */
  host?: string;

  /**
   * Custom z-index for the widget overlay.
   * Note: This is handled by @speechos/client, not core SDK.
   * @deprecated Use SpeechOS.init() from @speechos/client with zIndex instead
   */
  zIndex?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Callback when transcription is completed and inserted
   */
  onTranscription?: (text: string, element: HTMLElement) => void;

  /**
   * Callback when edit is completed and applied
   */
  onEdit?: (editedText: string, originalText: string, element: HTMLElement) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: { code: string; message: string; source: string }) => void;

  /**
   * Callback when widget becomes visible
   */
  onShow?: () => void;

  /**
   * Callback when widget is hidden
   */
  onHide?: () => void;

  /**
   * Additional class name for the container
   */
  className?: string;
}

// Type declaration for the custom element
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "speechos-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

/**
 * SpeechOSWidget - React wrapper for the SpeechOS Web Component
 *
 * This component mounts the existing <speechos-widget> Lit Web Component
 * and bridges React props to the Web Component's attributes and events.
 *
 * Note: Requires @speechos/client to be installed and imported somewhere
 * in your app to register the Web Component.
 *
 * @example
 * ```tsx
 * import { SpeechOSProvider, SpeechOSWidget } from '@speechos/react';
 * import '@speechos/client'; // Registers the Web Component
 *
 * function App() {
 *   return (
 *     <SpeechOSProvider>
 *       <MyForm />
 *       <SpeechOSWidget
 *         apiKey="your-key"
 *         onTranscription={(text) => console.log('Transcribed:', text)}
 *         onError={(error) => console.error(error)}
 *       />
 *     </SpeechOSProvider>
 *   );
 * }
 * ```
 */
export function SpeechOSWidget({
  apiKey,
  userId,
  host,
  zIndex,
  debug,
  onTranscription,
  onEdit,
  onError,
  onShow,
  onHide,
  className,
}: SpeechOSWidgetProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLElement | null>(null);
  const { init, isInitialized } = useSpeechOSContext();

  // Initialize SpeechOS with config from props if not already initialized
  // Note: zIndex is a client-side only config (handled by @speechos/client)
  useEffect(() => {
    if (!isInitialized && apiKey) {
      init({
        apiKey,
        userId,
        host,
        debug,
      });
    }
  }, [isInitialized, init, apiKey, userId, host, debug]);

  // Subscribe to SpeechOS events and forward to React callbacks
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    if (onTranscription) {
      unsubscribers.push(
        events.on("transcription:inserted", (payload) => {
          onTranscription(payload.text, payload.element);
        })
      );
    }

    if (onEdit) {
      unsubscribers.push(
        events.on("edit:applied", (payload) => {
          onEdit(payload.editedContent, payload.originalContent, payload.element);
        })
      );
    }

    if (onError) {
      unsubscribers.push(
        events.on("error", (payload) => {
          onError(payload);
        })
      );
    }

    if (onShow) {
      unsubscribers.push(
        events.on("widget:show", () => {
          onShow();
        })
      );
    }

    if (onHide) {
      unsubscribers.push(
        events.on("widget:hide", () => {
          onHide();
        })
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [onTranscription, onEdit, onError, onShow, onHide]);

  // Mount the Web Component
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if the Web Component is registered
    const isWebComponentRegistered = customElements.get("speechos-widget") !== undefined;

    if (!isWebComponentRegistered) {
      console.warn(
        'SpeechOSWidget: <speechos-widget> Web Component is not registered. ' +
        'Make sure to import @speechos/client in your app.'
      );
      return;
    }

    // Create and mount the Web Component
    const widget = document.createElement("speechos-widget");

    containerRef.current.appendChild(widget);
    widgetRef.current = widget;

    return () => {
      if (widgetRef.current && containerRef.current) {
        containerRef.current.removeChild(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ display: "contents" }}
    />
  );
}
