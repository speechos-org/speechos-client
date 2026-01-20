/**
 * Settings button component
 * A small gear icon button that opens the settings modal
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";
import { settingsIcon } from "./icons.js";

@customElement("speechos-settings-button")
export class SpeechOSSettingsButton extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: block;
      }

      .settings-button {
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
        opacity: 0;
        transform: scale(0.6);
        pointer-events: none;
      }

      .settings-button.visible {
        opacity: 1;
        transform: scale(1);
        pointer-events: auto;
      }

      .settings-button:hover {
        background: rgba(39, 39, 42, 0.9);
        border-color: rgba(63, 63, 70, 0.8);
        color: rgba(250, 250, 250, 1);
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }

      .settings-button:active {
        transform: scale(0.95);
      }

      /* Mobile styles - 30% larger */
      @media (max-width: 768px) and (hover: none) {
        .settings-button {
          width: 42px;
          height: 42px;
        }

        .settings-button svg {
          transform: scale(1.3);
        }
      }
    `,
  ];

  @property({ type: Boolean })
  visible = false;

  private handleClick(e: Event): void {
    e.stopPropagation();
    e.preventDefault();

    this.dispatchEvent(
      new CustomEvent("settings-click", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render(): import("lit").TemplateResult {
    return html`
      <button
        class="settings-button ${this.visible ? "visible" : ""}"
        @click="${this.handleClick}"
        aria-label="Settings"
        title="Settings"
      >
        ${settingsIcon(16)}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-settings-button": SpeechOSSettingsButton;
  }
}
