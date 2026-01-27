# TTS Guide

Text-to-Speech (TTS) allows your application to convert text into spoken audio. SpeechOS TTS uses high-quality voices from ElevenLabs for natural-sounding speech.

## Overview

The TTS API supports two main use cases:

1. **Play audio immediately** - Use `tts.speak()` to synthesize and play audio through the browser
2. **Get raw audio bytes** - Use `tts.synthesize()` to get audio data for custom handling

## Quick Start

### Browser (Play Audio)

```typescript
import { tts } from '@speechos/client';

// Play audio immediately
await tts.speak('Hello, welcome to SpeechOS!');
```

### Headless (Get Bytes)

```typescript
import { tts } from '@speechos/core';

// Get audio as ArrayBuffer
const result = await tts.synthesize('Hello world');
console.log(result.audio);       // ArrayBuffer (MP3)
console.log(result.contentType); // 'audio/mpeg'
```

### React

```tsx
import { useTTS } from '@speechos/react';

function TTSButton() {
  const { speak, isSynthesizing, isPlaying, error } = useTTS();

  return (
    <button 
      onClick={() => speak('Hello!')}
      disabled={isSynthesizing || isPlaying}
    >
      {isSynthesizing ? 'Loading...' : isPlaying ? 'Playing...' : 'Speak'}
    </button>
  );
}
```

## API Reference

### `tts.speak(text, options?)` (Client only)

Synthesize text and play audio through the browser.

```typescript
await tts.speak('Hello world', {
  voiceId: 'optional-voice-id',
  language: 'en',
  audioDeviceId: 'output-device-id'  // Optional
});
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `text` | `string` | Text to synthesize (max 1000 chars) |
| `options.voiceId` | `string?` | Voice ID (server validates, uses default if omitted) |
| `options.language` | `string?` | Language code (default: 'en') |
| `options.audioDeviceId` | `string?` | Output audio device ID (if supported) |

**Returns:** `Promise<void>` - Resolves when playback completes.

### `tts.synthesize(text, options?)`

Synthesize text and return raw audio bytes.

```typescript
const result = await tts.synthesize('Hello world', {
  voiceId: 'optional-voice-id',
  language: 'en'
});
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `text` | `string` | Text to synthesize (max 1000 chars) |
| `options.voiceId` | `string?` | Voice ID (server validates, uses default if omitted) |
| `options.language` | `string?` | Language code (default: 'en') |

**Returns:** `Promise<TTSResult>`

```typescript
interface TTSResult {
  audio: ArrayBuffer;     // MP3 audio data
  contentType: string;    // 'audio/mpeg'
}
```

### `tts.stream(text, options?)`

Stream audio chunks as they arrive from the server.

```typescript
const chunks: Uint8Array[] = [];
for await (const chunk of tts.stream('Hello world')) {
  chunks.push(chunk);
  // Process chunk progressively
}
```

**Parameters:** Same as `synthesize()`

**Yields:** `AsyncGenerator<Uint8Array>` - Audio chunks

### `tts.stop()` (Client only)

Stop current audio playback.

```typescript
tts.stop();
```

### `tts.isPlaying()` (Client only)

Check if audio is currently playing.

```typescript
if (tts.isPlaying()) {
  console.log('Audio is playing');
}
```

## Options Reference

### Voice Selection

Voice IDs are validated server-side. Pass any valid voice ID, or omit to use the client default (Bella).

### Voice Selection (Widget)

The widget settings include a voice selector. This setting is stored locally and
applies to widget-based playback (read-aloud and TTS). Backend support for voice
settings is planned; for now it remains local.

```typescript
// Use server default voice
await tts.speak('Hello');

// Use specific voice
await tts.speak('Hello', { voiceId: 'JBFqnCBsd6RMkjVDRZzb' });
```

A default voice ID constant is exported for reference:

```typescript
import { DEFAULT_TTS_VOICE_ID } from '@speechos/core';
// DEFAULT_TTS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL' (Bella)
```

### Language

Specify the language code for proper pronunciation:

```typescript
await tts.speak('Bonjour le monde!', { language: 'fr' });
await tts.speak('Hola mundo!', { language: 'es' });
await tts.speak('Hallo Welt!', { language: 'de' });
```

