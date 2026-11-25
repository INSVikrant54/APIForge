import { useEffect, useState } from 'react';
import { redactSecrets } from '../../../server/utils/environmentResolver.js';

const STORAGE_KEY_RECENT_RUNS = 'apiforge_recent_runs_v1';

/** Last 20 runs, redacted with the selected environment's secrets before storage. */
export function useRunHistory() {
  const [recentRuns, setRecentRuns] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_RUNS);
      if (saved) setRecentRuns(JSON.parse(saved));
    } catch {
      // Ignore local storage parse error
    }
  }, []);

  const recordRunToHistory = (suite, runSummary, runResults, path, secrets) => {
    const safe = redactSecrets({
      suiteName: suite.suiteName,
      path,
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

  const handleClearRuns = () => {
    setRecentRuns([]);
    localStorage.removeItem(STORAGE_KEY_RECENT_RUNS);
  };

  return { recentRuns, recordRunToHistory, handleClearRuns };
}
