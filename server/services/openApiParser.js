/**
 * OpenAPI / Swagger importer
 * Parses OpenAPI 3.x and Swagger 2.0 JSON/YAML specs and returns an array of
 * test-plan-ready endpoint objects:
 *   { method, path, summary, parameters, requestBody, expectedStatusCodes,
 *     sampleBody, operationId, tags }
 *
 * Output format reference: server/utils/schemaValidator.js
 * Only methods supported by the test-plan schema (GET, POST, PUT, PATCH, DELETE)
 * are extracted, so every returned endpoint can be fed straight into plan
 * generation and the deterministic runner.
 */

import { parse as parseYaml, parseDocument } from 'yaml';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_ENDPOINTS_DEFAULT = 500;
const MAX_SAMPLE_DEPTH = 6;

// -------------------------------------------------------
// Spec text parsing (JSON first, YAML fallback)
// -------------------------------------------------------

/**
 * Normalizes a raw spec string (JSON or YAML) into a JS object.
 * Tries JSON first (clearer failures), then falls back to the YAML parser.
 *
 * @param {string} specText
 * @returns {Object}
 * @throws {Error} If the spec cannot be parsed or is not a plain object
 */
export function parseSpecText(specText) {
  if (typeof specText !== 'string' || specText.trim().length === 0) {
    throw new Error('Spec text must be a non-empty string');
  }

  let parsed;
  try {
    parsed = JSON.parse(specText);
  } catch {
    try {
      parsed = parseYaml(specText);
    } catch (err) {
      throw new Error(
        `Failed to parse spec as JSON or YAML: ${err && err.message ? err.message : 'unknown parse error'}`
      );
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Spec must be a JSON/YAML object describing an API (expected "openapi" or "swagger" field)');
  }

  return parsed;
}

/**
 * Detects whether a parsed spec is OpenAPI 3.x, Swagger 2.0, or unknown.
 *
 * @param {Object} spec
 * @returns {'openapi3'|'swagger2'|'unknown'}
 */
export function detectSpecVersion(spec) {
  if (!spec || typeof spec !== 'object') return 'unknown';
  if (typeof spec.openapi === 'string' && spec.openapi.startsWith('3')) return 'openapi3';
  if (spec.swagger === '2.0' || spec.swagger === 2) return 'swagger2';
  return 'unknown';
}

// -------------------------------------------------------
// $ref resolution (local JSON pointers only)
// -------------------------------------------------------

/**
 * Resolves a local `#/...` $ref against the root spec.
 * External refs (http://..., other files) return null — callers degrade gracefully.
 * Cycle-guarded so self-referential schemas cannot hang the parser.
 *
 * @param {Object} spec - Root spec document
 * @param {Object} node - Node that may contain a $ref
 * @param {Set<string>} [seen]
 * @returns {Object|null}
 */
function resolveRef(spec, node, seen = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (typeof node.$ref !== 'string') return node;
  if (!node.$ref.startsWith('#/')) return null; // external ref — unsupported

  if (seen.has(node.$ref)) return null; // cycle
  seen.add(node.$ref);

  const segments = node.$ref
    .slice(2)
    .split('/')
    .map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'));

  let target = spec;
  for (const seg of segments) {
    if (!target || typeof target !== 'object') return null;
    target = target[seg];
  }
  if (target === undefined || target === null) return null;

  return resolveRef(spec, target, seen);
}

// -------------------------------------------------------
// Sample body generation from a JSON schema
// -------------------------------------------------------

/**
 * Builds a deterministic sample instance from a JSON schema so imported
 * endpoints can prefill the request body editor.
 * Honors example, default, enum, required, min/max, and format hints.
 *
 * @param {Object} schema
 * @param {Object} spec - Root spec (for $ref resolution)
 * @param {number} [depth]
 * @param {Set} [seen]
 * @returns {*} Sample value, or null when no useful sample can be built
 */
export function generateSampleBody(schema, spec, depth = 0, seen = new Set()) {
  if (!schema || typeof schema !== 'object' || depth > MAX_SAMPLE_DEPTH) return null;

  if (seen.has(schema)) return null; // cycle guard
  seen.add(schema);

  try {
    const resolved = resolveRef(spec, schema) || schema;

    if (resolved.example !== undefined) return resolved.example;
    if (resolved.default !== undefined) return resolved.default;
    if (Array.isArray(resolved.enum) && resolved.enum.length > 0) return resolved.enum[0];

    // Composition
    if (Array.isArray(resolved.allOf) && resolved.allOf.length > 0) {
      const merged = {};
      for (const sub of resolved.allOf) {
        const part = generateSampleBody(sub, spec, depth + 1, seen);
        if (part && typeof part === 'object' && !Array.isArray(part)) Object.assign(merged, part);
      }
      return merged;
    }
    const composed = resolved.oneOf?.[0] || resolved.anyOf?.[0];
    if (composed) return generateSampleBody(composed, spec, depth + 1, seen);

    const type = resolved.type || (resolved.properties ? 'object' : undefined);

    switch (type) {
      case 'object': {
        const props = resolved.properties || {};
        const required = new Set(Array.isArray(resolved.required) ? resolved.required : []);
        const out = {};
        for (const [key, propSchema] of Object.entries(props)) {
          // Required fields always; optional fields only when they carry
          // an example/default/enum so the sample stays realistic and lean.
          const isRich = propSchema && typeof propSchema === 'object'
            && (propSchema.example !== undefined || propSchema.default !== undefined || Array.isArray(propSchema.enum));
          if (required.has(key) || isRich) {
            const value = generateSampleBody(propSchema, spec, depth + 1, seen);
            if (value !== null || (propSchema && propSchema.type === 'null')) out[key] = value;
          }
        }
        return out;
      }
      case 'array': {
        const item = generateSampleBody(resolved.items, spec, depth + 1, seen);
        return item === null ? [] : [item];
      }
      case 'integer':
        return typeof resolved.minimum === 'number' ? resolved.minimum : 0;
      case 'number':
        return typeof resolved.minimum === 'number' ? resolved.minimum : 0;
      case 'boolean':
        return true;
      case 'null':
        return null;
      case 'string':
      default: {
        if (type !== 'string') return null;
        switch (resolved.format) {
          case 'email': return 'user@example.com';
          case 'uuid': return '3fa85f64-5717-4562-b3fc-2c963f66afa6';
          case 'date-time': return '2024-01-01T00:00:00.000Z';
          case 'date': return '2024-01-01';
          case 'uri':
          case 'url': return 'https://example.com';
          case 'password': return 'string';
          default: return 'string';
        }
      }
    }
  } finally {
    seen.delete(schema);
  }
}

// -------------------------------------------------------
// Parameter helpers
// -------------------------------------------------------

/**
 * Converts a Swagger 2.0 non-body parameter into an OpenAPI-style schema
 * by lifting its top-level type/items/format/enum fields.
 */
function swaggerParamToSchema(param) {
  const schema = { type: param.type || 'string' };
  if (param.format) schema.format = param.format;
  if (param.items) schema.items = param.items;
  if (Array.isArray(param.enum)) schema.enum = param.enum;
  if (param.default !== undefined) schema.default = param.default;
  if (param.minimum !== undefined) schema.minimum = param.minimum;
  if (param.maximum !== undefined) schema.maximum = param.maximum;
  if (param.minLength !== undefined) schema.minLength = param.minLength;
  if (param.maxLength !== undefined) schema.maxLength = param.maxLength;
  if (param.pattern) schema.pattern = param.pattern;
  return schema;
}

/** Normalizes one parameter (either spec version) into the output shape. */
function normalizeParameter(spec, rawParam) {
  const param = resolveRef(spec, rawParam);
  if (!param || typeof param !== 'object' || !param.name) return null;

  const location = param.in || 'query';
  let schema;
  if (param.schema) {
    schema = resolveRef(spec, param.schema) || param.schema;
  } else if (location === 'body') {
    schema = null; // body params become the requestBody, not a parameter
  } else {
    schema = swaggerParamToSchema(param);
  }

  const out = {
    name: param.name,
    in: location,
    required: param.required === true || location === 'path',
    description: typeof param.description === 'string' ? param.description : '',
    schema
  };
  if (param.example !== undefined) out.example = param.example;
  return out;
}

// -------------------------------------------------------
// Endpoint extraction
// -------------------------------------------------------

/**
 * Extracts test-plan-ready endpoint descriptors from a parsed spec.
 *
 * For each path item and supported HTTP method, returns:
 *   - method:              GET | POST | PUT | PATCH | DELETE (uppercase)
 *   - path:                the path template, e.g. /users/{id}
 *   - summary:             operation summary (falls back to operationId)
 *   - parameters:          merged path-level + operation-level parameters
 *   - requestBody:         JSON schema of the body (or null)
 *   - expectedStatusCodes: sorted numeric status codes from `responses`
 *   - sampleBody:          deterministic sample instance for prefill (or null)
 *   - operationId, tags:   extra identity for UI grouping
 *
 * @param {Object} spec - Parsed OpenAPI/Swagger spec object
 * @param {Object} [options]
 * @param {number} [options.maxEndpoints=500] Cap for very large specs
 * @returns {Array<Object>}
 * @throws {Error} When the spec version is unrecognized
 */
export function extractEndpoints(spec, options = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('Spec must be a parsed OpenAPI/Swagger object');
  }

  const version = detectSpecVersion(spec);
  if (version === 'unknown') {
    throw new Error(`Unrecognized specification: expected an 'openapi: 3.x' or 'swagger: "2.0"' field`);
  }

  const maxEndpoints = Number.isInteger(options.maxEndpoints) && options.maxEndpoints > 0
    ? options.maxEndpoints
    : MAX_ENDPOINTS_DEFAULT;

  const pathItems = spec.paths && typeof spec.paths === 'object' ? spec.paths : {};
  const endpoints = [];

  for (const [pathTemplate, rawPathItem] of Object.entries(pathItems)) {
    const pathItem = resolveRef(spec, rawPathItem);
    if (!pathItem || typeof pathItem !== 'object') continue;

    // Path-level parameters apply to every operation unless overridden
    // by name + location at the operation level.
    const sharedParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const [rawMethod, rawOperation] of Object.entries(pathItem)) {
      const method = rawMethod.toUpperCase();
      if (!SUPPORTED_METHODS.has(method)) continue;

      const operation = resolveRef(spec, rawOperation);
      if (!operation || typeof operation !== 'object') continue;

      // --- summary ---
      const summary = typeof operation.summary === 'string' && operation.summary.trim()
        ? operation.summary.trim()
        : (typeof operation.operationId === 'string' ? operation.operationId : '');

      // --- parameters (path-level merged with operation-level) ---
      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const byKey = new Map();
      for (const raw of sharedParams) {
        const p = normalizeParameter(spec, raw);
        if (p && p.in !== 'body' && p.in !== 'formData') byKey.set(`${p.in}:${p.name}`, p);
      }
      for (const raw of opParams) {
        const p = normalizeParameter(spec, raw);
        if (p && p.in !== 'body' && p.in !== 'formData') byKey.set(`${p.in}:${p.name}`, p);
      }
      const parameters = [...byKey.values()];

      // --- requestBody schema ---
      let requestBody = null;
      if (version === 'openapi3' && operation.requestBody) {
        const rb = resolveRef(spec, operation.requestBody);
        const content = rb && typeof rb.content === 'object' ? rb.content : null;
        if (content) {
          const contentType = Object.keys(content).find(t => t === 'application/json')
            || Object.keys(content).find(t => t.endsWith('+json'))
            || null;
          if (contentType && content[contentType] && typeof content[contentType].schema === 'object') {
            requestBody = resolveRef(spec, content[contentType].schema) || content[contentType].schema;
          }
        }
      } else if (version === 'swagger2' && Array.isArray(operation.parameters)) {
        // Swagger 2.0: `in: body` is the JSON body; `in: formData` fields
        // are folded into a single object schema.
        const bodyParam = operation.parameters
          .map(raw => resolveRef(spec, raw))
          .find(p => p && p.in === 'body');
        const formDataParams = operation.parameters
          .map(raw => resolveRef(spec, raw))
          .filter(p => p && p.in === 'formData');

        if (bodyParam && bodyParam.schema) {
          requestBody = resolveRef(spec, bodyParam.schema) || bodyParam.schema;
        } else if (formDataParams.length > 0) {
          const properties = {};
          const required = [];
          for (const p of formDataParams) {
            properties[p.name] = swaggerParamToSchema(p);
            if (p.required) required.push(p.name);
          }
          requestBody = { type: 'object', properties, required };
        }
      }

      // --- expected status codes ---
      const responses = operation.responses && typeof operation.responses === 'object'
        ? operation.responses
        : {};
      const codeSet = new Set();
      for (const key of Object.keys(responses)) {
        const code = Number(key);
        if (Number.isInteger(code) && code >= 100 && code <= 599) codeSet.add(code);
      }
      const expectedStatusCodes = [...codeSet].sort((a, b) => a - b);
      if (expectedStatusCodes.length === 0) expectedStatusCodes.push(200);

      // --- sample body for prefill ---
      const sampleBody = requestBody ? generateSampleBody(requestBody, spec) : null;

      endpoints.push({
        method,
        path: pathTemplate,
        summary,
        parameters,
        requestBody,
        expectedStatusCodes,
        sampleBody,
        operationId: typeof operation.operationId === 'string' ? operation.operationId : '',
        tags: Array.isArray(operation.tags) ? operation.tags.filter(t => typeof t === 'string') : []
      });

      if (endpoints.length >= maxEndpoints) {
        return endpoints;
      }
    }
  }

  return endpoints;
}

