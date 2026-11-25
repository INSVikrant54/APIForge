import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

const VALID_YAML_SPEC = `
openapi: 3.0.3
info:
  title: Pet Store
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List pets
      responses:
        '200':
          description: OK
    post:
      summary: Create pet
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
      responses:
        '201':
          description: Created
`;

describe('POST /api/openapi/parse integration tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
    }
  });

  async function postParse(payload) {
    const response = await fetch(`${baseUrl}/api/openapi/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON error bodies (e.g. express body-limit 413) are acceptable here.
    }
    return { status: response.status, data };
  }

  const parseSource = source => postParse({ source });

  it('returns 400 when source is missing, empty, or not a string', async () => {
    for (const payload of [{}, { source: '' }, { source: '   ' }, { source: 42 }, { source: null }]) {
      const { status, data } = await postParse(payload);
      assert.equal(status, 400);
      assert.equal(data.success, false);
      assert.match(data.error, /non-empty source string/i);
    }
  });

  it('parses a YAML OpenAPI 3.0 spec into test-plan-ready endpoints', async () => {
    const { status, data } = await parseSource(VALID_YAML_SPEC);
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.equal(data.data.length, 2);

    const get = data.data.find(e => e.method === 'GET');
    assert.equal(get.path, '/pets');
    assert.equal(get.summary, 'List pets');
    assert.deepEqual(get.expected.statusCodes, [200]);
    assert.equal(get.requiresReview, false);
    assert.ok(get.request && typeof get.request.headers === 'object');

    const post = data.data.find(e => e.method === 'POST');
    assert.equal(post.summary, 'Create pet');
    assert.deepEqual(post.expected.statusCodes, [201]);
    assert.ok(post.requestBody);
    assert.equal(post.requestBody.contentType, 'application/json');
    assert.deepEqual(post.requestBody.schema.required, ['name']);
  });

  it('parses a JSON Swagger 2.0 spec and reports the server URL', async () => {
    const spec = JSON.stringify({
      swagger: '2.0',
      info: { title: 'Legacy', version: '1.0.0' },
      host: 'api.example.com',
      basePath: '/v1',
      paths: {
        '/things': {
          get: { summary: 'List things', responses: { 200: { description: 'OK' } } }
        }
      }
    });
    const { status, data } = await parseSource(spec);
    assert.equal(status, 200);
    const [endpoint] = data.data;
    assert.equal(endpoint.method, 'GET');
    assert.equal(endpoint.path, '/things');
    assert.deepEqual(endpoint.expected.statusCodes, [200]);
    // No `schemes` declared: the strict importer reports host+basePath
    // verbatim instead of inventing a scheme.
    assert.equal(endpoint.serverUrl, 'api.example.com/v1');
    assert.equal(endpoint.apiTitle, 'Legacy');
  });

  it('flags endpoints for review when no explicit 2xx is documented', async () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'NoSuccess', version: '1.0.0' },
      paths: {
        '/x': {
          get: { responses: { 404: { description: 'Missing' } } }
        }
      }
    });
    const { status, data } = await parseSource(spec);
    assert.equal(status, 200);
    assert.deepEqual(data.data[0].expected.statusCodes, []);
    assert.equal(data.data[0].requiresReview, true);
    assert.match(data.data[0].expected.description, /no explicit 2xx/i);
  });

  it('returns 400 with a helpful message for unparseable input', async () => {
    const { status, data } = await parseSource('not: a: spec: [[[[');
    assert.equal(status, 400);
    assert.equal(data.success, false);
    assert.match(data.error, /parse|Unrecognized|object|source/i);
  });

  it('returns 422 when the spec has no supported operations', async () => {
    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Empty', version: '1.0.0' },
      paths: { '/health': { trace: { responses: { 200: { description: 'ok' } } } } }
    });
    const { status, data } = await parseSource(spec);
    assert.equal(status, 422);
    assert.equal(data.success, false);
    assert.match(data.error, /no supported API operations/i);
  });

  it('rejects a source over 1 MiB by UTF-8 byte length', async () => {
    // The string has fewer than 1 MiB of JS characters, but its UTF-8 form exceeds 1 MiB.
    const oversized = 'é'.repeat(524_289);
    assert.ok(oversized.length < 1_048_576);
    const { status, data } = await parseSource(oversized);
    assert.equal(status, 413);
    assert.match(data.error, /1 MiB or smaller/i);
  });

  it('rejects an oversized ASCII specification with 413', async () => {
    // The OpenAPI route accepts a larger JSON wrapper, then enforces the
    // 1 MiB specification-source limit itself.
    const oversized = `openapi: 3.0.0\n# ${'x'.repeat(1_048_600)}`;
    const { status, data } = await parseSource(oversized);
    assert.equal(status, 413);
    assert.match(data.error, /1 MiB or smaller/i);
  });
});
