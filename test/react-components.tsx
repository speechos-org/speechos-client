/**
 * SpeechOS React Hooks Test Components
 *
 * Individual test components for each React hook.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  useDictation,
  useEdit,
  useCommand,
  useSpeechOSState,
  useSpeechOSEvents,
  useSpeechOS,
  useSpeechOSWidget,
} from '@speechos/react';
import type { CommandDefinition, SpeechOSEventMap } from '@speechos/core';
import { formatTime, formatJson } from './shared-utils.js';

// ============================================
// useDictation Test Component
// ============================================

export function DictationTest() {
  const { start, stop, isRecording, isProcessing, transcript, error, clear } = useDictation();

  return (
    <div className="test-panel">
      <h3>useDictation Hook</h3>
      <p className="description">
        Simple hook for voice-to-text dictation. Call <code>start()</code> to begin recording
        and <code>stop()</code> to end recording and get the transcript.
      </p>

      <div className="info-box">
        <p>
          <strong>Usage:</strong> Click "Start Recording" and speak. When done, click "Stop Recording"
          to get the transcribed text.
        </p>
      </div>

      <div className="controls">
        <button
          className="btn btn-success"
          onClick={() => start()}
          disabled={isRecording || isProcessing}
        >
          {isRecording ? '🔴 Recording...' : '🎤 Start Recording'}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => stop()}
          disabled={!isRecording}
        >
          ⏹️ Stop Recording
        </button>
        <button className="btn btn-secondary" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="status-row">
        <span className={`status-badge ${isRecording ? 'recording' : ''}`}>
          {isRecording ? '● Recording' : '○ Not Recording'}
        </span>
        <span className={`status-badge ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? '⏳ Processing' : '○ Idle'}
        </span>
      </div>

      <div className={`result-box ${error ? 'error' : transcript ? 'success' : ''}`}>
        <div className="result-label">Transcript</div>
        <div className={`result-content ${!transcript && !error ? 'empty' : ''}`}>
          {error ? `Error: ${error}` : transcript || 'No transcript yet. Start recording and speak...'}
        </div>
      </div>
    </div>
  );
}

// ============================================
// useEdit Test Component
// ============================================

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This is a sample text that you can edit using voice commands. Try saying things like "change fox to cat" or "delete the word lazy".`;

export function EditTest() {
  const { start, stop, isEditing, isProcessing, originalText, result, error, clear } = useEdit();
  const [inputText, setInputText] = useState(SAMPLE_TEXT);

  const handleStartEdit = async () => {
    await start(inputText);
  };

  const handleStopEdit = async () => {
    const edited = await stop();
    if (edited) {
      setInputText(edited);
    }
  };

  return (
    <div className="test-panel">
      <h3>useEdit Hook</h3>
      <p className="description">
        Hook for voice-based text editing. Provide text to edit, speak your instructions,
        and get back the edited result.
      </p>

      <div className="info-box">
        <p>
          <strong>Usage:</strong> Enter text below, click "Start Editing", then speak your edit
          instruction (e.g., "change fox to cat", "make it more formal"). Click "Apply Edit" when done.
        </p>
      </div>

      <textarea
        className="text-input"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter text to edit..."
        disabled={isEditing || isProcessing}
      />

      <div className="controls">
        <button
          className="btn btn-warning"
          onClick={handleStartEdit}
          disabled={isEditing || isProcessing || !inputText}
        >
          {isEditing ? '🔴 Listening...' : '✏️ Start Editing'}
        </button>
        <button
          className="btn btn-success"
          onClick={handleStopEdit}
          disabled={!isEditing}
        >
          ✓ Apply Edit
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            clear();
            setInputText(SAMPLE_TEXT);
          }}
        >
          Reset
        </button>
      </div>

      <div className="status-row">
        <span className={`status-badge ${isEditing ? 'recording' : ''}`}>
          {isEditing ? '● Editing' : '○ Not Editing'}
        </span>
        <span className={`status-badge ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? '⏳ Processing' : '○ Idle'}
        </span>
      </div>

      {(originalText || result || error) && (
        <div className="comparison">
          <div className="comparison-box">
            <h4>Original Text</h4>
            <p>{originalText || '—'}</p>
          </div>
          <div className={`comparison-box ${error ? 'error' : ''}`}>
            <h4>Edited Result</h4>
            <p>{error ? `Error: ${error}` : result || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// useCommand Test Component - Light Control Demo
// ============================================

// Light colors with their styling
const LIGHTS = [
  { id: 'red', label: 'Red', bgOff: '#4a1515', bgOn: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)' },
  { id: 'orange', label: 'Orange', bgOff: '#4a2a15', bgOn: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' },
  { id: 'yellow', label: 'Yellow', bgOff: '#4a4515', bgOn: '#eab308', glow: 'rgba(234, 179, 8, 0.6)' },
  { id: 'green', label: 'Green', bgOff: '#154a1a', bgOn: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)' },
  { id: 'blue', label: 'Blue', bgOff: '#15234a', bgOn: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)' },
  { id: 'purple', label: 'Purple', bgOff: '#2e154a', bgOn: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
] as const;

type LightColor = (typeof LIGHTS)[number]['id'];

const LIGHT_COMMANDS: CommandDefinition[] = [
  {
    name: 'turn_on',
    description: 'Turn on a specific light by color',
    arguments: [
      {
        name: 'color',
        description: 'The color of the light to turn on (red, orange, yellow, green, blue, purple)',
        type: 'string',
        required: true,
      },
    ],
  },
  {
    name: 'turn_off',
    description: 'Turn off a specific light by color',
    arguments: [
      {
        name: 'color',
        description: 'The color of the light to turn off (red, orange, yellow, green, blue, purple)',
        type: 'string',
        required: true,
      },
    ],
  },
  {
    name: 'toggle',
    description: 'Toggle a specific light on or off',
    arguments: [
      {
        name: 'color',
        description: 'The color of the light to toggle (red, orange, yellow, green, blue, purple)',
        type: 'string',
        required: true,
      },
    ],
  },
  {
    name: 'all_on',
    description: 'Turn on all lights at once',
  },
  {
    name: 'all_off',
    description: 'Turn off all lights at once',
  },
];

export function CommandTest() {
  const { start, stop, isListening, isProcessing, result, error, clear } = useCommand();
  const [lights, setLights] = useState<Record<LightColor, boolean>>({
    red: false,
    orange: false,
    yellow: false,
    green: false,
    blue: false,
    purple: false,
  });
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const handleStart = async () => {
    await start(LIGHT_COMMANDS);
  };

  const handleStop = async () => {
    const commandResult = await stop();
    if (commandResult) {
      handleCommand(commandResult);
    }
  };

  const handleCommand = (cmd: { name: string; arguments: Record<string, unknown> }) => {
    const { name, arguments: args } = cmd;
    const color = (typeof args?.color === 'string' ? args.color.toLowerCase() : '') as LightColor;

    switch (name) {
      case 'turn_on':
        if (color && LIGHTS.some((l) => l.id === color)) {
          setLights((prev) => ({ ...prev, [color]: true }));
          setLastCommand(`turn_on(${color})`);
        }
        break;
      case 'turn_off':
        if (color && LIGHTS.some((l) => l.id === color)) {
          setLights((prev) => ({ ...prev, [color]: false }));
          setLastCommand(`turn_off(${color})`);
        }
        break;
      case 'toggle':
        if (color && LIGHTS.some((l) => l.id === color)) {
          setLights((prev) => ({ ...prev, [color]: !prev[color] }));
          setLastCommand(`toggle(${color})`);
        }
        break;
      case 'all_on':
        setLights({ red: true, orange: true, yellow: true, green: true, blue: true, purple: true });
        setLastCommand('all_on()');
        break;
      case 'all_off':
        setLights({ red: false, orange: false, yellow: false, green: false, blue: false, purple: false });
        setLastCommand('all_off()');
        break;
    }
  };

  const resetLights = () => {
    setLights({ red: false, orange: false, yellow: false, green: false, blue: false, purple: false });
    setLastCommand(null);
    clear();
  };

  return (
    <div className="test-panel">
      <h3>useCommand Hook</h3>
      <p className="description">
        Hook for voice command matching. Speak naturally and the AI matches your intent to defined commands.
        Try controlling the lights below!
      </p>

      {/* Lights Display */}
      <div style={{
        background: 'linear-gradient(to bottom, #1a1a2e, #16162a)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '24px',
        }}>
          {LIGHTS.map((light) => (
            <div key={light.id} style={{ textAlign: 'center' }}>
              <div
                onClick={() => setLights((prev) => ({ ...prev, [light.id]: !prev[light.id] }))}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: lights[light.id] ? light.bgOn : light.bgOff,
                  border: `3px solid ${lights[light.id] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: lights[light.id] ? `0 0 30px ${light.glow}, 0 0 60px ${light.glow}` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
              <span style={{
                display: 'block',
                marginTop: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: lights[light.id] ? '#fff' : 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {light.label}
              </span>
            </div>
          ))}
        </div>

        {lastCommand && (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Last Command: </span>
            <span style={{ color: '#22c55e', fontFamily: 'Monaco, monospace', fontSize: '14px' }}>
              {lastCommand}
            </span>
          </div>
        )}
      </div>

      <div className="info-box">
        <p>
          <strong>Try saying:</strong> "Turn on the red light", "Toggle blue", "All lights on",
          "Turn off everything"
        </p>
      </div>

      <div className="controls">
        <button
          className="btn btn-warning"
          onClick={handleStart}
          disabled={isListening || isProcessing}
        >
          {isListening ? '🔴 Listening...' : '⚡ Start Listening'}
        </button>
        <button
          className="btn btn-success"
          onClick={handleStop}
          disabled={!isListening}
        >
          ✓ Execute Command
        </button>
        <button className="btn btn-secondary" onClick={resetLights}>
          Reset
        </button>
      </div>

      <div className="status-row">
        <span className={`status-badge ${isListening ? 'recording' : ''}`}>
          {isListening ? '● Listening' : '○ Not Listening'}
        </span>
        <span className={`status-badge ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? '⏳ Processing' : '○ Idle'}
        </span>
      </div>

      {error && (
        <div className="result-box error">
          <div className="result-label">Error</div>
          <div className="result-content">{error}</div>
        </div>
      )}

      {result && (
        <div className="result-box success">
          <div className="result-label">Matched Command</div>
          <div className="json-display">
            {formatJson(result)}
          </div>
        </div>
      )}

      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
          View command definitions
        </summary>
        <div className="json-display" style={{ marginTop: '8px' }}>
          {formatJson(LIGHT_COMMANDS)}
        </div>
      </details>
    </div>
  );
}

