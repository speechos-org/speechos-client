/**
 * Shared styles for lightweight popup modals
 * Used by dictation-output-modal and edit-help-modal
 */

import { css } from "lit";

/** Base popup modal styles - simpler than full settings modal */
export const popupModalStyles = css`
  :host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: calc(var(--speechos-z-base) + 100);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: calc(var(--speechos-z-base) + 100);
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    pointer-events: none;
    backdrop-filter: blur(4px);
  }

  .modal-overlay.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .modal-card {
    background: #1a1d24;
    border-radius: 16px;
    width: 90%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    transform: scale(0.95) translateY(10px);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    overflow: hidden;
  }

  .modal-overlay.open .modal-card {
    transform: scale(1) translateY(0);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.2);
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .close-button {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.15s ease;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.1);
  }

  .btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.12);
    color: white;
  }

  .btn-primary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  /* Success state for copy button */
  .btn-success {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  }

  /* Text display area */
  .text-display {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 14px 16px;
    color: white;
    font-size: 14px;
    line-height: 1.5;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Scrollbar styling */
  .text-display::-webkit-scrollbar {
    width: 6px;
  }

  .text-display::-webkit-scrollbar-track {
    background: transparent;
  }

  .text-display::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }

  .text-display::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  /* Instruction list styling */
  .instruction-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .instruction-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .instruction-item:last-child {
    border-bottom: none;
  }

  .instruction-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .instruction-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.5;
    padding-top: 2px;
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .modal-card {
      width: 95%;
      max-width: none;
      border-radius: 12px;
    }

    .modal-header {
      padding: 14px 16px;
    }

    .modal-body {
      padding: 16px;
    }

    .modal-footer {
      padding: 14px 16px;
    }

    .modal-title {
      font-size: 15px;
    }
  }
`;
