# Manual Testing Guide

This directory contains a test page for manually testing the SpeechOS Client SDK in a live browser environment.

## Quick Start

### 1. Build the SDK

First, make sure you've built the SDK:

```bash
cd speechos-client
npm install
npm run build
```

### 2. Start the Test Server

From the `speechos-client` directory:

```bash
npm run test:serve
```

This will start a local HTTP server on port 8080.

### 3. Open the Test Page

Open your browser and navigate to:

```
http://localhost:8080/
```

Or use the convenience script:

```bash
npm run test:open
```

## What the Test Page Does

The test page (`index.html`) provides:

1. **Visual Status Indicator** - Shows if the SDK loaded successfully
2. **SDK Information Display** - Shows version and other metadata
3. **Interactive Test Buttons** - Test various SDK features:
   - Check if SDK is loaded
   - Get version information
   - List all exported functions/properties
   - Test for global scope pollution
4. **Console Output** - Real-time logging of test results
5. **Build Instructions** - Helpful warnings if the SDK isn't built yet

## Manual Testing Workflow

1. **Initial Load Test**
   - Open the page
   - Check if status shows "Loaded" (green)
   - Verify version number is displayed

2. **Run Built-in Tests**
   - Click each test button
   - Verify console output shows expected results
   - All tests should show ✓ success messages

3. **Browser Console Testing**
   - Open browser DevTools (F12)
   - Type `window.SpeechOS` in console
   - Verify the SDK object is accessible
   - Test individual exports

4. **Cross-Browser Testing**
   - Test in Chrome, Firefox, Safari, Edge
   - Verify consistent behavior
   - Check for console errors

## Testing Different Build Formats

### IIFE (Current Default)

The test page uses the IIFE build by default:

```html
<script src="../dist/index.iife.js"></script>
```

### ESM (Module Import)

To test the ESM build, create a new test file with:

```html
<script type="module">
  import { SpeechOS } from '../dist/index.js';
  console.log('SpeechOS Version:', SpeechOS.VERSION);
</script>
```

## Troubleshooting

### "Failed to load SDK" error

**Problem:** The test page shows "Build Required" status.

**Solution:** Run `npm run build` from the `speechos-client` directory.

### CORS errors in console

**Problem:** Browser blocks loading due to CORS policy.

**Solution:** Use the provided HTTP server (`npm run test:serve`) instead of opening the file directly.

### Changes not reflecting

**Problem:** Made code changes but test page shows old behavior.

**Solution:**
1. Rebuild: `npm run build`
2. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)
3. Clear browser cache if needed

## Development Mode

For active development, run the build in watch mode in one terminal:

```bash
npm run dev
```

And the test server in another:

```bash
npm run test:serve
```

Then simply refresh the browser after each build completes.

## Adding New Tests

To add custom tests to the page:

1. Open `test/index.html`
2. Add a new button in the "Test Actions" section
3. Create a corresponding test function in the `<script>` tag
4. Use `logToConsole()` to output results

Example:

```javascript
function testMyFeature() {
  if (typeof window.SpeechOS !== 'undefined') {
    // Your test code here
    logToConsole('✓ Test passed!', 'success');
  } else {
    logToConsole('✗ SDK not loaded', 'error');
  }
}
```
