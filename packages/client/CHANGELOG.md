# @speechos/client

## 0.2.9

### Patch Changes

- Internal work to support Chrome extension
- Updated dependencies
  - @speechos/core@0.2.8

## 0.2.8

### Patch Changes

- Fix bug with dictation closing widget
- Updated dependencies
  - @speechos/core@0.2.7

## 0.2.7

### Patch Changes

- Add support for swappable WebSocket implementations and improve error handling

  - Added `WebSocketFactory` type and `webSocketFactory` config option to allow custom WebSocket implementations
  - Improved error state handling with better CSP violation detection and surfacing
  - Switched to `text-field-edit` library for more reliable text insertion and selection handling in form fields

- Updated dependencies
  - @speechos/core@0.2.6

## 0.2.6

### Patch Changes

- Add no-audio warning detection and user feedback improvements

  - Add no-audio warning detection to widget with automatic settings modal prompting
  - Show feedback when no edit is understood during voice input
  - Fix settings modal opening from no-audio warning
  - Add recording demo HTML pages for testing

- Updated dependencies
  - @speechos/core@0.2.5

## 0.2.5

### Patch Changes

- Bump due to release error
- Updated dependencies
  - @speechos/core@0.2.4

## 0.2.4

### Patch Changes

- # Features

  - Always visible state: Add support for persistent UI visibility with new modal components for dictation output and editing help, enhanced mic button functionality, and configurable
    form detection behavior
  - Anonymous user tracking: Implement anonymous ID generation and transmission to backend for analytics

- Updated dependencies
  - @speechos/core@0.2.3

## 0.2.3

### Patch Changes

- b9e25b9: Fixed ESM build for proper browser compatibility:

  - Changed `sideEffects` to `true` to preserve custom element registration
  - Switched ESM build from tsdown to Rollup for proper TypeScript decorator compilation
  - Bundled Lit into ESM output to avoid version conflicts when used with Vite

- 3cf5ade: Initial beta release
- Updated dependencies [3cf5ade]
  - @speechos/core@0.2.2

## 0.2.1

### Patch Changes

- Fixed ESM build for proper browser compatibility:

  - Changed `sideEffects` to `true` to preserve custom element registration
  - Switched ESM build from tsdown to Rollup for proper TypeScript decorator compilation
  - Bundled Lit into ESM output to avoid version conflicts when used with Vite

## 0.2.0

### Minor Changes

- 66af827: Initial release of SpeechOS SDK packages

  - `@speechos/core`: Headless core SDK with state management, events, and LiveKit integration
  - `@speechos/client`: Full client SDK with Web Components UI for embedding voice input
  - `@speechos/react`: React hooks and components for SpeechOS integration

### Patch Changes

- Updated dependencies [66af827]
  - @speechos/core@0.2.0
