// ESM loader - Vite processes this file and resolves bare imports
import { SpeechOS } from "@speechos/client";

// Expose to global scope for the test page
(window as any).SpeechOS = SpeechOS;
window.dispatchEvent(new Event("speechos-esm-loaded"));
