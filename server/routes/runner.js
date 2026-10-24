import express from 'express';
import { executeHttpRequest } from '../services/httpExecutor.js';
import { evaluateTestAssertions } from '../services/assertionEngine.js';

const router = express.Router();

// POST /api/run-tests - Deterministic test execution engine
router.post('/', async (req, res) => {
  const {
    targetBaseUrl = '',
    tests = [],
    timeoutMs = 6000
  } = req.body || {};

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'No tests provided to execute' });
  }

  const localPort = process.env.PORT || 5000;
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
    // 1. Check if test was explicitly skipped
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

    // 2. Check if test requires review and was not confirmed
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

    // 3. Resolve target URL
    const reqConfig = test.request || {};
    let testUrl = reqConfig.path || '/api/demo/orders';
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      if (testUrl.startsWith('/api/demo/')) {
        // Internal demo endpoint
        testUrl = `http://127.0.0.1:${localPort}${testUrl}`;
      } else if (targetBaseUrl) {
        testUrl = `${targetBaseUrl.replace(/\/$/, '')}/${testUrl.replace(/^\//, '')}`;
      } else {
        testUrl = `http://127.0.0.1:${localPort}${testUrl}`;
      }
    }

    // 4. Execute HTTP request safely
    const actual = await executeHttpRequest({
      method: reqConfig.method || 'POST',
      targetUrl: testUrl,
      headers: reqConfig.headers || {},
      body: reqConfig.body,
      timeoutMs,
      localPort
    });

    // 5. Handle Execution Errors (SSRF block, network failure, timeout)
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

    // 6. Deterministic Assertion Evaluation
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

  res.json({
    success: true,
    summary,
    results
  });
});

export default router;
