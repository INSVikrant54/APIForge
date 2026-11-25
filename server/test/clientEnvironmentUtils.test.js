import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerationConfig } from '../../client/src/utils/environments.js';

describe('client environment helpers (generation payload)', () => {
  it('resolves non-secret businessRules placeholders and keeps secret placeholders verbatim', () => {
    const config = {
      environment: 'development',
      environments: {
        development: {
          targetBaseUrl: '',
          variables: {
            baseUrl: { value: 'https://api.test', secret: false },
            apiKey: { value: 'super-secret-token', secret: true }
          }
        }
      },
      path: '{{baseUrl}}/orders',
      headers: { 'X-API-Key': '{{apiKey}}' },
      body: { service: '{{baseUrl}}', credential: '{{apiKey}}' },
      sampleResponse: { url: '{{baseUrl}}' },
      businessRules: 'Only {{baseUrl}} is allowed. Never expose {{apiKey}}.'
    };

    const generated = buildGenerationConfig(config);

    assert.equal(generated.path, 'https://api.test/orders');
    assert.equal(generated.headers['X-API-Key'], '{{apiKey}}');
    assert.deepEqual(generated.body, { service: 'https://api.test', credential: '{{apiKey}}' });
    assert.deepEqual(generated.sampleResponse, { url: 'https://api.test' });
    assert.equal(generated.businessRules,
      'Only https://api.test is allowed. Never expose {{apiKey}}.');
    assert.equal(JSON.stringify(generated).includes('super-secret-token'), false);

    // The original config (React state) still holds raw templates.
    assert.equal(config.businessRules, 'Only {{baseUrl}} is allowed. Never expose {{apiKey}}.');
    assert.equal(config.path, '{{baseUrl}}/orders');
  });

  it('returns an empty businessRules string when none is configured', () => {
    const generated = buildGenerationConfig({ path: '/orders' });
    assert.equal(generated.businessRules, '');
  });
});
