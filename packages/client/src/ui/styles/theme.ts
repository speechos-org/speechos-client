/**
 * Shared styles and CSS variables for SpeechOS UI components
 */

import { css, type CSSResult } from 'lit';

/**
 * CSS variables and theme tokens
 * These can be customized by the host application
 */
export const themeStyles: CSSResult = css`
  :host {
    /* Font stack - system fonts for consistent rendering across sites */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";

    /* Color tokens */
    --speechos-primary: #10B981;
    --speechos-primary-hover: #059669;
    --speechos-primary-active: #047857;

    --speechos-bg: #ffffff;
    --speechos-bg-hover: #f9fafb;
    --speechos-surface: #f3f4f6;

    --speechos-text: #111827;
    --speechos-text-secondary: #6b7280;

    --speechos-border: #e5e7eb;
    --speechos-shadow: rgba(0, 0, 0, 0.1);
    --speechos-shadow-lg: rgba(0, 0, 0, 0.15);

    /* Spacing */
    --speechos-spacing-xs: 4px;
    --speechos-spacing-sm: 8px;
    --speechos-spacing-md: 12px;
    --speechos-spacing-lg: 16px;
    --speechos-spacing-xl: 24px;

    /* Border radius */
    --speechos-radius-sm: 6px;
    --speechos-radius-md: 8px;
    --speechos-radius-lg: 12px;
    --speechos-radius-full: 9999px;

    /* Transitions */
    --speechos-transition-fast: 150ms ease;
    --speechos-transition-base: 200ms ease;
    --speechos-transition-slow: 300ms ease;

    /* Z-index */
    --speechos-z-base: 999999;
    --speechos-z-popup: 1000000;
  }
`;

/**
 * Common animation keyframes
 */
export const animations: CSSResult = css`
  @keyframes speechos-fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes speechos-fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  @keyframes speechos-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(0.95);
    }
  }

  @keyframes speechos-slideUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes speechos-scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

/**
 * Utility styles for common patterns
 */
export const utilityStyles: CSSResult = css`
  .speechos-hidden {
    display: none !important;
  }

  .speechos-visible {
    display: block;
  }

  .speechos-fade-in {
    animation: speechos-fadeIn var(--speechos-transition-base) forwards;
  }

  .speechos-fade-out {
    animation: speechos-fadeOut var(--speechos-transition-base) forwards;
  }

  .speechos-pulse {
    animation: speechos-pulse 2s ease-in-out infinite;
  }
`;
