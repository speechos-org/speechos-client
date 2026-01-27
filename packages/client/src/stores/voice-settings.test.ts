/**
 * Tests for voice settings store
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getVoiceSettings, setVoiceSettings, getVoiceId, setVoiceId, resetVoiceSettings, SUPPORTED_VOICES } from "./voice-settings.js";

const STORAGE_KEY = "speechos_voice_settings";

describe("voice-settings", () => {
  beforeEach(() => {
    localStorage.clear();
    resetVoiceSettings();
  });

  it("should return default settings when nothing is stored", () => {
    const settings = getVoiceSettings();
    const defaultVoiceId = SUPPORTED_VOICES.find((v) => v.name === "Rachel")?.id;
    expect(settings.voiceId).toBe(defaultVoiceId);
  });

  it("should save and load voice settings", () => {
    const target = SUPPORTED_VOICES[0];
    setVoiceSettings({ voiceId: target.id });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.voiceId).toBe(target.id);

    const settings = getVoiceSettings();
    expect(settings.voiceId).toBe(target.id);
  });

  it("should set voice id and persist", () => {
    const target = SUPPORTED_VOICES[0]; // Use George, not Rachel (Rachel is the default)
    setVoiceId(target.id);

    expect(getVoiceId()).toBe(target.id);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.voiceId).toBe(target.id);
  });

  it("should fall back to default for invalid voice IDs", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceId: "invalid" }));

    const settings = getVoiceSettings();
    const defaultVoiceId = SUPPORTED_VOICES.find((v) => v.name === "Rachel")?.id;
    expect(settings.voiceId).toBe(defaultVoiceId);
  });
});
