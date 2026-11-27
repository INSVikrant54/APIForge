import { ArrowRight, FileJson, Package, Play } from 'lucide-react';
import BatchResultsView from './BatchResultsView.jsx';
import ConfigPanel from './ConfigPanel.jsx';
import OpenApiImportPanel from './OpenApiImportPanel.jsx';
import PostmanImportPanel from './PostmanImportPanel.jsx';
import TestSuitePanel from './TestSuitePanel.jsx';
import { environmentSecrets } from '../utils/environments.js';
import { redactText } from '../../../server/utils/environmentResolver.js';

/** Lab tab body: batch, import, start and request-workspace states. */
export default function LabView({
  batch, openApiImportOpen, postmanImportOpen, testSuite, customRequestStarted,
  loadingPlan, planError, config, activeModel, results, summary, runningTests,
  setConfig, setCustomRequestStarted, setOpenApiImportOpen, setPostmanImportOpen,
  setExportModalOpen, handleOpenBatchEntry, handleBackToStart,
  handleChooseOpenApiEndpoint, handleChooseOpenApiEndpoints, handleChoosePostmanRequest,
  handleLoadDemo, handleGeneratePlan, handleOpenApiImport, handleOpenPostmanImport,
  handleToggleSelect, handleSelectAll, handleDeselectAll, handleUpdateTest,
  handleRunSelected, handleRunSingle, handleInspectFailure
}) {
  return (
    batch ? (
      <BatchResultsView
        entries={batch.entries}
        running={batch.running}
        onOpenEntry={handleOpenBatchEntry}
        onClose={handleBackToStart}
      />
    ) : openApiImportOpen ? (
      <OpenApiImportPanel
        onChooseEndpoint={handleChooseOpenApiEndpoint}
        onChooseEndpoints={handleChooseOpenApiEndpoints}
      />
    ) : postmanImportOpen ? (
      <PostmanImportPanel onChooseRequest={handleChoosePostmanRequest} />
    ) : (!testSuite && !customRequestStarted) ? (
      <div className="start-workspace">
        <section className="start-copy" aria-labelledby="start-title">
          <h1 id="start-title">Find out how your API really behaves.</h1>
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
              <Play size={16} aria-hidden="true" />
              {loadingPlan ? 'Preparing demo…' : 'Run the demo'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOpenApiImportOpen(false);
                setPostmanImportOpen(false);
                setConfig(prev => ({ ...prev, path: '' }));
                setCustomRequestStarted(true);
              }}
            >
              <ArrowRight size={16} aria-hidden="true" />
              Test my API
            </button>
          </div>
          <p className="start-secondary">
            Have a spec already?
            <button type="button" className="start-link" onClick={handleOpenApiImport}>
              <FileJson size={14} aria-hidden="true" /> Import OpenAPI
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" className="start-link" onClick={handleOpenPostmanImport}>
              <Package size={14} aria-hidden="true" /> Import Postman
            </button>
          </p>
        </section>

        {planError && <div className="start-error" role="alert">{planError}</div>}
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
            activeModel={activeModel}
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
  );
}
