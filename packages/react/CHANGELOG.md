# @speechos/react

## 1.0.11

### Patch Changes

- Add support for TTS to APIs and widget
- Fix bugs with new read feature
- Updated dependencies
- Updated dependencies
  - @speechos/client@0.2.12
  - @speechos/core@0.2.11

## 1.0.10

### Patch Changes

- New default light theme
- Updated dependencies
  - @speechos/client@0.2.11
  - @speechos/core@0.2.10

## 1.0.9

### Patch Changes

- Simplify Chrome extension code for security purposes
- Updated dependencies
  - @speechos/client@0.2.10
  - @speechos/core@0.2.9

## 1.0.8

### Patch Changes

- Internal work to support Chrome extension
- Updated dependencies
  - @speechos/client@0.2.9
  - @speechos/core@0.2.8

## 1.0.7

### Patch Changes

- Fix bug with dictation closing widget
- Updated dependencies
  - @speechos/client@0.2.8
  - @speechos/core@0.2.7

## 1.0.6

### Patch Changes

- Add support for swappable WebSocket implementations and improve error handling

  - Added `WebSocketFactory` type and `webSocketFactory` config option to allow custom WebSocket implementations
  - Improved error state handling with better CSP violation detection and surfacing
  - Switched to `text-field-edit` library for more reliable text insertion and selection handling in form fields

- Updated dependencies
  - @speechos/client@0.2.7
  - @speechos/core@0.2.6

## 1.0.5

### Patch Changes

- Add no-audio warning detection and user feedback improvements

  - Add no-audio warning detection to widget with automatic settings modal prompting
  - Show feedback when no edit is understood during voice input
  - Fix settings modal opening from no-audio warning
  - Add recording demo HTML pages for testing

- Updated dependencies
  - @speechos/client@0.2.6
  - @speechos/core@0.2.5

## 1.0.4

### Patch Changes

- Bump due to release error
- Updated dependencies
  - @speechos/client@0.2.5
  - @speechos/core@0.2.4

## 1.0.3

### Patch Changes

- # Features

  - Always visible state: Add support for persistent UI visibility with new modal components for dictation output and editing help, enhanced mic button functionality, and configurable
    form detection behavior
  - Anonymous user tracking: Implement anonymous ID generation and transmission to backend for analytics

- Updated dependencies
  - @speechos/client@0.2.4
  - @speechos/core@0.2.3

## 1.0.2

### Patch Changes

- 3cf5ade: Initial beta release
- Updated dependencies [b9e25b9]
- Updated dependencies [3cf5ade]
  - @speechos/client@0.2.3
  - @speechos/core@0.2.2

## 1.0.0

### Minor Changes

- 66af827: Initial release of SpeechOS SDK packages

  - `@speechos/core`: Headless core SDK with state management, events, and LiveKit integration
  - `@speechos/client`: Full client SDK with Web Components UI for embedding voice input
  - `@speechos/react`: React hooks and components for SpeechOS integration

### Patch Changes

- Updated dependencies [66af827]
  - @speechos/core@0.2.0
  - @speechos/client@0.2.0
