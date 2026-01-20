/**
 * Shared styles for settings modal and tabs
 */

import { css } from "lit";

/** Base modal layout styles */
export const modalLayoutStyles = css`
  :host {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: calc(var(--speechos-z-base) + 100);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
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

  .modal {
    background: #1a1d24;
    border-radius: 16px;
    width: 90%;
    max-width: 580px;
    height: min(560px, 85vh);
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    transform: scale(0.95) translateY(10px);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    overflow: hidden;
  }

  /* Mobile: use more of the screen */
  @media (max-width: 480px) {
    .modal {
      width: 95%;
      height: min(520px, 90vh);
      border-radius: 12px;
    }
  }

  .modal-overlay.open .modal {
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
    font-size: 17px;
    font-weight: 600;
    color: white;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .modal-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #10b981 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-icon svg {
    width: 16px;
    height: 16px;
    color: white;
  }

  .logo-text {
    font-size: 17px;
    font-weight: 500;
    color: white;
    letter-spacing: -0.02em;
  }

  .logo-os {
    font-weight: 700;
    background: linear-gradient(135deg, #34d399 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 110px;
    flex-shrink: 0;
    background: rgba(0, 0, 0, 0.25);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  @media (max-width: 480px) {
    .sidebar {
      width: 90px;
      padding: 10px 6px;
    }
  }

  .sidebar-spacer {
    flex: 1;
    min-height: 8px;
  }

  .sidebar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border: none;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.15s ease;
    position: relative;
  }

  .sidebar-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
  }

  .sidebar-item.active {
    background: rgba(16, 185, 129, 0.12);
    color: #34d399;
  }

  .sidebar-item.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 24px;
    background: #34d399;
    border-radius: 0 3px 3px 0;
  }

  .sidebar-label {
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    line-height: 1.2;
  }

  @media (max-width: 480px) {
    .sidebar-item {
      padding: 10px 6px;
      gap: 4px;
    }

    .sidebar-label {
      font-size: 10px;
    }
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  @media (max-width: 480px) {
    .modal-content {
      padding: 16px;
    }
  }
`;

/** Shared tab content styles */
export const tabContentStyles = css`
  .section-header {
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: white;
    margin: 0 0 6px 0;
    letter-spacing: -0.01em;
  }

  .section-description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
  }

  .empty-state-icon {
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .empty-state-title {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.7);
  }

  .empty-state-text {
    font-size: 13px;
    line-height: 1.5;
  }

  .delete-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.35);
    transition: all 0.15s ease;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .limit-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .limit-warning-icon {
    color: #fbbf24;
    flex-shrink: 0;
  }

  .limit-warning-text {
    font-size: 13px;
    color: #fcd34d;
    line-height: 1.4;
  }
`;

/** Form styles for add/edit forms */
export const formStyles = css`
  .add-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .add-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .add-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .count-badge {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 500;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .add-form {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group:last-of-type {
    margin-bottom: 16px;
  }

  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .form-input {
    width: 100%;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-input:focus {
    outline: none;
    border-color: #34d399;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }

  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-input.error {
    border-color: #f87171;
  }

  .form-input.error:focus {
    box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
  }

  textarea.form-input {
    resize: vertical;
    min-height: 80px;
  }

  .form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .char-count {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    font-variant-numeric: tabular-nums;
  }

  .char-count.warning {
    color: #fbbf24;
  }

  .char-count.error {
    color: #f87171;
  }

  .form-error {
    font-size: 12px;
    color: #f87171;
    margin-top: 6px;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .form-btn {
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .form-btn.cancel {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }

  .form-btn.cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .form-btn.save {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: none;
    color: white;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .form-btn.save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .form-btn.save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;
