/**
 * Audio level meter component
 * Displays real-time audio amplitude visualization for microphone input
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";

const NUM_BARS = 12;
const SMOOTHING = 0.8;

@customElement("speechos-audio-level-meter")
export class SpeechOSAudioLevelMeter extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: block;
      }

      .meter-container {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 3px;
        height: 32px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }

      .meter-bar {
        width: 6px;
        min-height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        transition: height 50ms ease-out, background 100ms ease;
      }

      .meter-bar.active {
        background: var(--speechos-primary);
      }

      .meter-inactive {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
      }

      .meter-error {
        color: #f87171;
      }
    `,
  ];

  @property({ type: Boolean })
  active = false;

  @property({ type: String })
  deviceId = "";

  @state()
  private levels: number[] = new Array(NUM_BARS).fill(0);

  @state()
  private error: string | null = null;

  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private smoothedLevels: number[] = new Array(NUM_BARS).fill(0);

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("active") || changedProperties.has("deviceId")) {
      if (this.active) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopMonitoring();
  }

  private async startMonitoring(): Promise<void> {
    this.error = null;

    try {
      // Stop any existing monitoring
      this.stopMonitoring();

      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: this.deviceId
          ? { deviceId: { exact: this.deviceId } }
          : true,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = SMOOTHING;

      // Connect microphone to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Start animation loop
      this.updateLevels();
    } catch (err) {
      console.error("[SpeechOS] Audio monitoring error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          this.error = "Microphone access denied";
        } else if (err.name === "NotFoundError") {
          this.error = "Microphone not found";
        } else {
          this.error = "Failed to access microphone";
        }
      } else {
        this.error = "Failed to access microphone";
      }
    }
  }

  private stopMonitoring(): void {
    // Cancel animation
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.analyser = null;
    this.dataArray = null;

    // Reset levels
    this.levels = new Array(NUM_BARS).fill(0);
    this.smoothedLevels = new Array(NUM_BARS).fill(0);
  }

  private updateLevels(): void {
    if (!this.analyser || !this.dataArray) return;

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate levels for each bar
    // Use lower frequencies for speech (roughly 85-255 Hz range)
    const binCount = this.dataArray.length;
    const binsPerBar = Math.floor(binCount / (NUM_BARS * 2)); // Use first half for speech frequencies

    const newLevels: number[] = [];

    for (let i = 0; i < NUM_BARS; i++) {
      const startBin = i * binsPerBar;
      const endBin = startBin + binsPerBar;

      // Get average value for this bar's frequency range
      let sum = 0;
      for (let j = startBin; j < endBin && j < binCount; j++) {
        sum += this.dataArray[j];
      }
      const avg = sum / binsPerBar;

      // Normalize to 0-1 range with some gain
      const normalized = Math.min(1, (avg / 255) * 1.5);

      // Apply smoothing
      this.smoothedLevels[i] =
        this.smoothedLevels[i] * 0.3 + normalized * 0.7;

      newLevels.push(this.smoothedLevels[i]);
    }

    this.levels = newLevels;

    // Continue animation loop
    this.animationId = requestAnimationFrame(() => this.updateLevels());
  }

  private getBarClass(level: number): string {
    if (level < 0.05) return "";
    return "active";
  }

  render() {
    if (this.error) {
      return html`
        <div class="meter-inactive meter-error">${this.error}</div>
      `;
    }

    if (!this.active) {
      return html`
        <div class="meter-inactive">Waiting for microphone access...</div>
      `;
    }

    return html`
      <div class="meter-container">
        ${this.levels.map(
          (level) => html`
            <div
              class="meter-bar ${this.getBarClass(level)}"
              style="height: ${Math.max(4, level * 28)}px"
            ></div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-audio-level-meter": SpeechOSAudioLevelMeter;
  }
}
