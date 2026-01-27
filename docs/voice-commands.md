# Voice Commands

Voice commands let you match natural speech to predefined actions. This is powerful for hands-free navigation, form submission, or custom workflows. SpeechOS can match multiple commands from a single voice input.

## Setting Up Commands

```typescript
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  commands: [
    // Simple command (no arguments)
    {
      name: 'submit_form',
      description: 'Submit the current form',
    },

    // Command with arguments
    {
      name: 'search',
      description: 'Search for something',
      arguments: [
        {
          name: 'query',
          description: 'What to search for',
          type: 'string',
          required: true,
        },
      ],
    },

    // Command with typed arguments
    {
      name: 'set_volume',
      description: 'Set the volume level',
      arguments: [
        {
          name: 'level',
          description: 'Volume level from 0 to 100',
          type: 'integer',
          required: true,
        },
      ],
    },
  ],
});
```

## Handling Command Results

Commands are returned as an array, which may contain zero, one, or multiple matched commands:

```typescript
SpeechOS.events.on('command:complete', ({ commands }) => {
  if (commands.length === 0) {
    console.log('No command matched');
    return;
  }

  // Process each matched command
  for (const command of commands) {
    switch (command.name) {
      case 'submit_form':
        document.querySelector('form')?.submit();
        break;

      case 'search':
        const query = command.arguments.query as string;
        performSearch(query);
        break;

      case 'set_volume':
        const level = command.arguments.level as number;
        setVolume(level);
        break;
    }
  }
});
```

## Argument Types

The `type` field controls how the AI extracts and formats argument values from speech:

| Type | Description | Example Speech | Extracted Value |
|------|-------------|----------------|-----------------|
| `string` | Text value (default) | "search for cats" | `"cats"` |
| `number` | Decimal number | "set to 3.5" | `3.5` |
| `integer` | Whole number | "go to page 5" | `5` |
| `boolean` | True/false | "enable dark mode" | `true` |

### Type Examples

```typescript
const commands = [
  {
    name: 'set_temperature',
    description: 'Set the thermostat temperature',
    arguments: [
      {
        name: 'degrees',
        description: 'Temperature in degrees',
        type: 'number',  // Returns number: 72.5
        required: true,
      },
    ],
  },
  {
    name: 'set_volume',
    description: 'Set volume level',
    arguments: [
      {
        name: 'level',
        description: 'Volume from 0 to 100',
        type: 'integer',  // Returns integer: 50
        required: true,
      },
    ],
  },
  {
    name: 'toggle_setting',
    description: 'Enable or disable a setting',
    arguments: [
      {
        name: 'setting',
        description: 'Setting name',
        type: 'string',  // Returns string: "dark_mode"
      },
      {
        name: 'enabled',
        description: 'Whether to enable',
        type: 'boolean',  // Returns boolean: true
      },
    ],
  },
];
```

### Type Safety in Results

Arguments are returned as `Record<string, unknown>`. Use type assertions for type-safe access:

```typescript
SpeechOS.events.on('command:complete', ({ commands }) => {
  for (const cmd of commands) {
    if (cmd.name === 'set_temperature') {
      const degrees = cmd.arguments.degrees as number;
      setThermostat(degrees);  // degrees is a number
    }
    if (cmd.name === 'toggle_setting') {
      const setting = cmd.arguments.setting as string;
      const enabled = cmd.arguments.enabled as boolean;
      updateSetting(setting, enabled);
    }
  }
});
```

## Multiple Commands in One Utterance

SpeechOS can match multiple commands from a single voice input. For example, saying "turn on the red light and turn off the blue light" will return both commands:

```typescript
SpeechOS.events.on('command:complete', ({ commands }) => {
  if (commands.length === 0) {
    console.log('No commands matched');
    return;
  }

  console.log(`Matched ${commands.length} command(s)`);

  // Execute each matched command
  for (const command of commands) {
    switch (command.name) {
      case 'turn_on':
        setLight(command.arguments.color as string, true);
        break;
      case 'turn_off':
        setLight(command.arguments.color as string, false);
        break;
    }
  }
});
```

## Command Definition Reference

```typescript
interface CommandDefinition {
  /** Unique identifier for the command */
  name: string;

  /** Description helps the AI understand when to match this command */
  description: string;

  /** Optional arguments to extract from speech */
  arguments?: CommandArgument[];
}

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

## Example: Light Control Demo

```typescript
const commands = [
  {
    name: 'turn_on',
    description: 'Turn on a light by color',
    arguments: [
      { name: 'color', description: 'Light color (red, green, blue)', type: 'string' },
    ],
  },
  {
    name: 'turn_off',
    description: 'Turn off a light by color',
    arguments: [
      { name: 'color', description: 'Light color', type: 'string' },
    ],
  },
  {
    name: 'all_on',
    description: 'Turn on all lights',
  },
  {
    name: 'all_off',
    description: 'Turn off all lights',
  },
];

SpeechOS.init({ apiKey: 'YOUR_API_KEY', commands });

SpeechOS.events.on('command:complete', ({ commands }) => {
  if (commands.length === 0) return;

  // Handle each matched command
  for (const command of commands) {
    switch (command.name) {
      case 'turn_on':
        setLight(command.arguments.color as string, true);
        break;
      case 'turn_off':
        setLight(command.arguments.color as string, false);
        break;
      case 'all_on':
        setAllLights(true);
        break;
      case 'all_off':
        setAllLights(false);
        break;
    }
  }
});
```

## Tips for Good Command Definitions

1. **Clear descriptions** — The AI uses descriptions to match user intent
2. **Specific names** — Use descriptive, unique command names
3. **Simple arguments** — Keep argument extraction straightforward
4. **Appropriate types** — Use the right type for each argument (integer for counts, boolean for toggles, etc.)
5. **Good examples** — Test with natural phrasings your users might say

## Related

- [Widget Guide](./widget-guide.md) — Configure the widget
- [Events Reference](./events-reference.md) — Command event details
- [React Integration](./react-integration.md) — Use commands in React
- [TypeScript Types](./typescript-types.md) — Full type reference
