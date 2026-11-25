import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSpecText,
  detectSpecVersion,
  extractEndpoints,
  generateSampleBody,
  parseAndExtract,
  parseOpenApiSpec
} from '../services/openApiParser.js';

// -------------------------------------------------------
// Fixtures
// -------------------------------------------------------

const OPENAPI3_JSON = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Orders API', version: '2.1.0', description: 'Order management' },
  servers: [{ url: 'https://api.example.com/v2' }],
  paths: {
    '/orders': {
      get: {
        operationId: 'listOrders',
        summary: 'List orders',
        tags: ['orders'],
        parameters: [
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'closed'] } }
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad request' },
          default: { description: 'Unexpected' }
        }
      },
      post: {
        operationId: 'createOrder',
        summary: 'Create an order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Order' }
            }
          }
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Invalid' }
        }
      }
    },
    '/orders/{orderId}': {
      parameters: [
        { name: 'orderId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      get: {
        summary: 'Fetch one order',
        responses: { '200': { description: 'OK' }, '404': { description: 'Missing' } }
      },
      delete: {
        responses: { '204': { description: 'Deleted' } }
      }
    }
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'integer', minimum: 1 },
          quantity: { type: 'integer', minimum: 1 },
          note: { type: 'string', example: 'leave at door' },
          priority: { type: 'string', enum: ['low', 'high'] }
        }
      }
    }
  }
});

const OPENAPI3_YAML = `
openapi: 3.0.3
info:
  title: Orders API
  version: 2.1.0
servers:
  - url: https://api.example.com/v2
paths:
  /orders:
    get:
      operationId: listOrders
      summary: List orders
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: OK
        '404':
          description: Missing
    post:
      summary: Create an order
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required:
                - productId
              properties:
                productId:
                  type: integer
      responses:
        '201':
          description: Created
`;

const SWAGGER2_JSON = JSON.stringify({
  swagger: '2.0',
  info: { title: 'Legacy API', version: '1.0.0' },
  host: 'legacy.example.com',
  basePath: '/api',
  schemes: ['https'],
  paths: {
    '/items': {
      get: {
        summary: 'List items',
        parameters: [
          { name: 'q', in: 'query', type: 'string', required: false }
        ],
        responses: { '200': { description: 'OK' } }
      },
      post: {
        summary: 'Create item',
        parameters: [
          {
            name: 'body',
            in: 'body',
            required: true,
            schema: { $ref: '#/definitions/Item' }
          }
        ],
        responses: { '201': { description: 'Created' }, '422': { description: 'Invalid' } }
      }
    },
    '/items/{id}': {
      put: {
        summary: 'Replace item',
        parameters: [
          { name: 'id', in: 'path', type: 'integer', required: true },
          { name: 'name', in: 'formData', type: 'string', required: true }
        ],
        responses: { '200': { description: 'OK' } }
      }
    }
  },
  definitions: {
    Item: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, price: { type: 'number', minimum: 0 } }
    }
  }
});

// -------------------------------------------------------
// parseSpecText / detectSpecVersion
// -------------------------------------------------------

describe('parseSpecText', () => {
  it('parses valid JSON specs', () => {
    const spec = parseSpecText(OPENAPI3_JSON);
    assert.equal(spec.openapi, '3.0.3');
  });

  it('parses valid YAML specs', () => {
    const spec = parseSpecText(OPENAPI3_YAML);
    assert.equal(spec.openapi, '3.0.3');
    assert.equal(spec.info.title, 'Orders API');
    assert.equal(spec.paths['/orders'].get.summary, 'List orders');
  });

  it('throws on empty or non-string input', () => {
    for (const bad of ['', '   ', null, undefined, 42]) {
      assert.throws(() => parseSpecText(bad), /non-empty string/);
    }
  });

  it('throws a helpful error on unparseable input', () => {
    assert.throws(() => parseSpecText('this: is: not: valid:'), /Failed to parse spec as JSON or YAML/);
  });

  it('throws when the document is not an object', () => {
    assert.throws(() => parseSpecText('[1,2,3]'), /JSON\/YAML object/);
    assert.throws(() => parseSpecText('"just a string"'), /JSON\/YAML object/);
  });
});

