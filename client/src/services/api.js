/**
 * APIForge Frontend Client Service
 * Dispatches requests to the Express backend API
 */

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed with HTTP ${res.status}`);
  return res.json();
}

export async function fetchDemoMode() {
  const res = await fetch('/api/demo/mode');
  if (!res.ok) throw new Error(`Failed to fetch demo mode: ${res.status}`);
  return res.json();
}

export async function setDemoMode(mode) {
  const res = await fetch('/api/demo/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error(`Failed to update demo mode: ${res.status}`);
  return res.json();
}

export async function generateTestPlanApi(config) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate test plan');
  }
  return data.data;
}

export async function runTestsApi({ targetBaseUrl, tests, timeoutMs }) {
  const res = await fetch('/api/run-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetBaseUrl, tests, timeoutMs })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Test runner failed');
  }
  return data;
}

export async function explainFailureApi({ test, actual, failedAssertion, businessRules }) {
  const res = await fetch('/api/explain-failure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test, actual, failedAssertion, businessRules })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to explain failure');
  }
  return data.data;
}
