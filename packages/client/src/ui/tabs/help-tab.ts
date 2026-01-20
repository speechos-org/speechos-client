/**
 * Help tab component - Shows usage instructions for dictate and edit modes
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import { themeStyles } from "../styles/theme.js";
import { dictateIcon, editIcon, globeIcon } from "../icons.js";

@customElement("speechos-help-tab")
export class SpeechOSHelpTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: block;
      }

      .help-section {
        margin-bottom: 24px;
      }

      .help-section:last-child {
        margin-bottom: 0;
      }

      .help-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        color: white;
        margin-bottom: 10px;
      }

      .help-title.dictate {
        color: #34d399;
      }

      .help-title.edit {
        color: #a78bfa;
      }

      .help-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.6;
        margin-bottom: 10px;
      }

      .help-text:last-child {
        margin-bottom: 0;
      }

      .help-examples {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .help-example {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

      .help-title.languages {
        background: linear-gradient(135deg, #34d399 0%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `,
  ];

  render() {
    return html`
      <div class="help-section">
        <div class="help-title dictate">${dictateIcon(18)} Dictate</div>
        <div class="help-text">
          Speak naturally and your words are transcribed into polished text—no
          filler words, perfect punctuation.
        </div>
      </div>

      <div class="help-section">
        <div class="help-title edit">${editIcon(18)} Edit</div>
        <div class="help-text">
          Say anything you want and we'll make it happen. Select specific text
          to edit just that part, or leave nothing selected to transform the
          entire text field.
        </div>
        <div class="help-text">
          Be as specific or vague as you like—we'll interpret your intent and
          apply the changes.
        </div>
        <div class="help-examples">
          <span class="help-example">"Make it shorter"</span>
          <span class="help-example">"More professional"</span>
          <span class="help-example">"Fix the grammar"</span>
          <span class="help-example">"Add bullet points"</span>
          <span class="help-example">"Rewrite this completely"</span>
        </div>
      </div>

      <div class="help-section">
        <div class="help-title languages">${globeIcon(18)} Languages</div>
        <div class="help-text">
          Configure your input and output languages in Settings. SpeechOS
          supports 33+ languages with automatic translation—speak in one
          language and get polished text in another.
        </div>
        <div class="help-examples">
          <span class="help-example">Speak German → English text</span>
          <span class="help-example">Speak Spanish → French text</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-help-tab": SpeechOSHelpTab;
  }
}
