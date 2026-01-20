# Troubleshooting

Common issues and solutions for SpeechOS SDK.

## Widget Issues

### Widget not appearing

**Possible causes:**

1. **SDK not initialized**
   - Ensure `SpeechOS.init()` is called with a valid API key
   - Check browser console for initialization errors

2. **Element not supported**
   - Widget only appears for text inputs, textareas, and contenteditable elements
   - Verify the focused element is one of these types

3. **Form detection disabled**
   - If `formDetection: false`, you must call `SpeechOS.show()` or `SpeechOS.showFor()` manually

4. **Widget hidden by CSS**
   - Check if z-index conflicts with other elements
   - Try increasing z-index: `SpeechOS.init({ apiKey: 'KEY', zIndex: 9999999 })`

**Solutions:**

```typescript
// Check initialization
const state = SpeechOS.getState();
console.log('State:', state);

// Manually show widget
SpeechOS.show();

// Show for specific element
const textarea = document.querySelector('textarea');
SpeechOS.showFor(textarea);
```

### Widget appears but doesn't respond

1. **Check event listeners**
   - Verify event handlers are properly registered
   - Use `debug: true` to see logs

2. **Element focus issues**
   - Ensure the text field has focus
   - Try clicking the field again

**Solutions:**

```typescript
// Enable debug mode
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  debug: true,
});

// Check visibility state
console.log(SpeechOS.getState().isVisible);
```

---

## Microphone Issues

### Microphone permission denied

**Cause:** User denied microphone access or browser blocked it.

**Solutions:**

1. **Check HTTPS**
   - Microphone access requires HTTPS (except localhost)
   - Use `https://` in production

2. **Reset permissions**
   - Click the lock icon in browser address bar
   - Reset site permissions
   - Reload page and allow microphone access

3. **Check browser settings**
   - Ensure microphone is not disabled globally
   - Check system-level permissions (macOS/Windows)

### Microphone not working / no audio captured

**Possible causes:**

1. **Wrong microphone selected**
   - User may have multiple microphones
   - Check system default microphone

2. **Hardware issues**
   - Test microphone in other applications
   - Check physical connection

3. **Browser compatibility**
   - Ensure browser supports WebRTC
   - Try a different browser

**Solutions:**

```typescript
// Listen for microphone errors
SpeechOS.events.on('error', ({ code, message, source }) => {
  if (source === 'audio-capture') {
    console.error('Microphone error:', message);
    alert('Microphone error: ' + message);
  }
});
```

---

## Transcription Issues

### Transcription is inaccurate

**Tips for better accuracy:**

1. **Speak clearly** — Enunciate words clearly
2. **Reduce background noise** — Use in quiet environment
3. **Use good microphone** — Better hardware = better results
4. **Check language settings** — Ensure correct language is selected

### Transcription taking too long

**Possible causes:**

1. **Network latency**
   - Check internet connection speed
   - Try on faster network

2. **Long recordings**
   - Longer audio takes more time to process
   - Try shorter recording sessions

**Solutions:**

```typescript
// Monitor processing state
SpeechOS.events.on('state:change', ({ state }) => {
  console.log('Recording state:', state.recordingState);
});
```

### No transcription result

**Possible causes:**

1. **No audio captured**
   - Check microphone is working
   - Verify permissions

2. **Network error**
   - Check internet connection
   - Look for error events

**Solutions:**

```typescript
// Check for errors
SpeechOS.events.on('error', ({ code, message }) => {
  console.error(`Error [${code}]: ${message}`);
});

// Verify transcription complete
SpeechOS.events.on('transcription:complete', ({ text }) => {
  console.log('Got transcript:', text);
});
```

---

## Command Issues

### Commands not matching

**Possible causes:**

1. **Unclear descriptions**
   - Improve command descriptions to be more specific
   - Use natural language that matches user intent

