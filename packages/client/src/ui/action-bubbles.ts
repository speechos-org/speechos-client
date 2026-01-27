/**
 * Action bubbles component
 * Displays available actions (Dictate, Edit) above the mic button
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { themeStyles, animations } from "./styles/theme.js";
import { dictateIcon, editIcon, commandIcon, readIcon, stopIcon } from "./icons.js";
import { events, type SpeechOSAction } from "@speechos/core";
import { getClientConfig } from "../config.js";

interface ActionButton {
  id: SpeechOSAction;
  label: string;
  icon: ReturnType<typeof dictateIcon>;
}

@customElement("speechos-action-bubbles")
export class SpeechOSActionBubbles extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    animations,
    css`
      :host {
        display: block;
        position: absolute;
        bottom: calc(100% + var(--speechos-spacing-md));
        left: 50%;
        transform: translateX(-50%);
        pointer-events: auto;
      }

      .bubbles-container {
        display: flex;
        gap: var(--speechos-spacing-sm);
        justify-content: center;
      }

      .action-button {
        display: flex;
        align-items: center;
        gap: var(--speechos-spacing-xs);
        padding: var(--speechos-spacing-sm) var(--speechos-spacing-md);
        border: none;
        border-radius: var(--speechos-radius-full);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: white;
        transition: all var(--speechos-transition-fast);
        animation: speechos-slideUp var(--speechos-transition-base) ease-out;
        white-space: nowrap;
      }

      /* Dictate button - Emerald (matches connecting state) */
      .action-button.dictate {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }

      .action-button.dictate:hover {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }

      /* Edit button - Purple (matches editing state) */
      .action-button.edit {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      }

      .action-button.edit:hover {
        background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
      }

      /* Command button - Amber/Orange (quick action) */
      .action-button.command {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      }

      .action-button.command:hover {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
      }

      /* Read button - Blue */
      .action-button.read {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .action-button.read:hover {
        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
      }

      .action-button:active {
        transform: translateY(0);
      }

      .action-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      /* Staggered animation delay */
      .action-button:nth-child(1) {
        animation-delay: 0ms;
      }

      .action-button:nth-child(2) {
        animation-delay: 50ms;
      }

      .action-button:nth-child(3) {
        animation-delay: 100ms;
      }

      .action-button:nth-child(4) {
        animation-delay: 150ms;
      }

      /* Mobile styles - 30% larger */
      @media (max-width: 768px) and (hover: none) {
        .action-button {
          padding: 10px 16px;
          font-size: 18px;
          gap: 6px;
        }

        .action-icon {
          transform: scale(1.3);
        }

        .bubbles-container {
          gap: 10px;
        }
      }
    `,
  ];

  @property({ type: Boolean })
  visible = false;

  @property({ type: Boolean })
  readAvailable = false;

  @property({ type: Boolean })
  readActive = false;

  /**
   * Get the list of available actions based on configuration.
   * Command button only appears if commands are configured.
   */
  private get actions(): ActionButton[] {
    const clientConfig = getClientConfig();
    const baseActions: ActionButton[] = [
      {
        id: "dictate",
        label: "Dictate",
        icon: dictateIcon(),
      },
      {
        id: "edit",
        label: "Edit",
        icon: editIcon(),
      },
    ];

    // Only show command button if commands are configured
    if (clientConfig.commands && clientConfig.commands.length > 0) {
      baseActions.push({
        id: "command",
        label: "Command",
        icon: commandIcon(),
      });
    }

    if (this.readAvailable) {
      baseActions.push({
        id: "read",
        label: this.readActive ? "Stop" : "Read",
        icon: this.readActive ? stopIcon(16) : readIcon(),
      });
    }

    return baseActions;
  }

  private handleActionClick(e: Event, action: SpeechOSAction): void {
    // Stop propagation to prevent bubbling issues
    e.stopPropagation();
    e.preventDefault();

    events.emit("action:select", { action });

    this.dispatchEvent(
      new CustomEvent("action-select", {
        bubbles: true,
        composed: true,
        detail: { action },
      })
    );
  }

  render(): import("lit").TemplateResult | string {
    if (!this.visible) {
      return html``;
    }

    return html`
      <div class="bubbles-container">
        ${this.actions.map(
          (action) => html`
            <button
              class="action-button ${action.id}"
              @click="${(e: Event) => this.handleActionClick(e, action.id)}"
              aria-label="${action.label}"
              title="${action.label}"
            >
              <span class="action-icon">${action.icon}</span>
              <span>${action.label}</span>
            </button>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-action-bubbles": SpeechOSActionBubbles;
  }
}
