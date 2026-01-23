# @speechos/react

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
