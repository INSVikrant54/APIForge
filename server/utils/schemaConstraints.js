/**
 * Bounded extraction of human-readable constraints from a JSON Schema.
 *
 * Used to append "smart defaults" to AI business rules without dumping an
 * entire unbounded schema into the prompt. Pure and isomorphic (browser +
 * Node), dependency free.
 */

export const MAX_SCHEMA_CONSTRAINTS = 20;
const MAX_DEPTH = 6;
const MAX_NODES = 200;
const MAX_TEXT = 120;
const SENSITIVE_NAME = /(pass(word)?|secret|token|api[-_]?key|credential|authorization)/i;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function short(value, limit = MAX_TEXT) {
  const raw = isRecord(value) || Array.isArray(value) ? JSON.stringify(value) : String(value);
  const text = raw.replace(/[\r\n\t]+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function describe(node, name) {
  const parts = [];
  if (Array.isArray(node.type)) parts.push(node.type.join('|'));
  else if (typeof node.type === 'string' && node.type.trim()) parts.push(short(node.type, 32));
  if (typeof node.format === 'string' && node.format.trim()) parts.push(`format ${short(node.format, 32)}`);
  if (Array.isArray(node.enum) && node.enum.length) {
    parts.push(`enum ${node.enum.slice(0, 5).map((v) => short(v, 32)).join(', ')}${node.enum.length > 5 ? ' …' : ''}`);
  }
  if (node.minimum !== undefined) parts.push(`min ${short(node.minimum, 32)}`);
  if (node.maximum !== undefined) parts.push(`max ${short(node.maximum, 32)}`);
  if (node.minLength !== undefined) parts.push(`minLength ${short(node.minLength, 32)}`);
  if (node.maxLength !== undefined) parts.push(`maxLength ${short(node.maxLength, 32)}`);
  if (typeof node.pattern === 'string' && node.pattern.trim()) parts.push(`pattern ${short(node.pattern, 48)}`);
  if (typeof node.description === 'string' && node.description.trim()) parts.push(short(node.description, 48));
  if (!SENSITIVE_NAME.test(name)) {
    if (node.default !== undefined) parts.push(`default ${short(node.default, 32)}`);
    if (node.example !== undefined) parts.push(`example ${short(node.example, 32)}`);
  }
  return parts.join(', ');
}

/**
 * @returns {string[]} at most `maxConstraints` (<= 20) readable constraints.
 */
export function extractSchemaConstraints(schema, options = {}) {
  const requested = options.maxConstraints;
  const limit = Number.isInteger(requested) && requested > 0
    ? Math.min(requested, MAX_SCHEMA_CONSTRAINTS)
    : MAX_SCHEMA_CONSTRAINTS;
  if (!isRecord(schema)) return [];

  const lines = [];
  let truncated = false;
  let nodes = 0;
  const add = (text) => {
    if (lines.length < limit) lines.push(text);
    else truncated = true;
  };

  function walk(node, path, depth) {
    if (!isRecord(node) || depth > MAX_DEPTH || nodes >= MAX_NODES) return;
    nodes += 1;

    if (Array.isArray(node.required) && node.required.length) {
      const names = node.required.filter((n) => typeof n === 'string' && n.trim()).slice(0, 10);
      if (names.length) add(`${path} required fields: ${names.map((n) => short(n, 48)).join(', ')}`);
    }

    const properties = isRecord(node.properties) ? node.properties : null;
    if (properties) {
      const entries = Object.entries(properties);
      for (let i = 0; i < entries.length; i += 1) {
        const [name, child] = entries[i];
        if (!isRecord(child)) continue;
        const detail = describe(child, name);
        if (detail) add(`${path}.${short(name, 48)}: ${detail}`);
        if (isRecord(child.properties) || isRecord(child.items) || Array.isArray(child.oneOf) || Array.isArray(child.anyOf)) {
          walk(child, `${path}.${short(name, 48)}`, depth + 1);
        }
        if (lines.length >= limit) {
          if (i < entries.length - 1) truncated = true;
          break;
        }
      }
    }

    if (isRecord(node.items)) walk(node.items, `${path}[]`, depth + 1);
    for (const key of ['oneOf', 'anyOf', 'allOf']) {
      if (Array.isArray(node[key])) {
        for (const variant of node[key].slice(0, 3)) walk(variant, `${path} (${key})`, depth + 1);
      }
    }
  }

  walk(schema, 'body', 0);
  if (truncated && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1]} … (further constraints omitted)`;
  return lines;
}
