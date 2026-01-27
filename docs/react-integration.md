# React Integration

For React apps, use `@speechos/react` for hooks and components that integrate naturally with React's lifecycle.

## Installation

```bash
npm install @speechos/client @speechos/react
```

## Basic Setup with Widget

```tsx
import { SpeechOS } from '@speechos/client';
import { SpeechOSProvider, SpeechOSWidget } from '@speechos/react';

function App() {
  return (
    <SpeechOSProvider config={{ apiKey: 'YOUR_API_KEY', readAloud: true }}>
      <MyForm />
      <SpeechOSWidget
        onTranscription={(text, element) => {
          console.log('Transcribed:', text);
        }}
        onEdit={(edited, original, element) => {
          console.log('Edited:', original, '->', edited);
        }}
        onError={(error) => {
          console.error('Error:', error.message);
        }}
      />
    </SpeechOSProvider>
  );
}

function MyForm() {
  return (
    <form>
      <textarea placeholder="Focus here to see the voice widget..." />
    </form>
  );
}
```

## Widget Props

```tsx
interface SpeechOSWidgetProps {
  apiKey?: string;              // Can also be set via Provider
  userId?: string;              // User identification
  debug?: boolean;              // Enable logging

  // Event callbacks
  onTranscription?: (text: string, element: HTMLElement) => void;
  onEdit?: (editedText: string, originalText: string, element: HTMLElement) => void;
  onError?: (error: { code: string; message: string; source: string }) => void;
  onShow?: () => void;
  onHide?: () => void;
}
```

## Read Aloud

The widget exposes a **Read** action when text is selected, or when a text box
(input/textarea) is focused with content but no selection. Playback can be stopped
with the red stop button.

---

## React Hooks API

For full control over voice interactions, use the React hooks directly. This enables custom UI, headless operation, or complex workflows.

### useDictation — Simple Voice-to-Text

```tsx
import { SpeechOSProvider, useDictation } from '@speechos/react';

function VoiceInput() {
  const {
    start,        // Start recording
    stop,         // Stop and get transcript
    isRecording,  // Currently recording?
    isProcessing, // Processing audio?
    transcript,   // Last transcription result
    error,        // Error message if failed
    clear,        // Clear transcript/error
  } = useDictation();

  return (
    <div>
      <button
        onClick={isRecording ? stop : start}
        disabled={isProcessing}
      >
        {isRecording ? '⏹️ Stop' : '🎤 Start'}
      </button>

      {isProcessing && <span>Processing...</span>}
      {transcript && <p>You said: {transcript}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

function App() {
  return (
    <SpeechOSProvider config={{ apiKey: 'YOUR_API_KEY' }}>
      <VoiceInput />
    </SpeechOSProvider>
  );
}
```

### useEdit — Voice-Powered Text Editing

```tsx
import { useState } from 'react';
import { SpeechOSProvider, useEdit } from '@speechos/react';

function TextEditor() {
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const {
    start,        // Start editing (pass text to edit)
    stop,         // Stop and get edited result
    isEditing,    // Currently recording edit instructions?
    isProcessing, // Processing?
    originalText, // Text being edited
    result,       // Edited result
    error,        // Error message
    clear,        // Clear state
  } = useEdit();

  const handleEdit = async () => {
    await start(text);
  };

  const handleStop = async () => {
    const edited = await stop();
    setText(edited);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isEditing || isProcessing}
      />

      <button
        onClick={isEditing ? handleStop : handleEdit}
        disabled={isProcessing || !text}
      >
        {isEditing ? '✅ Apply Edit' : '✏️ Edit with Voice'}
      </button>

      <p>
        <em>Try saying: "make it more formal" or "change fox to cat"</em>
      </p>

      {isProcessing && <span>Processing edit...</span>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### useCommand — Voice Commands with Arguments

```tsx
import { SpeechOSProvider, useCommand } from '@speechos/react';
import type { CommandDefinition } from '@speechos/react';

const commands: CommandDefinition[] = [
  { name: 'scroll_down', description: 'Scroll the page down' },
  { name: 'scroll_up', description: 'Scroll the page up' },
  {
    name: 'go_to_page',
    description: 'Navigate to a specific page',
    arguments: [
      { name: 'page', description: 'Page name or number', type: 'string' }
    ]
  },
  {
    name: 'set_zoom',
    description: 'Set zoom level',
    arguments: [
      { name: 'percent', description: 'Zoom percentage', type: 'integer' }
    ]
  },
];

