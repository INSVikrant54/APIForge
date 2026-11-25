import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

const SECRET = 'server-side-secret-value';

describe('environment-aware /api/run-tests', () => {
  let server;
  let baseUrl;
  let previousPort;

  before(async () => {
    previousPort = process.env.PORT;
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    process.env.PORT = String(server.address().port);
  });

  after(async () => {
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
    if (server) await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  async function post(payload) {
    const response = await fetch(`${baseUrl}/api/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { status: response.status, data: await response.json() };
  }

  it('substitutes environment variables before execution and redacts secrets in the report', async () => {
    const { status, data } = await post({
      environment: {
        name: 'staging',
        targetBaseUrl: '',
        variables: {
          productId: 42,
          API_KEY: { value: SECRET, secret: true }
        }
      },
      tests: [{
        id: 'env-1',
        name: 'Uses environment values',
        request: {
          method: 'POST',
          path: '/api/demo/orders',
          body: { productId: '{{productId}}', quantity: 1, unitPrice: 10, apiKey: '{{API_KEY}}' }
        },
        expected: { statusCodes: [201] }
      }]
    });

    assert.equal(status, 200);
    assert.equal(data.summary.errors, 0);
    assert.equal(data.results[0].request.body.productId, '42');
    assert.equal(data.results[0].request.body.apiKey, '[REDACTED]');
    assert.equal(JSON.stringify(data).includes(SECRET), false);
  });

  it('keeps SSRF validation intact for substituted target URLs', async () => {
    const { status, data } = await post({
      environment: {
        name: 'staging',
        targetBaseUrl: 'http://{{host}}',
        variables: {
          host: '169.254.169.254',
          API_KEY: { value: SECRET, secret: true }
        }
      },
      tests: [{
        id: 'env-ssrf',
        name: 'Blocked metadata target',
        request: {
          method: 'GET',
          path: '/latest/meta-data',
          headers: { Authorization: `Bearer {{API_KEY}}` }
        },
        expected: { statusCodes: [200] }
      }]
    });

    assert.equal(status, 200);
    assert.equal(data.results[0].status, 'ERROR');
    assert.match(data.results[0].error, /SSRF Guard blocked/i);
    assert.equal(JSON.stringify(data).includes(SECRET), false);
  });

  it('applies auth at run time and redacts credentials even when unflagged', async () => {
    const { status, data } = await post({
      environment: {
        name: 'staging',
        variables: { KEY: SECRET }
      },
      auth: { type: 'apiKeyHeader', keyVariable: 'KEY', headerName: 'X-API-Key' },
      tests: [{
        id: 'auth-run',
        name: 'Authenticated request',
        request: {
          method: 'POST',
          path: '/api/demo/orders',
          headers: { Accept: 'application/json' },
          body: { productId: 1, quantity: 1, unitPrice: 10 }
        },
        expected: { statusCodes: [201] }
      }]
    });

    assert.equal(status, 200);
    assert.equal(data.summary.errors, 0);
    assert.equal(data.results[0].request.headers['X-API-Key'], '[REDACTED]');
    assert.equal(JSON.stringify(data).includes(SECRET), false);
  });

  it('still accepts the legacy plain variables payload', async () => {
    const { status, data } = await post({
      variables: { productId: 7 },
      tests: [{
        id: 'legacy-1',
        name: 'Legacy variables',
        request: {
          method: 'POST',
          path: '/api/demo/orders',
          body: { productId: '{{productId}}', quantity: 1, unitPrice: 10 }
        },
        expected: { statusCodes: [201] }
      }]
    });
    assert.equal(status, 200);
    assert.equal(data.results[0].request.body.productId, '7');
  });
});
