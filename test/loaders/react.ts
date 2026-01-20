// React loader - Vite processes this file and resolves bare imports
import { SpeechOS } from "@speechos/client";
import * as SpeechOSReact from "@speechos/react";
import * as React from "react";
import * as ReactDOM from "react-dom/client";

// Expose to global scope for the test page
(window as any).SpeechOS = SpeechOS;
(window as any).SpeechOSReact = SpeechOSReact;
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;
window.dispatchEvent(new Event("speechos-react-loaded"));
