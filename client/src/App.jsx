import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import TestSuitePanel from './components/TestSuitePanel.jsx';
import FailureDetailModal from './components/FailureDetailModal.jsx';
import RegressionExportModal from './components/RegressionExportModal.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import RecentRunsView from './components/RecentRunsView.jsx';
import DocsView from './components/DocsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import { PRESETS } from './utils/presets.js';
import {
  fetchHealth,
  fetchDemoMode,
  setDemoMode,
  generateTestPlanApi,
  runTestsApi,
  explainFailureApi
} from './services/api.js';

const STORAGE_KEY_RECENT_RUNS = 'apiforge_recent_runs_v1';
const STORAGE_KEY_AI_SETTINGS = 'apiforge_ai_settings_v1';

export default function App() {
  const [currentTab, setCurrentTab] = useState('lab'); // 'lab' | 'history' | 'docs' | 'settings'
  const [health, setHealth] = useState(null);
  const [demoMode, setDemoModeState] = useState({ mode: 'vulnerable' });
  const [timeoutMs, setTimeoutMs] = useState(6000);

  // AI Key & Model Settings (BYOK support)
  const [aiSettings, setAiSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
      return saved ? JSON.parse(saved) : { useServerKey: true, customKey: '', model: 'gemma-4-26b-a4b-it' };
    } catch {
      return { useServerKey: true, customKey: '', model: 'gemma-4-26b-a4b-it' };
    }
  });
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Configuration state initialized from first preset (Demo Order API)
  const [config, setConfig] = useState({
    method: PRESETS[0].method,
    path: PRESETS[0].path,
    expectedStatus: PRESETS[0].expectedStatus,
    headers: PRESETS[0].headers,
    body: PRESETS[0].body,
    sampleResponse: PRESETS[0].sampleResponse,
    businessRules: PRESETS[0].businessRules
  });

  // Test Suite & Execution state
  const [testSuite, setTestSuite] = useState(null);
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Modal states
  const [inspectingFailure, setInspectingFailure] = useState(null); // { test, result }
  const [failureExplanation, setFailureExplanation] = useState(null);
  const [explainingFailure, setExplainingFailure] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Session History
  const [recentRuns, setRecentRuns] = useState([]);

  // Load health, demo mode, and local history on mount
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(err => console.warn('Could not reach backend health route:', err.message));

    fetchDemoMode()
      .then(setDemoModeState)
      .catch(err => console.warn('Could not reach demo mode route:', err.message));

    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_RUNS);
      if (saved) setRecentRuns(JSON.parse(saved));
    } catch {
      // Ignore local storage parse error
    }
  }, []);

  const handleSaveAiSettings = (newSettings) => {
    setAiSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(newSettings));
    } catch {
      // Ignore storage errors
    }
  };

  // Save run to local history
  const recordRunToHistory = (suite, runSummary, runResults) => {
    const newRun = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      suiteName: suite.suiteName,
      path: config.path,
      summary: runSummary,
      results: runResults,
      tests: suite.tests
    };

    const updated = [newRun, ...recentRuns].slice(0, 20); // Keep last 20 runs
    setRecentRuns(updated);
    try {
      localStorage.setItem(STORAGE_KEY_RECENT_RUNS, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleDemoMode = async (newMode) => {
    try {
      const res = await setDemoMode(newMode);
      setDemoModeState(res);
    } catch (err) {
      alert(`Failed to switch demo mode: ${err.message}`);
    }
  };

  // Generate Test Plan
  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    setResults(null);
    setSummary(null);

    const isCustomActive = !aiSettings.useServerKey && aiSettings.customKey;
    const shouldFallbackOffline = !isCustomActive && !health?.aiConfigured;

    try {
      const plan = await generateTestPlanApi({
        ...config,
        useOfflineDemo: shouldFallbackOffline
      }, aiSettings);
      setTestSuite(plan);
      setCurrentTab('lab');
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Load and generate interactive demo with one click
  const handleLoadDemo = async () => {
    const demoPreset = PRESETS[0];
    setConfig({
      method: demoPreset.method,
      path: demoPreset.path,
      expectedStatus: demoPreset.expectedStatus,
      headers: demoPreset.headers,
      body: demoPreset.body,
      sampleResponse: demoPreset.sampleResponse,
      businessRules: demoPreset.businessRules
    });

    setLoadingPlan(true);
    setPlanError(null);
    setResults(null);
    setSummary(null);

    const isCustomActive = !aiSettings.useServerKey && aiSettings.customKey;
    const shouldFallbackOffline = !isCustomActive && !health?.aiConfigured;

    try {
      const plan = await generateTestPlanApi({
        ...demoPreset,
        useOfflineDemo: shouldFallbackOffline
      }, aiSettings);
      setTestSuite(plan);
      setCurrentTab('lab');
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Toggle selection on a single test
  const handleToggleSelect = (testId) => {
    if (!testSuite) return;
    const updated = testSuite.tests.map(t =>
      t.id === testId ? { ...t, selected: t.selected === false ? true : false } : t
    );
    setTestSuite({ ...testSuite, tests: updated });
  };

  const handleSelectAll = () => {
    if (!testSuite) return;
    const updated = testSuite.tests.map(t => ({ ...t, selected: true }));
    setTestSuite({ ...testSuite, tests: updated });
  };

  const handleDeselectAll = () => {
    if (!testSuite) return;
    const updated = testSuite.tests.map(t => ({ ...t, selected: false }));
    setTestSuite({ ...testSuite, tests: updated });
  };

  const handleUpdateTest = (testId, patch) => {
    if (!testSuite) return;
    const updated = testSuite.tests.map(t =>
      t.id === testId ? { ...t, ...patch } : t
    );
    setTestSuite({ ...testSuite, tests: updated });
  };

  // Run Selected Tests
  const handleRunSelected = async () => {
    if (!testSuite) return;
    setRunningTests(true);

    try {
      const runnerRes = await runTestsApi({
        targetBaseUrl: config.path.startsWith('http') ? config.path : '',
        tests: testSuite.tests,
        timeoutMs
      });

      setSummary(runnerRes.summary);
      setResults(runnerRes.results);
      recordRunToHistory(testSuite, runnerRes.summary, runnerRes.results);
    } catch (err) {
      alert(`Execution failed: ${err.message}`);
    } finally {
      setRunningTests(false);
    }
  };

  // Run a single test
  const handleRunSingle = async (test) => {
    setRunningTests(true);
    try {
      const runnerRes = await runTestsApi({
        targetBaseUrl: config.path.startsWith('http') ? config.path : '',
        tests: [{ ...test, selected: true }],
        timeoutMs
      });

      const singleResult = runnerRes.results[0];
      setResults(prev => {
        const filtered = (prev || []).filter(r => r.id !== test.id);
        return [...filtered, singleResult];
      });
    } catch (err) {
      alert(`Test execution failed: ${err.message}`);
    } finally {
      setRunningTests(false);
    }
  };

  // Failure Inspector & AI diagnosis
  const handleInspectFailure = (test, result) => {
    setInspectingFailure({ test, result });
    setFailureExplanation(null);
  };

  const handleExplainFailure = async (test, result) => {
    setExplainingFailure(true);
    try {
      const explanation = await explainFailureApi({
        test,
        actual: result.actual,
        failedAssertion: result.failureReason,
        businessRules: config.businessRules
      }, aiSettings);
      setFailureExplanation(explanation);
    } catch (err) {
      alert(`Could not generate AI failure explanation: ${err.message}`);
    } finally {
      setExplainingFailure(false);
    }
  };

  const handleLoadRecentRun = (run) => {
    setTestSuite({
      suiteName: run.suiteName,
      summary: `Restored from session history (${new Date(run.timestamp).toLocaleTimeString()})`,
      tests: run.tests
    });
    setSummary(run.summary);
    setResults(run.results);
    setCurrentTab('lab');
  };

  const handleClearRuns = () => {
    setRecentRuns([]);
    localStorage.removeItem(STORAGE_KEY_RECENT_RUNS);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        recentRunsCount={recentRuns.length}
      />

      {/* Main App Area */}
      <div className="main-wrapper">
        {/* Top Header */}
        <Header
          health={health}
          demoMode={demoMode}
          aiSettings={aiSettings}
          onOpenAiSettings={() => setApiKeyModalOpen(true)}
          onToggleDemoMode={handleToggleDemoMode}
          onLoadDemo={handleLoadDemo}
          loading={loadingPlan || runningTests}
        />

        {/* Tab Content */}
        <main className="main-content">
          {currentTab === 'lab' && (
            <>
              {/* Left Column: API Configuration & Business Rules */}
              <div className="panel-left">
                <ConfigPanel
                  config={config}
                  onChangeConfig={setConfig}
                  onGeneratePlan={handleGeneratePlan}
                  loading={loadingPlan}
                  error={planError}
                />
              </div>

              {/* Right Column: Test Suite Review & Execution Console */}
              <div className="panel-right">
                <TestSuitePanel
                  testSuite={testSuite}
                  results={results}
                  summary={summary}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onUpdateTest={handleUpdateTest}
                  onRunSelected={handleRunSelected}
                  onRunSingle={handleRunSingle}
                  onInspectFailure={handleInspectFailure}
                  onOpenExport={() => setExportModalOpen(true)}
                  running={runningTests}
                />
              </div>
            </>
          )}

          {currentTab === 'history' && (
            <div style={{ flex: 1 }}>
              <RecentRunsView
                runs={recentRuns}
                onLoadRun={handleLoadRecentRun}
                onClearRuns={handleClearRuns}
              />
            </div>
          )}

          {currentTab === 'docs' && (
            <div style={{ flex: 1 }}>
              <DocsView />
            </div>
          )}

          {currentTab === 'settings' && (
            <div style={{ flex: 1 }}>
              <SettingsView
                health={health}
                aiSettings={aiSettings}
                onOpenAiSettings={() => setApiKeyModalOpen(true)}
                timeoutMs={timeoutMs}
                onChangeTimeout={setTimeoutMs}
              />
            </div>
          )}
        </main>
      </div>

      {/* API Key & Model Settings Modal (BYOK) */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        health={health}
        aiSettings={aiSettings}
        onSaveSettings={handleSaveAiSettings}
      />

      {/* Failure Breakdown & AI Remediation Modal */}
      {inspectingFailure && (
        <FailureDetailModal
          test={inspectingFailure.test}
          result={inspectingFailure.result}
          businessRules={config.businessRules}
          onClose={() => setInspectingFailure(null)}
          onExplainFailure={handleExplainFailure}
          explaining={explainingFailure}
          explanation={failureExplanation}
        />
      )}

      {/* Regression Test Export Modal */}
      {exportModalOpen && testSuite && (
        <RegressionExportModal
          testSuite={testSuite}
          results={results}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </div>
  );
}
