import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { importSpec, endpointToTest } from '../commands/import.js';

const jsonFixture = readFileSync(new URL('./fixtures/oas3.json', import.meta.url), 'utf8');
const yamlFixture = readFileSync(new URL('./fixtures/oas3.yaml', import.meta.url), 'utf8');

function tempSuitePath() {
  return join(mkdtempSync(join(tmpdir(), 'apiforge-import-')), 'suite.json');
}

describe('OpenAPI import conversion', () => {
  it('converts an OAS3 JSON fixture into deterministic suite tests', () => {
    const out = tempSuitePath();
    try {
      const result = importSpec(jsonFixture, { name: 'Pets', filePath: out });
      const { suite } = result;
      assert.equal(result.total, 3);
      assert.equal(result.reviewCount, 2);
      assert.equal(suite.schemaVersion, 1);
      assert.equal(suite.name, 'Pets');
      assert.equal(suite.environment, 'default');
      assert.equal(suite.environments.default.targetBaseUrl, 'https://api.example.com/v1');
      assert.deepEqual(suite.environments.default.variables, {});
      assert.equal(suite.tests.length, 3);

      for (const test of suite.tests) {
        assert.equal(test.category, 'happy_path');
        assert.equal(test.severity, 'medium');
        assert.equal(test.confirmed, false);
        assert.match(test.id, /^(get|post)-/);
      }

      const get = suite.tests.find((t) => t.name === 'Get pet by id');
      assert.equal(get.request.path, '/pets/{petId}');
      assert.deepEqual(get.expected.statusCodes, [200]);
      assert.equal(get.requiresReview, true);
      assert.match(get.rationale, /concrete path parameter value/);

      const post = suite.tests.find((t) => t.name === 'Create pet');
      assert.deepEqual(post.request.body, { name: 'Rex' });
      assert.equal(post.request.headers['Content-Type'], 'application/json');
      assert.deepEqual(post.expected.statusCodes, [201]);

      const unclear = suite.tests.find((t) => t.request.path === '/unclear');
      assert.deepEqual(unclear.expected.statusCodes, []);
      assert.equal(unclear.requiresReview, true);
    } finally {
      rmSync(dirname(out), { recursive: true, force: true });
    }
  });

  it('produces identical test objects across repeated conversions', () => {
    const endpoint = {
      method: 'GET',
      path: '/x',
      summary: 'Read x',
      expected: { statusCodes: [200], description: 'OK' },
      request: { method: 'GET', path: '/x', headers: {}, body: null }
    };
    assert.deepEqual(endpointToTest(endpoint, 0), endpointToTest(endpoint, 0));
  });

  it('parses a YAML OAS3 fixture and defaults the suite name from the title', () => {
    const out = tempSuitePath();
    try {
      const { suite } = importSpec(yamlFixture, { filePath: out });
      assert.equal(suite.name, 'Tiny API');
      assert.equal(suite.tests.length, 1);
      assert.equal(suite.tests[0].name, 'Ping');
      assert.deepEqual(suite.tests[0].expected.statusCodes, [200]);
      assert.equal(suite.environments.default.targetBaseUrl, '');
    } finally {
      rmSync(dirname(out), { recursive: true, force: true });
    }
  });

  it('rejects a spec with no supported operations', () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Empty', version: '1.0.0' },
      paths: { '/health': { trace: { responses: { 200: { description: 'ok' } } } } }
    });
    assert.throws(() => importSpec(spec, { filePath: tempSuitePath() }), /no supported/i);
  });
});
