/**
 * Compact audio visualizer component
 * A minimal inline audio amplitude visualization for the listening state
 */

import { LitElement, html, css, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { themeStyles } from "./styles/theme.js";
import { getAudioDeviceId } from "../stores/audio-settings.js";

const NUM_BARS = 5;
const SMOOTHING = 0.8;

@customElement("speechos-audio-visualizer")
export class SpeechOSAudioVisualizer extends LitElement {
  static styles: CSSResultGroup = [
    themeStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .visualizer {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 2px;
        height: 18px;
        padding: 4px 8px;
        background: #1f2937;
        border-radius: 6px;
      }

      .bar {
        width: 3px;
        min-height: 3px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 1.5px;
        transition: height 50ms ease-out, background 100ms ease;
      }

      .bar.active {
        background: var(--speechos-primary);
      }
    `,
  ];

  @property({ type: Boolean })
  active = false;

  @state()
  private levels: number[] = new Array(NUM_BARS).fill(0);

  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private smoothedLevels: number[] = new Array(NUM_BARS).fill(0);

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("active")) {
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
    try {
      // Stop any existing monitoring
      this.stopMonitoring();

      // Get device preference
      const deviceId = getAudioDeviceId();

      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      this.mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);

      // Create audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = SMOOTHING;

      // Connect microphone to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Start animation loop
      this.updateLevels();
    } catch (err) {
      console.error("[SpeechOS] Audio visualizer error:", err);
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
    const binsPerBar = Math.floor(binCount / (NUM_BARS * 2));

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
      const normalized = Math.min(1, (avg / 255) * 1.8);

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
    if (!this.active) {
      return html``;
    }

    return html`
      <div class="visualizer">
        ${this.levels.map(
          (level) => html`
            <div
              class="bar ${this.getBarClass(level)}"
              style="height: ${Math.max(3, level * 16)}px"
            ></div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "speechos-audio-visualizer": SpeechOSAudioVisualizer;
  }
}
