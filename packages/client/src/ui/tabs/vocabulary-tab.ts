/**
 * Vocabulary tab component - Manage custom vocabulary terms for transcription accuracy
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, state } from "lit/decorators.js";
import { events } from "@speechos/core";
import { themeStyles } from "../styles/theme.js";
import { tabContentStyles, formStyles } from "../styles/modal-styles.js";
import { bookOpenIcon, plusIcon, xIcon, infoIcon } from "../icons.js";
import { vocabularyStore, type VocabularyTerm } from "../../stores/vocabulary-store.js";

@customElement("speechos-vocabulary-tab")
export class SpeechOSVocabularyTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    tabContentStyles,
    formStyles,
    css`
      :host {
        display: block;
      }

      .vocabulary-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .vocabulary-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.25);
        border-radius: 8px;
        transition: all 0.15s ease;
      }

      .vocabulary-chip:hover {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.35);
      }

      .vocabulary-chip-text {
        font-size: 13px;
        font-weight: 500;
        color: #7c3aed;
      }

      .vocabulary-chip .delete-btn {
        width: 20px;
        height: 20px;
        margin: -4px -4px -4px 0;
        color: #737373;
      }

      .vocabulary-chip .delete-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
      }
    `,
  ];

  @state()
  private vocabulary: VocabularyTerm[] = [];

  @state()
  private showForm: boolean = false;

  @state()
  private term: string = "";

  @state()
  private error: string = "";

  private unsubscribeSettingsLoaded: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadVocabulary();

    // Refresh when settings are loaded from the server
    this.unsubscribeSettingsLoaded = events.on("settings:loaded", () => {
      this.loadVocabulary();
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribeSettingsLoaded) {
      this.unsubscribeSettingsLoaded();
      this.unsubscribeSettingsLoaded = null;
    }
  }

  /** Reload vocabulary from store */
  refresh(): void {
    this.loadVocabulary();
  }

  /** Reset form state */
  resetForm(): void {
    this.showForm = false;
    this.term = "";
    this.error = "";
  }

  private loadVocabulary(): void {
    this.vocabulary = vocabularyStore.getVocabulary();
  }

  private handleAddClick(): void {
    this.showForm = true;
    this.error = "";
  }

  private handleCancel(): void {
    this.resetForm();
  }

  private handleTermInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.term = input.value;
    this.error = "";
  }

  private handleSave(): void {
    const result = vocabularyStore.addTerm(this.term);

    if (result.success) {
      this.loadVocabulary();
      this.resetForm();
    } else {
      this.error = result.error.message;
    }
  }

  private handleDelete(id: string): void {
    vocabularyStore.deleteTerm(id);
    this.loadVocabulary();
  }

  private renderForm() {
    const termLength = this.term.length;
    const canSave = termLength > 0 && termLength <= 50;

    return html`
      <div class="add-form">
        <div class="form-group">
          <label class="form-label">Term</label>
          <input
            type="text"
            class="form-input ${this.error ? "error" : ""}"
            placeholder="e.g., Kubernetes"
            .value="${this.term}"
            @input="${this.handleTermInput}"
            maxlength="50"
          />
          <div class="form-footer">
            <span
              class="char-count ${termLength > 40
                ? "warning"
                : ""} ${termLength > 50 ? "error" : ""}"
            >
              ${termLength}/50
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
            Add Term
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const count = vocabularyStore.getVocabularyCount();
    const atLimit = vocabularyStore.isAtVocabularyLimit();

    return html`
      <div class="section-header">
        <h3 class="section-title">Custom Vocabulary</h3>
        <p class="section-description">
          Add technical terms, names, or jargon to ensure they're always
          transcribed accurately.
        </p>
      </div>

      ${atLimit
        ? html`
            <div class="limit-warning">
              <span class="limit-warning-icon">${infoIcon(16)}</span>
              <span class="limit-warning-text">
                You've reached the ${count.max} term limit. Remove unused terms
                to add more.
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
          ${plusIcon(14)} Add Term
        </button>
        <span class="count-badge">${count.current}/${count.max} used</span>
      </div>

      ${this.vocabulary.length === 0
        ? html`
            <div class="empty-state">
              <div class="empty-state-icon">${bookOpenIcon(44)}</div>
              <div class="empty-state-title">No custom terms yet</div>
              <div class="empty-state-text">
                Add words that are unique to your work.
              </div>
            </div>
          `
        : html`
            <div class="vocabulary-grid">
              ${this.vocabulary.map(
                (v) => html`
                  <div class="vocabulary-chip">
                    <span class="vocabulary-chip-text">${v.term}</span>
                    <button
                      class="delete-btn"
                      @click="${() => this.handleDelete(v.id)}"
                      title="Remove term"
                    >
                      ${xIcon(12)}
                    </button>
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
    "speechos-vocabulary-tab": SpeechOSVocabularyTab;
  }
}
