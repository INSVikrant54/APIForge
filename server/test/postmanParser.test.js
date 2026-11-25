import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePostmanCollection, MAX_POSTMAN_ITEMS } from '../utils/postmanParser.js';

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

function collection(items, extraInfo = {}) {
  return JSON.stringify({ info: { name: 'Demo API', schema: SCHEMA, ...extraInfo }, item: items });
}

describe('Postman v2.1 parser', () => {
  it('extracts bounded request metadata without running scripts', () => {
    const parsed = parsePostmanCollection(collection([
      {
        name: 'List orders',
        event: [{ listen: 'test', script: { exec: ['pm.environment.set("leak", "yes")'] } }],
        request: {
          method: 'get',
          header: [
            { key: 'X-API-Key', value: '{{apiKey}}' },
            { key: 'X-Disabled', value: 'nope', disabled: true }
          ],
          url: '{{baseUrl}}/orders?limit=10'
        }
      },
      {
        name: 'Create order',
        request: {
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          url: {
            protocol: 'https',
            host: ['api', 'example', 'com'],
            path: ['v1', 'orders'],
            query: [{ key: 'dryRun', value: 'true' }]
          },
          body: { mode: 'raw', raw: '{"sku":"ABC"}' }
        }
      }
    ]));

    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed[0], {
      method: 'GET',
      path: '{{baseUrl}}/orders?limit=10',
      summary: 'List orders',
      description: '',
      parameters: [],
      requestBody: { required: false, contentType: 'application/json', schema: null, example: null },
      expectedStatusCodes: [],
      request: { method: 'GET', path: '{{baseUrl}}/orders?limit=10', headers: { 'X-API-Key': '{{apiKey}}' }, body: null },
      operationId: 'postman-1',
      tags: [],
      requiresReview: true,
      serverUrl: '',
      serverUrlNeedsReview: true,
      apiTitle: 'Demo API',
      source: 'postman'
    });
    assert.equal(parsed[1].path, 'https://api.example.com/v1/orders?dryRun=true');
    assert.deepEqual(parsed[1].request.body, { sku: 'ABC' });
    assert.equal(JSON.stringify(parsed).includes('leak'), false);
  });

  it('flattens folders and enforces the request bound', () => {
    const folder = { name: 'Nested', item: Array.from({ length: 5 }, (_, i) => ({ name: `R${i}`, request: { method: 'GET', url: `/r/${i}` } })) };
    assert.equal(parsePostmanCollection(collection([folder])).length, 5);

    const tooMany = Array.from({ length: MAX_POSTMAN_ITEMS + 1 }, (_, i) => ({ name: `R${i}`, request: { method: 'GET', url: `/r/${i}` } }));
    assert.throws(() => parsePostmanCollection(collection(tooMany)), /limited to 50 requests/);
  });

  it('gives a clear error for v1.0 and other unsupported versions', () => {
    const v1 = JSON.stringify({
      info: { name: 'Legacy', schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json' },
      item: []
    });
    assert.throws(() => parsePostmanCollection(v1), /Postman Collection v1\.0 is not supported/);
    assert.throws(
      () => parsePostmanCollection(JSON.stringify({ info: { name: 'X', schema: SCHEMA.replace('v2.1.0', 'v3.0.0') }, item: [] })),
      /Only Postman Collection v2\.1 is supported/
    );
    assert.throws(() => parsePostmanCollection('not json'), /not valid JSON/);
    assert.throws(() => parsePostmanCollection(collection([])), /No requests were found/);
    assert.throws(() => parsePostmanCollection('x'.repeat(1024 * 1024 + 1)), /no larger than 1 MiB/);
  });
});
