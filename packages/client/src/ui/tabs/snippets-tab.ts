/**
 * Snippets tab component - Manage text snippets that expand from trigger phrases
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, state } from "lit/decorators.js";
import { themeStyles } from "../styles/theme.js";
import { tabContentStyles, formStyles } from "../styles/modal-styles.js";
import { scissorsIcon, plusIcon, xIcon, infoIcon, editIcon } from "../icons.js";
import { snippetsStore, type Snippet } from "../../stores/snippets-store.js";

@customElement("speechos-snippets-tab")
export class SpeechOSSnippetsTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    tabContentStyles,
    formStyles,
    css`
      :host {
        display: block;
      }

      .snippet-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .snippet-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 14px;
        transition: all 0.15s ease;
        position: relative;
      }

      .snippet-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .snippet-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .snippet-trigger-text {
        font-size: 14px;
        font-weight: 600;
        color: #34d399;
      }

      .snippet-trigger-text::before {
        content: '"';
        opacity: 0.6;
      }

      .snippet-trigger-text::after {
        content: '"';
        opacity: 0.6;
      }

      .snippet-expansion {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.5;
      }

      .snippet-expansion-arrow {
        color: rgba(255, 255, 255, 0.3);
        flex-shrink: 0;
        margin-top: 2px;
      }

      .snippet-expansion-text {
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .snippet-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .edit-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.4);
        transition: all 0.15s ease;
      }

      .edit-btn:hover {
        background: rgba(52, 211, 153, 0.15);
        color: #34d399;
      }
    `,
  ];

  @state()
  private snippets: Snippet[] = [];

  @state()
  private showForm: boolean = false;

  @state()
  private editingId: string | null = null;

  @state()
  private trigger: string = "";

  @state()
  private expansion: string = "";

  @state()
  private error: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.loadSnippets();
  }

  /** Reload snippets from store */
  refresh(): void {
    this.loadSnippets();
  }

  /** Reset form state */
  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.trigger = "";
    this.expansion = "";
    this.error = "";
  }

  private loadSnippets(): void {
    this.snippets = snippetsStore.getSnippets();
  }

  private handleAddClick(): void {
    this.editingId = null;
    this.trigger = "";
    this.expansion = "";
    this.showForm = true;
    this.error = "";
  }

  private handleEditClick(snippet: Snippet): void {
    this.editingId = snippet.id;
    this.trigger = snippet.trigger;
    this.expansion = snippet.expansion;
    this.showForm = true;
    this.error = "";
  }

  private handleCancel(): void {
    this.resetForm();
  }

  private handleTriggerInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.trigger = input.value;
    this.error = "";
  }

  private handleExpansionInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.expansion = textarea.value;
    this.error = "";
  }

  private handleSave(): void {
    const result = this.editingId
      ? snippetsStore.updateSnippet(this.editingId, this.trigger, this.expansion)
      : snippetsStore.addSnippet(this.trigger, this.expansion);

    if (result.success) {
      this.loadSnippets();
      this.resetForm();
    } else {
      this.error = result.error.message;
    }
  }

  private handleDelete(id: string): void {
    snippetsStore.deleteSnippet(id);
    this.loadSnippets();
  }

  private renderForm() {
    const triggerLength = this.trigger.length;
    const expansionLength = this.expansion.length;
    const canSave =
      triggerLength > 0 &&
      triggerLength <= 30 &&
      expansionLength > 0 &&
      expansionLength <= 300;

    return html`
      <div class="add-form">
        <div class="form-group">
          <label class="form-label">Trigger phrase</label>
          <input
            type="text"
            class="form-input ${this.error && this.error.includes("trigger")
              ? "error"
              : ""}"
            placeholder="e.g., my email"
            .value="${this.trigger}"
            @input="${this.handleTriggerInput}"
            maxlength="30"
          />
          <div class="form-footer">
            <span
              class="char-count ${triggerLength > 25
                ? "warning"
                : ""} ${triggerLength > 30 ? "error" : ""}"
            >
              ${triggerLength}/30
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Expands to</label>
          <textarea
            class="form-input ${this.error && this.error.includes("Expansion")
              ? "error"
              : ""}"
            placeholder="e.g., john.smith@company.com"
            .value="${this.expansion}"
            @input="${this.handleExpansionInput}"
            maxlength="300"
          ></textarea>
          <div class="form-footer">
            <span
              class="char-count ${expansionLength > 250
                ? "warning"
                : ""} ${expansionLength > 300 ? "error" : ""}"
            >
              ${expansionLength}/300
            </span>
          </div>
        </div>

        ${this.error ? html`<div class="form-error">${this.error}</div>` : ""}

        <div class="form-actions">
          <button class="form-btn cancel" @click="${this.handleCancel}">
            Cancel
          </button>
          <button
            class="form-btn save"
            ?disabled="${!canSave}"
            @click="${this.handleSave}"
          >
            ${this.editingId ? "Update Snippet" : "Save Snippet"}
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const count = snippetsStore.getSnippetCount();
    const atLimit = snippetsStore.isAtSnippetLimit();

    return html`
      <div class="section-header">
        <h3 class="section-title">Text Snippets</h3>
        <p class="section-description">
          Say a trigger phrase to instantly insert saved text. Perfect for
          signatures, addresses, and templates you use often.
        </p>
      </div>

      ${atLimit
        ? html`
            <div class="limit-warning">
              <span class="limit-warning-icon">${infoIcon(16)}</span>
              <span class="limit-warning-text">
                You've reached the ${count.max} snippet limit. Delete unused
                snippets to add more.
              </span>
            </div>
          `
        : ""}
      ${this.showForm ? this.renderForm() : ""}

      <div class="action-row">
        <button
          class="add-button"
          ?disabled="${atLimit || this.showForm}"
          @click="${this.handleAddClick}"
        >
          ${plusIcon(14)} Add Snippet
        </button>
        <span class="count-badge">${count.current}/${count.max} used</span>
      </div>

      ${this.snippets.length === 0
        ? html`
            <div class="empty-state">
              <div class="empty-state-icon">${scissorsIcon(44)}</div>
              <div class="empty-state-title">No snippets yet</div>
              <div class="empty-state-text">
                Add your first snippet to speed up your dictation.
              </div>
            </div>
          `
        : html`
            <div class="snippet-list">
              ${this.snippets.map(
                (s) => html`
                  <div class="snippet-item">
                    <div class="snippet-trigger">
                      <span class="snippet-trigger-text">${s.trigger}</span>
                      <div class="snippet-actions">
                        <button
                          class="edit-btn"
                          @click="${() => this.handleEditClick(s)}"
                          title="Edit snippet"
                        >
                          ${editIcon(14)}
                        </button>
                        <button
                          class="delete-btn"
                          @click="${() => this.handleDelete(s.id)}"
                          title="Delete snippet"
                        >
                          ${xIcon(14)}
                        </button>
                      </div>
                    </div>
                    <div class="snippet-expansion">
                      <span class="snippet-expansion-arrow">→</span>
                      <span class="snippet-expansion-text">${s.expansion}</span>
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-snippets-tab": SpeechOSSnippetsTab;
  }
}