// -------------------------------------------------------
// Spec metadata
// -------------------------------------------------------

/** Extracts display metadata (title/version) and a suggested base URL. */
function extractMeta(spec, version) {
  const info = spec.info && typeof spec.info === 'object' ? spec.info : {};
  const meta = {
    title: typeof info.title === 'string' && info.title.trim() ? info.title.trim() : 'Untitled API',
    version: typeof info.version === 'string' ? info.version : '',
    description: typeof info.description === 'string' ? info.description : ''
  };

  let baseUrl = null;
  if (version === 'openapi3' && Array.isArray(spec.servers) && spec.servers[0]) {
    const url = spec.servers[0].url;
    if (typeof url === 'string' && url.trim()) baseUrl = url.trim().replace(/\/+$/, '');
  } else if (version === 'swagger2' && typeof spec.host === 'string' && spec.host) {
    const scheme = Array.isArray(spec.schemes) && spec.schemes[0] ? spec.schemes[0] : 'http';
    const basePath = typeof spec.basePath === 'string' ? spec.basePath.replace(/\/+$/, '') : '';
    baseUrl = `${scheme}://${spec.host}${basePath}` || null;
  }

  return { info: meta, baseUrl };
}

// -------------------------------------------------------
// Public entry point
// -------------------------------------------------------

