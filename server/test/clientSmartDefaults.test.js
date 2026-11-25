import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfigFromEndpoint } from '../../client/src/utils/openApiEndpoint.js';
import { MAX_SCHEMA_CONSTRAINTS } from '../utils/schemaConstraints.js';

describe('client smart-default integration', () => {
  it('appends bounded schema constraints to generated business rules', () => {
    const endpoint = {
      method: 'POST',
      path: '/v1/orders',
      summary: 'Create order',
      apiTitle: 'Orders API',
      parameters: [],
      requestBody: {
        schema: {
          type: 'object',
          required: ['sku', 'quantity'],
          properties: {
            sku: { type: 'string', minLength: 3 },
            quantity: { type: 'integer', minimum: 1, maximum: 99 },
            password: { type: 'string', example: 'do-not-leak' }
          }
        },
        example: { sku: 'ABC', quantity: 2 }
      },
      expected: { statusCodes: [201] },
      requiresReview: false
    };
    const config = buildConfigFromEndpoint({ targetBaseUrl: 'https://api.example.com' }, endpoint);
    assert.match(config.businessRules, /API: Orders API/);
    assert.match(config.businessRules, /Request body constraints \(smart defaults\):/);
    assert.match(config.businessRules, /body required fields: sku, quantity/);
    assert.match(config.businessRules, /body\.quantity: integer, min 1, max 99/);
    assert.equal(config.businessRules.includes('do-not-leak'), false);
    assert.equal(config.path, '/v1/orders');
    assert.equal(config.expectedStatus, 201);
    assert.deepEqual(endpoint.requestBody.schema.properties.sku, { type: 'string', minLength: 3 });
  });

  it('does not emit a raw JSON schema dump for large schemas', () => {
    const properties = Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [`field${i}`, { type: 'string', minLength: i }])
    );
    const config = buildConfigFromEndpoint({}, {
      method: 'PUT',
      path: '/bulk',
      requestBody: { schema: { type: 'object', properties } }
    });
    const ruleLines = config.businessRules.split('\n');
    assert.equal(ruleLines.filter((line) => line.startsWith('body.')).length, MAX_SCHEMA_CONSTRAINTS);
    assert.match(config.businessRules, /further constraints omitted/);
    assert.equal(config.businessRules.includes('"properties"'), false);
  });
});
