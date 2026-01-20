# Advanced Topics

## Custom Text Input Handling

Override how SpeechOS interacts with text fields by providing a custom `TextInputHandler`. Useful for:

- React controlled inputs that need special handling
- Custom editor components (Monaco, CodeMirror, etc.)
- Non-standard text input implementations

### TextInputHandler Interface

```typescript
export interface TextInputHandlerInterface {
  /** Get current cursor/selection position from an element */
  getSelection(element: HTMLElement): SelectionInfo;

  /** Get content from element (selected portion if exists, otherwise full content) */
  getContent(element: HTMLElement, selection?: SelectionInfo): string;

  /** Insert text at cursor position (for dictation) */
  insertText(element: HTMLElement, text: string, cursorPosition?: SelectionInfo): void;

  /** Replace content/selection with new text (for edit) */
  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void;
}

export interface SelectionInfo {
  start: number | null;
  end: number | null;
  text: string;
}
```

### Example: Custom Handler for React Controlled Inputs

```typescript
import { SpeechOS } from '@speechos/client';
import type { TextInputHandlerInterface, SelectionInfo } from '@speechos/client';

const reactInputHandler: TextInputHandlerInterface = {
  getSelection(element: HTMLElement): SelectionInfo {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        start: element.selectionStart,
        end: element.selectionEnd,
        text: element.value.substring(
          element.selectionStart ?? 0,
          element.selectionEnd ?? 0
        ),
      };
    }
    return { start: null, end: null, text: '' };
  },

  getContent(element: HTMLElement, selection?: SelectionInfo): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (selection && selection.start !== selection.end) {
        return element.value.substring(selection.start ?? 0, selection.end ?? 0);
      }
      return element.value;
    }
    return '';
  },

  insertText(element: HTMLElement, text: string, cursor?: SelectionInfo): void {
    // Dispatch custom event for React to handle
    element.dispatchEvent(new CustomEvent('speechos:insert', {
      bubbles: true,
      detail: { text, cursor },
    }));
  },

  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void {
    // Dispatch custom event for React to handle
    element.dispatchEvent(new CustomEvent('speechos:replace', {
      bubbles: true,
      detail: { text, selection },
    }));
  },
};

SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  textInputHandler: reactInputHandler,
});
```

### Example: Custom Handler for Monaco Editor

```typescript
import type { editor as MonacoEditor } from 'monaco-editor';
import type { TextInputHandlerInterface, SelectionInfo } from '@speechos/client';

class MonacoInputHandler implements TextInputHandlerInterface {
  private editors = new WeakMap<HTMLElement, MonacoEditor.IStandaloneCodeEditor>();

  registerEditor(element: HTMLElement, editor: MonacoEditor.IStandaloneCodeEditor) {
    this.editors.set(element, editor);
  }

  getSelection(element: HTMLElement): SelectionInfo {
    const editor = this.editors.get(element);
    if (!editor) return { start: null, end: null, text: '' };

    const selection = editor.getSelection();
    if (!selection) return { start: null, end: null, text: '' };

    const model = editor.getModel();
    if (!model) return { start: null, end: null, text: '' };

    return {
      start: model.getOffsetAt(selection.getStartPosition()),
      end: model.getOffsetAt(selection.getEndPosition()),
      text: model.getValueInRange(selection),
    };
  }

  getContent(element: HTMLElement, selection?: SelectionInfo): string {
    const editor = this.editors.get(element);
    if (!editor) return '';

    if (selection && selection.text) {
      return selection.text;
    }
    return editor.getValue();
  }

  insertText(element: HTMLElement, text: string, cursor?: SelectionInfo): void {
    const editor = this.editors.get(element);
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('speechos', [{
        range: selection,
        text: text,
      }]);
    }
  }

  replaceContent(element: HTMLElement, text: string, selection?: SelectionInfo): void {
    const editor = this.editors.get(element);
    if (!editor) return;

    const range = editor.getSelection();
    if (range) {
      editor.executeEdits('speechos', [{
        range: range,
        text: text,
      }]);
    }
  }
}

const monacoHandler = new MonacoInputHandler();

// Register your Monaco editor instances
monacoHandler.registerEditor(editorElement, editor);

SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  textInputHandler: monacoHandler,
});
```

---

## Headless Usage (Core SDK)

For complete control without any UI, use `@speechos/core` directly:

```typescript
import { speechOS } from '@speechos/core';

// Initialize
speechOS.init({ apiKey: 'YOUR_API_KEY' });

// High-level API
async function transcribe() {
  // Start dictation (returns promise that resolves when stopped)
  const transcriptPromise = speechOS.dictate();

  // ... user is recording ...

  // Stop and get result
  const text = await speechOS.stopDictation();
  console.log('Transcript:', text);
}

async function editText(originalText: string) {
  // Start edit session
  speechOS.edit(originalText);

  // ... user speaks edit instructions ...

  // Stop and get edited text
  const edited = await speechOS.stopEdit();
  console.log('Edited:', edited);
}

// Subscribe to state changes
speechOS.state.subscribe((newState, prevState) => {
  console.log('State changed:', newState.recordingState);
});

// Subscribe to events
speechOS.events.on('transcription:complete', ({ text }) => {
  console.log('Transcription:', text);
});

// Cancel any active operation
await speechOS.cancel();
```

### When to Use Headless Mode

- Building custom UI components
- Integrating with non-web platforms
- Creating voice-controlled applications without text fields
- Need fine-grained control over the voice pipeline

### Headless API Methods

```typescript
// Initialization
speechOS.init(config: SpeechOSCoreConfig): void;

// Dictation
speechOS.dictate(): Promise<string>;
speechOS.stopDictation(): Promise<string>;

// Editing
speechOS.edit(text: string): Promise<string>;
speechOS.stopEdit(): Promise<string>;

// Commands
speechOS.command(commands: CommandDefinition[]): Promise<CommandResult>;
speechOS.stopCommand(): Promise<CommandResult>;

// Control
speechOS.cancel(): Promise<void>;
speechOS.destroy(): Promise<void>;

// State
speechOS.state.subscribe(callback): UnsubscribeFn;
speechOS.getState(): SpeechOSState;

// Events
speechOS.events.on(event, callback): UnsubscribeFn;
speechOS.events.off(event, callback): void;
```

## Related

- [API Reference](./api-reference.md) — Complete API documentation
- [TypeScript Types](./typescript-types.md) — Type definitions
- [Widget Guide](./widget-guide.md) — Using the widget
