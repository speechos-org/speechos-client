/**
 * Settings modal component
 * Main orchestrator for the settings modal with sidebar navigation
 */

import { LitElement, html, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";
import { modalLayoutStyles } from "./styles/modal-styles.js";
import {
  xIcon,
  clipboardIcon,
  helpCircleIcon,
  infoIcon,
  settingsIcon,
  scissorsIcon,
  bookOpenIcon,
} from "./icons.js";

// Import tab components
import "./tabs/history-tab.js";
import "./tabs/help-tab.js";
import "./tabs/about-tab.js";
import "./tabs/settings-tab.js";
import "./tabs/snippets-tab.js";
import "./tabs/vocabulary-tab.js";

type TabId =
  | "transcripts"
  | "help"
  | "about"
  | "settings"
  | "snippets"
  | "vocabulary";

interface Tab {
  id: TabId;
  label: string;
  icon: ReturnType<typeof clipboardIcon>;
}

@customElement("speechos-settings-modal")
export class SpeechOSSettingsModal extends LitElement {
  static styles: CSSResultGroup = [themeStyles, modalLayoutStyles];

  @property({ type: Boolean })
  open = false;

  @state()
  private activeTab: TabId = "settings";

  private mainTabs: Tab[] = [
    { id: "settings", label: "Settings", icon: settingsIcon(18) },
    { id: "transcripts", label: "History", icon: clipboardIcon(18) },
    { id: "vocabulary", label: "Vocab", icon: bookOpenIcon(18) },
    { id: "snippets", label: "Snippets", icon: scissorsIcon(18) },
    { id: "help", label: "Help", icon: helpCircleIcon(18) },
  ];

  private bottomTabs: Tab[] = [
    { id: "about", label: "About", icon: infoIcon(18) },
  ];

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("open")) {
      if (this.open) {
        this.refreshActiveTab();
      } else {
        this.resetTabs();
      }
    }
  }

  private refreshActiveTab(): void {
    const tab = this.getTabElement();
    if (tab && "refresh" in tab) {
      (tab as { refresh: () => void }).refresh();
    }
    if (tab && "activate" in tab) {
      (tab as { activate: () => void }).activate();
    }
  }

  private resetTabs(): void {
    // Reset form states in tabs that have forms
    const snippetsTab = this.shadowRoot?.querySelector("speechos-snippets-tab");
    const vocabTab = this.shadowRoot?.querySelector("speechos-vocabulary-tab");
    const settingsTab = this.shadowRoot?.querySelector("speechos-settings-tab");

    if (snippetsTab && "resetForm" in snippetsTab) {
      (snippetsTab as { resetForm: () => void }).resetForm();
    }
    if (vocabTab && "resetForm" in vocabTab) {
      (vocabTab as { resetForm: () => void }).resetForm();
    }
    if (settingsTab && "deactivate" in settingsTab) {
      (settingsTab as { deactivate: () => void }).deactivate();
    }
  }

  private getTabElement(): Element | null {
    const selectors: Record<TabId, string> = {
      transcripts: "speechos-history-tab",
      help: "speechos-help-tab",
      about: "speechos-about-tab",
      settings: "speechos-settings-tab",
      snippets: "speechos-snippets-tab",
      vocabulary: "speechos-vocabulary-tab",
    };
    return this.shadowRoot?.querySelector(selectors[this.activeTab]) ?? null;
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

  private handleTabClick(tabId: TabId): void {
    // Deactivate current tab if it has deactivate method
    const currentTab = this.getTabElement();
    if (currentTab && "deactivate" in currentTab) {
      (currentTab as { deactivate: () => void }).deactivate();
    }

    this.activeTab = tabId;

    // Use requestUpdate to ensure the tab is rendered before activating
    this.updateComplete.then(() => {
      this.refreshActiveTab();
    });
  }

  private renderTabContent() {
    switch (this.activeTab) {
      case "transcripts":
        return html`<speechos-history-tab></speechos-history-tab>`;
      case "help":
        return html`<speechos-help-tab></speechos-help-tab>`;
      case "about":
        return html`<speechos-about-tab></speechos-about-tab>`;
      case "settings":
        return html`<speechos-settings-tab></speechos-settings-tab>`;
      case "snippets":
        return html`<speechos-snippets-tab></speechos-snippets-tab>`;
      case "vocabulary":
        return html`<speechos-vocabulary-tab></speechos-vocabulary-tab>`;
    }
  }

  render() {
    return html`
      <div
        class="modal-overlay ${this.open ? "open" : ""}"
        @click="${this.handleOverlayClick}"
      >
        <div class="modal">
          <div class="modal-header">
            <div class="modal-logo">
              <div class="logo-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <span class="logo-text"
                >Speech<span class="logo-os">OS</span></span
              >
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
            <nav class="sidebar">
              ${this.mainTabs.map(
                (tab) => html`
                  <button
                    class="sidebar-item ${this.activeTab === tab.id
                      ? "active"
                      : ""}"
                    @click="${() => this.handleTabClick(tab.id)}"
                  >
                    ${tab.icon}
                    <span class="sidebar-label">${tab.label}</span>
                  </button>
                `
              )}
              <div class="sidebar-spacer"></div>
              ${this.bottomTabs.map(
                (tab) => html`
                  <button
                    class="sidebar-item ${this.activeTab === tab.id
                      ? "active"
                      : ""}"
                    @click="${() => this.handleTabClick(tab.id)}"
                  >
                    ${tab.icon}
                    <span class="sidebar-label">${tab.label}</span>
                  </button>
                `
              )}
            </nav>

            <div class="modal-content">${this.renderTabContent()}</div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-settings-modal": SpeechOSSettingsModal;
  }
}
