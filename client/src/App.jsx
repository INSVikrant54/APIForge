import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import OpenApiImportPanel from './components/OpenApiImportPanel.jsx';
import TestSuitePanel from './components/TestSuitePanel.jsx';
import FailureDetailModal from './components/FailureDetailModal.jsx';
import RegressionExportModal from './components/RegressionExportModal.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import RecentRunsView from './components/RecentRunsView.jsx';
import DocsView from './components/DocsView.jsx';
import SettingsView from './components/SettingsView.jsx';
import { PRESETS } from './utils/presets.js';
import { applyParameterExamples } from './utils/openApiParams.js';
import {
  buildGenerationConfig,
  createDefaultEnvironments,
  currentAuth,
  currentEnvironment,
  environmentSecrets,
  environmentValues,
  resolvedBaseUrl
} from './utils/environments.js';
import { redactSecrets, redactText } from '../../server/utils/environmentResolver.js';
import {
  fetchHealth,
  fetchDemoMode,
  setDemoMode,
  parseOpenApiSpecApi,
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

  // AI Key & Model Settings (BYOK support - session only, zero persistent disk secrets)
  const [aiSettings, setAiSettings] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_AI_SETTINGS) || localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
      if (localStorage.getItem(STORAGE_KEY_AI_SETTINGS)) {
        localStorage.removeItem(STORAGE_KEY_AI_SETTINGS); // Purge from permanent disk
      }
      return saved ? JSON.parse(saved) : { useServerKey: true, customKey: '', model: 'gemini-3.5-flash-lite' };
    } catch {
      return { useServerKey: true, customKey: '', model: 'gemini-3.5-flash-lite' };
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
    businessRules: PRESETS[0].businessRules,
    environment: 'development',
    environments: createDefaultEnvironments()
  });

  // Auth is stored per environment in React state only. Credential values are
  // never typed here: each helper points at an environment variable.
  const handleChangeAuth = (nextAuth) => {
    setConfig((previous) => {
      const name = previous.environment || 'development';
      const environments = { ...previous.environments };
      environments[name] = { ...(environments[name] || {}), auth: nextAuth };
      return { ...previous, environments };
    });
  };

  // Test Suite & Execution state
  const [testSuite, setTestSuite] = useState(null);
  const [customRequestStarted, setCustomRequestStarted] = useState(false);
  const [openApiImportOpen, setOpenApiImportOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('apiforge_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [banner, setBanner] = useState(null);

  // Modal states
  const [inspectingFailure, setInspectingFailure] = useState(null); // { test, result }
  const [failureExplanation, setFailureExplanation] = useState(null);
  const [explainingFailure, setExplainingFailure] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Session History
  const [recentRuns, setRecentRuns] = useState([]);

  // Load health, demo mode, and local history on mount
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('apiforge_theme', theme);
  }, [theme]);

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

  // Modal containment: keep keyboard focus inside the open dialog, lock page
  // scroll, and return focus to the trigger when it closes.
  const anyModalOpen = apiKeyModalOpen || Boolean(inspectingFailure) || (exportModalOpen && Boolean(testSuite));

  useEffect(() => {
    if (!anyModalOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const dialog = document.querySelector('[role="dialog"]');
    const getFocusable = () => Array.from(
      dialog?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || []
    ).filter(element => element.offsetParent !== null);

    const firstFocusable = getFocusable()[0];
    if (firstFocusable) firstFocusable.focus();

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [anyModalOpen]);

  const handleSaveAiSettings = (newSettings) => {
    setAiSettings(newSettings);
    try {
      sessionStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(newSettings));
      localStorage.removeItem(STORAGE_KEY_AI_SETTINGS); // Ensure zero disk persistence
    } catch {
      // Ignore storage errors
    }
  };

  // Save run to local history
  const recordRunToHistory = (suite, runSummary, runResults) => {
    const secrets = environmentSecrets(config);
    const safe = redactSecrets({
      suiteName: suite.suiteName,
      path: config.path,
      results: runResults,
      tests: suite.tests
    }, secrets);
    const newRun = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      suiteName: safe.suiteName,
      path: safe.path,
      summary: runSummary,
      results: safe.results,
      tests: safe.tests
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
      setBanner({ message: `Could not switch demo mode: ${err.message}. Check that the API server is running, then try again.` });
    }
  };

  // Generate Test Plan
  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    setBanner(null);
    setResults(null);
    setSummary(null);

    const isCustomActive = !aiSettings.useServerKey && aiSettings.customKey;
    const shouldFallbackOffline = !isCustomActive && !health?.aiConfigured;

    try {
      const plan = await generateTestPlanApi({
        ...buildGenerationConfig(config),
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
    const nextConfig = {
      ...config,
      method: demoPreset.method,
      path: demoPreset.path,
      expectedStatus: demoPreset.expectedStatus,
      headers: demoPreset.headers,
      body: demoPreset.body,
      sampleResponse: demoPreset.sampleResponse,
      businessRules: demoPreset.businessRules
    };
    setConfig(nextConfig);

    setLoadingPlan(true);
    setPlanError(null);
    setResults(null);
    setSummary(null);

    const isCustomActive = !aiSettings.useServerKey && aiSettings.customKey;
    const shouldFallbackOffline = !isCustomActive && !health?.aiConfigured;

    try {
      const plan = await generateTestPlanApi({
        ...buildGenerationConfig(nextConfig),
        useOfflineDemo: shouldFallbackOffline
      }, aiSettings);
      setTestSuite(plan);
      setCustomRequestStarted(false);
      setCurrentTab('lab');
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleOpenApiImport = () => {
    setPlanError(null);
    setBanner(null);
    setResults(null);
    setSummary(null);
    setTestSuite(null);
    setCustomRequestStarted(false);
    setOpenApiImportOpen(true);
  };

  const handleChooseOpenApiEndpoint = (endpoint) => {
    const expectedStatusCodes = Array.isArray(endpoint.expected?.statusCodes)
      ? endpoint.expected.statusCodes
      : [];
    const serverNeedsReview = Boolean(endpoint.serverUrlNeedsReview || !endpoint.serverUrl);
    const { path: substitutedPath, query, unresolved } = applyParameterExamples(
      endpoint.path || '',
      endpoint.parameters || []
    );
    const parameterNeedsReview = unresolved.length > 0;
    let path = `${substitutedPath}${query}`;
    let serverBaseUrl = '';

    if (!serverNeedsReview && endpoint.serverUrl) {
      try {
        const server = new URL(endpoint.serverUrl);
        if (['http:', 'https:'].includes(server.protocol)) {
          const basePath = server.pathname.replace(/\/+$/, '');
          const operationPath = `/${substitutedPath.replace(/^\/+/, '')}`;
          serverBaseUrl = `${server.origin}${basePath}`;
          path = `${serverBaseUrl}${operationPath}${query}`;
        }
      } catch {
        // Keep the relative operation path; the user can set a target URL manually.
      }
    }

    const parameterNotes = (endpoint.parameters || []).map((parameter) => {
      const required = parameter.required ? ' (required)' : '';
      const example = parameter.example !== undefined ? `; example: ${JSON.stringify(parameter.example)}` : '';
      const description = parameter.description ? ` — ${parameter.description}` : '';
      return `- ${parameter.in} parameter "${parameter.name}"${required}${description}${example}`;
    });
    const rules = [
      endpoint.apiTitle ? `API: ${endpoint.apiTitle}` : '',
      endpoint.summary || endpoint.description,
      ...(parameterNotes.length ? ['Parameters from the API specification:', ...parameterNotes] : []),
      ...(parameterNeedsReview
        ? [`Unresolved path parameters: ${unresolved.join(', ')}. Provide concrete values before running.`]
        : []),
      endpoint.requestBody?.schema ? `Request body schema: ${JSON.stringify(endpoint.requestBody.schema)}` : ''
    ].filter(Boolean).join('\n');
    const body = endpoint.request?.body;
    const headers = endpoint.request?.headers || {};

    setConfig({
      ...config,
      method: endpoint.method,
      path,
      expectedStatus: expectedStatusCodes[0] ?? '',
      expectedStatusCodes,
      expectedStatusReviewRequired: expectedStatusCodes.length === 0,
      importMetadata: {
        apiTitle: endpoint.apiTitle,
        operationId: endpoint.operationId,
        serverNeedsReview,
        serverBaseUrl,
        parameterNeedsReview,
        unresolvedParameters: unresolved,
        requiresReview: Boolean(endpoint.requiresReview || serverNeedsReview || parameterNeedsReview)
      },
      headers,
      body: body == null ? '' : JSON.stringify(body, null, 2),
      sampleResponse: '',
      businessRules: rules
    });
    setTestSuite(null);
    setResults(null);
    setSummary(null);
    setPlanError(null);
    setOpenApiImportOpen(false);
    setCustomRequestStarted(true);
    setCurrentTab('lab');
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
    setBanner(null);

    try {
      const runnerRes = await runTestsApi({
        targetBaseUrl: resolvedBaseUrl(config),
        tests: testSuite.tests,
        timeoutMs,
        environment: currentEnvironment(config),
        auth: currentAuth(config),
        values: environmentValues(config)
      });

      const safeResults = redactSecrets(runnerRes.results || [], environmentSecrets(config));
      setSummary(runnerRes.summary);
      setResults(safeResults);
      recordRunToHistory(testSuite, runnerRes.summary, safeResults);
    } catch (err) {
      setBanner({ message: `Execution failed: ${err.message}. The backend runner did not respond — confirm the API server is up and retry.` });
    } finally {
      setRunningTests(false);
    }
  };

  // Run a single test
  const handleRunSingle = async (test) => {
    setRunningTests(true);
    try {
      const runnerRes = await runTestsApi({
        targetBaseUrl: resolvedBaseUrl(config),
        tests: [{ ...test, selected: true }],
        timeoutMs,
        environment: currentEnvironment(config),
        auth: currentAuth(config),
        values: environmentValues(config)
      });

      const singleResult = redactSecrets(runnerRes.results[0] || {}, environmentSecrets(config));
      setResults(prev => {
        const filtered = (prev || []).filter(r => r.id !== test.id);
        return [...filtered, singleResult];
      });
      setInspectingFailure(prev =>
        prev?.test.id === test.id
          ? { ...prev, test: { ...prev.test, ...test }, result: singleResult }
          : prev
      );
    } catch (err) {
      setBanner({ message: `Test execution failed: ${err.message}. Confirm the backend runner is running and try again.` });
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
        businessRules: redactText(config.businessRules || '', environmentSecrets(config))
      }, aiSettings);
      setFailureExplanation(explanation);
    } catch (err) {
      setBanner({ message: `Could not generate an AI explanation: ${err.message}. The failure details and cURL above remain available.` });
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
    if (run.path) {
      setConfig(prev => ({ ...prev, path: run.path }));
    }
    setSummary(run.summary);
    setResults(run.results);
    setCurrentTab('lab');
  };

  const handleBackToStart = () => {
    setTestSuite(null);
    setResults(null);
    setSummary(null);
    setCustomRequestStarted(false);
    setOpenApiImportOpen(false);
    setPlanError(null);
    setBanner(null);
    setInspectingFailure(null);
    setFailureExplanation(null);
    setExportModalOpen(false);
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
        activeModel={aiSettings?.model || health?.model || 'gemini-3.5-flash-lite'}
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
          customRequestActive={customRequestStarted}
          importActive={openApiImportOpen}
          theme={theme}
          onChangeTheme={setTheme}
          showBack={currentTab === 'lab' && (Boolean(testSuite) || customRequestStarted || openApiImportOpen)}
          onBack={handleBackToStart}
        />

        {banner && (
          <div className="app-banner" role="alert">
            <span>{banner.message}</span>
            <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss message">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        <main className="main-content">
          {currentTab === 'lab' && (
            openApiImportOpen ? (
              <OpenApiImportPanel onChooseEndpoint={handleChooseOpenApiEndpoint} />
            ) : (!testSuite && !customRequestStarted) ? (
              <div className="start-workspace">
                <section className="start-copy">
                  <p className="start-kicker">API behavior check</p>
                  <h1>Find out how your API really behaves.</h1>
                  <p>
                    Generate edge-case tests, run them against your endpoint, and inspect any failure.
                  </p>
                  <div className="start-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleLoadDemo}
                      disabled={loadingPlan}
                    >
                      {loadingPlan ? 'Preparing demo…' : 'Run the demo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setOpenApiImportOpen(false);
                        setConfig(prev => ({ ...prev, path: '' }));
                        setCustomRequestStarted(true);
                      }}
                    >
                      Test my API
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleOpenApiImport}
                    >
                      Import OpenAPI
                    </button>
                  </div>
                </section>

                {planError && <div className="start-error">{planError}</div>}
              </div>
            ) : (
              <>
                <div className="panel-left">
                  <ConfigPanel
                    config={config}
                    onChangeConfig={setConfig}
                    onGeneratePlan={handleGeneratePlan}
                    loading={loadingPlan}
                    error={planError}
                    activeModel={aiSettings?.model || health?.model || 'gemini-3.5-flash-lite'}
                  />
                </div>

                <div className="panel-right">
                  <TestSuitePanel
                    testSuite={testSuite}
                    results={results}
                    summary={summary}
                    targetPath={redactText(config.path || '', environmentSecrets(config))}
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
            )
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
                authConfig={currentAuth(config)}
                variableNames={Object.keys(currentEnvironment(config).variables || {})}
                environmentName={config.environment}
                onChangeAuth={handleChangeAuth}
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
          activeModel={aiSettings?.model || health?.model || 'gemini-3.5-flash-lite'}
          onClose={() => setInspectingFailure(null)}
          onExplainFailure={handleExplainFailure}
          explaining={explainingFailure}
          explanation={failureExplanation}
          onRunSingle={handleRunSingle}
          runningTests={runningTests}
        />
      )}

      {/* Regression Test Export Modal */}
      {exportModalOpen && testSuite && (
        <RegressionExportModal
          testSuite={testSuite}
          results={results}
          secretValues={environmentSecrets(config)}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </div>
  );
}