/**
 * Parses a spec string (JSON or YAML) and extracts test-plan-ready endpoints.
 *
 * @param {string} specText - OpenAPI 3.x or Swagger 2.0 document
 * @param {Object} [options] - { maxEndpoints }
 * @returns {{
 *   version: 'openapi3'|'swagger2',
 *   spec: Object,
 *   info: { title: string, version: string, description: string },
 *   baseUrl: string|null,
 *   endpoints: Array<Object>,
 *   totalFound: number,
 *   truncated: boolean
 * }}
 * @throws {Error} On unparseable input or unrecognized spec version
 */
export function parseAndExtract(specText, options = {}) {
  const spec = parseSpecText(specText);
  const version = detectSpecVersion(spec);
  if (version === 'unknown') {
    throw new Error(`Unrecognized specification: expected an 'openapi: 3.x' or 'swagger: "2.0"' field`);
  }

  const maxEndpoints = Number.isInteger(options.maxEndpoints) && options.maxEndpoints > 0
    ? options.maxEndpoints
    : MAX_ENDPOINTS_DEFAULT;

  const allEndpoints = extractEndpoints(spec, { maxEndpoints: Number.MAX_SAFE_INTEGER });
  const endpoints = allEndpoints.slice(0, maxEndpoints);
  const { info, baseUrl } = extractMeta(spec, version);

  return {
    version,
    spec,
    info,
    baseUrl,
    endpoints,
    totalFound: allEndpoints.length,
    truncated: allEndpoints.length > endpoints.length
  };
}

