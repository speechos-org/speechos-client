# TypeScript Types

Complete TypeScript type definitions for SpeechOS SDK.

## Core Types

### SpeechOSState

The state object representing the current state of the SDK.

```typescript
interface SpeechOSState {
  /** Current recording/processing state */
  recordingState: RecordingState;
  
  /** Is the widget visible? */
  isVisible: boolean;
  
  /** Is connected to the backend? */
  isConnected: boolean;
  
  /** Currently active action (or null if idle) */
  activeAction: SpeechOSAction | null;
  
  /** Currently focused/attached element (or null) */
  focusedElement: HTMLElement | null;

  /** Currently selected text (or null) */
  selectionText: string | null;

  /** Element associated with current selection (or null) */
  selectionElement: HTMLElement | null;
  
  /** Error message (or null if no error) */
  errorMessage: string | null;
}

type RecordingState = 'idle' | 'connecting' | 'recording' | 'processing' | 'error';
type SpeechOSAction = 'dictate' | 'edit' | 'command' | 'read';
```

### Configuration Types

#### SpeechOSCoreConfig

Configuration for `@speechos/core` package.

```typescript
interface SpeechOSCoreConfig {
  /** Your SpeechOS API key (required) */
  apiKey: string;
  
  /** Optional user identifier for analytics */
  userId?: string;
  
  /** Enable debug logging */
  debug?: boolean;
}
```

#### SpeechOSClientConfig

Configuration for `@speechos/client` package (extends SpeechOSCoreConfig).

```typescript
interface SpeechOSClientConfig extends SpeechOSCoreConfig {
  /** Widget z-index (default: 999999) */
  zIndex?: number;
  
  /** Form detection behavior (default: true) */
  formDetection?: boolean | FormDetectorInterface;

  /** Read-aloud configuration */
  readAloud?: boolean | ReadAloudConfig;
  
  /** Voice command definitions */
  commands?: CommandDefinition[];
  
  /** Custom text input handler */
  textInputHandler?: TextInputHandlerInterface;
}

interface ReadAloudConfig {
  enabled?: boolean;
  minLength?: number;
  maxLength?: number | null;
  showOnSelection?: boolean;
}
```

#### SpeechOSReactConfig

Configuration for React provider.

```typescript
interface SpeechOSReactConfig extends SpeechOSCoreConfig {
  // Same as SpeechOSCoreConfig
}
```

## Command Types

### CommandDefinition

Definition of a voice command.

```typescript
interface CommandDefinition {
  /** Unique command identifier */
  name: string;
  
  /** Description helps AI match user intent */
  description: string;
  
  /** Optional command arguments */
  arguments?: CommandArgument[];
}
```

### CommandArgument

Argument definition for a command.

```typescript
interface CommandArgument {
  /** Argument name (used as key in CommandResult.arguments) */
  name: string;
  
  /** Description helps AI understand what value to extract */
  description: string;
  
  /**
   * Expected type - controls how the value is extracted and formatted.
   *
   * - 'string': Text value (default). Returned as string.
   * - 'number': Decimal number. Returned as number (e.g., 3.14).
   * - 'integer': Whole number. Returned as number (e.g., 42).
   * - 'boolean': True/false. Returned as boolean.
   *
   * @default 'string'
   */
  type?: 'string' | 'number' | 'integer' | 'boolean';
  
  /**
   * Whether this argument must be present for the command to match.
   * If required and not found in speech, the command won't match.
   *
   * @default true
   */
  required?: boolean;
}
```

### CommandResult

Result of a matched command.

```typescript
interface CommandResult {
  /** Name of the matched command */
  name: string;
  
  /**
   * Extracted argument values.
   *
   * Values are typed based on the CommandArgument.type:
   * - 'string' arguments → string
   * - 'number' arguments → number
   * - 'integer' arguments → number
   * - 'boolean' arguments → boolean
   *
   * Use type assertions when accessing:
   * ```typescript
   * const level = result.arguments.level as number;
   * const enabled = result.arguments.enabled as boolean;
   * ```
   */
  arguments: Record<string, unknown>;
}
```

## Event Types

### SpeechOSEventMap

Map of all events and their payloads.

```typescript
interface SpeechOSEventMap {
  'transcription:inserted': { text: string; element: HTMLElement };
  'transcription:complete': { text: string };
  'edit:applied': { originalContent: string; editedContent: string; element: HTMLElement };
  'edit:complete': { text: string; originalText: string };
  'command:complete': { commands: CommandResult[] };  // Array of matched commands
  'error': { code: string; message: string; source: string };
  'widget:show': void;
  'widget:hide': void;
  'form:focus': { element: HTMLElement };
  'form:blur': { element: HTMLElement };
  'action:select': { action: SpeechOSAction };
  'state:change': { state: SpeechOSState };
  'settings:changed': { setting: string };
}
```

### UnsubscribeFn

Function returned from event subscriptions to unsubscribe.

```typescript
type UnsubscribeFn = () => void;
```

## Customization Interfaces

### FormDetectorInterface

Interface for custom form detection.

```typescript
interface FormDetectorInterface {
  /** Called when SDK initializes */
  attach(): void;
  
  /** Called when SDK is destroyed */
  detach(): void;
  
  /** Get currently focused form element (or null) */
  getCurrentElement(): HTMLElement | null;
}
```

### TextInputHandlerInterface

Interface for custom text input handling.

