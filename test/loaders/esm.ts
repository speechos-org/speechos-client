// ESM loader - Vite processes this file and resolves bare imports
import { SpeechOS, tts } from "@speechos/client";

// Expose to global scope for the test page
// Attach tts to SpeechOS for convenience (events is already a static getter on SpeechOS)
(SpeechOS as any).tts = tts;
(window as any).SpeechOS = SpeechOS;
window.dispatchEvent(new Event("speechos-esm-loaded"));