// ===========================================================================
// Safe importer API (parseOpenApiSpec)
//
// This is the entry point used by POST /api/openapi/parse. Unlike the legacy
// helpers above, it fails closed: strict version checks, a single YAML
// document with a bounded alias budget, local-only JSON-pointer refs with
// prototype-pollution guards, hard traversal/size limits, and no invented
// success status codes.
// ===========================================================================

const STRICT_SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const STRICT_METHOD_KEYS = new Set([
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'
]);
const MAX_SPEC_BYTES = 1024 * 1024; // 1 MiB
const MAX_ALIAS_COUNT = 20;
const MAX_REF_DEPTH = 16;
const MAX_TRAVERSAL_DEPTH = 40;
const MAX_NODES = 5000;
const MAX_OPERATIONS = 200;
const UNSAFE_POINTER_TOKENS = new Set(['__proto__', 'constructor', 'prototype']);

const safeHasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function decodePointerToken(token) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** JSON text, YAML text (exactly one document), or an already-parsed object. */
function toSafeSpecObject(source) {
  if (source !== null && typeof source === 'object' && !Array.isArray(source)) {
    return source;
  }
  if (typeof source !== 'string') {
    throw new Error('Specification source must be a JSON/YAML string or an object');
  }
  if (source.trim() === '') {
    throw new Error('Specification source must not be empty');
  }
  if (Buffer.byteLength(source, 'utf8') > MAX_SPEC_BYTES) {
    throw new Error('Specification exceeds the maximum size of 1 MiB');
  }

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    let doc;
    try {
      // 'core' schema only: no custom tags or executable YAML constructs.
      doc = parseDocument(source, { schema: 'core', prettyErrors: true });
    } catch (error) {
      throw new Error(`Failed to parse YAML specification: ${error.message}`);
    }
    if (doc.errors && doc.errors.length > 0) {
      const first = doc.errors[0];
      const where = first.linePos && first.linePos.length
        ? ` at line ${first.linePos[0].line}` : '';
      throw new Error(
        `Failed to parse YAML specification${where}: ${first.message || String(first)}`
      );
    }
    try {
      parsed = doc.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
    } catch (error) {
      throw new Error(`Failed to parse YAML specification: ${error.message}`);
    }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Specification must parse to an object');
  }
  return parsed;
}

