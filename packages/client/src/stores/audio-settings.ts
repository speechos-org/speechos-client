/**
 * Audio settings store
 * Persists audio device preferences to localStorage
 */

const STORAGE_KEY = "speechos_audio_settings";

export interface AudioSettings {
  /** Selected audio input device ID (empty string = system default) */
  deviceId: string;
}

const defaultSettings: AudioSettings = {
  deviceId: "",
};

/**
 * Get current audio settings from localStorage
 */
export function getAudioSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Save audio settings to localStorage
 */
function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * Get the selected audio device ID
 * Returns empty string for system default
 */
export function getAudioDeviceId(): string {
  return getAudioSettings().deviceId;
}

/**
 * Set the selected audio device ID
 * Pass empty string to use system default
 */
export function setAudioDeviceId(deviceId: string): void {
  const settings = getAudioSettings();
  settings.deviceId = deviceId;
  saveAudioSettings(settings);
}

/**
 * Get list of available audio input devices
 * Requires microphone permission to get device labels
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "audioinput");
  } catch {
    return [];
  }
}

/**
 * Check if the selected device is still available
 * Returns true if the device exists or if using system default
 */
export async function isSelectedDeviceAvailable(): Promise<boolean> {
  const deviceId = getAudioDeviceId();
  if (!deviceId) return true; // System default is always "available"

  const devices = await getAudioInputDevices();
  return devices.some((device) => device.deviceId === deviceId);
}

/**
 * Reset audio settings to defaults
 */
export function resetAudioSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

export const audioSettings: {
  getAudioSettings: typeof getAudioSettings;
  getAudioDeviceId: typeof getAudioDeviceId;
  setAudioDeviceId: typeof setAudioDeviceId;
  getAudioInputDevices: typeof getAudioInputDevices;
  isSelectedDeviceAvailable: typeof isSelectedDeviceAvailable;
  resetAudioSettings: typeof resetAudioSettings;
} = {
  getAudioSettings,
  getAudioDeviceId,
  setAudioDeviceId,
  getAudioInputDevices,
  isSelectedDeviceAvailable,
  resetAudioSettings,
};
