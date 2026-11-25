import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ENVIRONMENT_NAMES,
  getSecretValues,
  getVariableValues,
  normalizeEnvironments,
  normalizeVariables,
  redactSecrets,
  redactText,
  resolveEnvironment,
  resolveValues,
  substituteBaseUrl,
  substituteRequest,
  substituteString,
  substituteTests,
  substituteValue,
  toSafeEnvironment
} from '../utils/environmentResolver.js';

describe('shared environment resolver', () => {
  it('normalizes string and { value, secret } variable records', () => {
    const vars = normalizeVariables({
      baseUrl: 'https://api.example.com',
      apiKey: { value: 'top-secret', secret: true },
      count: 3,
      ignored: null
    });
    assert.deepEqual(vars, {
      baseUrl: { value: 'https://api.example.com', secret: false },
      apiKey: { value: 'top-secret', secret: true },
      count: { value: 3, secret: false }
    });
    assert.deepEqual(getVariableValues(vars), {
      baseUrl: 'https://api.example.com',
      apiKey: 'top-secret',
      count: 3
    });
    assert.deepEqual(getSecretValues(vars, ['baseUrl']), ['top-secret', 'https://api.example.com']);
  });

  it('resolves secretVariableNames as variable keys, never as literal values', () => {
    const vars = normalizeVariables({
      token: { value: 'tok-123', secret: true },
      headerName: { value: 'X-API-Key', secret: false },
      empty: { value: '', secret: true },
      nonString: { value: 42, secret: false }
    });

    // Keys resolve to their values; duplicates dedupe and empty values are skipped.
    assert.deepEqual(getSecretValues(vars, ['token', 'headerName', 'token', 'empty']),
      ['tok-123', 'X-API-Key']);

    // Unknown keys are ignored; flagged secrets still apply. The key name
    // itself must never be redacted.
    assert.deepEqual(getSecretValues(vars, ['does-not-exist', '', null, 7]), ['tok-123']);
    assert.equal(redactText('use does-not-exist to log in', getSecretValues(vars, ['does-not-exist'])),
      'use does-not-exist to log in');

    // Non-string variable values are normalized before being added.
    assert.deepEqual(getSecretValues(vars, ['nonString']), ['tok-123', '42']);

    // Resolved names are usable for redaction alongside flagged secrets.
    assert.equal(redactText('token=tok-123 header=X-API-Key', getSecretValues(vars, ['headerName'])),
      'token=[REDACTED] header=[REDACTED]');
  });

  it('normalizes environments from strings and records, and resolves by name', () => {
    const envs = normalizeEnvironments({
      development: 'https://dev.example.com',
      staging: {
        targetBaseUrl: 'https://staging.example.com',
        variables: { baseUrl: 'https://staging.example.com', apiKey: { value: 's3cret', secret: true } }
      },
      production: {}
    });
    assert.deepEqual(DEFAULT_ENVIRONMENT_NAMES, ['development', 'staging', 'production']);
    assert.equal(envs.development.targetBaseUrl, 'https://dev.example.com');
    assert.deepEqual(resolveValues(envs, 'staging'), {
      baseUrl: 'https://staging.example.com',
      apiKey: 's3cret'
    });
    assert.equal(resolveEnvironment(envs, 'production').name, 'production');
    assert.throws(() => resolveEnvironment(envs, 'qa'), /not defined/i);
  });

  it('substitutes strings, objects, arrays and requests without mutation', () => {
    const values = { host: 'api.test', version: 'v2', token: 't-1' };
    const input = {
      path: '/{{host}}/{{version}}/{{missing}}',
      headers: { Authorization: 'Bearer {{token}}' },
      body: { nested: ['{{version}}', 5, { raw: '{{missing}}' }] }
    };
    const request = substituteRequest(input, values);
    assert.equal(request.path, '/api.test/v2/{{missing}}');
    assert.equal(request.headers.Authorization, 'Bearer t-1');
    assert.deepEqual(request.body, { nested: ['v2', 5, { raw: '{{missing}}' }] });
    assert.equal(input.path, '/{{host}}/{{version}}/{{missing}}');
    assert.equal(input.headers.Authorization, 'Bearer {{token}}');

    assert.deepEqual(substituteValue([['{{version}}']], values), [['v2']]);
    assert.equal(substituteBaseUrl('https://{{host}}/v1', values), 'https://api.test/v1');
    assert.deepEqual(
      substituteTests([{ id: 't', request: { path: '/{{version}}', headers: {}, body: null } }], values)[0].request.path,
      '/v2'
    );
  });

  it('bounds recursive substitution and leaves cycles visible', () => {
    const values = { a: '{{b}}', b: '{{a}}', chain: '{{a}}' };
    assert.equal(substituteString('{{chain}}', values, { maxDepth: 2 }), '{{b}}');
    assert.equal(substituteString('{{a}}', values, { maxDepth: 8 }), '{{a}}');
    assert.equal(substituteString('{{a}}', { a: 'done' }, { maxDepth: 0 }), '{{a}}');
    assert.equal(substituteString('{{ a }}', { a: 1 }), '1');
  });

  it('redacts secret values from strings, objects, and safe environment views', () => {
    const secrets = ['s3cret', 'never-print-me'];
    assert.equal(redactText('token=s3cret', secrets), 'token=[REDACTED]');
    const report = {
      curl: 'curl -H "x-api-key: s3cret" https://api.test/orders',
      results: [{ request: { headers: { 'x-api-key': 's3cret' } }, message: 'never-print-me failed' }]
    };
    assert.deepEqual(redactSecrets(report, secrets), {
      curl: 'curl -H "x-api-key: [REDACTED]" https://api.test/orders',
      results: [{ request: { headers: { 'x-api-key': '[REDACTED]' } }, message: '[REDACTED] failed' }]
    });
    assert.equal(report.results[0].request.headers['x-api-key'], 's3cret');

    const safe = toSafeEnvironment(normalizeEnvironments({
      staging: { variables: { apiKey: { value: 's3cret', secret: true }, baseUrl: 'https://api.test' } }
    }).staging);
    assert.deepEqual(safe.variables.apiKey, { value: '[REDACTED]', secret: true });
    assert.equal(safe.variables.baseUrl.value, 'https://api.test');
  });
});
