import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runTestSuite } from '../services/testRunner.js';

const baseTest = {
  id: 'shared-1',
  name: 'Shared runner test',
  category: 'happy_path',
  severity: 'medium',
  request: { method: 'GET', path: '/pets' },
  expected: { statusCodes: [200] }
};

describe('runTestSuite service', () => {
  it('rejects an empty test array', async () => {
    await assert.rejects(() => runTestSuite({ tests: [] }), /No tests provided/);
  });

  it('uses injected executor and returns deterministic summary', async () => {
    let seen;
    const report = await runTestSuite({
      tests: [baseTest],
      targetBaseUrl: 'https://api.example.com/v1/',
      timeoutMs: 999999,
      execute: async (options) => {
        seen = options;
        return {
          success: true,
          status: 200,
          statusText: 'OK',
          headers: {},
          body: { ok: true },
          durationMs: 4,
          curl: 'curl https://api.example.com/v1/pets'
        };
      }
    });

    assert.equal(seen.targetUrl, 'https://api.example.com/v1/pets');
    assert.equal(seen.timeoutMs, 30000);
    assert.equal(report.summary.passed, 1);
    assert.equal(report.results[0].status, 'PASS');
  });

  it('skips unconfirmed review tests without executing them', async () => {
    let called = false;
    const report = await runTestSuite({
      tests: [{ ...baseTest, requiresReview: true, confirmed: false }],
      execute: async () => {
        called = true;
        return { success: true, status: 200, headers: {}, body: {}, durationMs: 1 };
      }
    });

    assert.equal(called, false);
    assert.equal(report.summary.needsReview, 1);
    assert.equal(report.results[0].status, 'NEEDS REVIEW');
  });
});
