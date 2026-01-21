/**
 * SpeechOS React Hooks Test Page
 *
 * Comprehensive testing interface for all React hooks.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SpeechOSProvider } from '@speechos/react';
import type { SpeechOSCoreConfig } from '@speechos/core';
import {
  loadConfig,
  saveApiKey,
  saveUserId,
  saveEnvironment,
  saveActiveTab,
  getActiveTab,
  getApiKey,
  getUserId,
  getEnvironment,
  hasValidConfig,
  type Environment,
} from './shared-utils.js';
import {
  DictationTest,
  EditTest,
  CommandTest,
  StateTest,
  EventsTest,
  SpeechOSTest,
  WidgetTest,
  WidgetHookTest,
  VisibilityTest,
} from './react-components.js';

// Tab definitions
const TABS = [
  { id: 'dictation', label: 'useDictation', description: 'Simple dictation workflow' },
  { id: 'edit', label: 'useEdit', description: 'Voice editing workflow' },
  { id: 'command', label: 'useCommand', description: 'Voice command matching' },
  { id: 'state', label: 'useSpeechOSState', description: 'Real-time state display' },
  { id: 'events', label: 'useSpeechOSEvents', description: 'Event monitoring' },
  { id: 'speechos', label: 'useSpeechOS', description: 'Full context API' },
  { id: 'widget-hook', label: 'useSpeechOSWidget', description: 'Programmatic widget control hook' },
  { id: 'widget', label: 'Widget (Client)', description: 'Client SDK widget control' },
  { id: 'visibility', label: 'Visibility & Modals', description: 'Test alwaysVisible and modal features' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Header component with navigation back to main test page
 */
function Header() {
  return (
    <div className="header">
      <h1>
        <span role="img" aria-label="react">⚛️</span>
        SpeechOS React Hooks
        <span className="badge">Test Page</span>
      </h1>
      <a href="/" className="back-link">
        ← Back to Main Test Page
      </a>
    </div>
  );
}

/**
 * Setup section for API key, user ID, and environment
 */
interface SetupSectionProps {
  config: SpeechOSCoreConfig;
  onConfigChange: (config: SpeechOSCoreConfig) => void;
  isInitialized: boolean;
  onInitialize: () => void;
}

function SetupSection({ config, onConfigChange, isInitialized, onInitialize }: SetupSectionProps) {
  const [apiKey, setApiKey] = useState(getApiKey());
  const [userId, setUserId] = useState(getUserId());
  const [environment, setEnvironment] = useState<Environment>(getEnvironment());

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    saveApiKey(value);
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserId(value);
    saveUserId(value);
  };

  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Environment;
    setEnvironment(value);
    saveEnvironment(value);
    // Update config with new host
    onConfigChange(loadConfig());
  };

  const handleInitialize = () => {
    const newConfig = loadConfig();
    onConfigChange(newConfig);
    onInitialize();
  };

  return (
    <div className="setup-section">
      <h2>🔑 Setup</h2>
      <div className="setup-grid">
        <div className="setup-field">
          <label htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your API key..."
            style={{ fontFamily: 'Monaco, Menlo, monospace', fontSize: '13px' }}
          />
        </div>
        <div className="setup-field">
          <label htmlFor="user-id">User ID (optional)</label>
          <input
            id="user-id"
            type="text"
            value={userId}
            onChange={handleUserIdChange}
            placeholder="e.g., user_123"
          />
        </div>
        <div className="setup-field">
          <label htmlFor="environment">Environment</label>
          <select id="environment" value={environment} onChange={handleEnvironmentChange}>
            <option value="local">🏠 Local (localhost:8000)</option>
            <option value="prod">🚀 Production (app.speechos.ai)</option>
          </select>
        </div>
      </div>
      <div className="setup-actions">
        <button
          className="btn btn-success"
          onClick={handleInitialize}
          disabled={!apiKey}
        >
          {isInitialized ? '✓ Re-initialize SDK' : 'Initialize SDK'}
        </button>
        {isInitialized && (
          <span className="status-badge active">SDK Initialized</span>
        )}
        {!apiKey && (
          <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
            API key required
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Tab navigation component
 */
interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Tab content - renders the active tab's test component
 */
interface TabContentProps {
  activeTab: TabId;
  isInitialized: boolean;
}

function TabContent({ activeTab, isInitialized }: TabContentProps) {
  if (!isInitialized) {
    return (
      <div className="not-initialized">
        <h4>⚠️ SDK Not Initialized</h4>
        <p>Enter your API key above and click "Initialize SDK" to start testing hooks.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`tab-panel ${activeTab === 'dictation' ? 'active' : ''}`}>
        <DictationTest />
      </div>
      <div className={`tab-panel ${activeTab === 'edit' ? 'active' : ''}`}>
        <EditTest />
      </div>
      <div className={`tab-panel ${activeTab === 'command' ? 'active' : ''}`}>
        <CommandTest />
      </div>
      <div className={`tab-panel ${activeTab === 'state' ? 'active' : ''}`}>
        <StateTest />
      </div>
      <div className={`tab-panel ${activeTab === 'events' ? 'active' : ''}`}>
        <EventsTest />
      </div>
      <div className={`tab-panel ${activeTab === 'speechos' ? 'active' : ''}`}>
        <SpeechOSTest />
      </div>
      <div className={`tab-panel ${activeTab === 'widget-hook' ? 'active' : ''}`}>
        <WidgetHookTest />
      </div>
      <div className={`tab-panel ${activeTab === 'widget' ? 'active' : ''}`}>
        <WidgetTest />
      </div>
      <div className={`tab-panel ${activeTab === 'visibility' ? 'active' : ''}`}>
        <VisibilityTest />
      </div>
    </>
  );
}

/**
 * Main App component
 */
function App() {
  const [activeTab, setActiveTab] = useState<TabId>(() => getActiveTab() as TabId);
  const [config, setConfig] = useState<SpeechOSCoreConfig>(loadConfig);
  const [isInitialized, setIsInitialized] = useState(false);
  const [key, setKey] = useState(0); // Key to force re-mount provider

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    saveActiveTab(tab);
  }, []);

  const handleConfigChange = useCallback((newConfig: SpeechOSCoreConfig) => {
    setConfig(newConfig);
  }, []);

  const handleInitialize = useCallback(() => {
    // Force remount of provider with new config
    setKey((k) => k + 1);
    setIsInitialized(true);
  }, []);

  // Auto-initialize if valid config exists on mount
  useEffect(() => {
    if (hasValidConfig() && !isInitialized) {
      setIsInitialized(true);
    }
  }, []);

  return (
    <>
      <Header />
      <SetupSection
        config={config}
        onConfigChange={handleConfigChange}
        isInitialized={isInitialized}
        onInitialize={handleInitialize}
      />
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      {isInitialized ? (
        <SpeechOSProvider key={key} config={config}>
          <TabContent activeTab={activeTab} isInitialized={isInitialized} />
        </SpeechOSProvider>
      ) : (
        <TabContent activeTab={activeTab} isInitialized={isInitialized} />
      )}
    </>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
