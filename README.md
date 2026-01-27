# SpeechOS Client SDK

Add voice input to any web application in minutes. SpeechOS lets users speak instead of type, saving time on text entry and editing tasks.

**Powered by [SpeechOS](https://www.speechos.ai/)** — Ship voice input in 2 lines of code. Your users speak 4x faster than they type, with zero typos and zero filler words. No setup, no servers, no complexity—[sign up for a free API key](https://www.speechos.ai/) and start building.

**Features:**

- **Dictation** — Speak to produce formatted text with punctuation and capitalization
- **Edit** — Give voice instructions to modify existing text (e.g., "make it more formal")
- **Commands** — Match voice input to custom commands with argument extraction
- **Read Aloud** — Select text (or focus a text box) and have it read out loud
- **Works Everywhere** — Browser, React, vanilla JS, and more

## Quick Start (Browser)

Add voice input to any website with two lines of code. Paste this just before the closing `</body>` tag:

```html
  <!-- Add SpeechOS here, just before </body> -->
  <script src="https://cdn.jsdelivr.net/npm/@speechos/client/dist/index.iife.min.js"></script>
  <script>
    SpeechOS.init({ apiKey: 'YOUR_API_KEY' });
  </script>
</body>
```

That's it! The SpeechOS widget will automatically appear when users focus on any text input, textarea, or contenteditable element.

> **Where to get your API key:** Log in to your [SpeechOS dashboard](https://app.speechos.ai) and navigate to your team settings to create a Client API Key.

## Installation

### NPM (Recommended for Modern Apps)

```bash
# Full client with built-in UI widget
npm install @speechos/client

# Or headless core only (no UI)
npm install @speechos/core

# React bindings
npm install @speechos/react
```

### CDN (Browser)

```html
<!-- Production (minified) -->
<script src="https://cdn.jsdelivr.net/npm/@speechos/client/dist/index.iife.min.js"></script>

<!-- Development (unminified, for debugging) -->
<script src="https://cdn.jsdelivr.net/npm/@speechos/client/dist/index.iife.js"></script>
```

## Basic Usage

### ESM (Modern JavaScript/TypeScript)

```typescript
import { SpeechOS } from '@speechos/client';

// Initialize with your API key
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
});
```

### Browser (Script Tag)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App with Voice Input</title>
</head>
<body>
  <form>
    <label for="notes">Notes</label>
    <textarea id="notes" placeholder="Click here and use voice input..."></textarea>
  </form>

  <script src="https://cdn.jsdelivr.net/npm/@speechos/client/dist/index.iife.min.js"></script>
  <script>
    SpeechOS.init({
      apiKey: 'YOUR_API_KEY',
    });
  </script>
</body>
</html>
```

### React

```tsx
import { SpeechOS } from '@speechos/client';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    SpeechOS.init({ apiKey: 'YOUR_API_KEY' });

    return () => {
      SpeechOS.destroy();
    };
  }, []);

  return (
    <form>
      <textarea placeholder="Click here and speak..." />
    </form>
  );
}
```

## Configuration Options

```typescript
SpeechOS.init({
  // Required
  apiKey: 'YOUR_API_KEY',

  // Optional
  userId: 'user_123',           // Identify end users for analytics
  debug: true,                  // Enable console logging
  zIndex: 999999,               // Widget z-index (default: 999999)
  formDetection: true,          // Auto-show widget on text field focus
  readAloud: true,              // Enable read-aloud for selected text (default: true)

  // Voice Commands (shows Command button if provided)
  commands: [
    { name: 'submit_form', description: 'Submit the current form' },
    { name: 'clear_all', description: 'Clear all form fields' },
  ],
});
```

## Essential Methods

```typescript
// User identification (for analytics)
SpeechOS.identify('user_123');

// Manual widget control
SpeechOS.show();                  // Show widget
SpeechOS.hide();                  // Hide widget
SpeechOS.showFor(element);        // Show for specific element
SpeechOS.attachTo(element);       // Attach widget to element

// Get current state
const state = SpeechOS.getState();

