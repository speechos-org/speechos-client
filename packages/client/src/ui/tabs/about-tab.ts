/**
 * About tab component - Shows SpeechOS branding and links
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import { themeStyles } from "../styles/theme.js";
import { externalLinkIcon } from "../icons.js";

@customElement("speechos-about-tab")
export class SpeechOSAboutTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: block;
      }

      .about-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
      }

      .logo-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #10b981 0%, #8b5cf6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-icon svg {
        width: 20px;
        height: 20px;
        color: white;
      }

      .about-logo-text {
        font-size: 22px;
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

      .about-description {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.65);
        line-height: 1.7;
        margin-bottom: 24px;
      }

      .about-description p {
        margin: 0 0 12px 0;
      }

      .about-description p:last-child {
        margin-bottom: 0;
      }

      .about-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }

      .about-link:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
      }
    `,
  ];

  render() {
    return html`
      <div class="about-logo">
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
        <div class="about-logo-text">Speech<span class="logo-os">OS</span></div>
      </div>
      <div class="about-description">
        <p>
          SpeechOS lets you speak 4x faster than you type. Every word is
          AI-polished—no filler words, no typos, just professional text ready to
          send.
        </p>
        <p>
          Dictate naturally at 220+ words per minute. Say "make it shorter" or
          "more formal" to transform text instantly. Support for 33+ languages
          with custom vocabulary for your domain-specific terminology.
        </p>
      </div>
      <a
        href="https://speechos.ai"
        target="_blank"
        rel="noopener noreferrer"
        class="about-link"
      >
        Visit SpeechOS ${externalLinkIcon(14)}
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-about-tab": SpeechOSAboutTab;
  }
}
