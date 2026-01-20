# Development Guide

Guide for developing and contributing to the SpeechOS SDK.

## Prerequisites

- Node.js 18+ and npm
- Git

## Initial Setup

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd speechos-client
npm install
```

## Project Structure

```
speechos-client/
├── packages/
│   ├── core/          # Headless SDK (no UI)
│   ├── client/        # Full SDK with widget
│   └── react/         # React bindings
├── test/              # Manual test pages
├── docs/              # Documentation
└── scripts/           # Build and dev scripts
```

## Building

### Build all packages

```bash
npm run build
```

This builds all three packages (`core`, `client`, `react`) in the correct order.

### Build individual packages

```bash
cd packages/core
npm run build

cd packages/client
npm run build

cd packages/react
npm run build
```

### Watch mode (development)

```bash
npm run dev
```

This starts watch mode for all packages, automatically rebuilding on file changes.

## Testing

### Run all tests

```bash
npm test
```

### Run tests for specific package

```bash
cd packages/core
npm test

cd packages/client
npm test

cd packages/react
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

## Manual Testing

The `test/` directory contains HTML pages for manual testing in a browser.

### Start the test server

```bash
npm run build
npm run test:serve
```

Then open <http://localhost:8080/test/> in your browser.

### Available test pages

- `index.html` — Basic vanilla JS integration
- `react.html` — React integration examples
- `esm-test.html` — ESM module testing

### Test with HTTPS (for microphone access)

```bash
# Generate self-signed certificates (first time only)
npm run generate-certs

# Start HTTPS server
npm run test:serve:https
```

Then open <https://localhost:8443/test/>

> **Note:** You'll need to accept the self-signed certificate warning in your browser.

## Code Style

### TypeScript

- Use TypeScript for all new code
- Include type definitions
- Use strict mode

### Linting

```bash
# Lint all packages
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

```bash
# Format all code
npm run format

# Check formatting
npm run format:check
```

## Package Dependencies

The packages have the following dependency structure:

```
@speechos/client
├── @speechos/core
└── lit

@speechos/react
├── @speechos/core
└── react (peer)

@speechos/core
└── (standalone)
```

When making changes:

- Changes to `core` require rebuilding `client` and `react`
- Changes to `client` don't affect `core` or `react`
- Changes to `react` don't affect other packages

## Making Changes

### 1. Create a branch

```bash
git checkout -b feature/my-feature
```

### 2. Make your changes

- Write code following project conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test your changes

```bash
# Run automated tests
npm test

# Test manually in browser
npm run build
npm run test:serve
```

### 4. Commit your changes

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `test:` — Test changes
- `refactor:` — Code refactoring
- `chore:` — Maintenance tasks

## Publishing (Maintainers Only)

### Version bump and changelog

This project uses [changesets](https://github.com/changesets/changesets) for version management.

#### 1. Add a changeset

```bash
npx changeset
```

Follow the prompts to describe your changes.

#### 2. Version packages

```bash
npx changeset version
```

This updates package versions and generates CHANGELOG.md files.

#### 3. Publish to npm

```bash
npm run build
npm run publish
```

## Debugging

### Enable debug mode

```typescript
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  debug: true, // Enables detailed console logging
});
```

### Common debugging techniques

1. **Check state**

   ```typescript
   console.log(SpeechOS.getState());
   ```

2. **Monitor events**

   ```typescript
   SpeechOS.events.on('state:change', ({ state }) => {
     console.log('State changed:', state);
   });
   ```

3. **Inspect errors**

   ```typescript
   SpeechOS.events.on('error', ({ code, message, source }) => {
     console.error(`[${source}] ${code}: ${message}`);
   });
   ```

## Documentation

Documentation is in the `docs/` directory.

### Update documentation

1. Edit relevant `.md` files in `docs/`
2. Ensure examples are accurate
3. Test code examples
4. Update main `README.md` if needed

### Documentation structure

- `README.md` — Main overview and getting started
- `docs/widget-guide.md` — Widget usage
- `docs/voice-commands.md` — Command setup
- `docs/react-integration.md` — React guide
- `docs/advanced.md` — Advanced topics
- `docs/api-reference.md` — Complete API reference
- `docs/typescript-types.md` — Type definitions
- `docs/events-reference.md` — Event documentation
- `docs/troubleshooting.md` — Common issues
- `docs/development.md` — This file

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Lit Documentation](https://lit.dev/docs/)
- [React Documentation](https://react.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Changesets](https://github.com/changesets/changesets)

## Getting Help

- Check existing documentation
- Review test files for examples
- Open an issue for bugs or questions
- Reach out to maintainers

## Related

- [API Reference](./api-reference.md) — Complete API documentation
- [TypeScript Types](./typescript-types.md) — Type definitions
- [Troubleshooting](./troubleshooting.md) — Common issues
