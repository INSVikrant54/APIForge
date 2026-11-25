import RecentRunsView from './RecentRunsView.jsx';
import DocsView from './DocsView.jsx';
import SettingsView from './SettingsView.jsx';
import { currentAuth, currentEnvironment } from '../utils/environments.js';

/** History, docs and settings tabs. */
export default function SecondaryViews({
  currentTab, recentRuns, handleLoadRecentRun, handleClearRuns,
  health, aiSettings, setApiKeyModalOpen, timeoutMs, setTimeoutMs,
  config, handleChangeAuth
}) {
  return (
    <>
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
    </>
  );
}