/** Only OpenAPI 3.0.x and Swagger 2.0 are accepted. */
function detectSpecDialect(spec) {
  if (safeHasOwn(spec, 'openapi')) {
    const version = String(
      spec.openapi === undefined || spec.openapi === null ? '' : spec.openapi
    ).trim();
    if (/^3\.0\.\d+(?:[-+].*)?$/.test(version)) return 'openapi3';
    throw new Error(
      `Unsupported OpenAPI version "${version || '(empty)'}"; only OpenAPI 3.0.x is supported`
    );
  }
  if (safeHasOwn(spec, 'swagger')) {
    const version = String(
      spec.swagger === undefined || spec.swagger === null ? '' : spec.swagger
    ).trim();
    if (version === '2.0') return 'swagger2';
    throw new Error(
      `Unsupported Swagger version "${version || '(empty)'}"; only Swagger 2.0 is supported`
    );
  }
  throw new Error(
    'Malformed specification: expected an "openapi" (3.0.x) or "swagger" ("2.0") version field'
  );
}

/** Resolve a local JSON-pointer $ref. Never fetches and never reads prototypes. */
function resolveSafeRef(ref, spec) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) {
    throw new Error(
      `Unsupported $ref "${String(ref)}": only local JSON pointers ("#/...") are supported`
    );
  }
  const rawTokens = ref.slice(2).split('/');
  if (rawTokens.length === 0 || rawTokens.length > MAX_REF_DEPTH) {
    throw new Error(`$ref "${ref}" exceeds the maximum pointer depth of ${MAX_REF_DEPTH}`);
  }
  const tokens = rawTokens.map(decodePointerToken);
  for (const token of tokens) {
    if (UNSAFE_POINTER_TOKENS.has(token)) {
      throw new Error(`Refused unsafe $ref pointer token "${token}" in "${ref}"`);
    }
  }

  let node = spec;
  for (const token of tokens) {
    if (node === null || typeof node !== 'object' || !safeHasOwn(node, token)) {
      throw new Error(`Unresolved $ref "${ref}": pointer segment "${token}" was not found`);
    }
    node = node[token];
  }
  return node;
}

function newSafeState() {
  return { depth: 0, refStack: [], objectStack: [], nodes: 0 };
}

