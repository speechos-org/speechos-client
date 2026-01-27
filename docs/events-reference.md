# Events Reference

Complete reference of all events emitted by SpeechOS.

## Event List

| Event | Payload | Description |
|-------|---------|-------------|
| `transcription:inserted` | `{ text, element }` | Text was dictated and inserted into a field |
| `transcription:complete` | `{ text }` | Transcription finished (before insertion) |
| `edit:applied` | `{ originalContent, editedContent, element }` | Edit was applied to field |
| `edit:complete` | `{ text, originalText }` | Edit finished (before application) |
| `command:complete` | `{ commands }` | Commands matched (empty array if no match) |
| `error` | `{ code, message, source }` | An error occurred |
| `widget:show` | `void` | Widget became visible |
| `widget:hide` | `void` | Widget was hidden |
| `form:focus` | `{ element }` | Text field received focus |
| `form:blur` | `{ element }` | Text field lost focus |
| `action:select` | `{ action }` | User selected an action (dictate/edit/command) |
| `state:change` | `{ state }` | Internal state changed |
| `settings:changed` | `{ setting }` | User changed a setting |
| `tts:synthesize:start` | `{ text }` | TTS synthesis request started |
| `tts:synthesize:complete` | `{ text }` | TTS audio bytes received |
| `tts:playback:start` | `{ text }` | TTS audio playback started |
| `tts:playback:complete` | `{ text }` | TTS audio playback finished |
| `tts:error` | `{ code, message, phase }` | TTS error occurred |

## Event Details

### transcription:inserted

Fired when transcribed text is inserted into a text field.

```typescript
SpeechOS.events.on('transcription:inserted', ({ text, element }) => {
  console.log(`Inserted: ${text}`);
  console.log('Into element:', element);
});
```

**Payload:**

- `text: string` — The transcribed text
- `element: HTMLElement` — The target text field

### transcription:complete

Fired when transcription is complete, before text insertion.

```typescript
SpeechOS.events.on('transcription:complete', ({ text }) => {
  console.log(`Transcription complete: ${text}`);
});
```

**Payload:**

- `text: string` — The transcribed text

### edit:applied

Fired when edited text is applied to a text field.

```typescript
SpeechOS.events.on('edit:applied', ({ originalContent, editedContent, element }) => {
  console.log(`Changed from: ${originalContent}`);
  console.log(`Changed to: ${editedContent}`);
  console.log('In element:', element);
});
```

**Payload:**

- `originalContent: string` — Original text before edit
- `editedContent: string` — Text after edit
- `element: HTMLElement` — The target text field

### edit:complete

Fired when editing is complete, before text application.

```typescript
SpeechOS.events.on('edit:complete', ({ text, originalText }) => {
  console.log(`Edit complete. Original: ${originalText}`);
  console.log(`New text: ${text}`);
});
```

**Payload:**

- `text: string` — The edited text
- `originalText: string` — Original text before edit

### command:complete

Fired when command matching is complete. Multiple commands can be matched from a single voice input.

```typescript
SpeechOS.events.on('command:complete', ({ commands }) => {
  if (commands.length > 0) {
    commands.forEach(cmd => {
      console.log(`Command matched: ${cmd.name}`);
      console.log('Arguments:', cmd.arguments);
    });
  } else {
    console.log('No command matched');
  }
});
```

**Payload:**

- `commands: CommandResult[]` — Array of matched commands (empty if no match)

**CommandResult:**

```typescript
interface CommandResult {
  /** Name of the matched command */
  name: string;

  /**
   * Extracted argument values.
   * Values are typed based on the CommandArgument.type:
   * - 'string' arguments → string
   * - 'number' arguments → number
   * - 'integer' arguments → number
   * - 'boolean' arguments → boolean
   */
  arguments: Record<string, unknown>;
}
```

### error

Fired when an error occurs.

```typescript
SpeechOS.events.on('error', ({ code, message, source }) => {
  console.error(`Error [${code}] from ${source}: ${message}`);
});
```

**Payload:**

- `code: string` — Error code
- `message: string` — Human-readable error message
- `source: string` — Component that generated the error

**Common error codes:**

- `MICROPHONE_PERMISSION_DENIED` — User denied microphone access
- `NETWORK_ERROR` — Connection failed
- `API_ERROR` — Backend API error
- `TRANSCRIPTION_FAILED` — Transcription processing failed

### widget:show

Fired when the widget becomes visible.

```typescript
SpeechOS.events.on('widget:show', () => {
  console.log('Widget is now visible');
});
```

