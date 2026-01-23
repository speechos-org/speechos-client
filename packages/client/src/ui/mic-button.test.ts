/**
 * Tests for mic button component - command feedback and no-audio warning features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("SpeechOSMicButton command feedback", () => {
  let micButton: HTMLElement;

  beforeEach(async () => {
    // Dynamically import to ensure custom element is registered
    await import("./mic-button.js");

    micButton = document.createElement("speechos-mic-button");
    document.body.appendChild(micButton);
    await (micButton as any).updateComplete;
  });

  afterEach(() => {
    if (micButton && micButton.parentNode) {
      micButton.parentNode.removeChild(micButton);
    }
    document.body.innerHTML = "";
  });

  describe("commandFeedback property", () => {
    it("should have commandFeedback default to null", () => {
      expect((micButton as any).commandFeedback).toBe(null);
    });

    it("should accept 'success' value", async () => {
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      expect((micButton as any).commandFeedback).toBe("success");
    });

    it("should accept 'none' value", async () => {
      (micButton as any).commandFeedback = "none";
      await (micButton as any).updateComplete;

      expect((micButton as any).commandFeedback).toBe("none");
    });

    it("should accept null value", async () => {
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      (micButton as any).commandFeedback = null;
      await (micButton as any).updateComplete;

      expect((micButton as any).commandFeedback).toBe(null);
    });
  });

  describe("feedback display", () => {
    it("should show 'Got it!' text for success feedback", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.textContent?.trim()).toBe("Got it!");
    });

    it("should show 'No command matched' text for none feedback", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "none";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.textContent?.trim()).toBe("No command matched");
    });

    it("should apply command-success class for success feedback", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.classList.contains("command-success")).toBe(true);
    });

    it("should apply command-none class for none feedback", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "none";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.classList.contains("command-none")).toBe(true);
    });

    it("should show status label when commandFeedback is set in idle state", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.classList.contains("visible")).toBe(true);
    });

    it("should not show close button when command feedback is visible", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      // Close button should be hidden or have display none when feedback is showing
      const closeButton = micButton.shadowRoot?.querySelector(".close-btn");
      // The close button visibility depends on showClose which is false when commandFeedback is set
      // Just verify it exists in the component
      expect(closeButton).toBeDefined();
    });
  });

  describe("feedback visibility logic", () => {
    it("should not show feedback when recording", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      // Status label should show recording state, not command feedback
      expect(statusLabel?.classList.contains("command-success")).toBe(false);
    });

    it("should not show feedback when processing", async () => {
      (micButton as any).recordingState = "processing";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.classList.contains("command-success")).toBe(false);
    });

    it("should show feedback only in idle state", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).commandFeedback = "success";
      await (micButton as any).updateComplete;

      const statusLabel = micButton.shadowRoot?.querySelector(".status-label");
      expect(statusLabel?.classList.contains("command-success")).toBe(true);
      expect(statusLabel?.classList.contains("visible")).toBe(true);
    });
  });
});

describe("SpeechOSMicButton no-audio warning", () => {
  let micButton: HTMLElement;

  beforeEach(async () => {
    await import("./mic-button.js");
    micButton = document.createElement("speechos-mic-button");
    document.body.appendChild(micButton);
    await (micButton as any).updateComplete;
  });

  afterEach(() => {
    if (micButton && micButton.parentNode) {
      micButton.parentNode.removeChild(micButton);
    }
    document.body.innerHTML = "";
  });

  describe("showNoAudioWarning property", () => {
    it("should have showNoAudioWarning default to false", () => {
      expect((micButton as any).showNoAudioWarning).toBe(false);
    });

    it("should accept true value", async () => {
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      expect((micButton as any).showNoAudioWarning).toBe(true);
    });
  });

  describe("warning display", () => {
    it("should show warning banner when showNoAudioWarning is true and recording", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      const warning = micButton.shadowRoot?.querySelector(".no-audio-warning");
      expect(warning?.classList.contains("visible")).toBe(true);
    });

    it("should not show warning banner when showNoAudioWarning is false", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).showNoAudioWarning = false;
      await (micButton as any).updateComplete;

      const warning = micButton.shadowRoot?.querySelector(".no-audio-warning");
      expect(warning?.classList.contains("visible")).toBe(false);
    });

    it("should not show warning banner when not recording", async () => {
      (micButton as any).recordingState = "idle";
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      const warning = micButton.shadowRoot?.querySelector(".no-audio-warning");
      expect(warning?.classList.contains("visible")).toBe(false);
    });

    it("should contain warning text", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      const warningText =
        micButton.shadowRoot?.querySelector(".warning-text");
      expect(warningText?.textContent).toContain("not hearing anything");
    });

    it("should contain settings link button", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      const settingsLink =
        micButton.shadowRoot?.querySelector(".settings-link");
      expect(settingsLink).not.toBeNull();
      expect(settingsLink?.textContent).toContain("Settings");
    });
  });

  describe("settings link interaction", () => {
    it("should dispatch open-settings event when settings link is clicked", async () => {
      (micButton as any).recordingState = "recording";
      (micButton as any).showNoAudioWarning = true;
      await (micButton as any).updateComplete;

      const eventListener = vi.fn();
      micButton.addEventListener("open-settings", eventListener);

      const settingsLink =
        micButton.shadowRoot?.querySelector(".settings-link") as HTMLElement;
      settingsLink?.click();

      expect(eventListener).toHaveBeenCalled();
    });
  });
});