/** Deeply dereference a fragment, replacing cycles with bounded markers. */
function derefSafe(value, spec, state) {
  state.nodes += 1;
  if (state.nodes > MAX_NODES) {
    throw new Error('Specification is too complex: node limit exceeded');
  }
  if (value === null || typeof value !== 'object') return value;

  if (state.objectStack.includes(value)) {
    return { $ref: '#/cyclic-structure', description: 'Cyclic structure omitted' };
  }
  const objectStack = [...state.objectStack, value];
  const next = overrides => ({ ...state, objectStack, ...overrides });

  if (Array.isArray(value)) {
    if (state.depth >= MAX_TRAVERSAL_DEPTH) {
      throw new Error('Specification nesting is too deep');
    }
    return value.map(item => derefSafe(item, spec, next({ depth: state.depth + 1 })));
  }

  if (typeof value.$ref === 'string') {
    const ref = value.$ref;
    if (state.refStack.includes(ref)) {
      return { type: 'object', $ref: ref, description: `Recursive reference to ${ref}` };
    }
    if (state.refStack.length >= MAX_REF_DEPTH) {
      throw new Error(`$ref chain exceeds the maximum depth of ${MAX_REF_DEPTH}`);
    }
    if (state.depth >= MAX_TRAVERSAL_DEPTH) {
      throw new Error('Specification nesting is too deep');
    }
    const target = resolveSafeRef(ref, spec);
    if (state.objectStack.includes(target)) {
      return { type: 'object', $ref: ref, description: `Recursive reference to ${ref}` };
    }
    return derefSafe(target, spec, next({
      depth: state.depth + 1,
      refStack: [...state.refStack, ref]
    }));
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref') continue;
    result[key] = derefSafe(child, spec, next({ depth: state.depth + 1 }));
  }
  return result;
}

/** Resolve only a top-level $ref chain (path items, responses). */
function derefRefOnly(value, spec) {
  const refStack = [];
  while (value !== null && typeof value === 'object' && !Array.isArray(value)
         && typeof value.$ref === 'string') {
    const ref = value.$ref;
    if (refStack.includes(ref)) {
      return { $ref: ref, description: `Recursive reference to ${ref}` };
    }
    refStack.push(ref);
    if (refStack.length > MAX_REF_DEPTH) {
      throw new Error(`$ref chain exceeds the maximum depth of ${MAX_REF_DEPTH}`);
    }
    value = resolveSafeRef(ref, spec);
  }
  return value;
}

/** Swagger 2 non-body params carry schema keywords inline. */
function swaggerParamSchema(param, spec) {
  const schema = {};
  for (const key of ['type', 'format', 'enum', 'default', 'minimum', 'maximum',
    'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength',
    'pattern', 'minItems', 'maxItems', 'uniqueItems']) {
    if (param[key] !== undefined) schema[key] = param[key];
  }
  if (param.items !== undefined) {
    schema.items = derefSafe(param.items, spec, newSafeState());
  }
  return Object.keys(schema).length > 0 ? schema : { type: 'string' };
}

/** Normalize an already-dereferenced parameter object. */
function normalizeSafeParameter(param, spec) {
  if (!param || typeof param !== 'object' || Array.isArray(param)) return null;
  const location = typeof param.in === 'string' ? param.in : 'query';
  const name = typeof param.name === 'string' ? param.name : '';
  const schema = param.schema !== null && typeof param.schema === 'object'
    && !Array.isArray(param.schema) ? param.schema : swaggerParamSchema(param, spec);

  let example = null;
  if (param.example !== undefined) example = param.example;
  else if (param['x-example'] !== undefined) example = param['x-example'];
  else if (schema.example !== undefined) example = schema.example;
  else if (param.default !== undefined) example = param.default;

  return {
    name,
    in: location,
    required: Boolean(param.required) || location === 'path',
    description: typeof param.description === 'string' ? param.description : '',
    schema,
    example: example === undefined ? null : example
  };
}

/** OpenAPI override semantics: operation-level wins on (in, name). */
function mergeSafeParameters(pathParams, opParams, spec) {
  const merged = new Map();
  const deref = list => (Array.isArray(list) ? list : [])
    .map(raw => derefSafe(raw, spec, newSafeState()))
    .filter(param => param && typeof param === 'object' && !Array.isArray(param));

  const pathDeref = deref(pathParams);
  const opDeref = deref(opParams);
  for (const param of pathDeref) {
    const normalized = normalizeSafeParameter(param, spec);
    if (normalized) merged.set(`${normalized.in}:${normalized.name}`, normalized);
  }
  for (const param of opDeref) {
    const normalized = normalizeSafeParameter(param, spec);
    if (normalized) merged.set(`${normalized.in}:${normalized.name}`, normalized);
  }

  const bodyParam = [...opDeref, ...pathDeref].find(param => param.in === 'body') || null;
  return { list: [...merged.values()], bodyParam };
}

