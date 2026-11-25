/**
 * Pure, dependency-free environment/variable resolver shared by the server,
 * CLI, and client. No I/O, no globals, no input mutation.
 *
 * Environments are maps of name -> { targetBaseUrl, variables } (a plain string
 * is shorthand for a base URL). Variables are plain values or
 * `{ value, secret }` records. Unknown `{{name}}` placeholders stay visible so
 * the user can fix them instead of silently sending an empty value.
 */

export const DEFAULT_ENVIRONMENT_NAMES = ['development', 'staging', 'production'];
export const DEFAULT_MAX_DEPTH = 4;
export const REDACTED = '[REDACTED]';

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const PRIMITIVES = new Set(['string', 'number', 'boolean']);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
export const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Normalize one variable into `{ value, secret }`. */
export function normalizeVariable(raw) {
  if (isRecord(raw)) {
    const source = raw.value;
    const value = source === null || source === undefined
      ? ''
      : (PRIMITIVES.has(typeof source) ? source : String(source));
    return { value, secret: Boolean(raw.secret) };
  }
  if (raw === null || raw === undefined) return { value: '', secret: false };
  return { value: PRIMITIVES.has(typeof raw) ? raw : String(raw), secret: false };
}

/** Normalize a variables map; null/undefined entries are skipped. */
export function normalizeVariables(input) {
  const out = {};
  if (!isRecord(input)) return out;
  for (const [name, raw] of Object.entries(input)) {
    if (raw === null || raw === undefined) continue;
    out[name] = normalizeVariable(raw);
  }
  return out;
}

/** Plain name -> value map used for substitution. */
export function getVariableValues(variables = {}) {
  const out = {};
  if (!isRecord(variables)) return out;
  for (const [name, record] of Object.entries(variables)) {
    const value = isRecord(record) ? record.value : record;
    if (value === null || value === undefined) continue;
    out[name] = PRIMITIVES.has(typeof value) ? value : String(value);
  }
  return out;
}

/**
 * Secret values that must never appear in logs, exports, or run history.
 * `names` are variable keys (not literal secret strings): each key is resolved
 * against `variables` and its value is added to the redaction set. Unknown,
 * empty, or non-string keys are ignored so a variable name can never be
 * mistaken for a secret value.
 */
export function getSecretValues(variables = {}, names = []) {
  const values = new Set();
  if (isRecord(variables)) {
    for (const raw of Object.values(variables)) {
      const record = isRecord(raw) ? raw : { value: raw, secret: false };
      if (!record.secret) continue;
      if (record.value === null || record.value === undefined || record.value === '') continue;
      values.add(String(record.value));
    }
  }
  for (const name of Array.isArray(names) ? names : []) {
    if (typeof name !== 'string' || name.trim() === '') continue;
    if (!isRecord(variables) || !hasOwn(variables, name)) continue;
    const raw = variables[name];
    const value = isRecord(raw) ? raw.value : raw;
    if (value === null || value === undefined || value === '') continue;
    values.add(String(value));
  }
  return [...values];
}

/** Normalize a single environment (string shorthand = target base URL). */
export function normalizeEnvironment(name, raw) {
  const envName = typeof name === 'string' && name.trim() ? name.trim() : 'default';
  if (typeof raw === 'string') {
    return { name: envName, targetBaseUrl: raw, variables: {} };
  }
  const source = isRecord(raw) ? raw : {};
  const base = typeof source.targetBaseUrl === 'string'
    ? source.targetBaseUrl
    : (typeof source.baseUrl === 'string' ? source.baseUrl : '');
  return {
    name: envName,
    targetBaseUrl: base,
    variables: normalizeVariables(source.variables)
  };
}

/** Normalize a named-environment map. */
export function normalizeEnvironments(input) {
  const out = {};
  if (!isRecord(input)) return out;
  for (const [name, raw] of Object.entries(input)) {
    out[name] = normalizeEnvironment(name, raw);
  }
  return out;
}

/** Resolve one environment by name; unknown names fail loudly. */
export function resolveEnvironment(environments, name, fallback) {
  const all = normalizeEnvironments(environments);
  const envName = typeof name === 'string' && name.trim()
    ? name.trim()
    : (typeof fallback === 'string' && fallback.trim() ? fallback.trim() : '');
  if (envName && hasOwn(all, envName)) return all[envName];
  const available = Object.keys(all).join(', ') || '(none)';
  throw new Error(`Environment "${envName || '(none)'}" is not defined. Available environments: ${available}`);
}

