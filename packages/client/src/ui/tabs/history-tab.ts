/**
 * History tab component - Shows transcript history with copy/delete actions
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { themeStyles } from "../styles/theme.js";
import { tabContentStyles } from "../styles/modal-styles.js";
import {
  clipboardIcon,
  dictateIcon,
  editIcon,
  commandIcon,
  copyIcon,
  trashIcon,
} from "../icons.js";
import { transcriptStore, type TranscriptEntry } from "../../stores/transcript-store.js";

@customElement("speechos-history-tab")
export class SpeechOSHistoryTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    tabContentStyles,
    css`
      :host {
        display: block;
      }

      .transcripts-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .transcript-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 12px 14px;
        transition: all 0.15s ease;
      }

      .transcript-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .transcript-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .transcript-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 4px 8px;
        border-radius: 6px;
      }

      .transcript-badge.dictate {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }

      .transcript-badge.edit {
        background: rgba(139, 92, 246, 0.15);
        color: #a78bfa;
      }

      .transcript-badge.command {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }

      .transcript-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.35);
      }

      .transcript-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.5;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }


      .transcript-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .transcript-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: none;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.15s ease;
      }

      .transcript-action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
      }

      .transcript-action-btn.copied {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }

      .transcript-action-btn.delete:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }

      .clear-all-button {
        display: block;
        width: 100%;
        margin-top: 16px;
        padding: 10px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.15);
        border-radius: 8px;
        color: #f87171;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .clear-all-button:hover {
        background: rgba(239, 68, 68, 0.18);
        border-color: rgba(239, 68, 68, 0.25);
      }
    `,
  ];

  @state()
  private transcripts: TranscriptEntry[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this.loadTranscripts();
  }

  /** Reload transcripts from store */
  refresh(): void {
    this.loadTranscripts();
  }

  private loadTranscripts(): void {
    this.transcripts = transcriptStore.getTranscripts();
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private handleDelete(id: string): void {
    transcriptStore.deleteTranscript(id);
    this.loadTranscripts();
  }

  private handleClearAll(): void {
    transcriptStore.clearTranscripts();
    this.loadTranscripts();
  }

  private async handleCopy(text: string, event: Event): Promise<void> {
    const button = event.currentTarget as HTMLButtonElement;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    button.classList.add("copied");
    button.textContent = "Copied!";
    setTimeout(() => {
      button.classList.remove("copied");
      this.requestUpdate();
    }, 1000);
  }

  private getActionIcon(action: string) {
    switch (action) {
      case "dictate":
        return dictateIcon(12);
      case "edit":
        return editIcon(12);
      case "command":
        return commandIcon(12);
      default:
        return dictateIcon(12);
    }
  }

  private renderCommandDetails(entry: TranscriptEntry) {
    // Show the transcript text (what the user said)
    const displayText = entry.inputText || entry.text;
    return html`<div class="transcript-text">${displayText}</div>`;
  }

  private getCopyText(entry: TranscriptEntry): string {
    if (entry.action === "command") {
      return entry.inputText || entry.text;
    }
    return entry.text;
  }

  render() {
    if (this.transcripts.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-state-icon">${clipboardIcon(44)}</div>
          <div class="empty-state-title">No transcripts yet</div>
          <div class="empty-state-text">
            Your dictation, edit, and command history will appear here.
          </div>
        </div>
      `;
    }

    return html`
      <div class="transcripts-list">
        ${this.transcripts.map(
          (t) => html`
            <div class="transcript-item">
              <div class="transcript-header">
                <span class="transcript-badge ${t.action}">
                  ${this.getActionIcon(t.action)}
                  ${t.action}
                </span>
                <span class="transcript-time"
                  >${this.formatTime(t.timestamp)}</span
                >
              </div>
              ${t.action === "command"
                ? this.renderCommandDetails(t)
                : html`<div class="transcript-text">${t.text}</div>`}
              <div class="transcript-actions">
                <button
                  class="transcript-action-btn copy"
                  @click="${(e: Event) => this.handleCopy(this.getCopyText(t), e)}"
                >
                  ${copyIcon(12)} Copy
                </button>
                <button
                  class="transcript-action-btn delete"
                  @click="${() => this.handleDelete(t.id)}"
                >
                  ${trashIcon(12)} Delete
                </button>
              </div>
            </div>
          `
        )}
      </div>
      <button class="clear-all-button" @click="${this.handleClearAll}">
        Clear All History
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-history-tab": SpeechOSHistoryTab;
  }
}
