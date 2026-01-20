# Testing the SpeechOS Client SDK

Quick reference guide for testing the SDK during development.

## Initial Setup

```bash
# Navigate to the client SDK directory
cd speechos-client

# Install dependencies
npm install

# Build the SDK (required before testing)
npm run build
```

## Test Methods

### 1. Browser Testing (Recommended for Manual Testing)

#### IIFE Build (Script Tag)

Tests the SDK as it would be used via CDN/script tag.

```bash
# Start the test server
npm run test:serve

# In another terminal or just open in browser:
# http://localhost:8080/test/
```

Features:
- Interactive test buttons
- Visual status indicators
- Real-time console output
- Tests SDK loading, exports, and global scope

#### ESM Build (Module Import)

Tests the SDK as it would be used in modern JavaScript applications.

```bash
# Same server, different page:
# http://localhost:8080/test/esm-test.html
```

Features:
- Tests ES module import
- Verifies no global pollution
- Validates named exports

### 2. Browser Console Testing

After opening either test page:

```javascript
// Check if SDK is loaded (IIFE only)
window.SpeechOS

// Check version
window.SpeechOS.VERSION  // IIFE
// or for ESM, check the page's console output

// List all exports
Object.keys(window.SpeechOS)
```

### 3. Development Workflow

For active development, use watch mode:

```bash
# Terminal 1: Watch and rebuild on changes
npm run dev

# Terminal 2: Serve test pages
npm run test:serve

# Browser: Open http://localhost:8080/test/
# Refresh after each build completes
```

## Testing Checklist

When testing new features, verify:

- [ ] SDK builds without errors (`npm run build`)
- [ ] TypeScript types are valid (`npm run type-check`)
- [ ] IIFE build loads in browser (test/index.html)
- [ ] ESM build imports correctly (test/esm-test.html)
- [ ] Exports are available as expected
- [ ] No unexpected global scope pollution
- [ ] Source maps are generated
- [ ] TypeScript declarations (.d.ts) are created
- [ ] All build formats work (check dist/ directory)

## Build Output Verification

After running `npm run build`, check the `dist/` directory:

```
dist/
├── index.js          # ESM bundle
├── index.js.map      # ESM source map
├── index.cjs         # CommonJS bundle
├── index.cjs.map     # CJS source map
├── index.iife.js     # IIFE bundle (for browsers)
├── index.iife.js.map # IIFE source map
├── index.d.ts        # TypeScript declarations
└── index.d.ts.map    # Declaration source map
```

## Troubleshooting

### "Module not found" errors

**Solution:** Make sure you've run `npm install` and `npm run build`

### Test page shows "Build Required"

**Solution:** Run `npm run build` from the speechos-client directory

### Changes not appearing

**Solution:**
1. Rebuild: `npm run build` or use `npm run dev` for auto-rebuild
2. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### CORS errors

**Solution:** Don't open HTML files directly (file://). Use the HTTP server: `npm run test:serve`

## Testing on Real Projects

To test the SDK in a real application:

### Using npm link (Local Testing)

```bash
# In speechos-client directory
npm link

# In your test project
npm link @speechos/client

# Import and use
import { VERSION } from '@speechos/client';
```

### Using File Path (Alternative)

```json
// In your test project's package.json
{
  "dependencies": {
    "@speechos/client": "file:../path/to/speechos-client"
  }
}
```

## Automated Testing (Future)

Currently, the SDK uses manual testing. Future additions could include:

- Unit tests with Vitest or Jest
- E2E tests with Playwright
- CI/CD integration
- Automated browser testing

## Questions?

See the full documentation:
- Main README: [README.md](README.md)
- Test README: [test/README.md](test/README.md)