function VoiceCommands() {
  const {
    start,        // Start listening (pass command definitions)
    stop,         // Stop and get matched commands
    isListening,  // Currently listening?
    isProcessing, // Processing?
    results,      // Matched command results (array)
    error,        // Error message
    clear,        // Clear state
  } = useCommand();

  const handleCommand = async () => {
    await start(commands);
  };

  const handleStop = async () => {
    const matched = await stop();
    // Execute all matched commands
    matched.forEach(cmd => executeCommand(cmd));
  };

  const executeCommand = (cmd: { name: string; arguments: Record<string, unknown> }) => {
    switch (cmd.name) {
      case 'scroll_down':
        window.scrollBy(0, 500);
        break;
      case 'scroll_up':
        window.scrollBy(0, -500);
        break;
      case 'go_to_page':
        navigateTo(cmd.arguments.page as string);
        break;
      case 'set_zoom':
        setZoom(cmd.arguments.percent as number);
        break;
    }
  };

  return (
    <div>
      <button
        onClick={isListening ? handleStop : handleCommand}
        disabled={isProcessing}
      >
        {isListening ? '✅ Execute' : '⚡ Say Command'}
      </button>

      {isProcessing && <span>Processing...</span>}
      {results.length > 0 && (
        <div>
          {results.map((cmd, i) => (
            <p key={i}>Command: {cmd.name}</p>
          ))}
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### useSpeechOSState — Read-Only State Access

```tsx
import { useSpeechOSState } from '@speechos/react';

function StatusIndicator() {
  const state = useSpeechOSState();

  return (
    <div>
      <p>Recording: {state.recordingState}</p>
      <p>Action: {state.activeAction || 'none'}</p>
      <p>Visible: {state.isVisible ? 'yes' : 'no'}</p>
      <p>Connected: {state.isConnected ? 'yes' : 'no'}</p>
      {state.errorMessage && <p>Error: {state.errorMessage}</p>}
    </div>
  );
}
```

### useSpeechOSEvents — Subscribe to Events

```tsx
import { useCallback } from 'react';
import { useSpeechOSEvents } from '@speechos/react';

function EventLogger() {
  // Subscribe to specific events (auto-cleanup on unmount)
  useSpeechOSEvents('transcription:complete', useCallback(({ text }) => {
    console.log('Transcription:', text);
  }, []));

  useSpeechOSEvents('error', useCallback(({ message, source }) => {
    console.error(`Error from ${source}: ${message}`);
  }, []));

  useSpeechOSEvents('command:complete', useCallback(({ commands }) => {
    commands.forEach(cmd => {
      console.log('Command matched:', cmd.name, cmd.arguments);
    });
  }, []));

  return <div>Event logging active (check console)</div>;
}
```

### useSpeechOSWidget — Programmatic Widget Control

Control widget visibility and positioning programmatically. Perfect for custom UX flows or when using `formDetection: false`.

```tsx
import { useRef } from 'react';
import { SpeechOSProvider, useSpeechOSWidget } from '@speechos/react';

function VoiceEnabledForm() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    showFor,         // Show widget for specific element
    attachTo,        // Attach widget to track element
    detach,          // Detach from element
    show,            // Show widget (default position)
    hide,            // Hide widget
    isVisible,       // Is widget visible?
    isExpanded,      // Are action bubbles expanded?
    focusedElement,  // Currently focused/attached element
  } = useSpeechOSWidget();

  return (
    <div>
      <textarea
        ref={textareaRef}
        placeholder="Enter text here..."
      />

      <button onClick={() => showFor(textareaRef.current!)}>
        🎤 Enable Voice for This Field
      </button>

      <button onClick={() => attachTo(textareaRef.current!)}>
        📌 Attach Widget to This Field
      </button>

      <button onClick={detach}>
        🔓 Detach Widget
      </button>

      <div>
        Status: {isVisible ? '👁️ Visible' : '🙈 Hidden'}
        {focusedElement && ` | Attached to ${focusedElement.tagName}`}
      </div>
    </div>
  );
}

function App() {
  return (
    <SpeechOSProvider config={{ apiKey: 'YOUR_API_KEY', formDetection: false }}>
      <VoiceEnabledForm />
    </SpeechOSProvider>
  );
}
```

### useSpeechOS — Full Context Access

For complete control, access the full context:

```tsx
import { useSpeechOS } from '@speechos/react';

function AdvancedControls() {
  const {
    state,          // Current state
    isInitialized,  // SDK ready?

    // Actions
    init,           // Initialize SDK
    dictate,        // Start dictation
    stopDictation,  // Stop and get transcript
    edit,           // Start edit
    stopEdit,       // Stop and get edited text
    command,        // Start command listening
    stopCommand,    // Stop and get matched command
    cancel,         // Cancel current operation

    // Events
    on,             // Subscribe to events
    off,            // Unsubscribe (use returned fn instead)
  } = useSpeechOS();

  // Full control over the voice session lifecycle
  const handleDictation = async () => {
    try {
      await dictate();
      // User is now recording...
    } catch (err) {
      console.error('Failed to start:', err);
    }
  };

  const handleStop = async () => {
    try {
      const text = await stopDictation();
      console.log('Got transcript:', text);
    } catch (err) {
      console.error('Failed to stop:', err);
    }
  };

  return (
    <div>
      <p>State: {state.recordingState}</p>
      <button onClick={handleDictation} disabled={state.recordingState !== 'idle'}>
        Start
      </button>
      <button onClick={handleStop} disabled={state.recordingState !== 'recording'}>
        Stop
      </button>
      <button onClick={cancel} disabled={state.recordingState === 'idle'}>
        Cancel
      </button>
    </div>
  );
}
```

## Related

- [Widget Guide](./widget-guide.md) — Configure the widget
- [Voice Commands](./voice-commands.md) — Set up commands
- [API Reference](./api-reference.md) — Full API documentation
- [TypeScript Types](./typescript-types.md) — Type definitions
