# SpeechOS Client SDK

Add voice input to any web application in minutes. SpeechOS lets users speak instead of type, saving time on text entry and editing tasks.

**Powered by [SpeechOS](https://www.speechos.ai/)** — Production-ready speech recognition APIs that actually work. No training required, no model management, no infrastructure headaches. Just accurate, fast transcription with built-in punctuation, capitalization, and AI-powered text editing. Start free, scale to millions of users.

**Features:**

- **Dictation** — Speak to produce formatted text with punctuation and capitalization
- **Edit** — Give voice instructions to modify existing text (e.g., "make it more formal")
- **Commands** — Match voice input to custom commands with argument extraction
- **Works Everywhere** — Browser, React, Vue, vanilla JS, and more

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

## Documentation

### Guides

- **[Widget Guide](./docs/widget-guide.md)** — Detailed widget configuration, positioning, and events
- **[Voice Commands](./docs/voice-commands.md)** — Set up and handle custom voice commands
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
