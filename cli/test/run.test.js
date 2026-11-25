import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeRun, parseRunOptions } from '../commands/run.js';

function makeSuite(tests) {
  return {
    schemaVersion: 1,
    name: 'Run Suite',
    environment: 'default',
    environments: {
      default: {
        targetBaseUrl: 'https://api.test',
        variables: { VERSION: 'v2', TOKEN: 't-1' }
      }
    },
    tests
  };
}

function baseTest(overrides = {}) {
  return {
    id: 't-1',
    name: 'Sample',
    category: 'happy_path',
    severity: 'medium',
    request: {
      method: 'GET',
      path: '/v1/ping/{{VERSION}}',
      headers: { Authorization: 'Bearer {{TOKEN}}' },
      body: null
    },
    expected: { statusCodes: [200], description: 'OK' },
    requiresReview: false,
    confirmed: true,
    ...overrides
  };
}

describe('run command with injected execute', () => {
  it('returns exit code 0 with resolved placeholders when all tests pass', async () => {
    const calls = [];
    const execute = async (opts) => {
      calls.push(opts);
      return {
        success: true,
        status: 200,
        statusText: 'OK',
        headers: {},
        body: { ok: true },
        durationMs: 5
      };
    };
    const out = await executeRun({
      suite: makeSuite([baseTest()]),
      options: { format: 'text' },
      execute
    });
    assert.equal(out.exitCode, 0);
    assert.match(out.output, /Passed: 1/);
    assert.match(out.output, /environment: default/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].targetUrl, 'https://api.test/v1/ping/v2');
    assert.equal(calls[0].headers.Authorization, 'Bearer t-1');
  });

  it('returns exit code 1 for FAIL and NEEDS REVIEW with parseable JSON', async () => {
    const failTest = baseTest({
      id: 't-fail',
      name: 'Fails',
      request: { method: 'GET', path: '/fail', headers: {}, body: null }
    });
    const reviewTest = baseTest({
      id: 't-review',
      name: 'Review',
      requiresReview: true,
      confirmed: false
    });
    const execute = async () => ({
      success: true,
      status: 500,
      statusText: 'Server Error',
      headers: {},
      body: null,
      durationMs: 5
    });
    const out = await executeRun({
      suite: makeSuite([failTest, reviewTest]),
      options: { format: 'json' },
      execute
    });
    assert.equal(out.exitCode, 1);
    const parsed = JSON.parse(out.output);
    assert.deepEqual(parsed.results.map((r) => r.status), ['FAIL', 'NEEDS REVIEW']);
    assert.equal(parsed.summary.failed, 1);
    assert.equal(parsed.summary.needsReview, 1);
  });

  it('returns exit code 2 for ERROR and emits a JUnit error entry', async () => {
    const execute = async () => ({
      success: false,
      isExecutionError: true,
      error: 'blocked by guard',
      status: 0,
      durationMs: 1,
      curl: 'curl -X GET "https://api.test/v1/ping/v2"'
    });
    const out = await executeRun({
      suite: makeSuite([baseTest()]),
      options: { format: 'junit' },
      execute
    });
    assert.equal(out.exitCode, 2);
    assert.match(out.output, /<error message="blocked by guard">/);
    assert.match(out.output, /<testsuite /);
  });

  it('emits SARIF 2.1.0 through executeRun for a failed suite', async () => {
    const execute = async () => ({
      success: true,
      status: 500,
      statusText: 'Server Error',
      headers: {},
      body: null,
      durationMs: 5
    });
    const out = await executeRun({
      suite: makeSuite([baseTest()]),
      options: { format: 'sarif' },
      execute
    });
    assert.equal(out.exitCode, 1);
    const sarif = JSON.parse(out.output);
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.runs[0].results[0].ruleId, 'FAIL');
  });

  it('parses run flags and defaults --ci to junit', () => {
    const ci = parseRunOptions(['suite.json', '--ci']);
    assert.equal(ci.format, 'junit');
    assert.equal(ci.ci, true);

    const explicit = parseRunOptions(['--format', 'sarif', '--env', 'prod', '--timeout', '1000']);
    assert.equal(explicit.format, 'sarif');
    assert.equal(explicit.env, 'prod');
    assert.equal(explicit.timeoutMs, 1000);

    assert.throws(() => parseRunOptions(['--format', 'xml']), /Unknown output format/);
    assert.throws(() => parseRunOptions(['--timeout', 'nope']), /Invalid --timeout/);
  });
});
