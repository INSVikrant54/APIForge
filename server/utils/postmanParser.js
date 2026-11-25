/**
 * Bounded Postman Collection v2.1 reader.
 *
 * Collections are treated as data only: Postman scripts are never executed,
 * only request metadata is extracted. The output shape is intentionally close
 * to the OpenAPI endpoint descriptors so both imports feel the same in the UI.
 */

export const MAX_POSTMAN_ITEMS = 50;
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_HEADERS = 50;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_DEPTH = 8;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function urlToString(raw) {
  if (typeof raw === 'string') return raw.trim();
  if (!isRecord(raw)) return '';
  if (typeof raw.raw === 'string' && raw.raw.trim()) return raw.raw.trim();

  const protocol = typeof raw.protocol === 'string' && raw.protocol.trim()
    ? raw.protocol.replace(/:$/, '')
    : 'https';
  const hostParts = Array.isArray(raw.host)
    ? raw.host
    : (typeof raw.host === 'string' ? raw.host.split('.') : []);
  const host = hostParts.map((part) => (isRecord(part) ? part.value : part)).filter(Boolean).join('.');
  const pathParts = Array.isArray(raw.path)
    ? raw.path.map((part) => (isRecord(part) ? part.value : part))
    : (typeof raw.path === 'string' ? [raw.path] : []);
  // Postman segments usually omit the separating slash (["v1", "orders"]).
  const segments = pathParts
    .filter((part) => typeof part === 'string')
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  let path = segments.length ? `/${segments.join('/')}` : '';

  const query = (Array.isArray(raw.query) ? raw.query : [])
    .filter((entry) => isRecord(entry) && !entry.disabled && entry.key)
    .slice(0, MAX_HEADERS)
    .map((entry) => `${encodeURIComponent(String(entry.key))}=${encodeURIComponent(String(entry.value ?? ''))}`)
    .join('&');
  const hash = typeof raw.hash === 'string' && raw.hash ? `#${raw.hash.replace(/^#/, '')}` : '';
  const suffix = `${query ? `?${query}` : ''}${hash}`;
  return host ? `${protocol}://${host}${path}${suffix}` : `${path}${suffix}`;
}

function normalizeHeaders(raw) {
  const headers = {};
  let count = 0;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!isRecord(entry) || entry.disabled || typeof entry.key !== 'string' || !entry.key.trim()) continue;
      if (count >= MAX_HEADERS) break;
      headers[entry.key] = String(entry.value ?? '');
      count += 1;
    }
  } else if (isRecord(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (count >= MAX_HEADERS) break;
      headers[key] = String(value ?? '');
      count += 1;
    }
  }
  return headers;
}

function normalizeBody(raw) {
  if (!isRecord(raw)) return null;
  if (typeof raw.raw !== 'string' || raw.raw.trim() === '') return null;
  const text = raw.raw;
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error(`A request body exceeds the ${MAX_BODY_BYTES / 1024} KiB limit.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function collectRequests(items, out, depth) {
  if (!Array.isArray(items)) return;
  if (depth > MAX_DEPTH) throw new Error('Postman collection nesting is too deep.');
  for (const item of items) {
    if (!isRecord(item)) continue;
    if (Array.isArray(item.item)) {
      collectRequests(item.item, out, depth + 1);
      continue;
    }
    if (!isRecord(item.request)) continue;
    out.push(item);
    if (out.length > MAX_POSTMAN_ITEMS) {
      throw new Error(`Postman collections are limited to ${MAX_POSTMAN_ITEMS} requests. Split the collection and import it in parts.`);
    }
  }
}

/** Parse a v2.1 collection into bounded, test-plan-ready endpoint descriptors. */
export function parsePostmanCollection(source) {
  const text = typeof source === 'string'
    ? source
    : (isRecord(source) ? JSON.stringify(source) : '');
  if (!text.trim()) throw new Error('Paste a Postman collection or choose a JSON file.');
  if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES) {
    throw new Error('Choose a Postman collection no larger than 1 MiB.');
  }

  let collection;
  try {
    collection = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Export the collection as JSON from Postman.');
  }
  if (!isRecord(collection) || !isRecord(collection.info)) {
    throw new Error('This does not look like a Postman collection (missing info section).');
  }

  const schema = typeof collection.info.schema === 'string' ? collection.info.schema : '';
  const version = /\/v(\d+(?:\.\d+)*)\//.exec(schema)?.[1] || '';
  if (version.startsWith('1.')) {
    throw new Error('Postman Collection v1.0 is not supported. Open the collection in Postman and export it as Collection v2.1.');
  }
  if (!version.startsWith('2.1')) {
    throw new Error(`Only Postman Collection v2.1 is supported${version ? ` (found v${version})` : ''}. Export it as Collection v2.1 from Postman.`);
  }

  const requests = [];
  collectRequests(collection.item, requests, 0);
  if (requests.length === 0) throw new Error('No requests were found in this collection.');

  const apiTitle = typeof collection.info.name === 'string' ? collection.info.name : '';
  return requests.map((item, index) => {
    const request = item.request;
    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    const path = urlToString(request.url);
    const headers = normalizeHeaders(request.header);
    const body = normalizeBody(request.body);
    const name = typeof item.name === 'string' && item.name.trim() ? item.name : `Request ${index + 1}`;

    return {
      method,
      path,
      summary: name,
      description: typeof request.description === 'string' ? request.description : '',
      parameters: [],
      requestBody: {
        required: body !== null,
        contentType: 'application/json',
        schema: null,
        example: body
      },
      expectedStatusCodes: [],
      request: { method, path, headers, body },
      operationId: `postman-${index + 1}`,
      tags: [],
      requiresReview: true,
      serverUrl: '',
      serverUrlNeedsReview: true,
      apiTitle,
      source: 'postman'
    };
  });
}