function pickSafeMediaType(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
  const keys = Object.keys(content);
  if (keys.length === 0) return null;
  if (keys.includes('application/json')) return 'application/json';
  return keys.find(key => /\+json\b|\bjson\b/i.test(key)) || keys[0];
}

function pickSafeConsumes(consumes) {
  const list = Array.isArray(consumes) ? consumes.filter(c => typeof c === 'string') : [];
  if (list.includes('application/json')) return 'application/json';
  return list.find(c => /\+json\b|\bjson\b/i.test(c)) || list[0] || 'application/json';
}

function buildSafeOas3RequestBody(operation, spec) {
  if (operation.requestBody === undefined || operation.requestBody === null) return null;
  const rb = derefSafe(operation.requestBody, spec, newSafeState());
  if (!rb || typeof rb !== 'object' || Array.isArray(rb)) return null;

  const contentType = pickSafeMediaType(rb.content);
  const media = contentType ? rb.content[contentType] : null;
  const schema = media && media.schema && typeof media.schema === 'object'
    && !Array.isArray(media.schema) ? media.schema : null;
  let example = null;
  if (media && media.example !== undefined) example = media.example;
  else if (schema && schema.example !== undefined) example = schema.example;

  return {
    required: Boolean(rb.required),
    contentType,
    schema,
    example: example === undefined ? null : example
  };
}

function buildSafeSwaggerRequestBody(bodyParam, formDataParams, spec, consumes) {
  const contentType = pickSafeConsumes(consumes);
  if (bodyParam) {
    const schema = bodyParam.schema && typeof bodyParam.schema === 'object'
      && !Array.isArray(bodyParam.schema) ? bodyParam.schema : null;
    let example = null;
    if (bodyParam['x-example'] !== undefined) example = bodyParam['x-example'];
    else if (bodyParam.example !== undefined) example = bodyParam.example;
    else if (schema && schema.example !== undefined) example = schema.example;
    return {
      required: Boolean(bodyParam.required),
      contentType,
      schema,
      example: example === undefined ? null : example
    };
  }

  if (formDataParams.length > 0) {
    const properties = {};
    const required = [];
    const example = {};
    for (const param of formDataParams) {
      if (!param.name) continue;
      properties[param.name] = swaggerParamSchema(param, spec);
      if (param.required) required.push(param.name);
      if (param.example !== null && param.example !== undefined) {
        example[param.name] = param.example;
      }
    }
    const schema = { type: 'object', properties };
    if (required.length > 0) schema.required = required;
    return {
      required: formDataParams.some(param => param.required),
      contentType,
      schema,
      example: Object.keys(example).length > 0 ? example : null
    };
  }
  return null;
}

/** Only explicit numeric 2xx responses count as expected successes. */
function buildSafeExpected(responses, spec) {
  const statusCodes = [];
  const descriptions = [];
  if (responses && typeof responses === 'object' && !Array.isArray(responses)) {
    for (const [key, rawResponse] of Object.entries(responses)) {
      const code = Number(key);
      if (!Number.isInteger(code) || code < 200 || code > 299) continue;
      statusCodes.push(code);
      const response = derefRefOnly(rawResponse, spec);
      const description = response && typeof response.description === 'string'
        ? response.description.trim() : '';
      descriptions.push(`${code}: ${description || 'No description'}`);
    }
  }
  const unique = [...new Set(statusCodes)].sort((a, b) => a - b);
  return {
    statusCodes: unique,
    description: unique.length > 0
      ? `Success responses: ${descriptions.join('; ')}`
      : 'No explicit 2xx response documented'
  };
}

/**
 * Return the literal base URL plus a review flag.
 * Server variables are never substituted: templates such as `{baseUrl}` are
 * returned verbatim and flagged, so placeholders cannot be treated as trusted
 * targets. Literal URLs must use http(s) to be considered safe.
 */