// ============================================
// useSpeechOSState Test Component
// ============================================

export function StateTest() {
  const state = useSpeechOSState();

  const formatValue = (value: unknown): { text: string; className: string } => {
    if (value === null) return { text: 'null', className: 'null' };
    if (value === true) return { text: 'true', className: 'true' };
    if (value === false) return { text: 'false', className: 'false' };
    if (typeof value === 'object') return { text: '[Object]', className: '' };
    return { text: String(value), className: '' };
  };

  const stateEntries = [
    { key: 'isVisible', value: state.isVisible },
    { key: 'isExpanded', value: state.isExpanded },
    { key: 'isConnected', value: state.isConnected },
    { key: 'isMicEnabled', value: state.isMicEnabled },
    { key: 'recordingState', value: state.recordingState },
    { key: 'activeAction', value: state.activeAction },
    { key: 'errorMessage', value: state.errorMessage },
    { key: 'focusedElement', value: state.focusedElement ? '[HTMLElement]' : null },
  ];

  return (
    <div className="test-panel">
      <h3>useSpeechOSState Hook</h3>
      <p className="description">
        Hook that returns the current SpeechOS state. Updates automatically when state changes.
        This is a read-only hook for observing state.
      </p>

      <div className="info-box">
        <p>
          <strong>Tip:</strong> Use other tabs to trigger state changes and watch the values
          update in real-time here.
        </p>
      </div>

      <div className="state-grid">
        {stateEntries.map(({ key, value }) => {
          const formatted = formatValue(value);
          return (
            <div key={key} className="state-card">
              <div className="label">{key}</div>
              <div className={`value ${formatted.className}`}>{formatted.text}</div>
            </div>
          );
        })}
      </div>

      <div className="result-box">
        <div className="result-label">Full State Object</div>
        <div className="json-display">
          {formatJson({
            ...state,
            focusedElement: state.focusedElement ? '[HTMLElement]' : null,
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// useSpeechOSEvents Test Component
// ============================================

interface EventLogEntry {
  id: number;
  time: string;
  event: string;
  payload: unknown;
}

const ALL_EVENTS: (keyof SpeechOSEventMap)[] = [
  'state:change',
  'transcription:complete',
  'edit:complete',
  'command:complete',
  'error',
  'form:focus',
  'form:blur',
  'widget:show',
  'widget:hide',
  'action:select',
  'transcription:inserted',
  'edit:applied',
  'settings:changed',
];

export function EventsTest() {
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const nextId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const addLogEntry = useCallback((event: string, payload: unknown) => {
    setEventLog((prev) => {
      const newEntry: EventLogEntry = {
        id: nextId.current++,
        time: formatTime(),
        event,
        payload,
      };
      // Keep last 100 entries
      const updated = [newEntry, ...prev].slice(0, 100);
      return updated;
    });
  }, []);

  // Subscribe to all events
  useSpeechOSEvents('state:change', (payload) => addLogEntry('state:change', { recordingState: payload.state.recordingState }));
  useSpeechOSEvents('transcription:complete', (payload) => addLogEntry('transcription:complete', payload));
  useSpeechOSEvents('edit:complete', (payload) => addLogEntry('edit:complete', payload));
  useSpeechOSEvents('command:complete', (payload) => addLogEntry('command:complete', payload));
  useSpeechOSEvents('error', (payload) => addLogEntry('error', payload));
  useSpeechOSEvents('widget:show', () => addLogEntry('widget:show', null));
  useSpeechOSEvents('widget:hide', () => addLogEntry('widget:hide', null));
  useSpeechOSEvents('action:select', (payload) => addLogEntry('action:select', payload));

  const filteredLog = filter === 'all'
    ? eventLog
    : eventLog.filter((entry) => entry.event === filter);

  const clearLog = () => {
    setEventLog([]);
    nextId.current = 0;
  };

  return (
    <div className="test-panel">
      <h3>useSpeechOSEvents Hook</h3>
      <p className="description">
        Hook for subscribing to SpeechOS events. Automatically handles subscription cleanup
        when the component unmounts.
      </p>

      <div className="info-box">
        <p>
          <strong>Tip:</strong> Use other tabs to trigger actions and watch the events appear
          in the log below.
        </p>
      </div>

      <div className="controls">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
        >
          <option value="all">All Events</option>
          {ALL_EVENTS.map((event) => (
            <option key={event} value={event}>{event}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={clearLog}>
          Clear Log
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>
          {eventLog.length} event(s) logged
        </span>
      </div>

      <div className="event-log" ref={logRef}>
        {filteredLog.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            No events yet. Use other tabs to trigger actions...
          </div>
        ) : (
          filteredLog.map((entry) => (
            <div key={entry.id} className="event-entry">
              <span className="event-time">[{entry.time}]</span>
              <span className="event-name">{entry.event}</span>
              {entry.payload !== null && entry.payload !== undefined && (
                <span className="event-payload">
                  {typeof entry.payload === 'object'
                    ? JSON.stringify(entry.payload)
                    : String(entry.payload as string | number | boolean)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// useSpeechOS Test Component (Full Context)
// ============================================

export function SpeechOSTest() {
  const context = useSpeechOS();
  const { state } = context;
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const executeAction = async (name: string, fn: () => Promise<unknown>) => {
    setLastAction(name);
    setError(null);
    setActionResult(null);
    try {
      const result = await fn();
      setActionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <div className="test-panel">
      <h3>useSpeechOS Hook</h3>
      <p className="description">
        Full context hook providing access to all SpeechOS APIs including state,
        high-level actions (dictate, edit, command), and events.
      </p>

      <div className="info-box">
        <p>
          <strong>This hook provides:</strong> state, init, dictate, stopDictation, edit, stopEdit,
          command, stopCommand, cancel, on, off
        </p>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>API Methods</h4>
      <div className="api-methods">
        <button
          className="btn btn-success"
          onClick={() => executeAction('dictate()', () => context.dictate())}
          disabled={state.recordingState !== 'idle'}
        >
          dictate()
        </button>
        <button
          className="btn btn-danger"
          onClick={() => executeAction('stopDictation()', () => context.stopDictation())}
          disabled={state.recordingState !== 'recording' || state.activeAction !== 'dictate'}
        >
          stopDictation()
        </button>
        <button
          className="btn btn-warning"
          onClick={() => executeAction('edit("Sample text")', () => context.edit('Sample text to edit'))}
          disabled={state.recordingState !== 'idle'}
        >
          edit()
        </button>
        <button
          className="btn btn-danger"
          onClick={() => executeAction('stopEdit()', () => context.stopEdit())}
          disabled={state.recordingState !== 'recording' || state.activeAction !== 'edit'}
        >
          stopEdit()
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => executeAction('cancel()', () => context.cancel())}
          disabled={state.recordingState === 'idle'}
        >
          cancel()
        </button>
      </div>

      <div className="status-row" style={{ marginTop: '20px' }}>
        <span className={`status-badge ${state.recordingState === 'recording' ? 'recording' : state.recordingState === 'processing' ? 'processing' : ''}`}>
          {state.recordingState}
        </span>
        {state.activeAction && (
          <span className="status-badge active">Action: {state.activeAction}</span>
        )}
      </div>

      {lastAction && (
        <div className="result-box" style={{ marginTop: '16px' }}>
          <div className="result-label">Last Action: {lastAction}</div>
          {error ? (
            <div className="result-content" style={{ color: '#dc2626' }}>Error: {error}</div>
          ) : actionResult !== null ? (
            <div className="json-display">
              {typeof actionResult === 'string' ? actionResult : formatJson(actionResult)}
            </div>
          ) : (
            <div className="result-content empty">Action in progress or no result...</div>
          )}
        </div>
      )}

      <div className="result-box" style={{ marginTop: '16px' }}>
        <div className="result-label">Current State</div>
        <div className="json-display">
          {formatJson({
            ...state,
            focusedElement: state.focusedElement ? '[HTMLElement]' : null,
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Widget Test Component (Programmatic Control)
// ============================================

// Import the client SDK for widget control
import { SpeechOS } from '@speechos/client';

export function WidgetTest() {
  const state = useSpeechOSState();
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [userIdInput, setUserIdInput] = useState('');
  const [isClientInitialized, setIsClientInitialized] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [
      { time: formatTime(), message, type },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  }, []);

  // Subscribe to widget events
  useSpeechOSEvents('widget:show', useCallback(() => {
    addLog('Widget shown', 'success');
  }, [addLog]));

  useSpeechOSEvents('widget:hide', useCallback(() => {
    addLog('Widget hidden', 'info');
  }, [addLog]));

  useSpeechOSEvents('form:focus', useCallback(({ element }) => {
    addLog(`Form focused: ${element.tagName.toLowerCase()}#${element.id || '(no id)'}`, 'info');
  }, [addLog]));

  useSpeechOSEvents('form:blur', useCallback(() => {
    addLog('Form blurred', 'info');
  }, [addLog]));

  // Initialize the client widget on first render of this tab
  useEffect(() => {
    if (!isClientInitialized) {
      const apiKey = localStorage.getItem('speechos-api-key') || '';
      const userId = localStorage.getItem('speechos-user-id') || undefined;
      const env = localStorage.getItem('speechos-environment') || 'local';
      const host = env === 'prod' ? 'https://app.speechos.ai' : 'http://localhost:8000';

      if (apiKey && !SpeechOS.initialized) {
        try {
          SpeechOS.init({
            apiKey,
            userId,
            host,
            debug: true,
          });
          setIsClientInitialized(true);
          addLog('Widget initialized via @speechos/client', 'success');
        } catch (err) {
          addLog(`Failed to init client: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
      } else if (SpeechOS.initialized) {
        setIsClientInitialized(true);
        addLog('Widget already initialized', 'info');
      }
    }
  }, [isClientInitialized, addLog]);

  // Widget control handlers
  const handleShow = () => {
    try {
      SpeechOS.show();
      addLog('SpeechOS.show() called', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleHide = () => {
    try {
      SpeechOS.hide();
      addLog('SpeechOS.hide() called', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleGetState = () => {
    try {
      const currentState = SpeechOS.getState();
      addLog(`State: ${JSON.stringify(currentState, (key, value) => {
        if (value instanceof HTMLElement) return '[HTMLElement]';
        return value;
      })}`, 'info');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleIdentify = () => {
    try {
      if (!userIdInput.trim()) {
        addLog('Please enter a User ID', 'error');
        return;
      }
      SpeechOS.identify(userIdInput.trim());
      addLog(`SpeechOS.identify("${userIdInput.trim()}") called`, 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDestroy = async () => {
    try {
      await SpeechOS.destroy();
      setIsClientInitialized(false);
      addLog('SpeechOS.destroy() called - Widget removed', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleReinitialize = () => {
    try {
      // Get config from localStorage
      const apiKey = localStorage.getItem('speechos-api-key') || '';
      const userId = localStorage.getItem('speechos-user-id') || undefined;
      const env = localStorage.getItem('speechos-environment') || 'local';
      const host = env === 'prod' ? 'https://app.speechos.ai' : 'http://localhost:8000';

      if (!apiKey) {
        addLog('No API key found. Please set up in the Setup section.', 'error');
        return;
      }

      SpeechOS.init({
        apiKey,
        userId,
        host,
        debug: true,
      });
      setIsClientInitialized(true);
      addLog('SpeechOS.init() called - Widget re-initialized', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="test-panel">
      <h3>Widget Programmatic Control</h3>
      <p className="description">
        Test the <code>@speechos/client</code> widget API methods: <code>show()</code>,{' '}
        <code>hide()</code>, <code>destroy()</code>, <code>getState()</code>, and{' '}
        <code>identify()</code>.
      </p>

      <div className="info-box">
        <p>
          <strong>Note:</strong> These methods control the <code>&lt;speechos-widget&gt;</code> Web Component
          from <code>@speechos/client</code>. The widget auto-shows when form fields are focused, but you can
          also control it programmatically.
        </p>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>Widget Visibility</h4>
      <div className="controls">
        <button className="btn btn-success" onClick={handleShow}>
          👁️ Show Widget
        </button>
        <button className="btn btn-secondary" onClick={handleHide}>
          🙈 Hide Widget
        </button>
        <button className="btn btn-primary" onClick={handleGetState}>
          📊 Get State
        </button>
      </div>

      <h4 style={{ marginTop: '20px', marginBottom: '12px', color: '#333' }}>User Identification</h4>
      <div className="controls">
        <input
          type="text"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          placeholder="Enter user ID..."
          style={{
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            width: '200px',
          }}
        />
        <button className="btn btn-primary" onClick={handleIdentify} disabled={!userIdInput.trim()}>
          🏷️ Identify User
        </button>
      </div>

      <h4 style={{ marginTop: '20px', marginBottom: '12px', color: '#333' }}>Lifecycle</h4>
      <div className="controls">
        <button className="btn btn-danger" onClick={handleDestroy}>
          💥 Destroy Widget
        </button>
        <button className="btn btn-success" onClick={handleReinitialize}>
          🔄 Re-initialize
        </button>
      </div>

      <div className="status-row" style={{ marginTop: '20px' }}>
        <span className={`status-badge ${state.isVisible ? 'active' : ''}`}>
          {state.isVisible ? '👁️ Visible' : '🙈 Hidden'}
        </span>
        <span className={`status-badge ${state.isExpanded ? 'active' : ''}`}>
          {state.isExpanded ? '📂 Expanded' : '📁 Collapsed'}
        </span>
        <span className={`status-badge ${state.recordingState === 'recording' ? 'recording' : state.recordingState === 'processing' ? 'processing' : ''}`}>
          {state.recordingState}
        </span>
      </div>

      <h4 style={{ marginTop: '20px', marginBottom: '12px', color: '#333' }}>Test Form Field</h4>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        Focus this input to trigger the widget auto-show behavior:
      </p>
      <input
        type="text"
        id="widget-test-input"
        placeholder="Click here to focus and show widget..."
        style={{
          width: '100%',
          padding: '12px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '20px',
        }}
      />

      <h4 style={{ marginBottom: '12px', color: '#333' }}>
        Event Log
        <button
          className="btn btn-secondary"
          onClick={clearLogs}
          style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
        >
          Clear
        </button>
      </h4>
      <div className="event-log" ref={logRef} style={{ minHeight: '150px' }}>
        {logs.length === 0 ? (
          <span style={{ color: '#666', fontStyle: 'italic' }}>
            Interact with the widget controls to see events...
          </span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="event-entry">
              <span className="event-time">[{log.time}]</span>
              <span
                className="event-name"
                style={{
                  color: log.type === 'success' ? '#22c55e' : log.type === 'error' ? '#ef4444' : '#61dafb',
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// useSpeechOSWidget Hook Test Component
// ============================================

export function WidgetHookTest() {
  const {
    showFor,
    attachTo,
    detach,
    show,
    hide,
    isVisible,
    isExpanded,
    focusedElement,
  } = useSpeechOSWidget();

  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [
      { time: formatTime(), message, type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Subscribe to widget events
  useSpeechOSEvents('widget:show', useCallback(() => {
    addLog('widget:show event fired', 'success');
  }, [addLog]));

  useSpeechOSEvents('widget:hide', useCallback(() => {
    addLog('widget:hide event fired', 'info');
  }, [addLog]));

  useSpeechOSEvents('transcription:inserted', useCallback(({ text }) => {
    addLog(`Transcription inserted: "${text}"`, 'success');
  }, [addLog]));

  useSpeechOSEvents('edit:applied', useCallback(({ editedContent }) => {
    addLog(`Edit applied: "${editedContent}"`, 'success');
  }, [addLog]));

  const handleShowForTextarea = () => {
    if (textareaRef.current) {
      showFor(textareaRef.current);
      addLog('showFor(textarea) called', 'success');
    }
  };

  const handleShowForInput = () => {
    if (inputRef.current) {
      showFor(inputRef.current);
      addLog('showFor(input) called', 'success');
    }
  };

  const handleShowForContentEditable = () => {
    if (contentEditableRef.current) {
      showFor(contentEditableRef.current);
      addLog('showFor(contenteditable) called', 'success');
    }
  };

  const handleAttachToTextarea = () => {
    if (textareaRef.current) {
      attachTo(textareaRef.current);
      addLog('attachTo(textarea) called', 'success');
    }
  };

  const handleDetach = () => {
    detach();
    addLog('detach() called', 'info');
  };

  const handleShow = () => {
    show();
    addLog('show() called', 'success');
  };

  const handleHide = () => {
    hide();
    addLog('hide() called', 'info');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="test-panel">
      <h3>useSpeechOSWidget Hook</h3>
      <p className="description">
        Programmatic widget control via React hook. Use <code>showFor(element)</code> to show the widget
        for a specific input, <code>attachTo(element)</code> to persistently track an element,
        and <code>detach()</code> to return to default positioning.
      </p>

      <div className="info-box">
        <p>
          <strong>Key difference from auto form detection:</strong> This hook lets you manually control
          which element the widget targets, without relying on focus events. Useful when{' '}
          <code>formDetection: false</code> is set, or for custom UX flows.
        </p>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>Hook State</h4>
      <div className="status-row" style={{ marginBottom: '20px' }}>
        <span className={`status-badge ${isVisible ? 'active' : ''}`}>
          {isVisible ? '👁️ Visible' : '🙈 Hidden'}
        </span>
        <span className={`status-badge ${isExpanded ? 'active' : ''}`}>
          {isExpanded ? '📂 Expanded' : '📁 Collapsed'}
        </span>
        <span className="status-badge">
          {focusedElement ? `🎯 ${focusedElement.tagName.toLowerCase()}` : '🚫 No element'}
        </span>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>Basic Controls</h4>
      <div className="controls" style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={handleShow}>
          👁️ show()
        </button>
        <button className="btn btn-secondary" onClick={handleHide}>
          🙈 hide()
        </button>
        <button className="btn btn-warning" onClick={handleDetach}>
          🔓 detach()
        </button>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>Target Elements</h4>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
        Use these buttons to programmatically show the widget for specific elements:
      </p>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>
              Textarea
            </label>
            <textarea
              ref={textareaRef}
              placeholder="Dictate or edit text here..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleShowForTextarea} style={{ whiteSpace: 'nowrap' }}>
              showFor()
            </button>
            <button className="btn btn-secondary" onClick={handleAttachToTextarea} style={{ whiteSpace: 'nowrap' }}>
              attachTo()
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>
              Text Input
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Single line input..."
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ paddingTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleShowForInput} style={{ whiteSpace: 'nowrap' }}>
              showFor()
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#666' }}>
              ContentEditable
            </label>
            <div
              ref={contentEditableRef}
              contentEditable
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fafafa',
              }}
              suppressContentEditableWarning
            >
              Rich text content...
            </div>
          </div>
          <div style={{ paddingTop: '20px' }}>
            <button className="btn btn-primary" onClick={handleShowForContentEditable} style={{ whiteSpace: 'nowrap' }}>
              showFor()
            </button>
          </div>
        </div>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>
        Event Log
        <button
          className="btn btn-secondary"
          onClick={clearLogs}
          style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
        >
          Clear
        </button>
      </h4>
      <div className="event-log" style={{ minHeight: '120px' }}>
        {logs.length === 0 ? (
          <span style={{ color: '#666', fontStyle: 'italic' }}>
            Use the controls above to see events...
          </span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="event-entry">
              <span className="event-time">[{log.time}]</span>
              <span
                className="event-name"
                style={{
                  color: log.type === 'success' ? '#22c55e' : log.type === 'error' ? '#ef4444' : '#61dafb',
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================
// Visibility & Modals Test Component
// ============================================

export function VisibilityTest() {
  const state = useSpeechOSState();
  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const [alwaysVisible, setAlwaysVisible] = useState(false);
  const [isReinitialized, setIsReinitialized] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs((prev) => [
      { time: formatTime(), message, type },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Subscribe to widget events
  useSpeechOSEvents('widget:show', useCallback(() => {
    addLog('widget:show event fired', 'success');
  }, [addLog]));

  useSpeechOSEvents('widget:hide', useCallback(() => {
    addLog('widget:hide event fired', 'info');
  }, [addLog]));

  useSpeechOSEvents('transcription:complete', useCallback(({ text }) => {
    addLog(`Transcription complete: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'success');
  }, [addLog]));

  const handleReinitWithAlwaysVisible = async () => {
    try {
      // First destroy the existing instance
      if (SpeechOS.initialized) {
        await SpeechOS.destroy();
        addLog('Destroyed existing SpeechOS instance', 'info');
      }

      // Get config from localStorage
      const apiKey = localStorage.getItem('speechos-api-key') || '';
      const userId = localStorage.getItem('speechos-user-id') || undefined;
      const env = localStorage.getItem('speechos-environment') || 'local';
      const host = env === 'prod' ? 'https://app.speechos.ai' : 'http://localhost:8000';

      if (!apiKey) {
        addLog('No API key found. Please set up in the Setup section.', 'error');
        return;
      }

      // Re-initialize with alwaysVisible
      SpeechOS.init({
        apiKey,
        userId,
        host,
        debug: true,
        alwaysVisible: true,
      });
      setAlwaysVisible(true);
      setIsReinitialized(true);
      addLog('Re-initialized with alwaysVisible: true', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleReinitNormal = async () => {
    try {
      if (SpeechOS.initialized) {
        await SpeechOS.destroy();
        addLog('Destroyed existing SpeechOS instance', 'info');
      }

      const apiKey = localStorage.getItem('speechos-api-key') || '';
      const userId = localStorage.getItem('speechos-user-id') || undefined;
      const env = localStorage.getItem('speechos-environment') || 'local';
      const host = env === 'prod' ? 'https://app.speechos.ai' : 'http://localhost:8000';

      if (!apiKey) {
        addLog('No API key found. Please set up in the Setup section.', 'error');
        return;
      }

      SpeechOS.init({
        apiKey,
        userId,
        host,
        debug: true,
        alwaysVisible: false,
      });
      setAlwaysVisible(false);
      setIsReinitialized(true);
      addLog('Re-initialized with alwaysVisible: false', 'success');
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="test-panel">
      <h3>Visibility & Modals Test</h3>
      <p className="description">
        Test the <code>alwaysVisible</code> config option and contextual modals for dictation/edit
        when no field is focused.
      </p>

      <div className="info-box">
        <p>
          <strong>Features to test:</strong>
          <br />• <code>alwaysVisible: true</code> - Widget stays visible even when no form is focused
          <br />• <strong>Dictation Output Modal</strong> - Shown when dictating with no focused field
          <br />• <strong>Edit Help Modal</strong> - Shown when clicking Edit with no focused field
          <br />• <strong>Command Feedback</strong> - "Got it!" or "No command matched" badge after commands
        </p>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>alwaysVisible Config</h4>
      <div className="status-row" style={{ marginBottom: '16px' }}>
        <span className={`status-badge ${alwaysVisible ? 'active' : ''}`}>
          alwaysVisible: {alwaysVisible ? 'true' : 'false'}
        </span>
        <span className={`status-badge ${state.isVisible ? 'connected' : ''}`}>
          Widget: {state.isVisible ? 'Visible' : 'Hidden'}
        </span>
      </div>

      <div className="controls" style={{ marginBottom: '20px' }}>
        <button className="btn btn-success" onClick={handleReinitWithAlwaysVisible}>
          🔄 Re-init with alwaysVisible: true
        </button>
        <button className="btn btn-secondary" onClick={handleReinitNormal}>
          🔄 Re-init with alwaysVisible: false
        </button>
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>Test Scenarios</h4>
      <div style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <h5 style={{ fontSize: '14px', marginBottom: '12px', color: '#333' }}>1. Dictation Output Modal</h5>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          With the widget visible but <strong>no text field focused</strong>, click the Dictate button and speak.
          When dictation completes, a modal should appear with the transcription and a Copy button.
        </p>

        <h5 style={{ fontSize: '14px', marginBottom: '12px', marginTop: '16px', color: '#333' }}>2. Edit Help Modal</h5>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          With the widget visible but <strong>no text field focused</strong>, click the Edit button.
          A help modal should appear explaining how to use the Edit feature.
        </p>

        <h5 style={{ fontSize: '14px', marginBottom: '12px', marginTop: '16px', color: '#333' }}>3. Command Feedback</h5>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          Use a Command action (requires commands configured). After speaking, you should see either:
          <br />• <strong style={{ color: '#f59e0b' }}>✓ "Got it!"</strong> - amber badge when command matched
          <br />• <strong style={{ color: '#6b7280' }}>"No command matched"</strong> - gray badge when no match
        </p>

        <h5 style={{ fontSize: '14px', marginBottom: '12px', marginTop: '16px', color: '#333' }}>4. Normal Dictation (with focused field)</h5>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
          Focus the text field below, then dictate. Text should insert directly (no modal).
        </p>
        <input
          type="text"
          placeholder="Focus here, then dictate..."
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        />
      </div>

      <h4 style={{ marginBottom: '12px', color: '#333' }}>
        Event Log
        <button
          className="btn btn-secondary"
          onClick={clearLogs}
          style={{ marginLeft: '12px', padding: '4px 12px', fontSize: '12px' }}
        >
          Clear
        </button>
      </h4>
      <div className="event-log" ref={logRef} style={{ minHeight: '150px' }}>
        {logs.length === 0 ? (
          <span style={{ color: '#666', fontStyle: 'italic' }}>
            Test the scenarios above to see events...
          </span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="event-entry">
              <span className="event-time">[{log.time}]</span>
              <span
                className="event-name"
                style={{
                  color: log.type === 'success' ? '#22c55e' : log.type === 'error' ? '#ef4444' : '#61dafb',
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
