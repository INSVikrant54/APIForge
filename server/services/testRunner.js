import { executeHttpRequest } from './httpExecutor.js';
import { evaluateTestAssertions } from './assertionEngine.js';

const DEFAULT_TIMEOUT_MS = 6000;

function resolveTestUrl(testUrl, targetBaseUrl, localPort) {
  const path = testUrl || '/api/demo/orders';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/api/demo/')) return `http://127.0.0.1:${localPort}${path}`;
  if (targetBaseUrl) {
    return `${targetBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
  return `http://127.0.0.1:${localPort}${path}`;
}

/**
 * Deterministically execute a suite of API tests.
 *
 * This is shared by the HTTP route and the CLI so both paths produce identical
 * verdicts. `execute` is injectable for focused tests.
 */
export async function runTestSuite({
  tests = [],
  targetBaseUrl = '',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  localPort = process.env.PORT || 5000,
  execute = executeHttpRequest
} = {}) {
  if (!Array.isArray(tests) || tests.length === 0) {
    throw new TypeError('No tests provided to execute');
  }

  const parsedTimeout = Number(timeoutMs);
  const boundedTimeoutMs = Number.isFinite(parsedTimeout)
    ? Math.min(Math.max(Math.round(parsedTimeout), 1000), 30000)
    : DEFAULT_TIMEOUT_MS;

  const suiteStartTime = performance.now();
  const results = [];
  const summary = {
    total: tests.length,
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
    needsReview: 0,
    durationMs: 0
  };

  for (const test of tests) {
    if (test.selected === false) {
      summary.skipped++;
      results.push({
        id: test.id,
        name: test.name,
        category: test.category,
        severity: test.severity,
        status: 'SKIPPED',
        message: 'Test was deselected by developer',
        durationMs: 0
      });
      continue;
    }

    if (test.requiresReview && !test.confirmed) {
      summary.needsReview++;
      results.push({
        id: test.id,
        name: test.name,
        category: test.category,
        severity: test.severity,
        status: 'NEEDS REVIEW',
        message: 'Expected behavior must be confirmed by developer before execution',
        durationMs: 0
      });
      continue;
    }

    const reqConfig = test.request || {};
    const testUrl = resolveTestUrl(reqConfig.path, targetBaseUrl, localPort);
    const actual = await execute({
      method: reqConfig.method || 'POST',
      targetUrl: testUrl,
      headers: reqConfig.headers || {},
      body: reqConfig.body,
      timeoutMs: boundedTimeoutMs,
      localPort
    });

    if (actual.isExecutionError) {
      summary.errors++;
      results.push({
        id: test.id,
        name: test.name,
        category: test.category,
        severity: test.severity,
        status: 'ERROR',
        error: actual.error,
        durationMs: actual.durationMs,
        curl: actual.curl,
        request: reqConfig,
        actual: {
          status: 0,
          error: actual.error
        }
      });
      continue;
    }

    const evalResult = evaluateTestAssertions(actual, test.expected, reqConfig);
    const testStatus = evalResult.passed ? 'PASS' : 'FAIL';

    if (testStatus === 'PASS') {
      summary.passed++;
    } else {
      summary.failed++;
    }

    results.push({
      id: test.id,
      name: test.name,
      category: test.category,
      severity: test.severity,
      description: test.description,
      rationale: test.rationale,
      status: testStatus,
      durationMs: actual.durationMs,
      curl: actual.curl,
      request: reqConfig,
      actual: {
        status: actual.status,
        statusText: actual.statusText,
        headers: actual.headers,
        body: actual.body
      },
      expected: test.expected,
      assertions: evalResult.assertions,
      failureReason: evalResult.primaryFailure
    });
  }

  summary.durationMs = Math.round(performance.now() - suiteStartTime);

  return {
    success: true,
    summary,
    results
  };
}
