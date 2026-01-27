# API Reference

Complete reference for the SpeechOS Client SDK.

## SpeechOS (Client API)

Main API for `@speechos/client` package.

### Initialization

#### `SpeechOS.init(config: SpeechOSClientConfig): void`

Initialize the SpeechOS client with configuration.

```typescript
import { SpeechOS } from '@speechos/client';

SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  userId: 'user_123',
  debug: true,
  zIndex: 999999,
  formDetection: true,
  commands: [
    { name: 'submit', description: 'Submit the form' }
  ],
  textInputHandler: customHandler,
});
```

**Parameters:**
- `config: SpeechOSClientConfig` — Configuration object

**SpeechOSClientConfig:**
```typescript
interface SpeechOSClientConfig {
  apiKey: string;
  userId?: string;
  debug?: boolean;
  zIndex?: number;
  formDetection?: boolean | FormDetectorInterface;
  commands?: CommandDefinition[];
  textInputHandler?: TextInputHandlerInterface;
}
```

### User Identification

#### `SpeechOS.identify(userId: string): void`

Associate the current session with a user ID.

```typescript
SpeechOS.identify('user_123');
```

### Widget Control

#### `SpeechOS.show(): void`

Show the widget at the default position.

```typescript
SpeechOS.show();
```

#### `SpeechOS.hide(): void`

Hide the widget.

```typescript
SpeechOS.hide();
```

#### `SpeechOS.showFor(element: HTMLElement): void`

Show the widget for a specific element.

```typescript
const textarea = document.querySelector('textarea');
SpeechOS.showFor(textarea);
```

#### `SpeechOS.attachTo(element: HTMLElement): void`

Attach the widget to track an element's position.

```typescript
const textarea = document.querySelector('textarea');
SpeechOS.attachTo(textarea);
```

#### `SpeechOS.detach(): void`

Detach the widget from the current element.

```typescript
SpeechOS.detach();
```

### State

#### `SpeechOS.getState(): SpeechOSState`

Get the current state.

```typescript
const state = SpeechOS.getState();
console.log(state.recordingState);
console.log(state.isVisible);
console.log(state.activeAction);
```

**Returns:** `SpeechOSState`

```typescript
interface SpeechOSState {
  recordingState: 'idle' | 'connecting' | 'recording' | 'processing';
  isVisible: boolean;
  isConnected: boolean;
  activeAction: 'dictate' | 'edit' | 'command' | null;
  focusedElement: HTMLElement | null;
  errorMessage: string | null;
}
```

### Events

#### `SpeechOS.events.on(event: string, callback: Function): UnsubscribeFn`

Subscribe to an event.

```typescript
const unsubscribe = SpeechOS.events.on('transcription:complete', ({ text }) => {
  console.log('Transcribed:', text);
});

// Unsubscribe later
unsubscribe();
```

**Returns:** Function to unsubscribe

See [Events Reference](./events-reference.md) for complete event list.

### Cleanup

#### `SpeechOS.destroy(): Promise<void>`

Destroy the SpeechOS instance and clean up resources.

```typescript
await SpeechOS.destroy();
```

---

## speechOS (Core API)

Headless API for `@speechos/core` package.

### Initialization

#### `speechOS.init(config: SpeechOSCoreConfig): void`

Initialize the core SDK.

```typescript
import { speechOS } from '@speechos/core';

speechOS.init({
  apiKey: 'YOUR_API_KEY',
  userId: 'user_123',
  debug: true,
});
```

**SpeechOSCoreConfig:**
```typescript
interface SpeechOSCoreConfig {
  apiKey: string;
  userId?: string;
  debug?: boolean;
}
```

### Dictation

#### `speechOS.dictate(): Promise<string>`

Start dictation session.

```typescript
const transcriptPromise = speechOS.dictate();
// ... user records audio ...
const text = await speechOS.stopDictation();
```

#### `speechOS.stopDictation(): Promise<string>`

Stop dictation and get transcript.

```typescript
const text = await speechOS.stopDictation();
console.log('Transcribed:', text);
```

### Editing

#### `speechOS.edit(text: string): Promise<string>`

Start edit session with text.

```typescript
const editPromise = speechOS.edit('The quick brown fox');
// ... user speaks edit instructions ...
const edited = await speechOS.stopEdit();
```