describe('detectSpecVersion', () => {
  it('detects OpenAPI 3.x and Swagger 2.0', () => {
    assert.equal(detectSpecVersion({ openapi: '3.1.0' }), 'openapi3');
    assert.equal(detectSpecVersion({ swagger: '2.0' }), 'swagger2');
    assert.equal(detectSpecVersion({ swagger: 2 }), 'swagger2');
    assert.equal(detectSpecVersion({}), 'unknown');
    assert.equal(detectSpecVersion(null), 'unknown');
  });
});

// -------------------------------------------------------
// extractEndpoints — OpenAPI 3.x
// -------------------------------------------------------

describe('extractEndpoints (OpenAPI 3.0 JSON)', () => {
  const endpoints = extractEndpoints(parseSpecText(OPENAPI3_JSON));
  const byKey = Object.fromEntries(endpoints.map(e => [`${e.method} ${e.path}`, e]));

  it('extracts only test-plan-supported methods with correct paths', () => {
    assert.deepEqual(
      endpoints.map(e => `${e.method} ${e.path}`).sort(),
      ['DELETE /orders/{orderId}', 'GET /orders', 'GET /orders/{orderId}', 'POST /orders']
    );
  });

  it('captures summary and falls back to operationId', () => {
    assert.equal(byKey['GET /orders'].summary, 'List orders');
    const noSummary = extractEndpoints(parseSpecText(JSON.stringify({
      openapi: '3.0.0',
      paths: { '/x': { get: { operationId: 'getX', responses: { 200: { description: 'ok' } } } } }
    })));
    assert.equal(noSummary[0].summary, 'getX');
  });

  it('normalizes parameters and merges path-level with operation-level', () => {
    const listParams = byKey['GET /orders'].parameters;
    assert.equal(listParams.length, 2);
    assert.deepEqual(listParams[0], {
      name: 'limit',
      in: 'query',
      required: false,
      description: '',
      schema: { type: 'integer', maximum: 100 }
    });

    const oneParams = byKey['GET /orders/{orderId}'].parameters;
    assert.equal(oneParams.length, 1);
    assert.equal(oneParams[0].name, 'orderId');
    assert.equal(oneParams[0].required, true); // path params are always required
  });

  it('resolves requestBody $ref into the schema', () => {
    const post = byKey['POST /orders'];
    assert.ok(post.requestBody);
    assert.equal(post.requestBody.type, 'object');
    assert.deepEqual(post.requestBody.required, ['productId', 'quantity']);
    assert.ok(post.requestBody.properties.productId);
  });

  it('returns sorted numeric status codes and drops non-numeric keys', () => {
    assert.deepEqual(byKey['GET /orders'].expectedStatusCodes, [200, 400]); // no "default"
    assert.deepEqual(byKey['POST /orders'].expectedStatusCodes, [201, 400]);
    assert.deepEqual(byKey['DELETE /orders/{orderId}'].expectedStatusCodes, [204]);
  });

  it('falls back to [200] when a response list is empty or missing', () => {
    const spec = parseSpecText(JSON.stringify({
      openapi: '3.0.0',
      paths: { '/a': { get: { responses: {} }, post: { responses: { default: { description: 'x' } } } } }
    }));
    for (const e of extractEndpoints(spec)) {
      assert.deepEqual(e.expectedStatusCodes, [200]);
    }
  });

  it('builds a deterministic sampleBody from the request schema', () => {
    const sample = byKey['POST /orders'].sampleBody;
    assert.deepEqual(sample, {
      productId: 1,
      quantity: 1,
      note: 'leave at door',
      priority: 'low'
    });
  });

  it('produces baseUrl from servers', () => {
    const { baseUrl } = parseAndExtract(OPENAPI3_JSON);
    assert.equal(baseUrl, 'https://api.example.com/v2');
  });
});

// -------------------------------------------------------
// extractEndpoints — OpenAPI 3.x YAML
// -------------------------------------------------------

describe('extractEndpoints (OpenAPI 3.0 YAML)', () => {
  const result = parseAndExtract(OPENAPI3_YAML);

  it('parses YAML and matches the JSON behavior', () => {
    assert.equal(result.version, 'openapi3');
    assert.equal(result.endpoints.length, 2);
    const get = result.endpoints.find(e => e.method === 'GET');
    assert.equal(get.path, '/orders');
    assert.equal(get.summary, 'List orders');
    assert.deepEqual(get.expectedStatusCodes, [200, 404]);
  });

  it('prefills a sample body for YAML requestBody schemas', () => {
    const post = result.endpoints.find(e => e.method === 'POST');
    // YAML schema has no minimum, so the deterministic integer sample is 0.
    assert.deepEqual(post.sampleBody, { productId: 0 });
  });
});

