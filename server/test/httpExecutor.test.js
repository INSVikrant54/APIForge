import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeHttpRequest } from '../services/httpExecutor.js';

describe('executeHttpRequest redirect handling', () => {
  it('does not follow redirects and returns the 3xx response for inspection', async () => {
    const originalFetch = globalThis.fetch;
    let receivedOptions;

    globalThis.fetch = async (_url, options) => {
      receivedOptions = options;
      return {
        status: 302,
        statusText: 'Found',
        headers: new Headers({
          'content-type': 'text/plain',
          location: 'http://127.0.0.1:5000/private'
        }),
        arrayBuffer: async () => new TextEncoder().encode('redirect response').buffer
      };
    };

    try {
      const result = await executeHttpRequest({
        method: 'GET',
        targetUrl: '/api/demo/orders'
      });

      assert.equal(receivedOptions.redirect, 'manual');
      assert.equal(result.success, true);
      assert.equal(result.status, 302);
      assert.equal(result.body, 'redirect response');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
