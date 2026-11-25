/**
 * Pure, dependency-free auth helpers shared by the server, CLI, and client.
 *
 * Auth configuration never holds a secret value directly: each credential is
 * identified by the name of an environment variable. Values are resolved at
 * call time from that environment, so the same redaction set covers every
 * injected credential. Unknown variables are skipped rather than sending an
 * empty credential.
 */

export const AUTH_TYPES = ['none', 'bearer', 'apiKeyHeader', 'apiKeyQuery', 'basic'];

const SAFE_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const SAFE_HEADER = /^[A-Za-z0-9-]{1,64}$/;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

/** Deterministic base64 for UTF-8 basic credentials (no Node-only globals). */
function base64Utf8(input) {
  const bytes = new TextEncoder().encode(String(input));
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
      + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=')
      + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

function emptyAuth() {
  return {
    type: 'none',
    tokenVariable: '',
    keyVariable: '',
    headerName: 'X-API-Key',
    queryParam: 'api_key',
    usernameVariable: '',
    passwordVariable: ''
  };
}

/** Normalize untrusted auth config into a bounded, predictable shape. */
export function normalizeAuth(raw) {
  if (!isRecord(raw)) return emptyAuth();
  const base = emptyAuth();
  const type = AUTH_TYPES.includes(raw.type) ? raw.type : 'none';
  return {
    type,
    tokenVariable: text(raw.tokenVariable),
    keyVariable: text(raw.keyVariable),
    headerName: text(raw.headerName) || base.headerName,
    queryParam: text(raw.queryParam) || base.queryParam,
    usernameVariable: text(raw.usernameVariable),
    passwordVariable: text(raw.passwordVariable)
  };
}

/** Variable names whose values are used as credentials and must be redacted. */
export function authVariableNames(auth) {
  const config = normalizeAuth(auth);
  const names = [];
  if (config.type === 'bearer' && config.tokenVariable) names.push(config.tokenVariable);
  if (config.type === 'apiKeyHeader' && config.keyVariable) names.push(config.keyVariable);
  if (config.type === 'apiKeyQuery' && config.keyVariable) names.push(config.keyVariable);
  if (config.type === 'basic') {
    if (config.usernameVariable) names.push(config.usernameVariable);
    if (config.passwordVariable) names.push(config.passwordVariable);
  }
  return [...new Set(names)];
}

/** Build the headers and query parameters required by the auth config. */
export function resolveAuth(auth, values = {}) {
  const config = normalizeAuth(auth);
  const source = isRecord(values) ? values : {};
  const lookup = (name) => {
    if (typeof name !== 'string' || name.trim() === '' || !hasOwn(source, name)) return '';
    const value = source[name];
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  const headers = {};
  const query = {};
  if (config.type === 'bearer') {
    const token = lookup(config.tokenVariable);
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (config.type === 'apiKeyHeader') {
    const key = lookup(config.keyVariable);
    if (key && SAFE_HEADER.test(config.headerName)) headers[config.headerName] = key;
  } else if (config.type === 'apiKeyQuery') {
    const key = lookup(config.keyVariable);
    if (key && SAFE_NAME.test(config.queryParam)) query[config.queryParam] = key;
  } else if (config.type === 'basic') {
    const username = lookup(config.usernameVariable);
    const password = lookup(config.passwordVariable);
    if (username || password) {
      headers.Authorization = `Basic ${base64Utf8(`${username}:${password}`)}`;
    }
  }
  return { headers, query };
}

function setQueryParams(path, query) {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const before = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = before.indexOf('?');
  const base = queryIndex >= 0 ? before.slice(0, queryIndex) : before;
  const existing = queryIndex >= 0 ? before.slice(queryIndex + 1) : '';
  const parts = existing ? existing.split('&').filter(Boolean) : [];
  for (const [name, value] of Object.entries(query)) {
    const prefix = `${encodeURIComponent(name)}=`;
    const encoded = `${prefix}${encodeURIComponent(value)}`;
    const index = parts.findIndex((part) => part.startsWith(prefix));
    if (index >= 0) parts[index] = encoded;
    else parts.push(encoded);
  }
  return `${base}${parts.length ? `?${parts.join('&')}` : ''}${hash}`;
}

/**
 * Return copies of the tests with auth attached to every request. Applying the
 * same config twice is idempotent (headers are overwritten, query params
 * replaced), which keeps client-side and server-side injection safe together.
 */
export function applyAuthToTests(tests, auth, values = {}) {
  if (!Array.isArray(tests)) return tests;
  const { headers, query } = resolveAuth(auth, values);
  if (Object.keys(headers).length === 0 && Object.keys(query).length === 0) return tests;

  return tests.map((test) => {
    if (!isRecord(test)) return test;
    const request = isRecord(test.request) ? test.request : {};
    const nextRequest = {
      ...request,
      headers: { ...(isRecord(request.headers) ? request.headers : {}) }
    };
    for (const [name, value] of Object.entries(headers)) nextRequest.headers[name] = value;
    if (Object.keys(query).length > 0) {
      nextRequest.path = setQueryParams(text(request.path), query);
    }
    return { ...test, request: nextRequest };
  });
}