// -------------------------------------------------------
// extractEndpoints — Swagger 2.0
// -------------------------------------------------------

describe('extractEndpoints (Swagger 2.0)', () => {
  const result = parseAndExtract(SWAGGER2_JSON);
  const endpoints = result.endpoints;
  const byKey = Object.fromEntries(endpoints.map(e => [`${e.method} ${e.path}`, e]));

  it('detects the version and builds baseUrl from host/basePath/schemes', () => {
    assert.equal(result.version, 'swagger2');
    assert.equal(result.baseUrl, 'https://legacy.example.com/api');
  });

  it('converts top-level parameter types into schemas', () => {
    const params = byKey['GET /items'].parameters;
    assert.equal(params.length, 1);
    assert.deepEqual(params[0].schema, { type: 'string' });
  });

  it('maps `in: body` parameters to the requestBody schema', () => {
    const post = byKey['POST /items'];
    assert.ok(post.requestBody);
    assert.equal(post.requestBody.type, 'object');
    assert.deepEqual(post.requestBody.required, ['name']);
    assert.deepEqual(post.sampleBody, { name: 'string' });
  });

  it('folds formData parameters into an object schema', () => {
    const put = byKey['PUT /items/{id}'];
    assert.ok(put.requestBody);
    assert.equal(put.requestBody.type, 'object');
    assert.deepEqual(put.requestBody.properties.name, { type: 'string' });
    assert.deepEqual(put.requestBody.required, ['name']);
  });

  it('keeps numeric status codes only', () => {
    assert.deepEqual(byKey['POST /items'].expectedStatusCodes, [201, 422]);
  });
});

// -------------------------------------------------------
// Edge cases
// -------------------------------------------------------

describe('edge cases', () => {
  it('throws on unrecognized spec versions', () => {
    assert.throws(() => parseAndExtract(JSON.stringify({ info: {}, paths: {} })), /Unrecognized specification/);
    assert.throws(() => extractEndpoints({}), /Unrecognized specification/);
  });

  it('returns an empty endpoint list when paths is missing or empty', () => {
    assert.deepEqual(extractEndpoints(parseSpecText(JSON.stringify({ openapi: '3.0.0' }))), []);
    const { endpoints, totalFound } = parseAndExtract(JSON.stringify({ swagger: '2.0', paths: {} }));
    assert.deepEqual(endpoints, []);
    assert.equal(totalFound, 0);
  });

  it('caps large specs and flags truncation', () => {
    const paths = {};
    for (let i = 0; i < 10; i++) paths[`/p${i}`] = { get: { responses: { 200: { description: 'ok' } } } };
    const spec = JSON.stringify({ openapi: '3.0.0', paths });

    const capped = parseAndExtract(spec, { maxEndpoints: 4 });
    assert.equal(capped.endpoints.length, 4);
    assert.equal(capped.totalFound, 10);
    assert.equal(capped.truncated, true);

    const full = parseAndExtract(spec);
    assert.equal(full.endpoints.length, 10);
    assert.equal(full.truncated, false);
  });

  it('survives circular $refs without hanging', () => {
    const spec = parseSpecText(JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/loop': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Node' }
                }
              }
            },
            responses: { 200: { description: 'ok' } }
          }
        }
      },
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: { child: { $ref: '#/components/schemas/Node' } }
          }
        }
      }
    }));
    const [endpoint] = extractEndpoints(spec);
    assert.equal(endpoint.requestBody.type, 'object');
    // The recursive marker yields no sample value for the child property.
    assert.equal(endpoint.sampleBody.child, undefined);
  });

  it('ignores external $refs gracefully', () => {
    const spec = parseSpecText(JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/ext': {
          get: {
            parameters: [{ $ref: 'https://example.com/params.json#/Limit' }],
            responses: { 200: { description: 'ok' } }
          }
        }
      }
    }));
    const [endpoint] = extractEndpoints(spec);
    assert.deepEqual(endpoint.parameters, []);
  });

  it('skips path items that are $refs or non-objects', () => {
    const spec = parseSpecText(JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/good': { get: { responses: { 200: { description: 'ok' } } } },
        '/ref': { $ref: '#/components/pathItems/Missing' },
        '/broken': 'not-an-object'
      }
    }));
    const endpoints = extractEndpoints(spec);
    assert.equal(endpoints.length, 1);
    assert.equal(endpoints[0].path, '/good');
  });
});