2. **Speech doesn't match intent**
   - User may not be speaking clearly
   - Try phrasing command differently

3. **No commands configured**
   - Verify commands are passed to `init()`

**Solutions:**

```typescript
// Better command descriptions
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  commands: [
    // Bad: vague description
    { name: 'do_thing', description: 'Do a thing' },
    
    // Good: clear, specific description
    { name: 'submit_form', description: 'Submit the current form to save data' },
  ],
});

// Debug command matching
SpeechOS.events.on('command:complete', ({ command }) => {
  if (command) {
    console.log('Matched command:', command.name, command.arguments);
  } else {
    console.log('No command matched - try different phrasing');
  }
});
```

---

## React Issues

### React hook errors

**Error: "Cannot use hooks outside SpeechOSProvider"**

**Cause:** Component using hooks is not wrapped in `SpeechOSProvider`.

**Solution:**

```tsx
// ❌ Wrong: No provider
function App() {
  return <MyComponent />;
}

// ✅ Correct: Wrapped in provider
function App() {
  return (
    <SpeechOSProvider config={{ apiKey: 'YOUR_API_KEY' }}>
      <MyComponent />
    </SpeechOSProvider>
  );
}
```

### Version mismatch errors

**Error: "Package version mismatch"**

**Cause:** Different versions of `@speechos/core` between packages.

**Solution:**

```bash
# Remove all SpeechOS packages
npm uninstall @speechos/client @speechos/react @speechos/core

# Reinstall
npm install @speechos/client @speechos/react

# Or clear cache
rm -rf node_modules package-lock.json
npm install
```

### State not updating in React

**Cause:** Not using proper React patterns for state updates.

**Solution:**

```tsx
// ✅ Use hooks for reactive state
function MyComponent() {
  const state = useSpeechOSState();
  return <div>{state.recordingState}</div>;
}

// ❌ Don't call getState directly (not reactive)
function MyComponent() {
  const state = SpeechOS.getState(); // Won't update on changes!
  return <div>{state.recordingState}</div>;
}
```

---

## Network Issues

### Connection failed / timeout

**Possible causes:**

1. **No internet connection**
2. **Firewall blocking WebSocket**
3. **Invalid API key**

**Solutions:**

```typescript
// Check connection state
SpeechOS.events.on('state:change', ({ state }) => {
  console.log('Connected:', state.isConnected);
});

// Handle connection errors
SpeechOS.events.on('error', ({ code, message }) => {
  if (code === 'NETWORK_ERROR') {
    alert('Connection failed. Please check your internet connection.');
  }
});
```

### API key errors

**Error: "Invalid API key" or "Unauthorized"**

**Causes:**
- Wrong API key
- API key expired
- API key not for client SDK (using wrong key type)

**Solutions:**
1. Log in to [SpeechOS dashboard](https://app.speechos.ai)
2. Navigate to team settings
3. Create or regenerate a **Client API Key** (not Server API Key)
4. Update your code with the new key

---

## Browser Compatibility

### Unsupported browser

**Requirements:**
- Modern browser with WebRTC support
- Chrome 60+, Firefox 55+, Safari 11+, Edge 79+

**Not supported:**
- Internet Explorer
- Very old browsers

**Solution:** Upgrade to a modern browser or test in a supported browser.

---

## Getting Help

If you're still having issues:

1. **Check the console** — Enable `debug: true` for detailed logs
2. **Review documentation** — Check relevant guide sections
3. **Contact support** — Reach out with:
   - Browser and version
   - Error messages from console
   - Steps to reproduce the issue

```typescript
// Enable debug mode for troubleshooting
SpeechOS.init({
  apiKey: 'YOUR_API_KEY',
  debug: true, // Shows detailed logs in console
});
```

## Related

- [API Reference](./api-reference.md) — Complete API documentation
- [Widget Guide](./widget-guide.md) — Widget configuration
- [Events Reference](./events-reference.md) — Event handling
