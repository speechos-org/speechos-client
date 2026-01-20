# Voice Commands

Voice commands let you match natural speech to predefined actions. This is powerful for hands-free navigation, form submission, or custom workflows.

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

```typescript
SpeechOS.events.on('command:complete', ({ command }) => {
  if (!command) {
    console.log('No command matched');
    return;
  }

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
  name: string;
  description: string;
  type?: 'string' | 'number' | 'integer' | 'boolean';
  required?: boolean; // default: true
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

SpeechOS.events.on('command:complete', ({ command }) => {
  if (!command) return;

  switch (command.name) {
    case 'turn_on':
      setLight(command.arguments.color, true);
      break;
    case 'turn_off':
      setLight(command.arguments.color, false);
      break;
    case 'all_on':
      setAllLights(true);
      break;
    case 'all_off':
      setAllLights(false);
      break;
  }
});
```

## Tips for Good Command Definitions

1. **Clear descriptions** — The AI uses descriptions to match user intent
2. **Specific names** — Use descriptive, unique command names
3. **Simple arguments** — Keep argument extraction straightforward
4. **Good examples** — Test with natural phrasings your users might say

## Related

- [Widget Guide](./widget-guide.md) — Configure the widget
- [Events Reference](./events-reference.md) — Command event details
- [React Integration](./react-integration.md) — Use commands in React
