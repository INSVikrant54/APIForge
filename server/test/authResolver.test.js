import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAuthToTests,
  authVariableNames,
  normalizeAuth,
  resolveAuth
} from '../utils/authResolver.js';

function oneTest() {
  return [{
    id: 'auth-1',
    name: 'Authenticated request',
    request: {
      method: 'GET',
      path: '/api/demo/orders?limit=2#results',
      headers: { Accept: 'application/json' }
    },
    expected: { statusCodes: [200] }
  }];
}

describe('authResolver', () => {
  it('normalizes untrusted auth config with safe defaults', () => {
    assert.deepEqual(normalizeAuth(null), {
      type: 'none',
      tokenVariable: '',
      keyVariable: '',
      headerName: 'X-API-Key',
      queryParam: 'api_key',
      usernameVariable: '',
      passwordVariable: ''
    });
    assert.equal(normalizeAuth({ type: 'bogus' }).type, 'none');
    assert.equal(normalizeAuth({ type: 'bearer', tokenVariable: 42 }).tokenVariable, '42');
  });

  it('lists only the credential variables used by the selected helper', () => {
    assert.deepEqual(authVariableNames({ type: 'bearer', tokenVariable: 'T' }), ['T']);
    assert.deepEqual(authVariableNames({ type: 'apiKeyHeader', keyVariable: 'K' }), ['K']);
    assert.deepEqual(authVariableNames({ type: 'basic', usernameVariable: 'U', passwordVariable: 'P' }), ['U', 'P']);
    assert.deepEqual(authVariableNames({ type: 'basic', usernameVariable: 'U', passwordVariable: 'U' }), ['U']);
    assert.deepEqual(authVariableNames({ type: 'none', tokenVariable: 'ignored' }), []);
  });

  it('injects a bearer token at call time without mutating source tests', () => {
    const tests = oneTest();
    const result = applyAuthToTests(tests, { type: 'bearer', tokenVariable: 'TOKEN' }, { TOKEN: 'tok-123' });
    assert.equal(result[0].request.headers.Authorization, 'Bearer tok-123');
    assert.equal(result[0].request.headers.Accept, 'application/json');
    assert.equal(tests[0].request.headers.Authorization, undefined);
  });

  it('injects an API key header and rejects unsafe header names', () => {
    const config = { type: 'apiKeyHeader', keyVariable: 'KEY', headerName: 'x-api-key' };
    assert.equal(applyAuthToTests(oneTest(), config, { KEY: 'abc' })[0].request.headers['x-api-key'], 'abc');
    const unsafe = applyAuthToTests(oneTest(), { ...config, headerName: 'X-Key\r\nInjected: 1' }, { KEY: 'abc' });
    assert.equal(unsafe[0].request.headers['X-Key\r\nInjected: 1'], undefined);
  });

  it('sets a query API key idempotently and preserves the fragment', () => {
    const config = { type: 'apiKeyQuery', keyVariable: 'KEY', queryParam: 'api_key' };
    const first = applyAuthToTests(oneTest(), config, { KEY: 'a b' })[0].request.path;
    assert.equal(first, '/api/demo/orders?limit=2&api_key=a%20b#results');
    const second = applyAuthToTests([{ request: { path: first } }], config, { KEY: 'a b' })[0].request.path;
    assert.equal(second, first);
    const replaced = applyAuthToTests([{ request: { path: first } }], config, { KEY: 'new' })[0].request.path;
    assert.equal(replaced, '/api/demo/orders?limit=2&api_key=new#results');
  });

  it('encodes UTF-8 basic credentials and skips missing values', () => {
    const config = { type: 'basic', usernameVariable: 'USER', passwordVariable: 'PASS' };
    const { headers } = resolveAuth(config, { USER: 'ünïcode', PASS: 'pä ss' });
    assert.equal(headers.Authorization, `Basic ${Buffer.from('ünïcode:pä ss', 'utf8').toString('base64')}`);
    assert.deepEqual(resolveAuth({ type: 'bearer', tokenVariable: 'MISSING' }, {}), { headers: {}, query: {} });
  });
});