// Listen to events
SpeechOS.events.on('transcription:inserted', ({ text, element }) => {
  console.log(`Inserted "${text}" into`, element);
});

// Clean up
await SpeechOS.destroy();
```

## Read Aloud (Widget)

When users select text, the widget shows a **Read** action. If no selection is made, focusing an input/textarea enables **Read** for the entire field.

- Click **Read** to start playback
- Click the red stop button (same as dictation/edit) to stop playback
- Voice selection is stored locally via the widget settings

## Text-to-Speech (TTS)

Convert text to speech and play it back or get raw audio bytes.

### Play Audio Immediately

```typescript
import { tts } from '@speechos/client';

// Speak with default voice
await tts.speak('Hello, welcome to SpeechOS!');

// With options
await tts.speak('Bonjour!', { language: 'fr' });

// Use a specific voice (server validates)
await tts.speak('Hello!', { voiceId: 'some-voice-id' });

// Control playback
tts.stop();           // Stop current audio
tts.isPlaying();      // Check if playing
```

### Get Raw Audio Bytes

```typescript
import { tts } from '@speechos/core';

// Get audio as ArrayBuffer (MP3 format)
const result = await tts.synthesize('Hello world');
console.log(result.audio);       // ArrayBuffer
console.log(result.contentType); // 'audio/mpeg'

// Stream audio chunks for progressive loading
for await (const chunk of tts.stream('Long text...')) {
  // Process each Uint8Array chunk
}
```

Voice validation is handled server-side. Invalid voice IDs will return an error.

### React Hook

```tsx
import { useTTS } from '@speechos/react';

function TTSButton() {
  const { speak, stop, isSynthesizing, isPlaying, error } = useTTS();

  const handleSpeak = async () => {
    await speak('Hello from React!');
  };

  return (
    <div>
      <button onClick={isPlaying ? stop : handleSpeak} disabled={isSynthesizing}>
        {isSynthesizing ? 'Loading...' : isPlaying ? 'Stop' : 'Speak'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### TTS Events

```typescript
// Synthesis events
events.on('tts:synthesize:start', ({ text }) => { /* request started */ });
events.on('tts:synthesize:complete', ({ text }) => { /* audio received */ });

// Playback events (client only)
events.on('tts:playback:start', ({ text }) => { /* audio playing */ });
events.on('tts:playback:complete', ({ text }) => { /* playback finished */ });
events.on('tts:playback:stop', ({ text }) => { /* playback stopped */ });

// Error handling
events.on('tts:error', ({ code, message, phase }) => {
  console.error(`TTS ${phase} error: ${message}`);
});
```

See [TTS Guide](./docs/tts-guide.md) for detailed documentation.

## Documentation

### Guides

- **[Widget Guide](./docs/widget-guide.md)** — Detailed widget configuration, positioning, and events
- **[Voice Commands](./docs/voice-commands.md)** — Set up and handle custom voice commands
- **[TTS Guide](./docs/tts-guide.md)** — Text-to-speech synthesis and playback
- **[React Integration](./docs/react-integration.md)** — React hooks, components, and patterns
- **[Advanced Topics](./docs/advanced.md)** — Custom text handlers, headless usage, and more

### Reference

- **[API Reference](./docs/api-reference.md)** — Complete API documentation
- **[TypeScript Types](./docs/typescript-types.md)** — Type definitions and interfaces
- **[Events Reference](./docs/events-reference.md)** — All available events and their payloads

### Other

- **[Troubleshooting](./docs/troubleshooting.md)** — Common issues and solutions
- **[Development](./docs/development.md)** — Build, test, and contribute

## Packages

| Package | Description | Use Case |
|---------|-------------|----------|
| `@speechos/client` | Full client with UI widget | Drop-in voice input for any app |
| `@speechos/react` | React hooks and components | React apps with custom UI |
| `@speechos/core` | Headless SDK (no UI) | Custom implementations, non-browser |

## TypeScript Support

All packages include full TypeScript definitions. See [TypeScript Types](./docs/typescript-types.md) for details.

## License

MIT
