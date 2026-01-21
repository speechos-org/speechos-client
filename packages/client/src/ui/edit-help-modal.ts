/**
 * Edit help modal component
 * Displays usage instructions for the edit feature when no text is selected
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";
import { popupModalStyles } from "./styles/popup-modal-styles.js";
import { xIcon, editIcon } from "./icons.js";

@customElement("speechos-edit-help-modal")
export class SpeechOSEditHelpModal extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    popupModalStyles,
    css`
      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .logo-icon svg {
        width: 18px;
        height: 18px;
        color: white;
      }

      .modal-title {
        background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .instruction-number {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      }

      .btn-primary {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        border-radius: 999px;
      }

      .btn-primary:hover {
        background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
      }

      .btn-primary:active {
        transform: translateY(0);
      }
    `,
  ];

  @property({ type: Boolean })
  open = false;

  private handleOverlayClick(e: Event): void {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private handleClose(): void {
    this.close();
  }

  private close(): void {
    this.dispatchEvent(
      new CustomEvent("modal-close", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div
        class="modal-overlay ${this.open ? "open" : ""}"
        @click="${this.handleOverlayClick}"
      >
        <div class="modal-card">
          <div class="modal-header">
            <div class="header-content">
              <div class="logo-icon">${editIcon(18)}</div>
              <h2 class="modal-title">How to Use Edit</h2>
            </div>
            <button
              class="close-button"
              @click="${this.handleClose}"
              aria-label="Close"
            >
              ${xIcon(16)}
            </button>
          </div>

          <div class="modal-body">
            <ol class="instruction-list">
              <li class="instruction-item">
                <span class="instruction-number">1</span>
                <span class="instruction-text">
                  Click on a text field to focus it, or select the text you want
                  to edit
                </span>
              </li>
              <li class="instruction-item">
                <span class="instruction-number">2</span>
                <span class="instruction-text">
                  Click the Edit button in the SpeechOS widget
                </span>
              </li>
              <li class="instruction-item">
                <span class="instruction-number">3</span>
                <span class="instruction-text">
                  Speak your editing instructions (e.g., "make it more formal"
                  or "fix the grammar")
                </span>
              </li>
            </ol>
          </div>

          <div class="modal-footer">
            <button class="btn btn-primary" @click="${this.handleClose}">
              Got it
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-edit-help-modal": SpeechOSEditHelpModal;
  }
}