function readSafeServerInfo(spec, version) {
  let url = null;
  if (version === 'openapi3') {
    const servers = spec.servers;
    if (Array.isArray(servers) && servers.length > 0 && servers[0]
        && typeof servers[0].url === 'string') {
      url = servers[0].url;
    }
  } else {
    const scheme = Array.isArray(spec.schemes) && spec.schemes.length > 0
      ? spec.schemes[0] : null;
    const host = typeof spec.host === 'string' && spec.host ? spec.host : null;
    if (host) {
      const basePath = typeof spec.basePath === 'string' && spec.basePath.startsWith('/')
        ? spec.basePath : '';
      url = `${scheme ? `${scheme}://` : ''}${host}${basePath}`;
    }
  }

  if (typeof url !== 'string' || url.trim() === '') {
    return { serverUrl: null, serverUrlNeedsReview: false };
  }
  const serverUrl = url.trim();
  const hasVariables = /\{[^}]+\}/.test(serverUrl);
  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\//i.exec(serverUrl);
  const hasSafeScheme = Boolean(schemeMatch)
    && ['http:', 'https:'].includes(`${schemeMatch[1].toLowerCase()}:`);
  return {
    serverUrl,
    serverUrlNeedsReview: hasVariables || !hasSafeScheme
  };
}

function buildSafeHeaders(parameters, contentType) {
  const headers = {};
  if (contentType) headers['Content-Type'] = contentType;
  for (const param of parameters) {
    if (param.in !== 'header' || !param.name) continue;
    headers[param.name] = param.example === null || param.example === undefined
      ? '' : param.example;
  }
  return headers;
}

/**
 * Parse an OpenAPI 3.0.x / Swagger 2.0 spec into APIForge endpoint objects.
 *
 * @param {string|Object} source JSON text, YAML text, or a parsed spec object
 * @returns {Array<Object>} normalized endpoint descriptors
 * @throws {Error} on malformed/unsupported specs or unsafe constructs
 */
export function parseOpenApiSpec(source) {
  const spec = toSafeSpecObject(source);
  const version = detectSpecDialect(spec);

  const paths = spec.paths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)) return [];

  const { serverUrl, serverUrlNeedsReview } = readSafeServerInfo(spec, version);
  const apiTitle = spec.info && typeof spec.info.title === 'string'
    ? spec.info.title : null;
  const apiVersion = version === 'openapi3' ? String(spec.openapi) : String(spec.swagger);
  const specConsumes = version === 'swagger2' && Array.isArray(spec.consumes)
    ? spec.consumes : [];

  const endpoints = [];
  let operationCount = 0;

  for (const [pathTemplate, rawPathItem] of Object.entries(paths)) {
    const pathItem = derefRefOnly(rawPathItem, spec);
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) continue;
    const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

    for (const [rawMethod, operation] of Object.entries(pathItem)) {
      if (!STRICT_METHOD_KEYS.has(rawMethod.toLowerCase())) continue;
      operationCount += 1;
      if (operationCount > MAX_OPERATIONS) {
        throw new Error(`Specification contains too many operations; limit is ${MAX_OPERATIONS}`);
      }

      const method = rawMethod.toUpperCase();
      if (!STRICT_SUPPORTED_METHODS.includes(method)) continue;
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue;

      const opParams = Array.isArray(operation.parameters) ? operation.parameters : [];
      const { list, bodyParam } = mergeSafeParameters(pathParams, opParams, spec);

      const requestBody = version === 'openapi3'
        ? buildSafeOas3RequestBody(operation, spec)
        : buildSafeSwaggerRequestBody(
            bodyParam,
            list.filter(param => param.in === 'formData'),
            spec,
            Array.isArray(operation.consumes) ? operation.consumes : specConsumes
          );

      const parameters = version === 'swagger2'
        ? list.filter(param => param.in !== 'body' && param.in !== 'formData')
        : list;
      const expected = buildSafeExpected(operation.responses, spec);

      endpoints.push({
        method,
        path: pathTemplate,
        summary: typeof operation.summary === 'string' ? operation.summary.trim() : '',
        description: typeof operation.description === 'string' ? operation.description.trim() : '',
        operationId: typeof operation.operationId === 'string' ? operation.operationId : null,
        parameters,
        requestBody,
        request: {
          method,
          path: pathTemplate,
          headers: buildSafeHeaders(parameters, requestBody ? requestBody.contentType : null),
          body: requestBody ? requestBody.example : null
        },
        expected,
        requiresReview: expected.statusCodes.length === 0 || serverUrlNeedsReview,
        serverUrl,
        serverUrlNeedsReview,
        apiVersion,
        apiTitle
      });
    }
  }

  return endpoints;
}
