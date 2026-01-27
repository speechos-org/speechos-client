/**
 * Voice settings store
 * Persists selected TTS voice to localStorage
 */

import { DEFAULT_TTS_VOICE_ID, events } from "@speechos/core";

const STORAGE_KEY = "speechos_voice_settings";

export interface VoiceOption {
  id: string;
  name: string;
}

export const SUPPORTED_VOICES: VoiceOption[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam" },
];

export interface VoiceSettings {
  voiceId: string;
}

const defaultSettings: VoiceSettings = {
  voiceId: DEFAULT_TTS_VOICE_ID,
};

let memoryCache: VoiceSettings | null = null;

function isValidVoiceId(voiceId: string): boolean {
  return SUPPORTED_VOICES.some((voice) => voice.id === voiceId);
}

function normalizeVoiceId(voiceId: string): string {
  if (!isValidVoiceId(voiceId)) {
    return defaultSettings.voiceId;
  }
  return voiceId;
}

/**
 * Get current voice settings from localStorage
 */
export function getVoiceSettings(): VoiceSettings {
  if (memoryCache) {
    return { ...memoryCache };
  }

  if (typeof localStorage === "undefined") {
    return { ...defaultSettings };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      memoryCache = { ...defaultSettings };
      return { ...defaultSettings };
    }

    const parsed = JSON.parse(stored) as Partial<VoiceSettings>;
    const voiceId = parsed.voiceId ?? defaultSettings.voiceId;
    memoryCache = { voiceId: normalizeVoiceId(voiceId) };
    return { ...memoryCache };
  } catch {
    memoryCache = { ...defaultSettings };
    return { ...defaultSettings };
  }
}

/**
 * Save voice settings to localStorage
 */
function saveVoiceSettings(settings: VoiceSettings): void {
  memoryCache = settings;
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Set voice settings directly (used for local updates)
 */
export function setVoiceSettings(settings: Partial<VoiceSettings>): void {
  const next: VoiceSettings = {
    voiceId: normalizeVoiceId(settings.voiceId ?? getVoiceSettings().voiceId),
  };
  saveVoiceSettings(next);
}

/**
 * Get selected voice ID
 */
export function getVoiceId(): string {
  return getVoiceSettings().voiceId;
}

/**
 * Set selected voice ID
 */
export function setVoiceId(voiceId: string): void {
  const current = getVoiceSettings();
  const normalized = normalizeVoiceId(voiceId);
  if (current.voiceId === normalized) {
    return;
  }
  saveVoiceSettings({ voiceId: normalized });
  events.emit("settings:changed", { setting: "voice" });
}

/**
 * Get voice option by ID
 */
export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return SUPPORTED_VOICES.find((voice) => voice.id === voiceId);
}

/**
 * Get display name for a voice ID
 */
export function getVoiceName(voiceId: string): string {
  return getVoiceById(voiceId)?.name ?? "Unknown";
}

/**
 * Reset voice settings to defaults
 */
export function resetVoiceSettings(): void {
  memoryCache = { ...defaultSettings };
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Reset memory cache (for testing)
 */
export function resetMemoryCache(): void {
  memoryCache = null;
}
