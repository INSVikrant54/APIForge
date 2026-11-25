import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  substituteString,
  substituteRequest,
  resolveSuiteTests,
  substituteTargetBaseUrl
} from '../lib/variables.js';

describe('variable substitution', () => {
  it('substitutes path, header and nested body placeholders', () => {
    const req = {
      method: 'POST',
      path: '/users/{{userId}}/orders',
      headers: { Authorization: 'Bearer {{TOKEN}}', 'X-Count': '{{count}}' },
      body: { owner: '{{USER}}', nested: ['{{TOKEN}}', 5] }
    };
    const resolved = substituteRequest(req, {
      userId: '42',
      TOKEN: 'secret',
      count: 3,
      USER: 'Ada'
    });
    assert.equal(resolved.path, '/users/42/orders');
    assert.equal(resolved.headers.Authorization, 'Bearer secret');
    assert.equal(resolved.headers['X-Count'], '3');
    assert.deepEqual(resolved.body, { owner: 'Ada', nested: ['secret', 5] });
  });

  it('leaves unknown placeholders unchanged and does not mutate the input', () => {
    const original = { path: '/{{known}}/{{missing}}', headers: {}, body: null };
    const resolved = substituteRequest(original, { known: 'x' });
    assert.equal(resolved.path, '/x/{{missing}}');
    assert.equal(original.path, '/{{known}}/{{missing}}');
    assert.equal(substituteString('{{a}} {{ b }}', { a: 1, b: 2 }), '1 2');
    assert.equal(
      substituteTargetBaseUrl('https://{{host}}/v1', { host: 'api.test' }),
      'https://api.test/v1'
    );
  });

  it('resolves tests through a variables map', () => {
    const tests = [{ id: 't1', request: { path: '/{{id}}', headers: {}, body: {} } }];
    const resolved = resolveSuiteTests(tests, { id: '7' });
    assert.equal(resolved[0].request.path, '/7');
    assert.equal(tests[0].request.path, '/{{id}}');
  });
});
