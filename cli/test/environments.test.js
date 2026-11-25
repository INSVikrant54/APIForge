import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeRun, parseRunOptions } from '../commands/run.js';
import { buildConfig } from '../commands/init.js';
import { mergeEnvironments, parseSecretFlags, readConfig } from '../lib/config.js';
import { normalizeSuite } from '../lib/suite.js';

const SECRET = 'super-secret-token-value';

function makeSuite(variables) {
  return normalizeSuite({
    schemaVersion: 1,
    name: 'Env Suite',
    environment: 'staging',
    environments: {
      development: 'https://dev.example.com',
      staging: {
        targetBaseUrl: 'https://{{host}}',
        variables
      }
    },
    tests: [{
      id: 'secret-1',
      name: 'Authenticated request',
      request: {
        method: 'GET',
        path: '{{basePath}}/ping',
        headers: { Authorization: 'Bearer {{API_KEY}}' },
        body: { nested: '{{API_KEY}}' }
      },
      expected: { statusCodes: [200] }
    }]
  });
}

function executeWithSecret(calls) {
  return async (options) => {
    calls.push(options);
    return {
      success: false,
      isExecutionError: true,
      error: `Rejected ${options.headers.Authorization}`,
      status: 0,
      durationMs: 4,
      curl: `curl -H "${options.headers.Authorization}" "${options.targetUrl}"`
    };
  };
}

describe('CLI named environments and secret redaction', () => {
  it('keeps secret placeholders out of config files and supports multiple environments', () => {
    const config = buildConfig({
      targetBaseUrl: 'https://dev.example.com',
      environments: ['development', 'staging', 'production'],
      secrets: ['API_KEY']
    });
    assert.deepEqual(Object.keys(config.environments), ['development', 'staging', 'production']);
    assert.deepEqual(config.environments.staging.variables.API_KEY, { value: 'REPLACE_ME', secret: true });
    assert.equal(JSON.stringify(config).includes(SECRET), false);
    assert.throws(() => buildConfig({ variables: { API_KEY: SECRET }, secrets: ['API_KEY'] }), /secret/i);
  });

  it('merges local config environments and parses runtime secret flags', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apiforge-config-'));
    try {
      const file = join(dir, 'apiforge.config.json');
      const config = buildConfig({ environments: ['staging'], secrets: ['API_KEY'] });
      config.environments.staging.targetBaseUrl = 'https://staging.example.com';
      writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
      const loaded = readConfig(file);
      const merged = mergeEnvironments({
        staging: { targetBaseUrl: 'https://placeholder.example.com', variables: { API_KEY: { value: 'REPLACE_ME', secret: true } } }
      }, loaded.environments);
      assert.equal(merged.staging.targetBaseUrl, 'https://staging.example.com');
      assert.equal(merged.staging.variables.API_KEY.secret, true);
      assert.deepEqual(parseSecretFlags([`API_KEY=${SECRET}`]), { API_KEY: SECRET });
      assert.deepEqual(parseSecretFlags(['MISSING_KEY'], { MISSING_KEY: 'env-value' }), { MISSING_KEY: 'env-value' });
      assert.deepEqual(parseSecretFlags(['MISSING_KEY'], {}), {});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses repeatable --secret flags', () => {
    const options = parseRunOptions(['suite.json', '--secret', 'A=1', '--secret', 'B=2', '--env', 'production']);
    assert.deepEqual(options.secretFlags, ['A=1', 'B=2']);
    assert.equal(options.env, 'production');
  });

  it('substitutes secrets at execution but redacts every output format', async () => {
    const suite = makeSuite({ host: 'api.test', basePath: '/v1', API_KEY: { value: 'REPLACE_ME', secret: true } });
    for (const format of ['text', 'json', 'junit', 'sarif']) {
      const calls = [];
      const out = await executeRun({
        suite,
        options: { format, env: 'staging', secretOverrides: { API_KEY: SECRET } },
        execute: executeWithSecret(calls)
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].headers.Authorization, `Bearer ${SECRET}`);
      assert.equal(calls[0].targetUrl, 'https://api.test/v1/ping');
      assert.equal(out.exitCode, 2);
      assert.equal(out.output.includes(SECRET), false, `${format} output leaked the secret`);
      assert.equal(JSON.stringify(out.result).includes(SECRET), false, `${format} result leaked the secret`);
      assert.equal(out.output.includes(`Bearer ${SECRET}`), false);
      assert.match(out.output, /\[REDACTED\]/);
    }
  });

  it('redacts secret values committed in suite files as well', async () => {
    const suite = makeSuite({ host: 'api.test', basePath: '/v1', API_KEY: { value: SECRET, secret: true } });
    const calls = [];
    const out = await executeRun({
      suite,
      options: { format: 'json' },
      execute: executeWithSecret(calls)
    });
    assert.equal(calls[0].headers.Authorization, `Bearer ${SECRET}`);
    assert.equal(out.output.includes(SECRET), false);
    const parsed = JSON.parse(out.output);
    assert.equal(parsed.environment, 'staging');
  });
});