// -------------------------------------------------------
// generateSampleBody
// -------------------------------------------------------

describe('generateSampleBody', () => {
  const spec = { components: { schemas: {} } };

  it('honors examples, defaults, and enums over type heuristics', () => {
    assert.equal(generateSampleBody({ type: 'string', example: 'abc' }, spec), 'abc');
    assert.equal(generateSampleBody({ type: 'integer', default: 7 }, spec), 7);
    assert.equal(generateSampleBody({ type: 'string', enum: ['a', 'b'] }, spec), 'a');
  });

  it('produces format-aware strings and sensible numbers', () => {
    assert.equal(generateSampleBody({ type: 'string', format: 'email' }, spec), 'user@example.com');
    assert.equal(generateSampleBody({ type: 'string', format: 'uuid' }, spec), '3fa85f64-5717-4562-b3fc-2c963f66afa6');
    assert.equal(generateSampleBody({ type: 'integer', minimum: 5 }, spec), 5);
    assert.equal(generateSampleBody({ type: 'boolean' }, spec), true);
  });

  it('builds objects with required fields and rich optional fields', () => {
    const schema = {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer' },
        label: { type: 'string' },
        tag: { type: 'string', default: 'x' }
      }
    };
    assert.deepEqual(generateSampleBody(schema, spec), { id: 0, tag: 'x' });
  });

  it('builds arrays with one sample item', () => {
    assert.deepEqual(generateSampleBody({ type: 'array', items: { type: 'string' } }, spec), ['string']);
  });

  it('merges allOf and picks the first oneOf branch', () => {
    const allOf = {
      allOf: [
        { type: 'object', required: ['a'], properties: { a: { type: 'integer' } } },
        { type: 'object', properties: { b: { type: 'string', default: 'hi' } } }
      ]
    };
    assert.deepEqual(generateSampleBody(allOf, spec), { a: 0, b: 'hi' });

    const oneOf = { oneOf: [{ type: 'string', example: 'first' }, { type: 'integer' }] };
    assert.equal(generateSampleBody(oneOf, spec), 'first');
  });

  it('returns null for unusable schemas', () => {
    assert.equal(generateSampleBody(null, spec), null);
    assert.equal(generateSampleBody({}, spec), null);
  });
});

// -------------------------------------------------------
// parseAndExtract metadata
// -------------------------------------------------------

describe('parseAndExtract', () => {
  it('returns version, info, endpoints, and counts for a valid spec', () => {
    const result = parseAndExtract(OPENAPI3_JSON);
    assert.equal(result.version, 'openapi3');
    assert.deepEqual(result.info, {
      title: 'Orders API',
      version: '2.1.0',
      description: 'Order management'
    });
    assert.equal(result.endpoints.length, 4);
    assert.equal(result.totalFound, 4);
    assert.equal(result.truncated, false);
    assert.ok(result.spec.paths); // full parsed spec retained for programmatic use
  });

  it('defaults title for specs without info', () => {
    const result = parseAndExtract(JSON.stringify({ openapi: '3.0.0', paths: {} }));
    assert.equal(result.info.title, 'Untitled API');
  });
});

// -------------------------------------------------------
// parseOpenApiSpec — normalized endpoint-array API used by the route
// -------------------------------------------------------

function strictOas3Spec() {
  return {
    openapi: '3.0.3',
    info: { title: 'Pet Store', version: '1.2.0' },
    servers: [{ url: 'https://api.example.test/v2' }],
    paths: {
      '/pets': {
        get: {
          summary: 'List pets',
          operationId: 'listPets',
          parameters: [{
            name: 'limit', in: 'query', required: false,
            description: 'max items', schema: { type: 'integer' }, example: 10
          }],
          responses: {
            200: { description: 'OK' },
            201: { description: 'Created' },
            400: { description: 'Bad request' },
            default: { description: 'Error' }
          }
        },
        post: {
          summary: 'Create pet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
                example: { name: 'Rex' }
              }
            }
          },
          responses: { 201: { description: 'Created' } }
        }
      }
    },
    components: {
      schemas: {
        Pet: {
          type: 'object', required: ['name'],
          properties: { name: { type: 'string' } }
        }
      }
    }
  };
}

