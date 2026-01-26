/**
 * Microphone button component
 * A circular button that toggles the action bubbles and handles recording states
 */

import {
  LitElement,
  html,
  css,
  type CSSResultGroup,
  type TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators.js";
import { themeStyles, animations } from "./styles/theme.js";
import { micIcon, stopIcon, loaderIcon, xIcon, checkIcon } from "./icons.js";
import type { RecordingState, SpeechOSAction } from "@speechos/core";
import "./audio-visualizer.js";

@customElement("speechos-mic-button")
export class SpeechOSMicButton extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    animations,
    css`
      :host {
        display: inline-block;
      }

      .button-wrapper {
        position: relative;
      }

      .mic-button {
        width: 56px;
        height: 56px;
        border-radius: var(--speechos-radius-full);
        background: #10b981;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .mic-button:hover {
        background: #059669;
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(16, 185, 129, 0.45);
      }

      .mic-button:active {
        transform: scale(0.98);
      }

      .mic-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4), 0 4px 16px rgba(16, 185, 129, 0.35);
      }

      /* Expanded state - bubbles visible */
      .mic-button.expanded {
        background: #059669;
      }

      /* Connecting state - Siri-style metallic spinner */
      .mic-button.connecting {
        background: radial-gradient(
          circle at 30% 30%,
          #2dd4bf 0%,
          #14b8a6 40%,
          #0d9488 70%,
          #0f766e 100%
        );
        cursor: wait;
        box-shadow: 0 0 20px rgba(13, 148, 136, 0.4),
          0 0 40px rgba(13, 148, 136, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
      }

      .mic-button.connecting .button-icon {
        opacity: 0.9;
        animation: connecting-breathe 2s ease-in-out infinite;
      }

      @keyframes connecting-breathe {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.85;
        }
        50% {
          transform: scale(0.92);
          opacity: 1;
        }
      }

      /* Siri-style spinning metallic ring */
      .siri-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 72px;
        height: 72px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
      }

      /* Outer spinning gradient ring */
      .siri-ring::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        padding: 3px;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(45, 212, 191, 0.1) 30deg,
          rgba(13, 148, 136, 0.8) 90deg,
          rgba(255, 255, 255, 0.95) 120deg,
          rgba(45, 212, 191, 0.9) 150deg,
          rgba(13, 148, 136, 0.6) 180deg,
          rgba(15, 118, 110, 0.3) 210deg,
          transparent 270deg,
          rgba(94, 234, 212, 0.2) 300deg,
          rgba(13, 148, 136, 0.5) 330deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin 1.8s linear infinite;
        filter: blur(0.5px);
      }

      /* Inner shimmer layer - counter-rotating */
      .siri-ring::after {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        padding: 2px;
        background: conic-gradient(
          from 180deg,
          transparent 0deg,
          rgba(153, 246, 228, 0.3) 60deg,
          rgba(255, 255, 255, 0.7) 90deg,
          rgba(94, 234, 212, 0.5) 120deg,
          transparent 180deg,
          rgba(45, 212, 191, 0.2) 240deg,
          rgba(255, 255, 255, 0.5) 270deg,
          rgba(13, 148, 136, 0.4) 300deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin-reverse 2.4s linear infinite;
        opacity: 0.7;
      }

      @keyframes siri-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes siri-spin-reverse {
        from {
          transform: rotate(360deg);
        }
        to {
          transform: rotate(0deg);
        }
      }

      /* Ambient glow pulse behind the ring */
      .siri-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 90px;
        height: 90px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(13, 148, 136, 0.4) 0%,
          rgba(13, 148, 136, 0.15) 40%,
          transparent 70%
        );
        animation: siri-glow-pulse 2s ease-in-out infinite;
        filter: blur(8px);
      }

      @keyframes siri-glow-pulse {
        0%,
        100% {
          opacity: 0.6;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.15);
        }
      }

      /* Recording state - red with pulse */
      .mic-button.recording {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      }

      .mic-button.recording:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
      }

      /* Pulse ring animation for recording */
      .pulse-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }

      .pulse-ring::before,
      .pulse-ring::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.4);
        animation: pulse-ring 1.5s ease-out infinite;
      }

      .pulse-ring::after {
        animation-delay: 0.5s;
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        100% {
          transform: scale(1.8);
          opacity: 0;
        }
      }

      /* Processing state (transcribing) - Siri-style amber */
      .mic-button.processing {
        background: radial-gradient(
          circle at 30% 30%,
          #fbbf24 0%,
          #f59e0b 40%,
          #d97706 70%,
          #b45309 100%
        );
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.4),
          0 0 40px rgba(245, 158, 11, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
        cursor: wait;
      }

      .mic-button.processing .button-icon {
        opacity: 0.9;
        animation: processing-breathe 2s ease-in-out infinite;
      }

      @keyframes processing-breathe {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.85;
        }
        50% {
          transform: scale(0.92);
          opacity: 1;
        }
      }

      /* Processing state (editing) - Siri-style purple */
      .mic-button.processing.editing {
        background: radial-gradient(
          circle at 30% 30%,
          #a78bfa 0%,
          #8b5cf6 40%,
          #7c3aed 70%,
          #6d28d9 100%
        );
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.4),
          0 0 40px rgba(139, 92, 246, 0.2),
          inset 0 0 20px rgba(255, 255, 255, 0.1);
      }

      /* Siri-style spinning ring for transcribing (amber) */
      .siri-ring-transcribe {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 72px;
        height: 72px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
      }

      .siri-ring-transcribe::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        padding: 3px;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(251, 191, 36, 0.1) 30deg,
          rgba(245, 158, 11, 0.8) 90deg,
          rgba(255, 255, 255, 0.95) 120deg,
          rgba(251, 191, 36, 0.9) 150deg,
          rgba(245, 158, 11, 0.6) 180deg,
          rgba(217, 119, 6, 0.3) 210deg,
          transparent 270deg,
          rgba(252, 211, 77, 0.2) 300deg,
          rgba(245, 158, 11, 0.5) 330deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin 1.8s linear infinite;
        filter: blur(0.5px);
      }

      .siri-ring-transcribe::after {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        padding: 2px;
        background: conic-gradient(
          from 180deg,
          transparent 0deg,
          rgba(253, 230, 138, 0.3) 60deg,
          rgba(255, 255, 255, 0.7) 90deg,
          rgba(252, 211, 77, 0.5) 120deg,
          transparent 180deg,
          rgba(251, 191, 36, 0.2) 240deg,
          rgba(255, 255, 255, 0.5) 270deg,
          rgba(245, 158, 11, 0.4) 300deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin-reverse 2.4s linear infinite;
        opacity: 0.7;
      }

      /* Ambient glow for transcribing */
      .siri-glow-transcribe {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 90px;
        height: 90px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(245, 158, 11, 0.4) 0%,
          rgba(245, 158, 11, 0.15) 40%,
          transparent 70%
        );
        animation: siri-glow-pulse 2s ease-in-out infinite;
        filter: blur(8px);
      }

      /* Siri-style spinning ring for editing (purple) */
      .siri-ring-edit {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 72px;
        height: 72px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
      }

      .siri-ring-edit::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 50%;
        padding: 3px;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(167, 139, 250, 0.1) 30deg,
          rgba(139, 92, 246, 0.8) 90deg,
          rgba(255, 255, 255, 0.95) 120deg,
          rgba(167, 139, 250, 0.9) 150deg,
          rgba(139, 92, 246, 0.6) 180deg,
          rgba(124, 58, 237, 0.3) 210deg,
          transparent 270deg,
          rgba(196, 181, 253, 0.2) 300deg,
          rgba(139, 92, 246, 0.5) 330deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin 1.8s linear infinite;
        filter: blur(0.5px);
      }

      .siri-ring-edit::after {
        content: "";
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        padding: 2px;
        background: conic-gradient(
          from 180deg,
          transparent 0deg,
          rgba(221, 214, 254, 0.3) 60deg,
          rgba(255, 255, 255, 0.7) 90deg,
          rgba(196, 181, 253, 0.5) 120deg,
          transparent 180deg,
          rgba(167, 139, 250, 0.2) 240deg,
          rgba(255, 255, 255, 0.5) 270deg,
          rgba(139, 92, 246, 0.4) 300deg,
          transparent 360deg
        );
        -webkit-mask: linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: siri-spin-reverse 2.4s linear infinite;
        opacity: 0.7;
      }

      /* Ambient glow for editing */
      .siri-glow-edit {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 90px;
        height: 90px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(139, 92, 246, 0.4) 0%,
          rgba(139, 92, 246, 0.15) 40%,
          transparent 70%
        );
        animation: siri-glow-pulse 2s ease-in-out infinite;
        filter: blur(8px);
      }

      /* Error state */
      .mic-button.error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        cursor: pointer;
      }

      .mic-button.error:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .button-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 1;
        transition: transform 0.2s ease;
      }

      /* Status label bubble above button - always centered */
      .status-label {
        position: absolute;
        bottom: calc(
          100% + var(--speechos-spacing-md)
        ); /* Same spacing as bubbles above */
        left: 50%;
        transform: translateX(-50%) scale(0.8);
        font-size: 11px;
        font-weight: 600;
        color: white;
        white-space: nowrap;
        opacity: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 6px 12px;
        border-radius: 20px;
        background: #374151;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 28px;
      }

      /* Pop-in animation when visible */
      .status-label.visible {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }

      /* When showing visualizer, remove pill background */
      .status-label.visualizer {
        background: transparent;
        padding: 0;
        box-shadow: none;
        min-width: auto;
        min-height: auto;
      }

      /* Recording state - red bubble with dot indicator */
      .status-label.recording {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        padding-left: 20px; /* Make room for the pulsing dot */
      }

      /* Subtle pulse animation for the label */
      .status-label.recording::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 8px;
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        transform: translateY(-50%);
        animation: label-pulse 1s ease-in-out infinite;
      }

      @keyframes label-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
      }

      /* Command feedback badge - success state (amber/orange) */
      .status-label.command-success {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        padding-left: 24px;
        animation: command-feedback-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)
          forwards;
      }

      .status-label.command-success::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 8px;
        width: 12px;
        height: 12px;
        transform: translateY(-50%);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
      }

      /* Command/edit feedback badge - no match/empty state (neutral gray) */
      .status-label.command-none,
      .status-label.edit-empty {
        background: #4b5563;
        box-shadow: 0 4px 12px rgba(75, 85, 99, 0.3);
        animation: command-feedback-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)
          forwards;
      }

      @keyframes command-feedback-in {
        0% {
          opacity: 0;
          transform: translateX(-50%) scale(0.8) translateY(4px);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) scale(1) translateY(0);
        }
      }

      /* Cancel button - positioned to the right of the main mic button */
      .cancel-button {
        position: absolute;
        top: 50%;
        right: -44px;
        transform: translateY(-50%) scale(0.6);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(24, 24, 27, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(63, 63, 70, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(161, 161, 170, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        opacity: 0;
      }

      .cancel-button.visible {
        opacity: 1;
        transform: translateY(-50%) scale(1);
        pointer-events: auto;
      }

      .cancel-button:hover {
        transform: translateY(-50%) scale(1.15);
        background: rgba(39, 39, 42, 0.9);
        border-color: rgba(63, 63, 70, 0.8);
        color: rgba(250, 250, 250, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }

      .cancel-button:active {
        transform: translateY(-50%) scale(0.95);
      }

      .cancel-button svg {
        stroke-width: 2.5;
      }

      /* Close/dismiss button - positioned to the right of the main mic button */
      .close-button {
        position: absolute;
        top: 50%;
        right: -44px;
        transform: translateY(-50%) scale(0.6);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(24, 24, 27, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(63, 63, 70, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(161, 161, 170, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        opacity: 0;
      }

      .close-button.visible {
        opacity: 1;
        transform: translateY(-50%) scale(1);
        pointer-events: auto;
      }

      .close-button:hover {
        transform: translateY(-50%) scale(1.15);
        background: rgba(39, 39, 42, 0.9);
        border-color: rgba(63, 63, 70, 0.8);
        color: rgba(250, 250, 250, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }

      .close-button:active {
        transform: translateY(-50%) scale(0.95);
      }

      .close-button svg {
        stroke-width: 2.5;
      }

      /* Error message display */
      .error-message {
        position: absolute;
        bottom: 72px; /* Above button */
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        min-width: 200px;
        max-width: 280px;
        width: max-content;
        font-size: 13px;
        color: white;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        text-align: center;
        padding: 12px 16px;
        border-radius: 12px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        opacity: 0;
        line-height: 1.4;
      }

      .error-message.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Retry button */
      .retry-button {
        display: block;
        margin: 8px auto 0;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        pointer-events: auto;
      }

      .retry-button:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
      }

      /* No audio warning banner */
      .no-audio-warning {
        position: absolute;
        bottom: 120px; /* Above button and waveform visualizer */
        left: 50%;
        transform: translateX(-50%) translateY(8px);
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 12px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        opacity: 0;
        white-space: nowrap;
      }

      .no-audio-warning.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        pointer-events: auto;
      }

      .no-audio-warning .warning-icon {
        flex-shrink: 0;
        color: white;
      }

      .no-audio-warning .warning-text {
        font-size: 13px;
        font-weight: 500;
        color: white;
      }

      .no-audio-warning .settings-link {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }

      .no-audio-warning .settings-link:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
      }

      /* Mobile styles - 30% larger */
      @media (max-width: 768px) and (hover: none) {
        .mic-button {
          width: 73px;
          height: 73px;
        }

        .button-icon {
          transform: scale(1.3);
        }

        .mic-button.connecting .button-icon {
          animation: connecting-breathe-mobile 2s ease-in-out infinite;
        }

        @keyframes connecting-breathe-mobile {
          0%,
          100% {
            transform: scale(1.3);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .mic-button.processing .button-icon {
          animation: processing-breathe-mobile 2s ease-in-out infinite;
        }

        @keyframes processing-breathe-mobile {
          0%,
          100% {
            transform: scale(1.3);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .siri-ring {
          width: 94px;
          height: 94px;
        }

        .siri-glow {
          width: 117px;
          height: 117px;
        }

        .siri-ring-transcribe {
          width: 94px;
          height: 94px;
        }

        .siri-glow-transcribe {
          width: 117px;
          height: 117px;
        }

        .siri-ring-edit {
          width: 94px;
          height: 94px;
        }

        .siri-glow-edit {
          width: 117px;
          height: 117px;
        }

        .cancel-button {
          width: 42px;
          height: 42px;
          right: -56px;
        }

        .cancel-button svg {
          transform: scale(1.3);
        }

        .close-button {
          width: 42px;
          height: 42px;
          right: -56px;
        }

        .close-button svg {
          transform: scale(1.3);
        }

        .status-label {
          font-size: 14px;
          padding: 8px 16px;
        }

        .status-label.recording {
          padding-left: 26px;
        }

        .status-label.recording::after {
          width: 8px;
          height: 8px;
          left: 10px;
        }

        .status-label.command-success {
          padding-left: 30px;
        }

        .status-label.command-success::before {
          left: 10px;
          width: 14px;
          height: 14px;
        }

        .error-message {
          font-size: 15px;
          padding: 14px 18px;
          min-width: 220px;
          max-width: 300px;
          bottom: 94px;
        }

        .retry-button {
          padding: 8px 14px;
          font-size: 14px;
        }

        .no-audio-warning {
          padding: 12px 16px;
          gap: 10px;
          bottom: 145px; /* Above button and waveform on mobile */
        }

        .no-audio-warning .warning-text {
          font-size: 15px;
        }

        .no-audio-warning .settings-link {
          padding: 6px 12px;
          font-size: 14px;
        }
      }
    `,
  ];

  @property({ type: Boolean })
  expanded = false;

  @property({ type: String })
  recordingState: RecordingState = "idle";

  @property({ type: String })
  activeAction: SpeechOSAction | null = null;

  @property({ type: String })
  editPreviewText: string = "";

  @property({ type: String })
  errorMessage: string | null = null;

  @property({ type: Boolean })
  showRetryButton = true;

  @property({ type: String })
  actionFeedback: "command-success" | "command-none" | "edit-empty" | null = null;

  @property({ type: Boolean })
  showNoAudioWarning = false;

  private handleClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    // Different behavior based on recording state
    if (this.recordingState === "recording") {
      // Stop recording
      this.dispatchEvent(
        new CustomEvent("stop-recording", {
          bubbles: true,
          composed: true,
        })
      );
    } else if (this.recordingState === "idle") {
      // Toggle bubbles menu
      this.dispatchEvent(
        new CustomEvent("mic-click", {
          bubbles: true,
          composed: true,
        })
      );
    } else if (this.recordingState === "error") {
      // Clear error on click
      this.dispatchEvent(
        new CustomEvent("cancel-operation", {
          bubbles: true,
          composed: true,
        })
      );
    }
    // Do nothing during connecting or processing states
  }

  private handleCancel(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    this.dispatchEvent(
      new CustomEvent("cancel-operation", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private stopEvent(e: Event): void {
    e.stopPropagation();
  }

  private handleClose(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    this.dispatchEvent(
      new CustomEvent("close-widget", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleRetry(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    this.dispatchEvent(
      new CustomEvent("retry-connection", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleOpenSettings(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    this.dispatchEvent(
      new CustomEvent("open-settings", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private getButtonClass(): string {
    const classes = ["mic-button"];

    if (this.expanded && this.recordingState === "idle") {
      classes.push("expanded");
    }

    if (this.recordingState !== "idle") {
      classes.push(this.recordingState);
      // Add editing class for purple styling during edit processing
      if (
        this.recordingState === "processing" &&
        this.activeAction === "edit"
      ) {
        classes.push("editing");
      }
    }

    return classes.join(" ");
  }

  private renderIcon(): TemplateResult {
    switch (this.recordingState) {
      case "connecting":
        return loaderIcon(24);
      case "recording":
        return stopIcon(20);
      case "processing":
        return loaderIcon(24);
      case "error":
        return xIcon(20);
      default:
        return micIcon(24);
    }
  }

  private getAriaLabel(): string {
    switch (this.recordingState) {
      case "connecting":
        return "Connecting...";
      case "recording":
        return "Stop recording";
      case "processing":
        return "Processing...";
      case "error":
        return "Connection error - click to dismiss";
      default:
        return "Open voice commands";
    }
  }

  /**
   * Truncate and format preview text for display
   */
  private formatPreviewText(text: string, maxLength: number = 10): string {
    // Trim whitespace and collapse multiple spaces
    const trimmed = text.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";

    if (trimmed.length <= maxLength) {
      return `"${trimmed}"`;
    }
    return `"${trimmed.substring(0, maxLength)}…"`;
  }

  private getStatusLabel(): string {
    switch (this.recordingState) {
      case "connecting":
      case "processing":
        // No text label - Siri-style animation speaks for itself
        return "";
      case "recording":
        if (this.activeAction === "edit" && this.editPreviewText) {
          const preview = this.formatPreviewText(this.editPreviewText);
          return `Editing ${preview}...`;
        }
        // Return empty - we'll show the audio visualizer instead
        return "";
      default:
        return "";
    }
  }

  private shouldShowVisualizer(): boolean {
    // Show visualizer during recording when not in edit mode with preview text
    return (
      this.recordingState === "recording" &&
      !(this.activeAction === "edit" && this.editPreviewText)
    );
  }

  private getStatusClass(): string {
    if (this.recordingState === "processing" && this.activeAction === "edit") {
      return "editing";
    }
    return this.recordingState;
  }

  private getActionFeedbackLabel(): string {
    if (this.actionFeedback === "command-success") {
      return "Got it!";
    }
    if (this.actionFeedback === "command-none") {
      return "No command matched";
    }
    if (this.actionFeedback === "edit-empty") {
      return "Couldn't understand edit";
    }
    return "";
  }

  render(): TemplateResult {
    const showPulse = this.recordingState === "recording";
    const showSiriConnecting = this.recordingState === "connecting";
    const showSiriTranscribe =
      this.recordingState === "processing" && this.activeAction !== "edit";
    const showSiriEdit =
      this.recordingState === "processing" && this.activeAction === "edit";
    const statusLabel = this.getStatusLabel();
    const showVisualizer = this.shouldShowVisualizer();
    // Show status label during recording (either visualizer or edit text) OR action feedback
    const showActionFeedback =
      this.recordingState === "idle" && this.actionFeedback !== null;
    const showStatus = this.recordingState === "recording" || showActionFeedback;
    const showCancel =
      this.recordingState === "connecting" ||
      this.recordingState === "recording" ||
      this.recordingState === "processing";
    const showError = this.recordingState === "error" && this.errorMessage;
    // Show close button in idle state (both solo mic and expanded), including when showing command feedback
    const showClose = this.recordingState === "idle";

    return html`
      <div class="button-wrapper">
        ${showPulse ? html`<div class="pulse-ring"></div>` : ""}
        ${showSiriConnecting
          ? html`
              <div class="siri-glow"></div>
              <div class="siri-ring"></div>
            `
          : ""}
        ${showSiriTranscribe
          ? html`
              <div class="siri-glow-transcribe"></div>
              <div class="siri-ring-transcribe"></div>
            `
          : ""}
        ${showSiriEdit
          ? html`
              <div class="siri-glow-edit"></div>
              <div class="siri-ring-edit"></div>
            `
          : ""}
        ${showError
          ? html`
              <div class="error-message ${showError ? "visible" : ""}">
                ${this.errorMessage}
                ${this.showRetryButton
                  ? html`
                      <button class="retry-button" @click="${this.handleRetry}">
                        Retry Connection
                      </button>
                    `
                  : ""}
              </div>
            `
          : ""}

        <div
          class="no-audio-warning ${this.showNoAudioWarning &&
          this.recordingState === "recording"
            ? "visible"
            : ""}"
        >
          <svg
            class="warning-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span class="warning-text">We're not hearing anything</span>
          <button class="settings-link" @click="${this.handleOpenSettings}">
            Check Settings
          </button>
        </div>

        <button
          class="${this.getButtonClass()}"
          @click="${this.handleClick}"
          aria-label="${this.getAriaLabel()}"
          title="${this.getAriaLabel()}"
          ?disabled="${this.recordingState === "connecting" ||
          this.recordingState === "processing"}"
        >
          <span class="button-icon">${this.renderIcon()}</span>
        </button>

        <span
          class="status-label ${showStatus ? "visible" : ""} ${showActionFeedback
            ? this.actionFeedback
            : showVisualizer
              ? "visualizer"
              : this.getStatusClass()}"
        >
          ${showActionFeedback
            ? this.getActionFeedbackLabel()
            : showVisualizer
              ? html`<speechos-audio-visualizer
                  ?active="${showVisualizer}"
                ></speechos-audio-visualizer>`
              : statusLabel}
        </span>

        <button
          class="close-button ${showClose ? "visible" : ""}"
          @click="${this.handleClose}"
          @mousedown="${this.stopEvent}"
          aria-label="Close"
          title="Close"
        >
          ${xIcon(16)}
        </button>

        <button
          class="cancel-button ${showCancel ? "visible" : ""}"
          @click="${this.handleCancel}"
          @mousedown="${this.stopEvent}"
          aria-label="Cancel"
          title="Cancel"
        >
          ${xIcon(16)}
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-mic-button": SpeechOSMicButton;
  }
}
