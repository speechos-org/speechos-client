# Widget Guide

The SpeechOS widget is the primary way users interact with voice input. It automatically appears when text fields are focused and provides a polished, accessible interface.

## How It Works

1. **User focuses a text field** — The widget appears at the bottom of the screen
2. **User clicks the microphone** — Action bubbles expand showing available actions
3. **User selects an action** — Dictate, Edit, Command (if configured), or Read (when text is selected)
4. **User speaks** — Audio is captured and processed in real-time
5. **User clicks stop** — Transcribed/edited text is inserted into the field

## Configuration Options

```typescript
SpeechOS.init({
  // Required
  apiKey: 'YOUR_API_KEY',

  // Optional
  userId: 'user_123',           // Identify end users for analytics
  debug: true,                  // Enable console logging
  zIndex: 999999,               // Widget z-index (default: 999999)

  // Form detection behavior (default: true)
  formDetection: true,          // true | false | custom FormDetectorInterface

  // Read-aloud behavior (default: true)
  readAloud: true,              // true | false | { enabled, minLength, maxLength, showOnSelection }

  // Voice Commands (shows Command button if provided)
  commands: [
    { name: 'submit_form', description: 'Submit the current form' },
    { name: 'clear_all', description: 'Clear all form fields' },
  ],

  // Advanced: Custom text input handler (see Advanced Topics)
  textInputHandler: customHandler,
});

## Read Aloud

The widget supports reading selected text out loud:

- **Select text** anywhere on the page to enable the **Read** action
- **Focus a text box** (input/textarea) with no selection to read the full field
- Click **Read** to start playback, and use the red stop button to stop

Voice selection is available in Settings and is stored locally.
```

## Form Detection

Control when and how the widget appears:

```typescript
// Automatic (default) - widget appears when text fields are focused
SpeechOS.init({ apiKey: 'YOUR_API_KEY', formDetection: true });

// Manual control only - use showFor() and attachTo() for positioning
SpeechOS.init({ apiKey: 'YOUR_API_KEY', formDetection: false });

// Custom implementation
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  formDetection: customDetector, // Implements FormDetectorInterface
});
```

## User Identification

Associate voice sessions with your users for analytics tracking:

```typescript
// Option 1: During initialization
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  userId: 'user_123',
});

// Option 2: After user logs in
SpeechOS.init({ apiKey: 'YOUR_API_KEY' });

// Later, when user authenticates
SpeechOS.identify('user_123');
```

## Programmatic Control

```typescript
// Show the widget manually (normally auto-shows on form focus)
SpeechOS.show();

// Hide the widget
SpeechOS.hide();

// Show widget for a specific element (useful with formDetection: false)
const textarea = document.querySelector('textarea');
SpeechOS.showFor(textarea);

// Attach widget to track an element's position (mobile: anchors below, desktop: center-bottom)
SpeechOS.attachTo(textarea);

// Detach from element and return to default position
SpeechOS.detach();

// Get current state
const state = SpeechOS.getState();
console.log(state.recordingState); // 'idle' | 'connecting' | 'recording' | 'processing'
console.log(state.isVisible);       // boolean
console.log(state.activeAction);    // 'dictate' | 'edit' | 'command' | null
console.log(state.focusedElement);  // HTMLElement | null

// Clean up (removes widget, disconnects)
await SpeechOS.destroy();
```

### Example: Manual Widget Control

```typescript
// Disable automatic form detection
SpeechOS.init({ apiKey: 'YOUR_API_KEY', formDetection: false });

// Manually control widget visibility and positioning
const textarea = document.querySelector('#notes');
const button = document.querySelector('#voice-button');

button.addEventListener('click', () => {
  SpeechOS.showFor(textarea);
});
```

## Events

Subscribe to widget events for custom behavior:

```typescript
import { SpeechOS } from '@speechos/client';

SpeechOS.init({ apiKey: 'YOUR_API_KEY' });

// Transcription completed and inserted into field
SpeechOS.events.on('transcription:inserted', ({ text, element }) => {
  console.log(`Inserted "${text}" into`, element);

  // Example: Auto-submit form after dictation
  if (element.form) {
    element.form.submit();
  }
});

// Edit completed and applied to field
SpeechOS.events.on('edit:applied', ({ originalContent, editedContent, element }) => {
  console.log(`Changed "${originalContent}" to "${editedContent}"`);
});

// Voice command matched
SpeechOS.events.on('command:complete', ({ command }) => {
  if (command) {
    console.log(`Command: ${command.name}`, command.arguments);
    handleCommand(command);
  } else {
    console.log('No command matched');
  }
});

// Error occurred
SpeechOS.events.on('error', ({ code, message, source }) => {
  console.error(`Error [${source}]: ${message}`);
});

// Widget visibility
SpeechOS.events.on('widget:show', () => console.log('Widget shown'));
SpeechOS.events.on('widget:hide', () => console.log('Widget hidden'));

// Form focus tracking
SpeechOS.events.on('form:focus', ({ element }) => {
  console.log('Focused:', element.tagName);
});
```

For a complete list of events, see [Events Reference](./events-reference.md).

## Related

- [Voice Commands](./voice-commands.md) — Set up custom voice commands
- [Events Reference](./events-reference.md) — Complete event documentation
- [API Reference](./api-reference.md) — Full API documentation