/** Resolve substitution values for a named environment. */
export function resolveValues(environments, name, fallback) {
  return getVariableValues(resolveEnvironment(environments, name, fallback).variables);
}

function boundedDepth(options) {
  const value = Number(options && options.maxDepth);
  if (!Number.isFinite(value)) return DEFAULT_MAX_DEPTH;
  return Math.min(Math.max(Math.round(value), 0), 8);
}

/** Substitute `{{name}}` in a string, with bounded recursive values. */
export function substituteString(text, values = {}, options = {}) {
  if (typeof text !== 'string' || text.length === 0) return text;
  const maxDepth = boundedDepth(options);

  const expand = (source, depth, seen) => source.replace(PLACEHOLDER, (match, rawName) => {
    const name = String(rawName).trim();
    if (!hasOwn(values, name)) return match;
    const value = values[name];
    if (value === null || value === undefined) return match;
    if (depth >= maxDepth || seen.has(name)) return match;
    const nextSeen = new Set(seen);
    nextSeen.add(name);
    return expand(String(value), depth + 1, nextSeen);
  });

  return expand(text, 0, new Set());
}

/** Recursively substitute in arrays and plain objects; never mutates input. */
export function substituteValue(value, values = {}, options = {}) {
  if (typeof value === 'string') return substituteString(value, values, options);
  if (Array.isArray(value)) return value.map((item) => substituteValue(item, values, options));
  if (!isRecord(value)) return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = substituteValue(child, values, options);
  }
  return out;
}

/** Substitute path, headers, and body while preserving other request fields. */
export function substituteRequest(request, values = {}, options = {}) {
  const source = isRecord(request) ? request : {};
  return {
    ...source,
    path: substituteString(typeof source.path === 'string' ? source.path : '', values, options),
    headers: substituteValue(isRecord(source.headers) ? source.headers : {}, values, options),
    body: substituteValue(source.body === undefined ? null : source.body, values, options)
  };
}

/** Substitute all tests in a suite without mutating them. */
export function substituteTests(tests, values = {}, options = {}) {
  if (!Array.isArray(tests)) return [];
  return tests.map((test) => isRecord(test)
    ? { ...test, request: substituteRequest(test.request, values, options) }
    : test);
}

/** Substitute a base URL (empty/non-string input becomes an empty string). */
export function substituteBaseUrl(baseUrl, values = {}, options = {}) {
  return substituteString(typeof baseUrl === 'string' ? baseUrl : '', values, options);
}

/** Replace literal secret occurrences in any string, recursively in data. */
export function redactText(text, secrets = []) {
  if (typeof text !== 'string' || text.length === 0) return text;
  return orderedSecrets(secrets).reduce(
    (current, secret) => current.split(secret).join(REDACTED),
    text
  );
}

function orderedSecrets(secrets) {
  return [...new Set((Array.isArray(secrets) ? secrets : [])
    .filter((s) => typeof s === 'string' && s.length > 0))]
    .sort((a, b) => b.length - a.length);
}

/** Deep-clone and redact secret values from reports, requests, and exports. */
export function redactSecrets(value, secrets = []) {
  if (typeof value === 'string') return redactText(value, secrets);
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, secrets));
  if (!isRecord(value)) return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = redactSecrets(child, secrets);
  }
  return out;
}

/** Safe environment view for UI display: secrets are replaced with a marker. */
export function toSafeEnvironment(env, secrets) {
  const source = isRecord(env) ? env : {};
  const values = getSecretValues(source.variables);
  const hidden = orderedSecrets(secrets === undefined ? values : secrets);
  const variables = {};
  for (const [name, raw] of Object.entries(isRecord(source.variables) ? source.variables : {})) {
    const record = normalizeVariable(raw);
    variables[name] = {
      value: record.secret ? REDACTED : redactText(record.value, hidden),
      secret: record.secret
    };
  }
  return {
    ...source,
    targetBaseUrl: redactText(typeof source.targetBaseUrl === 'string' ? source.targetBaseUrl : '', hidden),
    variables
  };
}