const STRICT_YAML_OAS3 = `
openapi: 3.0.0
info:
  title: YAML API
  version: '1.0'
servers:
  - url: https://yaml.example.test
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Healthy
`;

function strictSwagger2Spec() {
  return {
    swagger: '2.0',
    info: { title: 'Legacy API', version: '2' },
    host: 'legacy.example.test',
    basePath: '/v1',
    schemes: ['https'],
    consumes: ['application/json'],
    paths: {
      '/pets': {
        post: {
          operationId: 'addPet',
          parameters: [
            {
              name: 'pet', in: 'body', required: true,
              schema: { $ref: '#/definitions/Pet' },
              'x-example': { name: 'Milo' }
            },
            { name: 'verbose', in: 'query', type: 'boolean', description: 'verbosity' }
          ],
          responses: { 201: { description: 'Created' } }
        }
      }
    },
    definitions: {
      Pet: {
        type: 'object', required: ['name'],
        properties: { name: { type: 'string' } }
      }
    }
  };
}

describe('OpenApiParser - named export happy paths', () => {
  it('parses JSON OpenAPI 3 into the agreed normalized endpoint shape', () => {
    const endpoints = parseOpenApiSpec(JSON.stringify(strictOas3Spec()));
    assert.equal(endpoints.length, 2);

    const [list, create] = endpoints;
    assert.equal(list.method, 'GET');
    assert.equal(list.path, '/pets');
    assert.equal(list.summary, 'List pets');
    assert.equal(list.description, '');
    assert.equal(list.operationId, 'listPets');
    assert.equal(list.apiVersion, '3.0.3');
    assert.equal(list.apiTitle, 'Pet Store');
    assert.equal(list.serverUrl, 'https://api.example.test/v2');
    assert.equal(list.serverUrlNeedsReview, false);
    assert.equal(list.requiresReview, false);
    assert.deepEqual(list.expected.statusCodes, [200, 201]);
    assert.match(list.expected.description, /200: OK/);
    assert.deepEqual(list.parameters[0], {
      name: 'limit', in: 'query', required: false,
      description: 'max items', schema: { type: 'integer' }, example: 10
    });
    assert.equal(list.request.method, 'GET');
    assert.equal(list.request.path, '/pets');
    assert.deepEqual(list.request.headers, {});
    assert.equal(list.request.body, null);
    assert.equal(list.requestBody, null);

    assert.equal(create.method, 'POST');
    assert.equal(create.requestBody.required, true);
    assert.equal(create.requestBody.contentType, 'application/json');
    assert.equal(create.requestBody.schema.properties.name.type, 'string');
    assert.deepEqual(create.requestBody.schema.required, ['name']);
    assert.deepEqual(create.requestBody.example, { name: 'Rex' });
    assert.deepEqual(create.request.body, { name: 'Rex' });
    assert.equal(create.request.headers['Content-Type'], 'application/json');
    assert.deepEqual(create.expected.statusCodes, [201]);
    assert.equal(create.requiresReview, false);
    assert.equal(create.serverUrlNeedsReview, false);
  });

  it('accepts an already-parsed object and a single YAML document', () => {
    assert.equal(parseOpenApiSpec(strictOas3Spec()).length, 2);

    const endpoints = parseOpenApiSpec(STRICT_YAML_OAS3);
    assert.equal(endpoints.length, 1);
    assert.equal(endpoints[0].method, 'GET');
    assert.equal(endpoints[0].path, '/health');
    assert.equal(endpoints[0].apiTitle, 'YAML API');
    assert.equal(endpoints[0].serverUrl, 'https://yaml.example.test');
    assert.equal(endpoints[0].serverUrlNeedsReview, false);
    assert.deepEqual(endpoints[0].expected.statusCodes, [200]);
    assert.equal(endpoints[0].requiresReview, false);
  });

  it('parses Swagger 2 body parameters, consumes, and definitions refs', () => {
    const [endpoint] = parseOpenApiSpec(JSON.stringify(strictSwagger2Spec()));
    assert.equal(endpoint.apiVersion, '2.0');
    assert.equal(endpoint.serverUrl, 'https://legacy.example.test/v1');
    assert.equal(endpoint.serverUrlNeedsReview, false);
    assert.equal(endpoint.parameters.length, 1);
    assert.equal(endpoint.parameters[0].name, 'verbose');
    assert.equal(endpoint.parameters[0].schema.type, 'boolean');
    assert.equal(endpoint.requestBody.contentType, 'application/json');
    assert.equal(endpoint.requestBody.required, true);
    assert.equal(endpoint.requestBody.schema.properties.name.type, 'string');
    assert.deepEqual(endpoint.request.body, { name: 'Milo' });
    assert.deepEqual(endpoint.expected.statusCodes, [201]);
    assert.equal(endpoint.requiresReview, false);
  });

  it('emits only methods APIForge can run', () => {
    const operations = {};
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']) {
      operations[method] = { responses: { 200: { description: 'OK' } } };
    }
    const endpoints = parseOpenApiSpec({ openapi: '3.0.0', paths: { '/all': operations } });
    assert.deepEqual(endpoints.map(e => e.method), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });
});

