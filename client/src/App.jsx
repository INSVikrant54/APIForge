import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import LabView from './components/LabView.jsx';
import FailureDetailModal from './components/FailureDetailModal.jsx';
import RegressionExportModal from './components/RegressionExportModal.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import SecondaryViews from './components/SecondaryViews.jsx';
import { PRESETS } from './utils/presets.js';
import { createDefaultEnvironments, environmentSecrets } from './utils/environments.js';
import { fetchHealth } from './services/api.js';
import { redactText } from '../../server/utils/environmentResolver.js';
import { useTheme } from './hooks/useTheme.js';
import { useAiSettings } from './hooks/useAiSettings.js';
import { useRunHistory } from './hooks/useRunHistory.js';
import { useTestSuite } from './hooks/useTestSuite.js';
import { useDemoMode } from './hooks/useDemoMode.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState('lab'); // 'lab' | 'history' | 'docs' | 'settings'
  const [health, setHealth] = useState(null);
  const [timeoutMs, setTimeoutMs] = useState(6000);
  const { theme, setTheme } = useTheme();
  const { aiSettings, apiKeyModalOpen, setApiKeyModalOpen, handleSaveAiSettings } = useAiSettings();
  const { recentRuns, recordRunToHistory, handleClearRuns } = useRunHistory();

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
  const configRef = useRef(config); configRef.current = config;
  const batchRunIdRef = useRef(0);

  const {
    testSuite, customRequestStarted, setCustomRequestStarted,
    openApiImportOpen, setOpenApiImportOpen, postmanImportOpen, setPostmanImportOpen,
    batch, results, summary, loadingPlan, runningTests, planError, banner, setBanner,
    inspectingFailure, setInspectingFailure, failureExplanation, explainingFailure,
    exportModalOpen, setExportModalOpen,
    handleGeneratePlan, handleLoadDemo, handleOpenApiImport, handleOpenPostmanImport,
    handleChooseOpenApiEndpoint, handleChooseOpenApiEndpoints, handleOpenBatchEntry,
    handleChoosePostmanRequest, handleToggleSelect, handleSelectAll, handleDeselectAll,
    handleUpdateTest, handleRunSelected, handleRunSingle, handleInspectFailure,
    handleExplainFailure, handleLoadRecentRun, handleBackToStart
  } = useTestSuite({
    configRef, setConfig, setCurrentTab, batchRunIdRef, aiSettings, health, timeoutMs, recordRunToHistory
  });

  const { demoMode, handleToggleDemoMode } = useDemoMode((error) => setBanner({ message: error.message }));

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

  useEffect(() => { fetchHealth().then(setHealth).catch(err => console.warn('Could not reach backend health route:', err.message)); }, []);

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

  const activeModel = aiSettings?.model || health?.model || 'gemini-3.5-flash-lite';

  return (
    <div className="app-container">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        recentRunsCount={recentRuns.length}
        activeModel={activeModel}
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
          importActive={openApiImportOpen || postmanImportOpen || Boolean(batch)}
          theme={theme}
          onChangeTheme={setTheme}
          showBack={currentTab === 'lab' && (Boolean(testSuite) || customRequestStarted || openApiImportOpen || postmanImportOpen || Boolean(batch))}
          onBack={handleBackToStart}
          targetPath={redactText(config.path || '', environmentSecrets(config))}
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
        <main className="main-content" id="main-content">
          {currentTab === 'lab' && (
            <LabView
              batch={batch}
              openApiImportOpen={openApiImportOpen}
              postmanImportOpen={postmanImportOpen}
              testSuite={testSuite}
              customRequestStarted={customRequestStarted}
              loadingPlan={loadingPlan}
              planError={planError}
              config={config}
              activeModel={activeModel}
              results={results}
              summary={summary}
              runningTests={runningTests}
              setConfig={setConfig}
              setCustomRequestStarted={setCustomRequestStarted}
              setOpenApiImportOpen={setOpenApiImportOpen}
              setPostmanImportOpen={setPostmanImportOpen}
              setExportModalOpen={setExportModalOpen}
              handleOpenBatchEntry={handleOpenBatchEntry}
              handleBackToStart={handleBackToStart}
              handleChooseOpenApiEndpoint={handleChooseOpenApiEndpoint}
              handleChooseOpenApiEndpoints={handleChooseOpenApiEndpoints}
              handleChoosePostmanRequest={handleChoosePostmanRequest}
              handleLoadDemo={handleLoadDemo}
              handleGeneratePlan={handleGeneratePlan}
              handleOpenApiImport={handleOpenApiImport}
              handleOpenPostmanImport={handleOpenPostmanImport}
              handleToggleSelect={handleToggleSelect}
              handleSelectAll={handleSelectAll}
              handleDeselectAll={handleDeselectAll}
              handleUpdateTest={handleUpdateTest}
              handleRunSelected={handleRunSelected}
              handleRunSingle={handleRunSingle}
              handleInspectFailure={handleInspectFailure}
            />
          )}

          {currentTab !== 'lab' && (
            <SecondaryViews
              currentTab={currentTab}
              recentRuns={recentRuns}
              handleLoadRecentRun={handleLoadRecentRun}
              handleClearRuns={handleClearRuns}
              health={health}
              aiSettings={aiSettings}
              setApiKeyModalOpen={setApiKeyModalOpen}
              timeoutMs={timeoutMs}
              setTimeoutMs={setTimeoutMs}
              config={config}
              handleChangeAuth={handleChangeAuth}
            />
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
          activeModel={activeModel}
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