```typescript
interface TextInputHandlerInterface {
  /** Get current cursor/selection position from an element */
  getSelection(element: HTMLElement): SelectionInfo;
  
  /** Get content from element (selected portion if exists, otherwise full content) */
  getContent(element: HTMLElement, selection?: SelectionInfo): string;
  
  /** Insert text at cursor position (for dictation) */
  insertText(element: HTMLElement, text: string, cursorPosition?: SelectionInfo): void;
  
  /** Replace content/selection with new text (for edit) */
  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void;
}

interface SelectionInfo {
  start: number | null;
  end: number | null;
  text: string;
}
```

## React Component Types

### SpeechOSProviderProps

Props for the React provider component.

```typescript
interface SpeechOSProviderProps {
  /** SDK configuration */
  config: SpeechOSReactConfig;
  
  /** Child components */
  children: React.ReactNode;
}
```

### SpeechOSWidgetProps

Props for the React widget component.

```typescript
interface SpeechOSWidgetProps {
  /** API key (can also be set via Provider) */
  apiKey?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Called when transcription is inserted */
  onTranscription?: (text: string, element: HTMLElement) => void;
  
  /** Called when edit is applied */
  onEdit?: (editedText: string, originalText: string, element: HTMLElement) => void;
  
  /** Called on error */
  onError?: (error: { code: string; message: string; source: string }) => void;
  
  /** Called when widget shows */
  onShow?: () => void;
  
  /** Called when widget hides */
  onHide?: () => void;
}
```

## React Hook Return Types

### UseDictationResult

```typescript
interface UseDictationResult {
  /** Start dictation */
  start: () => Promise<void>;
  
  /** Stop and get transcript */
  stop: () => Promise<string>;
  
  /** Is currently recording? */
  isRecording: boolean;
  
  /** Is processing audio? */
  isProcessing: boolean;
  
  /** Last transcript result */
  transcript: string | null;
  
  /** Error message if failed */
  error: string | null;
  
  /** Clear transcript and error */
  clear: () => void;
}
```

### UseEditResult

```typescript
interface UseEditResult {
  /** Start editing (pass text to edit) */
  start: (text: string) => Promise<void>;
  
  /** Stop and get edited text */
  stop: () => Promise<string>;
  
  /** Is currently recording edit instructions? */
  isEditing: boolean;
  
  /** Is processing? */
  isProcessing: boolean;
  
  /** Original text being edited */
  originalText: string | null;
  
  /** Edited result */
  result: string | null;
  
  /** Error message */
  error: string | null;
  
  /** Clear state */
  clear: () => void;
}
```

### UseCommandResult

```typescript
interface UseCommandResult {
  /** Start listening for commands */
  start: (commands: CommandDefinition[]) => Promise<void>;
  
  /** Stop and get matched commands */
  stop: () => Promise<CommandResult[]>;
  
  /** Is currently listening? */
  isListening: boolean;
  
  /** Is processing? */
  isProcessing: boolean;
  
  /** Matched command results (empty array if no matches) */
  results: CommandResult[];
  
  /** Error message */
  error: string | null;
  
  /** Clear state */
  clear: () => void;
}
```

### UseSpeechOSWidgetResult

```typescript
interface UseSpeechOSWidgetResult {
  /** Show widget for specific element */
  showFor: (element: HTMLElement) => void;
  
  /** Attach widget to track element */
  attachTo: (element: HTMLElement) => void;
  
  /** Detach from element */
  detach: () => void;
  
  /** Show widget (default position) */
  show: () => void;
  
  /** Hide widget */
  hide: () => void;
  
  /** Is widget visible? */
  isVisible: boolean;
  
  /** Are action bubbles expanded? */
  isExpanded: boolean;
  
  /** Currently focused/attached element */
  focusedElement: HTMLElement | null;
}
```

### UseSpeechOSResult

```typescript
interface UseSpeechOSResult {
  /** Current state */
  state: SpeechOSState;
  
  /** Is SDK initialized? */
  isInitialized: boolean;
  
  /** Initialize SDK */
  init: (config: SpeechOSCoreConfig) => void;
  
  /** Start dictation */
  dictate: () => Promise<string>;
  
  /** Stop dictation */
  stopDictation: () => Promise<string>;
  
  /** Start edit */
  edit: (text: string) => Promise<string>;
  
  /** Stop edit */
  stopEdit: () => Promise<string>;
  
  /** Start command listening */
  command: (commands: CommandDefinition[]) => Promise<CommandResult[]>;
  
  /** Stop command listening (returns array of matched commands) */
  stopCommand: () => Promise<CommandResult[]>;
  
  /** Cancel current operation */
  cancel: () => Promise<void>;
  
  /** Subscribe to events */
  on: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => UnsubscribeFn;
  
  /** Unsubscribe from events */
  off: <K extends keyof SpeechOSEventMap>(
    event: K,
    callback: (payload: SpeechOSEventMap[K]) => void
  ) => void;
}
```

## Importing Types

```typescript
// From @speechos/client
import type {
  SpeechOSState,
  RecordingState,
  SpeechOSAction,
  SpeechOSCoreConfig,
  SpeechOSClientConfig,
  SpeechOSEventMap,
  CommandDefinition,
  CommandArgument,
  CommandResult,
  FormDetectorInterface,
  TextInputHandlerInterface,
  SelectionInfo,
  UnsubscribeFn,
} from '@speechos/client';

// From @speechos/react
import type {
  SpeechOSReactConfig,
  SpeechOSProviderProps,
  SpeechOSWidgetProps,
  UseDictationResult,
  UseEditResult,
  UseCommandResult,
  UseSpeechOSWidgetResult,
  UseSpeechOSResult,
} from '@speechos/react';
```

## Related

- [API Reference](./api-reference.md) — Complete API documentation
- [Events Reference](./events-reference.md) — Event documentation
- [Advanced Topics](./advanced.md) — Custom interfaces
