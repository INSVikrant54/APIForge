import { useState } from 'react';
import { PRESETS } from '../utils/presets.js';
import { buildConfigFromEndpoint } from '../utils/openApiEndpoint.js';
import { runBatch } from '../utils/batchRunner.js';
import {
  buildGenerationConfig,
  currentAuth,
  currentEnvironment,
  environmentSecrets,
  environmentValues,
  resolvedBaseUrl
} from '../utils/environments.js';
import { redactSecrets, redactText } from '../../../server/utils/environmentResolver.js';
import { generateTestPlanApi, runTestsApi, explainFailureApi } from '../services/api.js';

/**
 * All test-suite, execution, import, batch and failure-inspection state and
 * handlers. `configRef`, `setConfig`, `setCurrentTab` and the cancellation ref
 * are injected so this hook owns behaviour without owning the workspace form.
 */
export function useTestSuite({
  configRef,
  setConfig,
  setCurrentTab,
  batchRunIdRef,
  aiSettings,
  health,
  timeoutMs,
  recordRunToHistory
}) {
  const [testSuite, setTestSuite] = useState(null);
  const [customRequestStarted, setCustomRequestStarted] = useState(false);
  const [openApiImportOpen, setOpenApiImportOpen] = useState(false);
  const [postmanImportOpen, setPostmanImportOpen] = useState(false);
  const [batch, setBatch] = useState(null); // { entries, running }
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [inspectingFailure, setInspectingFailure] = useState(null); // { test, result }
  const [failureExplanation, setFailureExplanation] = useState(null);
  const [explainingFailure, setExplainingFailure] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const fallbackToOffline = () => {
    const isCustomActive = !aiSettings.useServerKey && aiSettings.customKey;
    return !isCustomActive && !health?.aiConfigured;
  };

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    setBanner(null);
    setResults(null);
    setSummary(null);

    try {
      const plan = await generateTestPlanApi({
        ...buildGenerationConfig(configRef.current),
        useOfflineDemo: fallbackToOffline()
      }, aiSettings);
      setTestSuite(plan);
      setCurrentTab('lab');
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleLoadDemo = async () => {
    const demoPreset = PRESETS[0];
    const nextConfig = {
      ...configRef.current,
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

    try {
      const plan = await generateTestPlanApi({
        ...buildGenerationConfig(nextConfig),
        useOfflineDemo: fallbackToOffline()
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
    setPostmanImportOpen(false);
    setOpenApiImportOpen(true);
  };

  const handleOpenPostmanImport = () => {
    setPlanError(null);
    setBanner(null);
    setResults(null);
    setSummary(null);
    setTestSuite(null);
    setCustomRequestStarted(false);
    setOpenApiImportOpen(false);
    setPostmanImportOpen(true);
  };

  const handleChooseOpenApiEndpoint = (endpoint) => {
    setConfig(buildConfigFromEndpoint(configRef.current, endpoint));
    setTestSuite(null);
    setResults(null);
    setSummary(null);
    setPlanError(null);
    setOpenApiImportOpen(false);
    setCustomRequestStarted(true);
    setCurrentTab('lab');
  };

  const handleChooseOpenApiEndpoints = async (endpoints) => {
    const runId = batchRunIdRef.current + 1;
    batchRunIdRef.current = runId;
    const isCurrent = () => batchRunIdRef.current === runId;

    setPlanError(null);
    setBanner(null);
    setResults(null);
    setSummary(null);
    setTestSuite(null);
    setCustomRequestStarted(false);
    setOpenApiImportOpen(false);
    setBatch({ entries: [], running: true });
    setCurrentTab('lab');

    try {
      const entries = await runBatch({
        endpoints,
        shouldContinue: isCurrent,
        prepare: (endpoint) => buildConfigFromEndpoint(configRef.current, endpoint),
        generate: (preparedConfig) => generateTestPlanApi({
          ...buildGenerationConfig(preparedConfig),
          useOfflineDemo: fallbackToOffline()
        }, aiSettings),
        execute: async (preparedConfig, plan) => {
          const runnerRes = await runTestsApi({
            targetBaseUrl: resolvedBaseUrl(preparedConfig),
            tests: plan.tests || [],
            timeoutMs,
            environment: currentEnvironment(preparedConfig),
            auth: currentAuth(preparedConfig),
            values: environmentValues(preparedConfig)
          });
          return {
            ...runnerRes,
            results: redactSecrets(runnerRes.results || [], environmentSecrets(preparedConfig))
          };
        },
        onProgress: (nextEntries) => {
          if (isCurrent()) setBatch({ entries: nextEntries, running: true });
        }
      });
      if (isCurrent()) setBatch({ entries, running: false });
    } catch (error) {
      if (isCurrent()) {
        setBatch({ entries: [], running: false });
        setBanner({ message: `Batch run failed: ${error.message}.` });
      }
    }
  };

  const handleOpenBatchEntry = (entry) => {
    if (!entry?.config) return;
    batchRunIdRef.current += 1;
    setConfig(entry.config);
    setTestSuite(entry.testSuite || null);
    setResults(entry.results || []);
    setSummary(entry.summary || null);
    setBatch(null);
    setCustomRequestStarted(true);
    setCurrentTab('lab');
  };

  // Postman requests are imported verbatim: {{variables}} stay as placeholders
  // and the shared resolver replaces them with the selected environment's values.
  const handleChoosePostmanRequest = (request) => {
    const body = request.request?.body;
    const rules = [
      request.apiTitle ? `Collection: ${request.apiTitle}` : '',
      request.summary ? `Request: ${request.summary}` : '',
      'Postman import: scripts were not executed. Confirm the target URL, headers, body and expected status before generating tests.'
    ].filter(Boolean).join('\n');

    setConfig({
      ...configRef.current,
      method: request.method || 'GET',
      path: request.path || '',
      expectedStatus: '',
      expectedStatusCodes: [],
      expectedStatusReviewRequired: true,
      importMetadata: {
        source: 'postman',
        apiTitle: request.apiTitle,
        operationId: request.operationId,
        requiresReview: true
      },
      headers: request.request?.headers || {},
      body: body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body, null, 2)),
      sampleResponse: '',
      businessRules: rules
    });
    setTestSuite(null);
    setResults(null);
    setSummary(null);
    setPlanError(null);
    setPostmanImportOpen(false);
    setCustomRequestStarted(true);
    setCurrentTab('lab');
  };

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

  const handleRunSelected = async () => {
    if (!testSuite) return;
    setRunningTests(true);
    setBanner(null);

    try {
      const config = configRef.current;
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
      recordRunToHistory(testSuite, runnerRes.summary, safeResults, config.path, environmentSecrets(config));
    } catch (err) {
      setBanner({ message: `Execution failed: ${err.message}. The backend runner did not respond — confirm the API server is up and retry.` });
    } finally {
      setRunningTests(false);
    }
  };

  const handleRunSingle = async (test) => {
    setRunningTests(true);
    try {
      const config = configRef.current;
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

  const handleInspectFailure = (test, result) => {
    setInspectingFailure({ test, result });
    setFailureExplanation(null);
  };

  const handleExplainFailure = async (test, result) => {
    setExplainingFailure(true);
    try {
      const config = configRef.current;
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
    batchRunIdRef.current += 1;
    setBatch(null);
    setTestSuite(null);
    setResults(null);
    setSummary(null);
    setCustomRequestStarted(false);
    setOpenApiImportOpen(false);
    setPostmanImportOpen(false);
    setPlanError(null);
    setBanner(null);
    setInspectingFailure(null);
    setFailureExplanation(null);
    setExportModalOpen(false);
  };

  return {
    testSuite, setTestSuite,
    customRequestStarted, setCustomRequestStarted,
    openApiImportOpen, setOpenApiImportOpen, postmanImportOpen, setPostmanImportOpen,
    batch,
    results, setResults,
    summary, setSummary,
    loadingPlan, runningTests,
    planError, setPlanError,
    banner, setBanner,
    inspectingFailure, setInspectingFailure,
    failureExplanation, explainingFailure,
    exportModalOpen, setExportModalOpen,
    handleGeneratePlan, handleLoadDemo,
    handleOpenApiImport, handleOpenPostmanImport,
    handleChooseOpenApiEndpoint, handleChooseOpenApiEndpoints,
    handleOpenBatchEntry, handleChoosePostmanRequest,
    handleToggleSelect, handleSelectAll, handleDeselectAll, handleUpdateTest,
    handleRunSelected, handleRunSingle,
    handleInspectFailure, handleExplainFailure,
    handleLoadRecentRun, handleBackToStart
  };
}