#### `speechOS.stopEdit(): Promise<string>`

Stop edit and get edited text.

```typescript
const edited = await speechOS.stopEdit();
console.log('Edited:', edited);
```

### Commands

#### `speechOS.command(commands: CommandDefinition[]): Promise<CommandResult[]>`

Start command listening with definitions. Returns an array of matched commands.

```typescript
const commandPromise = speechOS.command([
  { name: 'submit', description: 'Submit the form' },
  { name: 'cancel', description: 'Cancel the form' }
]);
// ... user speaks command(s) ...
const results = await speechOS.stopCommand();
```

#### `speechOS.stopCommand(): Promise<CommandResult[]>`

Stop command listening and get matched commands. Multiple commands can be matched from a single voice input.

```typescript
const results = await speechOS.stopCommand();
if (results.length > 0) {
  results.forEach(cmd => {
    console.log('Command:', cmd.name, cmd.arguments);
  });
}
```

### Control

#### `speechOS.cancel(): Promise<void>`

Cancel the current operation.

```typescript
await speechOS.cancel();
```

#### `speechOS.destroy(): Promise<void>`

Destroy the SDK instance.

```typescript
await speechOS.destroy();
```

### State

#### `speechOS.state.subscribe(callback: StateCallback): UnsubscribeFn`

Subscribe to state changes.

```typescript
const unsubscribe = speechOS.state.subscribe((newState, prevState) => {
  console.log('State changed:', newState.recordingState);
});

// Unsubscribe later
unsubscribe();
```

#### `speechOS.getState(): SpeechOSState`

Get current state.

```typescript
const state = speechOS.getState();
```

### Events

Same as client API. See [Events Reference](./events-reference.md).

---

## React Hooks

Complete reference for `@speechos/react` hooks.

### useDictation

```typescript
interface UseDictationResult {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  error: string | null;
  clear: () => void;
}

function useDictation(): UseDictationResult;
```

### useEdit

```typescript
interface UseEditResult {
  start: (text: string) => Promise<void>;
  stop: () => Promise<string>;
  isEditing: boolean;
  isProcessing: boolean;
  originalText: string | null;
  result: string | null;
  error: string | null;
  clear: () => void;
}

function useEdit(): UseEditResult;
```

### useCommand

```typescript
interface UseCommandResult {
  start: (commands: CommandDefinition[]) => Promise<void>;
  stop: () => Promise<CommandResult[]>;
  isListening: boolean;
  isProcessing: boolean;
  results: CommandResult[];  // Array of matched commands
  error: string | null;
  clear: () => void;
}

function useCommand(): UseCommandResult;
```

### useSpeechOSState

```typescript
function useSpeechOSState(): SpeechOSState;
```

### useSpeechOSEvents

```typescript
function useSpeechOSEvents<K extends keyof SpeechOSEventMap>(
  event: K,
  callback: (payload: SpeechOSEventMap[K]) => void
): void;
```

### useSpeechOSWidget

```typescript
interface UseSpeechOSWidgetResult {
  showFor: (element: HTMLElement) => void;
  attachTo: (element: HTMLElement) => void;
  detach: () => void;
  show: () => void;
  hide: () => void;
  isVisible: boolean;
  isExpanded: boolean;
  focusedElement: HTMLElement | null;
}

function useSpeechOSWidget(): UseSpeechOSWidgetResult;
```

### useSpeechOS

```typescript
interface UseSpeechOSResult {
  state: SpeechOSState;
  isInitialized: boolean;
  init: (config: SpeechOSCoreConfig) => void;
  dictate: () => Promise<string>;
  stopDictation: () => Promise<string>;
  edit: (text: string) => Promise<string>;
  stopEdit: () => Promise<string>;
  command: (commands: CommandDefinition[]) => Promise<CommandResult[]>;
  stopCommand: () => Promise<CommandResult[]>;
  cancel: () => Promise<void>;
  on: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => UnsubscribeFn;
  off: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => void;
}

function useSpeechOS(): UseSpeechOSResult;
```

---

## Related

- [TypeScript Types](./typescript-types.md) — Complete type definitions
- [Events Reference](./events-reference.md) — Event documentation
- [Widget Guide](./widget-guide.md) — Widget usage
- [React Integration](./react-integration.md) — React examples