**Payload:** None

### widget:hide

Fired when the widget is hidden.

```typescript
SpeechOS.events.on('widget:hide', () => {
  console.log('Widget is now hidden');
});
```

**Payload:** None

### form:focus

Fired when a text field receives focus (if form detection is enabled).

```typescript
SpeechOS.events.on('form:focus', ({ element }) => {
  console.log('Focused:', element.tagName, element.id);
});
```

**Payload:**

- `element: HTMLElement` — The focused element

### form:blur

Fired when a text field loses focus.

```typescript
SpeechOS.events.on('form:blur', ({ element }) => {
  console.log('Blurred:', element.tagName, element.id);
});
```

**Payload:**

- `element: HTMLElement` — The blurred element

### action:select

Fired when user selects an action (dictate, edit, or command).

```typescript
SpeechOS.events.on('action:select', ({ action }) => {
  console.log('User selected action:', action);
});
```

**Payload:**

- `action: 'dictate' | 'edit' | 'command'` — The selected action

### state:change

Fired whenever the internal state changes.

```typescript
SpeechOS.events.on('state:change', ({ state }) => {
  console.log('New state:', state);
});
```

**Payload:**

- `state: SpeechOSState` — The new state object

### settings:changed

Fired when user changes a setting in the widget.

```typescript
SpeechOS.events.on('settings:changed', ({ setting }) => {
  console.log('Setting changed:', setting);
});
```

**Payload:**

- `setting: string` — Name of the setting that changed

## TTS Events

### tts:synthesize:start

Fired when a TTS synthesis request begins.

```typescript
events.on('tts:synthesize:start', ({ text }) => {
  console.log('Synthesizing:', text);
  showLoadingSpinner();
});
```

**Payload:**

- `text: string` — The text being synthesized

### tts:synthesize:complete

Fired when TTS audio bytes are fully received from the server.

```typescript
events.on('tts:synthesize:complete', ({ text }) => {
  console.log('Synthesis complete for:', text);
  hideLoadingSpinner();
});
```

**Payload:**

- `text: string` — The text that was synthesized

### tts:playback:start

Fired when TTS audio playback begins (client package only).

```typescript
events.on('tts:playback:start', ({ text }) => {
  console.log('Playing:', text);
  showSpeakingIndicator();
});
```

**Payload:**

- `text: string` — The text being spoken

### tts:playback:complete

Fired when TTS audio playback finishes (client package only).

```typescript
events.on('tts:playback:complete', ({ text }) => {
  console.log('Playback complete:', text);
  hideSpeakingIndicator();
});
```

**Payload:**

- `text: string` — The text that was spoken

### tts:error

Fired when an error occurs during TTS synthesis or playback.

```typescript
events.on('tts:error', ({ code, message, phase }) => {
  console.error(`TTS ${phase} error [${code}]: ${message}`);
  
  if (phase === 'synthesize') {
    // Handle network/API errors
  } else {
    // Handle playback errors
  }
});
```

**Payload:**

- `code: string` — Error code identifying the error type
- `message: string` — Human-readable error message
- `phase: 'synthesize' | 'playback'` — Which phase the error occurred in

**Common error codes:**

| Code | Phase | Description |
|------|-------|-------------|
| `invalid_request` | synthesize | Invalid text or options |
| `usage_limit_exceeded` | synthesize | TTS character limit reached |
| `authentication_failed` | synthesize | Invalid or missing API key |
| `network_error` | synthesize | Network request failed |
| `decode_failed` | playback | Failed to decode audio data |
| `playback_failed` | playback | Audio playback error |

## Subscribing to Events

### Vanilla JavaScript

```typescript
import { SpeechOS } from '@speechos/client';

// Subscribe to event
const unsubscribe = SpeechOS.events.on('transcription:complete', ({ text }) => {
  console.log(text);
});

// Unsubscribe later
unsubscribe();
```

### React

```tsx
import { useCallback } from 'react';
import { useSpeechOSEvents } from '@speechos/react';

function MyComponent() {
  useSpeechOSEvents('transcription:complete', useCallback(({ text }) => {
    console.log('Transcribed:', text);
  }, []));

  return <div>Listening for events...</div>;
}
```

## Related

- [Widget Guide](./widget-guide.md) — Using events with the widget
- [TTS Guide](./tts-guide.md) — Text-to-speech events and usage
- [React Integration](./react-integration.md) — React event hooks
- [API Reference](./api-reference.md) — Full API documentation
