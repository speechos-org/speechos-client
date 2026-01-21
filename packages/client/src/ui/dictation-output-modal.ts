/**
 * Dictation output modal component
 * Displays transcribed text with copy functionality when no field is focused
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";
import { popupModalStyles } from "./styles/popup-modal-styles.js";
import { xIcon, copyIcon, checkIcon, micIcon } from "./icons.js";

@customElement("speechos-dictation-output-modal")
export class SpeechOSDictationOutputModal extends LitElement {
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
        background: linear-gradient(135deg, #10b981 0%, #8b5cf6 100%);
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
        background: linear-gradient(135deg, #34d399 0%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .btn-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        border-radius: 999px;
      }

      .btn-primary:hover {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }

      .btn-primary:active {
        transform: translateY(0);
      }

      .btn-success {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        box-shadow: 0 4px 12px rgba(52, 211, 153, 0.3);
        border-radius: 999px;
      }

      .btn-secondary {
        border-radius: 999px;
      }

      .hint {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(16, 185, 129, 0.08);
        border-radius: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .hint-icon {
        color: #10b981;
        flex-shrink: 0;
      }
    `,
  ];

  @property({ type: Boolean })
  open = false;

  @property({ type: String })
  text = "";

  @state()
  private copied = false;

  private copyTimeout: number | null = null;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("open")) {
      if (!this.open) {
        // Reset copied state when modal closes
        this.copied = false;
        if (this.copyTimeout) {
          clearTimeout(this.copyTimeout);
          this.copyTimeout = null;
        }
      }
    }
  }

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

  private async handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text);
      this.copied = true;

      // Reset copied state after 2 seconds
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = window.setTimeout(() => {
        this.copied = false;
        this.copyTimeout = null;
      }, 2000);
    } catch (err) {
      console.error("[SpeechOS] Failed to copy text:", err);
    }
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
              <div class="logo-icon">${micIcon(18)}</div>
              <h2 class="modal-title">Dictation Complete</h2>
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
            <div class="text-display">${this.text}</div>
            <div class="hint">
              <svg class="hint-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>Tip: Focus a text field first to auto-insert next time</span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              class="btn ${this.copied ? "btn-success" : "btn-primary"}"
              @click="${this.handleCopy}"
            >
              ${this.copied ? checkIcon(16) : copyIcon(16)}
              ${this.copied ? "Copied!" : "Copy"}
            </button>
            <button class="btn btn-secondary" @click="${this.handleClose}">
              Done
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-dictation-output-modal": SpeechOSDictationOutputModal;
  }
}
