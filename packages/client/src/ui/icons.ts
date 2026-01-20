/**
 * Icon imports and templates using inline SVG
 */

import { html, type TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

/**
 * Helper to create an SVG icon template
 */
function createIcon(paths: string, size = 20): TemplateResult {
  const svgString = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="display: block;"
    >
      ${paths}
    </svg>
  `;

  return html`${unsafeHTML(svgString)}`;
}

/**
 * Microphone icon for the main button
 * Lucide Mic icon paths
 */
export const micIcon = (size = 20): TemplateResult =>
  createIcon(
    '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
    size
  );

/**
 * Message square icon for dictate action
 * Lucide MessageSquare icon paths
 */
export const dictateIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    size
  );

/**
 * Pencil icon for edit action
 * Lucide Pencil icon paths
 */
export const editIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    size
  );

/**
 * Stop/Square icon for stopping recording
 * Lucide Square icon (filled)
 */
export const stopIcon = (size = 18): TemplateResult => {
  const svgString = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      style="display: block;"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  `;
  return html`${unsafeHTML(svgString)}`;
};

/**
 * Loader/spinner icon for connecting state
 */
export const loaderIcon = (size = 20): TemplateResult => {
  const svgString = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style="display: block; animation: spin 1s linear infinite;"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  `;
  return html`${unsafeHTML(svgString)}`;
};

/**
 * Check icon for "Keep" action
 * Lucide Check icon paths
 */
export const checkIcon = (size = 18): TemplateResult =>
  createIcon('<path d="M20 6 9 17l-5-5"/>', size);

/**
 * Undo icon for "Undo" action
 * Lucide Undo2 icon paths
 */
export const undoIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    size
  );

/**
 * Refresh icon for "Continue editing" action
 * Lucide RefreshCw icon paths
 */
export const refreshIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    size
  );

/**
 * X icon for cancel action
 * Lucide X icon paths
 */
export const xIcon = (size = 14): TemplateResult =>
  createIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', size);

/**
 * More vertical (three dots) icon for settings button
 * Lucide MoreVertical icon paths
 */
export const moreVerticalIcon = (size = 16): TemplateResult =>
  createIcon(
    '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    size
  );

/**
 * Clipboard/list icon for transcripts tab
 * Lucide ClipboardList icon paths
 */
export const clipboardIcon = (size = 16): TemplateResult =>
  createIcon(
    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    size
  );

/**
 * Help circle icon for help tab
 * Lucide HelpCircle icon paths
 */
export const helpCircleIcon = (size = 16): TemplateResult =>
  createIcon(
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    size
  );

/**
 * Info icon for about tab
 * Lucide Info icon paths
 */
export const infoIcon = (size = 16): TemplateResult =>
  createIcon(
    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    size
  );

/**
 * Settings/cog icon for settings tab
 * Lucide Settings icon paths
 */
export const settingsIcon = (size = 16): TemplateResult =>
  createIcon(
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    size
  );

/**
 * Trash icon for delete action
 * Lucide Trash2 icon paths
 */
export const trashIcon = (size = 14): TemplateResult =>
  createIcon(
    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    size
  );

/**
 * External link icon
 * Lucide ExternalLink icon paths
 */
export const externalLinkIcon = (size = 14): TemplateResult =>
  createIcon(
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    size
  );

/**
 * Copy icon
 * Lucide Copy icon paths
 */
export const copyIcon = (size = 14): TemplateResult =>
  createIcon(
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    size
  );

/**
 * Globe icon for language selection
 * Lucide Globe icon paths
 */
export const globeIcon = (size = 18): TemplateResult =>
  createIcon(
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    size
  );

/**
 * Scissors icon for snippets
 * Lucide Scissors icon paths
 */
export const scissorsIcon = (size = 16): TemplateResult =>
  createIcon(
    '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    size
  );

/**
 * Book open icon for vocabulary
 * Lucide BookOpen icon paths
 */
export const bookOpenIcon = (size = 16): TemplateResult =>
  createIcon(
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    size
  );

/**
 * Plus icon for add buttons
 * Lucide Plus icon paths
 */
export const plusIcon = (size = 16): TemplateResult =>
  createIcon('<path d="M5 12h14"/><path d="M12 5v14"/>', size);

/**
 * Sparkles icon for AI/smart features
 * Lucide Sparkles icon paths
 */
export const sparklesIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    size
  );

/**
 * Zap/lightning icon for command action
 * Lucide Zap icon paths - represents quick command execution
 */
export const commandIcon = (size = 18): TemplateResult =>
  createIcon(
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    size
  );
