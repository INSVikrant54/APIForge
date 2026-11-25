import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePostmanCollection, MAX_EXPORT_ITEMS } from '../../client/src/utils/exportPostman.js';
import { parsePostmanCollection } from '../utils/postmanParser.js';

const suite = {
  suiteName: 'Orders verification',
  tests: Array.from({ length: MAX_EXPORT_ITEMS + 3 }, (_, i) => ({
    id: `t${i}`,
    name: `Case ${i}`,
    description: 'Generated case',
    request: {
      method: 'POST',
      path: '/api/demo/orders',
      headers: i === 0
        ? { Authorization: 'Bearer real-secret-token', 'X-API-Key': '{{apiKey}}', 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
      body: { sku: `SKU-${i}` }
    },
    expected: { statusCodes: [201] }
  }))
};

describe('Postman exporter', () => {
  it('produces Collection v2.1 JSON bounded to 50 requests with placeholders intact', () => {
    const output = generatePostmanCollection(suite, [], ['real-secret-token']);
    assert.match(output.info.schema, /collection\/v2\.1\.0/);
    assert.equal(output.item.length, MAX_EXPORT_ITEMS);
    assert.equal(output.item[0].request.url.raw, '{{baseUrl}}/api/demo/orders');
    assert.match(output.item[0].request.body.raw, /SKU-0/);

    const headers = output.item[0].request.header;
    assert.equal(headers.some(h => h.key === 'Authorization'), false, 'real credentials must not be exported');
    assert.deepEqual(headers.find(h => h.key === 'X-API-Key'), { key: 'X-API-Key', value: '{{apiKey}}', disabled: false });
    assert.equal(JSON.stringify(output).includes('real-secret-token'), false);
  });

  it('round-trips through the parser', () => {
    const output = generatePostmanCollection({ suiteName: 'Round trip', tests: suite.tests.slice(0, 2) });
    const parsed = parsePostmanCollection(output);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].path, '{{baseUrl}}/api/demo/orders');
    assert.deepEqual(parsed[1].request.body, { sku: 'SKU-1' });
  });

  it('keeps templated authorization but drops literal credentials', () => {
    const output = generatePostmanCollection({
      suiteName: 'Auth',
      tests: [{
        id: 'a1',
        name: 'Templated auth',
        request: { method: 'GET', path: '/me', headers: { Authorization: 'Bearer {{token}}', Cookie: 'session=abc123' } }
      }]
    });
    const headers = output.item[0].request.header;
    assert.deepEqual(headers.find(h => h.key === 'Authorization'), { key: 'Authorization', value: 'Bearer {{token}}', disabled: false });
    assert.equal(headers.some(h => h.key === 'Cookie'), false);
  });
});
