/**
 * Suite file helpers: creation, normalization, validation and stable IDs.
 * Suite files are the on-disk contract between `import` and `run`.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const SCHEMA_VERSION = 1;
export const DEFAULT_SUITE_NAME = 'APIForge Suite';
export const DEFAULT_ENVIRONMENT = 'default';
export const DEFAULT_SUITE_FILENAME = 'apiforge.suite.json';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** Deterministic, index-scoped ID derived from method + path. */
export function makeTestId(endpoint, index = 0) {
  const isObject = endpoint !== null && typeof endpoint === 'object' && !Array.isArray(endpoint);
  const method = isObject ? String(endpoint.method || '').toUpperCase() : '';
  const path = isObject
    ? String(endpoint.path || endpoint.request?.path || '')
    : String(endpoint || '');
  const slug = path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'root';
  const prefix = SUPPORTED_METHODS.has(method) ? `${method.toLowerCase()}-` : '';
  return `${prefix}${slug}-${String(index + 1).padStart(3, '0')}`;
}

function normalizeVariables(input) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    if (['string', 'number', 'boolean'].includes(typeof value)) out[key] = value;
  }
  return out;
}

function normalizeHeaders(input) {
  const out = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    out[key] = ['string', 'number', 'boolean'].includes(typeof value) ? value : String(value);
  }
  return out;
}

function normalizeStatusCodes(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const code of input) {
    if (!Number.isInteger(code) || code < 100 || code > 599 || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/** Normalize a single test while preserving explicit review/confirmation flags. */
export function normalizeTest(raw, index = 0) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const request = source.request && typeof source.request === 'object' && !Array.isArray(source.request)
    ? source.request
    : {};
  const expected = source.expected && typeof source.expected === 'object' && !Array.isArray(source.expected)
    ? source.expected
    : {};
  const rawMethod = typeof request.method === 'string' ? request.method.toUpperCase() : '';
  const method = SUPPORTED_METHODS.has(rawMethod) ? rawMethod : 'GET';
  const path = typeof request.path === 'string' && request.path.trim()
    ? request.path.trim()
    : '/';
  const statusCodes = normalizeStatusCodes(expected.statusCodes);

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : makeTestId({ method, path }, index),
    name: typeof source.name === 'string' && source.name.trim() ? source.name : `Test ${index + 1}`,
    category: typeof source.category === 'string' && source.category.trim() ? source.category : 'happy_path',
    severity: typeof source.severity === 'string' && source.severity.trim() ? source.severity : 'medium',
    request: {
      method,
      path,
      headers: normalizeHeaders(request.headers),
      body: request.body === undefined ? null : request.body
    },
    expected: {
      statusCodes,
      description: typeof expected.description === 'string' ? expected.description : ''
    },
    requiresReview: Boolean(source.requiresReview),
    confirmed: Boolean(source.confirmed),
    description: typeof source.description === 'string' ? source.description : '',
    rationale: typeof source.rationale === 'string' ? source.rationale : ''
  };
}

/** Build a fresh, versioned suite object. */
export function createSuite({
  name = DEFAULT_SUITE_NAME,
  targetBaseUrl = '',
  variables = {},
  tests = []
} = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_SUITE_NAME,
    environments: {
      [DEFAULT_ENVIRONMENT]: {
        targetBaseUrl: typeof targetBaseUrl === 'string' ? targetBaseUrl : '',
        variables: normalizeVariables(variables)
      }
    },
    environment: DEFAULT_ENVIRONMENT,
    tests: (Array.isArray(tests) ? tests : []).map(normalizeTest)
  };
}

/**
 * Validate and normalize a raw suite object. Unknown schema versions are
 * rejected with a clear message rather than silently interpreted.
 */
export function normalizeSuite(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Suite must be a JSON object');
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported suite schemaVersion: ${JSON.stringify(raw.schemaVersion)}. Expected ${SCHEMA_VERSION}`
    );
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : DEFAULT_SUITE_NAME;
  const rawEnvironments = raw.environments && typeof raw.environments === 'object' && !Array.isArray(raw.environments)
    ? raw.environments
    : {};
  const environments = {};
  for (const [envName, env] of Object.entries(rawEnvironments)) {
    if (!env || typeof env !== 'object' || Array.isArray(env)) continue;
    environments[envName] = {
      targetBaseUrl: typeof env.targetBaseUrl === 'string' ? env.targetBaseUrl : '',
      variables: normalizeVariables(env.variables)
    };
  }
  if (Object.keys(environments).length === 0) {
    environments[DEFAULT_ENVIRONMENT] = { targetBaseUrl: '', variables: {} };
  }

  const environment = typeof raw.environment === 'string' && raw.environment.trim()
    ? raw.environment.trim()
    : DEFAULT_ENVIRONMENT;
  if (!hasOwn(environments, environment)) {
    throw new Error(
      `Selected environment "${environment}" is not defined. Available: ${Object.keys(environments).join(', ')}`
    );
  }

  const tests = Array.isArray(raw.tests) ? raw.tests.map(normalizeTest) : [];
  return { schemaVersion: SCHEMA_VERSION, name, environments, environment, tests };
}

/** Resolve an environment by name, with variables normalized. */
export function resolveEnvironment(suite, name) {
  if (!suite || typeof suite !== 'object') throw new Error('Suite must be a loaded suite object');
  const all = suite.environments && typeof suite.environments === 'object' ? suite.environments : {};
  const envName = typeof name === 'string' && name.trim() ? name.trim() : (suite.environment || DEFAULT_ENVIRONMENT);
  const env = all[envName];
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    const available = Object.keys(all).join(', ') || '(none)';
    throw new Error(`Environment "${envName}" is not defined. Available environments: ${available}`);
  }
  return {
    name: envName,
    targetBaseUrl: typeof env.targetBaseUrl === 'string' ? env.targetBaseUrl : '',
    variables: normalizeVariables(env.variables)
  };
}

export function readSuite(filePath) {
  let text;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read suite file "${filePath}": ${err.message}`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse suite file "${filePath}" as JSON: ${err.message}`);
  }
  return normalizeSuite(raw);
}

export function writeSuite(filePath, suite) {
  const normalized = normalizeSuite(suite);
  try {
    writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  } catch (err) {
    throw new Error(`Failed to write suite file "${filePath}": ${err.message}`);
  }
  return filePath;
}
