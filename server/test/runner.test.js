import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

describe('POST /api/run-tests integration tests', () => {
  let server;
  let baseUrl;
  let previousPort;

  before(async () => {
    previousPort = process.env.PORT;
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const address = server.address();
    process.env.PORT = String(address.port);
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  beforeEach(async () => {
    await fetch(`${baseUrl}/api/demo/reset`, { method: 'POST' });
  });

  async function runTestsRequest(payload) {
    const response = await fetch(`${baseUrl}/api/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  it('returns 400 when tests array is missing, empty, or not an array', async () => {
    const missingRes = await runTestsRequest({});
    assert.equal(missingRes.status, 400);
    assert.equal(missingRes.data.error, 'No tests provided to execute');

    const emptyRes = await runTestsRequest({ tests: [] });
    assert.equal(emptyRes.status, 400);
    assert.equal(emptyRes.data.error, 'No tests provided to execute');

    const invalidTypeRes = await runTestsRequest({ tests: 'not-an-array' });
    assert.equal(invalidTypeRes.status, 400);
    assert.equal(invalidTypeRes.data.error, 'No tests provided to execute');
  });

  it('increments summary.skipped and returns SKIPPED when selected is false', async () => {
    const { status, data } = await runTestsRequest({
      tests: [
        {
          id: 'test-skip-1',
          name: 'Deselected test case',
          category: 'validation',
          severity: 'low',
          selected: false,
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 1, quantity: 2, unitPrice: 10 }
          },
          expected: { statusCodes: [201] }
        }
      ]
    });

    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.deepEqual(
      {
        total: data.summary.total,
        passed: data.summary.passed,
        failed: data.summary.failed,
        errors: data.summary.errors,
        skipped: data.summary.skipped,
        needsReview: data.summary.needsReview
      },
      {
        total: 1,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 1,
        needsReview: 0
      }
    );
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].id, 'test-skip-1');
    assert.equal(data.results[0].status, 'SKIPPED');
    assert.equal(data.results[0].durationMs, 0);
    assert.equal(data.results[0].message, 'Test was deselected by developer');
  });

  it('increments summary.needsReview and returns NEEDS REVIEW when requiresReview is true and confirmed is false', async () => {
    const { status, data } = await runTestsRequest({
      tests: [
        {
          id: 'test-review-1',
          name: 'Unconfirmed sensitive test',
          category: 'security',
          severity: 'high',
          selected: true,
          requiresReview: true,
          confirmed: false,
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 1, quantity: 2, unitPrice: 10 }
          },
          expected: { statusCodes: [201] }
        }
      ]
    });

    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.deepEqual(
      {
        total: data.summary.total,
        passed: data.summary.passed,
        failed: data.summary.failed,
        errors: data.summary.errors,
        skipped: data.summary.skipped,
        needsReview: data.summary.needsReview
      },
      {
        total: 1,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
        needsReview: 1
      }
    );
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].id, 'test-review-1');
    assert.equal(data.results[0].status, 'NEEDS REVIEW');
    assert.equal(data.results[0].durationMs, 0);
    assert.equal(
      data.results[0].message,
      'Expected behavior must be confirmed by developer before execution'
    );
  });

  it('executes confirmed tests when requiresReview is true and confirmed is true', async () => {
    const { status, data } = await runTestsRequest({
      tests: [
        {
          id: 'test-confirmed-1',
          name: 'Confirmed test executes normally',
          category: 'happy-path',
          severity: 'medium',
          selected: true,
          requiresReview: true,
          confirmed: true,
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 1, quantity: 3, unitPrice: 15 }
          },
          expected: { statusCodes: [201] }
        }
      ]
    });

    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.summary.passed, 1);
    assert.equal(data.summary.needsReview, 0);
    assert.equal(data.results[0].status, 'PASS');
  });

  it('clamps low and high timeoutMs values and executes against /api/demo/orders with valid summary counts', async () => {
    const testSuite = [
      {
        id: 'test-pass-order',
        name: 'Valid order returns 201',
        category: 'happy-path',
        severity: 'high',
        request: {
          method: 'POST',
          path: '/api/demo/orders',
          body: { productId: 10, quantity: 2, unitPrice: 25 }
        },
        expected: {
          statusCodes: [201],
          assertions: [
            { target: 'body.order.totalPrice', operator: 'equals', value: 50 }
          ]
        }
      },
      {
        id: 'test-fail-order',
        name: 'Missing productId fails 201 expectation',
        category: 'validation',
        severity: 'medium',
        request: {
          method: 'POST',
          path: '/api/demo/orders',
          body: { quantity: 2, unitPrice: 25 }
        },
        expected: {
          statusCodes: [201]
        }
      }
    ];

    for (const timeoutMs of [50, 9999999]) {
      const { status, data } = await runTestsRequest({
        timeoutMs,
        tests: testSuite
      });

      assert.equal(status, 200);
      assert.equal(data.success, true);
      assert.equal(data.summary.total, 2);
      assert.equal(data.summary.passed, 1);
      assert.equal(data.summary.failed, 1);
      assert.equal(data.summary.errors, 0);
      assert.equal(data.summary.skipped, 0);
      assert.equal(data.summary.needsReview, 0);
      assert.equal(typeof data.summary.durationMs, 'number');
      assert.ok(data.summary.durationMs >= 0);

      assert.equal(data.results[0].status, 'PASS');
      assert.equal(data.results[0].actual.status, 201);
      assert.equal(data.results[1].status, 'FAIL');
      assert.equal(data.results[1].actual.status, 400);
    }
  });

  it('increments summary.errors and returns ERROR for SSRF-blocked target URLs', async () => {
    const { status, data } = await runTestsRequest({
      tests: [
        {
          id: 'test-ssrf-metadata',
          name: 'Block cloud metadata IP',
          category: 'security',
          severity: 'critical',
          request: {
            method: 'GET',
            path: 'http://169.254.169.254/latest/meta-data'
          },
          expected: { statusCodes: [200] }
        }
      ]
    });

    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.deepEqual(
      {
        total: data.summary.total,
        passed: data.summary.passed,
        failed: data.summary.failed,
        errors: data.summary.errors,
        skipped: data.summary.skipped,
        needsReview: data.summary.needsReview
      },
      {
        total: 1,
        passed: 0,
        failed: 0,
        errors: 1,
        skipped: 0,
        needsReview: 0
      }
    );
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].id, 'test-ssrf-metadata');
    assert.equal(data.results[0].status, 'ERROR');
    assert.equal(data.results[0].actual.status, 0);
    assert.match(data.results[0].error, /SSRF Guard blocked/i);
  });

  it('aggregates summary counts accurately across mixed test outcomes in a single run', async () => {
    const { status, data } = await runTestsRequest({
      timeoutMs: 5000,
      tests: [
        {
          id: 'mix-skip',
          name: 'Skipped test',
          selected: false,
          request: { method: 'POST', path: '/api/demo/orders', body: {} },
          expected: { statusCodes: [201] }
        },
        {
          id: 'mix-review',
          name: 'Needs review test',
          requiresReview: true,
          confirmed: false,
          request: { method: 'POST', path: '/api/demo/orders', body: {} },
          expected: { statusCodes: [201] }
        },
        {
          id: 'mix-pass',
          name: 'Passing test',
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 5, quantity: 4, unitPrice: 12.5 }
          },
          expected: { statusCodes: [201] }
        },
        {
          id: 'mix-fail',
          name: 'Failing test',
          request: {
            method: 'POST',
            path: '/api/demo/orders',
            body: { productId: 5, quantity: 1, unitPrice: -1 }
          },
          expected: { statusCodes: [201] }
        },
        {
          id: 'mix-error',
          name: 'SSRF blocked test',
          request: {
            method: 'GET',
            path: 'http://169.254.169.254/latest/meta-data'
          },
          expected: { statusCodes: [200] }
        }
      ]
    });

    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.summary.total, 5);
    assert.equal(data.summary.skipped, 1);
    assert.equal(data.summary.needsReview, 1);
    assert.equal(data.summary.passed, 1);
    assert.equal(data.summary.failed, 1);
    assert.equal(data.summary.errors, 1);
    assert.equal(typeof data.summary.durationMs, 'number');
    assert.ok(data.summary.durationMs >= 0);

    assert.deepEqual(
      data.results.map((r) => r.status),
      ['SKIPPED', 'NEEDS REVIEW', 'PASS', 'FAIL', 'ERROR']
    );
  });
});
