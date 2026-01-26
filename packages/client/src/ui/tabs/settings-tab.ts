/**
 * Settings tab component - Language and microphone preferences
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, state } from "lit/decorators.js";
import { events } from "@speechos/core";
import { themeStyles } from "../styles/theme.js";
import { globeIcon, micIcon, sparklesIcon } from "../icons.js";
import {
  getAudioDeviceId,
  setAudioDeviceId,
  getAudioInputDevices,
} from "../../stores/audio-settings.js";
import {
  getInputLanguageCode,
  setInputLanguageCode,
  getOutputLanguageCode,
  setOutputLanguageCode,
  getSmartFormatEnabled,
  setSmartFormatEnabled,
  SUPPORTED_LANGUAGES,
} from "../../stores/language-settings.js";
import "../audio-level-meter.js";

@customElement("speechos-settings-tab")
export class SpeechOSSettingsTab extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: block;
      }

      .settings-section {
        margin-bottom: 28px;
      }

      .settings-section:last-child {
        margin-bottom: 0;
      }

      .settings-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .settings-section-icon {
        color: #0d9488;
      }

      .settings-section-title {
        font-size: 14px;
        font-weight: 600;
        color: #171717;
      }

      .settings-section-description {
        font-size: 13px;
        color: #525252;
        line-height: 1.5;
        margin-bottom: 14px;
      }

      .settings-select-wrapper {
        position: relative;
        margin-bottom: 12px;
      }

      .settings-mic-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .settings-mic-row .settings-select-wrapper {
        flex: 1;
        margin-bottom: 0;
      }

      .settings-mic-row speechos-audio-level-meter {
        width: 80px;
        flex-shrink: 0;
      }

      .settings-select {
        width: 100%;
        padding: 12px 40px 12px 14px;
        background: #ffffff;
        border: 1px solid #d4d4d4;
        border-radius: 10px;
        color: #171717;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        transition: all 0.15s ease;
      }

      .settings-select:hover {
        border-color: #a3a3a3;
        background: #ffffff;
      }

      .settings-select:focus {
        outline: none;
        border-color: #0d9488;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
      }

      .settings-select option {
        background: #ffffff;
        color: #171717;
        padding: 8px;
      }

      .settings-select:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .settings-select:disabled:hover {
        border-color: #d4d4d4;
        background: #ffffff;
      }

      .settings-select-arrow {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #737373;
      }

      .settings-permission-note {
        font-size: 12px;
        color: #737373;
        margin-top: 10px;
        font-style: italic;
      }

      .settings-saved-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #059669;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .settings-saved-indicator.visible {
        opacity: 1;
      }

      /* Toggle switch styles */
      .settings-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 10px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }

      .settings-toggle-label {
        font-size: 14px;
        color: #171717;
      }

      .settings-toggle {
        position: relative;
        width: 44px;
        height: 24px;
        background: #d4d4d4;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .settings-toggle.active {
        background: #0d9488;
      }

      .settings-toggle:focus {
        outline: none;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #0d9488;
      }

      .settings-toggle-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .settings-toggle.active .settings-toggle-knob {
        transform: translateX(20px);
      }
    `,
  ];

  @state()
  private audioDevices: MediaDeviceInfo[] = [];

  @state()
  private selectedDeviceId: string = "";

  @state()
  private selectedInputLanguageCode: string = "en-US";

  @state()
  private selectedOutputLanguageCode: string = "en-US";

  @state()
  private isTestingMic: boolean = false;

  @state()
  private showSavedIndicator: boolean = false;

  @state()
  private permissionGranted: boolean = false;

  @state()
  private smartFormatEnabled: boolean = true;

  private savedIndicatorTimeout: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeSettingsLoaded: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadSettings();

    // Refresh when settings are loaded from the server
    this.unsubscribeSettingsLoaded = events.on("settings:loaded", () => {
      this.loadSettings();
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.savedIndicatorTimeout) {
      clearTimeout(this.savedIndicatorTimeout);
    }
    if (this.unsubscribeSettingsLoaded) {
      this.unsubscribeSettingsLoaded();
      this.unsubscribeSettingsLoaded = null;
    }
    this.isTestingMic = false;
  }

  /** Called when tab becomes active */
  activate(): void {
    this.startMicPreview();
  }

  /** Called when tab becomes inactive */
  deactivate(): void {
    this.isTestingMic = false;
  }

  private async loadSettings(): Promise<void> {
    this.selectedDeviceId = getAudioDeviceId();
    this.selectedInputLanguageCode = getInputLanguageCode();
    this.selectedOutputLanguageCode = getOutputLanguageCode();
    this.smartFormatEnabled = getSmartFormatEnabled();
    await this.loadAudioDevices();
  }

  private async loadAudioDevices(): Promise<void> {
    try {
      const devices = await getAudioInputDevices();
      const hasLabels = devices.some(
        (d: MediaDeviceInfo) => d.label && d.label.length > 0
      );

      this.permissionGranted = hasLabels;
      this.audioDevices = devices;
    } catch (error) {
      console.error("[SpeechOS] Failed to enumerate audio devices:", error);
      this.audioDevices = [];
    }
  }

  private async requestMicPermission(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.permissionGranted = true;
      await this.loadAudioDevices();
    } catch (error) {
      console.error("[SpeechOS] Microphone permission denied:", error);
    }
  }

  private async startMicPreview(): Promise<void> {
    if (!this.permissionGranted) {
      await this.requestMicPermission();
    }
    if (this.permissionGranted) {
      this.isTestingMic = true;
    }
  }

  private showSaved(): void {
    this.showSavedIndicator = true;
    if (this.savedIndicatorTimeout) {
      clearTimeout(this.savedIndicatorTimeout);
    }
    this.savedIndicatorTimeout = setTimeout(() => {
      this.showSavedIndicator = false;
    }, 2000);
  }

  private handleInputLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedInputLanguageCode = select.value;
    setInputLanguageCode(this.selectedInputLanguageCode);
    this.showSaved();
  }

  private handleOutputLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedOutputLanguageCode = select.value;
    setOutputLanguageCode(this.selectedOutputLanguageCode);
    this.showSaved();
  }

  private handleDeviceChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedDeviceId = select.value;
    setAudioDeviceId(this.selectedDeviceId);
    this.showSaved();

    if (this.isTestingMic) {
      this.isTestingMic = false;
      requestAnimationFrame(() => {
        this.isTestingMic = true;
      });
    }
  }

  private handleSmartFormatToggle(): void {
    this.smartFormatEnabled = !this.smartFormatEnabled;
    setSmartFormatEnabled(this.smartFormatEnabled);
    this.showSaved();
  }

  private renderLanguageSelector(
    selectedCode: string,
    onChange: (event: Event) => void,
    disabled: boolean = false
  ) {
    return html`
      <div class="settings-select-wrapper">
        <select
          class="settings-select"
          .value="${selectedCode}"
          @change="${onChange}"
          ?disabled="${disabled}"
        >
          ${SUPPORTED_LANGUAGES.map(
            (lang) => html`
              <option
                value="${lang.code}"
                ?selected="${lang.code === selectedCode}"
              >
                ${lang.name}
              </option>
            `
          )}
        </select>
        <div class="settings-select-arrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    `;
  }

  private renderDeviceSelector() {
    return html`
      <div class="settings-select-wrapper">
        <select
          class="settings-select"
          .value="${this.selectedDeviceId}"
          @change="${this.handleDeviceChange}"
        >
          <option value="">System Default</option>
          ${this.audioDevices.map(
            (device) => html`
              <option value="${device.deviceId}">
                ${device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            `
          )}
        </select>
        <div class="settings-select-arrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    `;
  }

  private renderPermissionRequest() {
    return html`
      <div class="settings-select-wrapper">
        <select class="settings-select" disabled>
          <option>Requesting microphone access...</option>
        </select>
        <div class="settings-select-arrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
      <p class="settings-permission-note">
        Please allow microphone access in your browser to see available devices.
      </p>
    `;
  }

  render() {
    return html`
      <div class="settings-section">
        <div class="settings-section-header">
          <span class="settings-section-icon">${micIcon(18)}</span>
          <span class="settings-section-title">Microphone</span>
          <span
            class="settings-saved-indicator ${this.showSavedIndicator
              ? "visible"
              : ""}"
          >
            Saved
          </span>
        </div>
        <div class="settings-section-description">
          Choose which microphone to use for dictation and editing.
        </div>
        ${this.permissionGranted
          ? html`
              <div class="settings-mic-row">
                ${this.renderDeviceSelector()}
                <speechos-audio-level-meter
                  ?active="${this.isTestingMic}"
                  deviceId="${this.selectedDeviceId}"
                ></speechos-audio-level-meter>
              </div>
            `
          : this.renderPermissionRequest()}
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <span class="settings-section-icon">${sparklesIcon(18)}</span>
          <span class="settings-section-title">Smart Format</span>
        </div>
        <div class="settings-section-description">
          AI automatically removes filler words, adds punctuation, and polishes
          your text. Disable for raw transcription output. Note: disabling also
          turns off text snippets and output language translation.
        </div>
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">Enable AI formatting</span>
          <div
            class="settings-toggle ${this.smartFormatEnabled ? "active" : ""}"
            @click="${this.handleSmartFormatToggle}"
            role="switch"
            aria-checked="${this.smartFormatEnabled}"
            tabindex="0"
            @keydown="${(e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.handleSmartFormatToggle();
              }
            }}"
          >
            <div class="settings-toggle-knob"></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <span class="settings-section-icon">${globeIcon(18)}</span>
          <span class="settings-section-title">Input Language</span>
        </div>
        <div class="settings-section-description">
          The language you'll be speaking. This helps improve transcription
          accuracy.
        </div>
        ${this.renderLanguageSelector(
          this.selectedInputLanguageCode,
          this.handleInputLanguageChange.bind(this)
        )}
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <span class="settings-section-icon">${globeIcon(18)}</span>
          <span class="settings-section-title">Output Language</span>
        </div>
        <div class="settings-section-description">
          The language for your transcribed text. Usually the same as input, but
          can differ for translation.${!this.smartFormatEnabled
            ? " Requires Smart Format to be enabled."
            : ""}
        </div>
        ${this.renderLanguageSelector(
          this.smartFormatEnabled
            ? this.selectedOutputLanguageCode
            : this.selectedInputLanguageCode,
          this.handleOutputLanguageChange.bind(this),
          !this.smartFormatEnabled
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-settings-tab": SpeechOSSettingsTab;
  }
}