describe('OpenApiParser - parameters, refs, and review', () => {
  it('merges path and operation parameters with operation override semantics', () => {
    const [endpoint] = parseOpenApiSpec({
      openapi: '3.0.0',
      paths: {
        '/items/{id}': {
          parameters: [
            {
              name: 'limit', in: 'query', required: false,
              description: 'from path', schema: { type: 'integer' }, example: 5
            },
            { name: 'trace', in: 'header', schema: { type: 'string' }, example: 'on' },
            { name: 'shared', in: 'header', schema: { type: 'string' } }
          ],
          get: {
            parameters: [
              {
                name: 'limit', in: 'query', required: true,
                description: 'from operation', schema: { type: 'string' }, example: '20'
              },
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'shared', in: 'query', schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    });

    assert.equal(endpoint.parameters.length, 5); // 'shared' differs by `in`
    const limit = endpoint.parameters.find(p => p.name === 'limit' && p.in === 'query');
    assert.equal(limit.required, true);
    assert.equal(limit.description, 'from operation');
    assert.equal(limit.schema.type, 'string');
    assert.equal(limit.example, '20');
    assert.ok(endpoint.parameters.some(p => p.name === 'shared' && p.in === 'header'));
    assert.ok(endpoint.parameters.some(p => p.name === 'shared' && p.in === 'query'));
    assert.equal(endpoint.request.headers.trace, 'on');
  });

  it('resolves local refs and bounds recursive schemas', () => {
    const [endpoint] = parseOpenApiSpec({
      openapi: '3.0.0',
      paths: {
        '/nodes': {
          post: {
            parameters: [{ $ref: '#/components/parameters/Limit' }],
            requestBody: {
              content: {
                'application/vnd.example+json': {
                  schema: { $ref: '#/components/schemas/Node' }
                }
              }
            },
            responses: { 200: { $ref: '#/components/responses/Ok' } }
          }
        }
      },
      components: {
        parameters: {
          Limit: { name: 'limit', in: 'query', schema: { type: 'integer' }, example: 7 }
        },
        schemas: {
          Node: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              next: { $ref: '#/components/schemas/Node' }
            }
          }
        },
        responses: { Ok: { description: 'OK' } }
      }
    });

    assert.equal(endpoint.parameters[0].name, 'limit');
    assert.equal(endpoint.parameters[0].example, 7);
    assert.equal(endpoint.requestBody.contentType, 'application/vnd.example+json');
    assert.equal(endpoint.requestBody.schema.properties.value.type, 'string');
    assert.match(endpoint.requestBody.schema.properties.next.description, /Recursive reference/);
    assert.deepEqual(endpoint.expected.statusCodes, [200]);
    assert.match(endpoint.expected.description, /OK/);
  });

  it('aggregates Swagger formData parameters into an object schema', () => {
    const [endpoint] = parseOpenApiSpec({
      swagger: '2.0',
      paths: {
        '/login': {
          post: {
            consumes: ['multipart/form-data'],
            parameters: [
              { name: 'user', in: 'formData', type: 'string', required: true },
              { name: 'remember', in: 'formData', type: 'boolean', default: false }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    });
    assert.equal(endpoint.parameters.length, 0);
    assert.equal(endpoint.requestBody.contentType, 'multipart/form-data');
    assert.equal(endpoint.requestBody.schema.type, 'object');
    assert.deepEqual(endpoint.requestBody.schema.required, ['user']);
    assert.deepEqual(endpoint.request.body, { remember: false });
  });

  it('flags a missing explicit 2xx response instead of guessing 200', () => {
    const [endpoint] = parseOpenApiSpec({
      openapi: '3.0.0',
      paths: {
        '/flaky': {
          get: { responses: { 400: { description: 'Bad request' }, default: { description: 'Error' } } }
        }
      }
    });
    assert.deepEqual(endpoint.expected.statusCodes, []);
    assert.match(endpoint.expected.description, /No explicit 2xx/);
    assert.equal(endpoint.requiresReview, true);
  });

  it('returns unresolved server variables literally with serverUrlNeedsReview', () => {
    const [endpoint] = parseOpenApiSpec({
      openapi: '3.0.0',
      servers: [{ url: 'https://{env}.example.test/v1' }],
      paths: { '/ping': { get: { responses: { 200: { description: 'OK' } } } } }
    });
    assert.equal(endpoint.serverUrl, 'https://{env}.example.test/v1');
    assert.equal(endpoint.serverUrlNeedsReview, true);
    assert.equal(endpoint.requiresReview, true);
    assert.equal(endpoint.request.path, '/ping');
  });
});

describe('OpenApiParser - fail closed', () => {
  it('rejects unsupported and malformed versions', () => {
    assert.throws(() => parseOpenApiSpec({ openapi: '3.1.0', paths: {} }), /Unsupported OpenAPI version/);
    assert.throws(() => parseOpenApiSpec({ swagger: '1.2', paths: {} }), /Unsupported Swagger version/);
    assert.throws(() => parseOpenApiSpec({ paths: {} }), /Malformed specification/);
    assert.throws(() => parseOpenApiSpec(null), /must be a JSON\/YAML string or an object/);
    assert.throws(() => parseOpenApiSpec([]), /must be a JSON\/YAML string or an object/);
    assert.throws(() => parseOpenApiSpec('   '), /must not be empty/);
  });

  it('rejects malformed YAML, multiple documents, and oversized input', () => {
    assert.throws(
      () => parseOpenApiSpec('openapi: 3.0.0\npaths:\n  /x:\n    get:\n      responses: [oops\n'),
      /Failed to parse YAML specification/
    );
    assert.throws(
      () => parseOpenApiSpec('openapi: 3.0.0\n---\nopenapi: 3.0.0\n'),
      /multiple documents/i
    );
    assert.throws(
      () => parseOpenApiSpec('x'.repeat(1024 * 1024 + 1)),
      /maximum size of 1 MiB/
    );
  });

  it('rejects external refs and unsafe pointer tokens', () => {
    const external = key => ({
      [key]: key === 'swagger' ? '2.0' : '3.0.0',
      paths: {
        '/x': {
          get: {
            parameters: [{ $ref: 'https://evil.example.test/p.json' }],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    });
    assert.throws(() => parseOpenApiSpec(external('openapi')), /only local JSON pointers/);
    assert.throws(() => parseOpenApiSpec(external('swagger')), /only local JSON pointers/);
    assert.throws(
      () => parseOpenApiSpec({
        openapi: '3.0.0',
        paths: {
          '/x': {
            get: {
              parameters: [{ $ref: '#/components/parameters/__proto__' }],
              responses: { 200: { description: 'OK' } }
            }
          }
        }
      }),
      /unsafe \$ref pointer token/
    );
  });

  it('enforces the alias-expansion cap', () => {
    const lines = ['openapi: 3.0.0', 'x-anchor: &a value'];
    for (let i = 0; i < 25; i += 1) lines.push(`x-alias-${i}: *a`);
    assert.throws(() => parseOpenApiSpec(lines.join('\n')), /alias count/i);
  });

  it('enforces ref-depth and operation-count limits', () => {
    const schemas = {};
    for (let i = 0; i < 18; i += 1) {
      schemas[`S${i}`] = { $ref: `#/components/schemas/S${i + 1}` };
    }
    schemas.S18 = { type: 'string' };
    assert.throws(
      () => parseOpenApiSpec({
        openapi: '3.0.0',
        paths: {
          '/deep': {
            post: {
              requestBody: {
                content: { 'application/json': { schema: { $ref: '#/components/schemas/S0' } } }
              },
              responses: { 200: { description: 'OK' } }
            }
          }
        },
        components: { schemas }
      }),
      /maximum depth/
    );

    const paths = {};
    for (let i = 0; i <= 200; i += 1) {
      paths[`/op${i}`] = { get: { responses: { 200: { description: 'OK' } } } };
    }
    assert.throws(() => parseOpenApiSpec({ openapi: '3.0.0', paths }), /too many operations/);
  });
});