Supported languages include: en, es, fr, de, it, pt, nl, pl, ru, ja, ko, zh, ar, and more.

### Audio Output Device (Client only)

Select a specific audio output device (where browser supports `setSinkId`):

```typescript
await tts.speak('Hello', { audioDeviceId: 'device-id' });
```

## Events

### Synthesis Events (Core)

```typescript
import { events } from '@speechos/core';

// Emitted when TTS request starts
events.on('tts:synthesize:start', ({ text }) => {
  console.log('Synthesizing:', text);
});

// Emitted when audio bytes are received
events.on('tts:synthesize:complete', ({ text }) => {
  console.log('Synthesis complete');
});
```

### Playback Events (Client)

```typescript
// Emitted when audio starts playing
events.on('tts:playback:start', ({ text }) => {
  console.log('Playing:', text);
});

// Emitted when playback finishes
events.on('tts:playback:complete', ({ text }) => {
  console.log('Playback complete');
});
```

### Error Events

```typescript
events.on('tts:error', ({ code, message, phase }) => {
  console.error(`TTS ${phase} error [${code}]: ${message}`);
});
```

**Error Codes:**

| Code | Phase | Description |
|------|-------|-------------|
| `invalid_request` | synthesize | Invalid text or options |
| `usage_limit_exceeded` | synthesize | TTS character limit reached |
| `authentication_failed` | synthesize | Invalid or missing API key |
| `network_error` | synthesize | Network request failed |
| `decode_failed` | playback | Failed to decode audio |
| `playback_failed` | playback | Audio playback error |

## React Hook

The `useTTS` hook provides a convenient interface for React applications:

```typescript
interface UseTTSResult {
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  synthesize: (text: string, options?: TTSOptions) => Promise<TTSResult>;
  stop: () => void;
  isSynthesizing: boolean;  // HTTP request in progress
  isPlaying: boolean;       // Audio currently playing
  audioResult: TTSResult | null;  // Last synthesize() result
  error: string | null;     // Error message
  clear: () => void;        // Clear audioResult and error
}
```

### Example: TTS with Loading State

```tsx
import { useTTS } from '@speechos/react';

function TTSComponent() {
  const { speak, stop, isSynthesizing, isPlaying, error } = useTTS();

  const handleClick = async () => {
    if (isPlaying) {
      stop();
    } else {
      await speak('Hello from React!');
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isSynthesizing}>
        {isSynthesizing ? 'Loading...' : isPlaying ? 'Stop' : 'Speak'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Example: Get Audio for Custom Playback

```tsx
import { useTTS } from '@speechos/react';

function CustomAudioPlayer() {
  const { synthesize, audioResult, isSynthesizing, clear } = useTTS();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleSynthesize = async () => {
    const result = await synthesize('Hello world');
    const blob = new Blob([result.audio], { type: result.contentType });
    setAudioUrl(URL.createObjectURL(blob));
  };

  return (
    <div>
      <button onClick={handleSynthesize} disabled={isSynthesizing}>
        {isSynthesizing ? 'Loading...' : 'Get Audio'}
      </button>
      {audioUrl && (
        <audio controls src={audioUrl} onEnded={() => clear()} />
      )}
    </div>
  );
}
```

## Browser Compatibility

TTS playback requires Web Audio API support:

- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

Audio device selection (`audioDeviceId`) requires `setSinkId` support, which has more limited availability.

## Error Handling

### Try/Catch Pattern

```typescript
try {
  await tts.speak('Hello');
} catch (error) {
  console.error('TTS failed:', error.message);
}
```

### Event-Based Pattern

```typescript
events.on('tts:error', ({ code, message, phase }) => {
  if (phase === 'synthesize') {
    // Handle network/API errors
    showNotification(`Failed to synthesize: ${message}`);
  } else {
    // Handle playback errors
    showNotification(`Playback error: ${message}`);
  }
});
```

## Limits

- Maximum text length: 1000 characters per request
- Usage limits may apply based on your plan
- Voice IDs are validated server-side

## See Also

- [Events Reference](./events-reference.md) - All TTS events
- [API Reference](./api-reference.md) - Complete API documentation
- [React Integration](./react-integration.md) - React patterns
