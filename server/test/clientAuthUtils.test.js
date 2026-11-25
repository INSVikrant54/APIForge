import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultEnvironments,
  currentAuth,
  environmentSecrets
} from '../../client/src/utils/environments.js';
import { runTestsApi } from '../../client/src/services/api.js';

function configWithAuth(auth) {
  const environments = createDefaultEnvironments();
  environments.staging.auth = auth;
  return { environment: 'staging', environments };
}

describe('client auth helpers', () => {
  it('reads auth per environment and treats credential variables as secrets', () => {
    const config = configWithAuth({ type: 'bearer', tokenVariable: 'apiKey' });
    config.environments.staging.variables.apiKey = { value: 'session-only-token', secret: false };
    assert.deepEqual(currentAuth(config), {
      type: 'bearer',
      tokenVariable: 'apiKey',
      keyVariable: '',
      headerName: 'X-API-Key',
      queryParam: 'api_key',
      usernameVariable: '',
      passwordVariable: ''
    });
    assert.deepEqual(environmentSecrets(config), ['session-only-token']);
  });

  it('attaches auth to tests at call time in runTestsApi', async () => {
    const originalFetch = globalThis.fetch;
    let captured;
    globalThis.fetch = async (url, options) => {
      captured = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ results: [], summary: {} }) };
    };
    try {
      await runTestsApi({
        targetBaseUrl: 'http://127.0.0.1:5000',
        tests: [{ id: 't1', request: { method: 'GET', path: '/api/demo/orders', headers: {} } }],
        timeoutMs: 6000,
        auth: { type: 'bearer', tokenVariable: 'TOKEN' },
        values: { TOKEN: 'tok-123' }
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(captured.url, '/api/run-tests');
    assert.equal(captured.body.tests[0].request.headers.Authorization, 'Bearer tok-123');
    assert.deepEqual(captured.body.auth, { type: 'bearer', tokenVariable: 'TOKEN' });
  });
});
