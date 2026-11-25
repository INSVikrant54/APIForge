import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSuite,
  makeTestId,
  normalizeSuite,
  resolveEnvironment,
  readSuite
} from '../lib/suite.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

describe('suite helpers', () => {
  it('creates a versioned suite with a default environment', () => {
    const suite = createSuite({ name: 'Sample' });
    assert.equal(suite.schemaVersion, 1);
    assert.equal(suite.name, 'Sample');
    assert.equal(suite.environment, 'default');
    assert.deepEqual(suite.environments.default, { targetBaseUrl: '', variables: {} });
    assert.deepEqual(suite.tests, []);
  });

  it('rejects an unknown schemaVersion with a clear error', () => {
    assert.throws(
      () => normalizeSuite({ schemaVersion: 9, environments: {}, tests: [] }),
      /schemaVersion/i
    );
    assert.throws(
      () => normalizeSuite({ environments: {}, tests: [] }),
      /schemaVersion/i
    );
  });

  it('generates stable, index-scoped test IDs', () => {
    const a = makeTestId({ method: 'GET', path: '/pets/{petId}' }, 0);
    const b = makeTestId({ method: 'GET', path: '/pets/{petId}' }, 0);
    const c = makeTestId({ method: 'GET', path: '/pets/{petId}' }, 1);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a, 'get-pets-petid-001');
  });

  it('resolves a named environment and reports missing ones', () => {
    const suite = createSuite({ name: 'x' });
    suite.environments.prod = {
      targetBaseUrl: 'https://api.example.com',
      variables: { TOKEN: 'abc' }
    };
    assert.deepEqual(resolveEnvironment(suite, 'prod'), {
      name: 'prod',
      targetBaseUrl: 'https://api.example.com',
      variables: { TOKEN: 'abc' }
    });
    assert.throws(() => resolveEnvironment(suite, 'staging'), /not defined/i);
  });

  it('reads and rejects suite files through the normalizer', () => {
    const dir = mkdtempSync(join(tmpdir(), 'apiforge-suite-'));
    const file = join(dir, 'suite.json');
    try {
      writeFileSync(file, `${JSON.stringify(createSuite({ name: 'From disk' }), null, 2)}\n`, 'utf8');
      const loaded = readSuite(file);
      assert.equal(loaded.name, 'From disk');
      assert.equal(loaded.schemaVersion, 1);

      writeFileSync(file, JSON.stringify({ schemaVersion: 2, environments: {}, tests: [] }), 'utf8');
      assert.throws(() => readSuite(file), /schemaVersion/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    assert.ok(dirname(file));
  });
});
