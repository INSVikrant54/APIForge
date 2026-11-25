/**
 * `{{variable}}` substitution for suite requests. Unknown variables are left
 * verbatim so unresolved placeholders remain visible instead of being silently
 * replaced with empty strings.
 */

export function substituteString(text, variables = {}) {
  if (typeof text !== 'string') return text;
  const pattern = /\{\{\s*([^{}]+?)\s*\}\}/g;
  return text.replace(pattern, (match, rawName) => {
    const name = String(rawName).trim();
    if (!Object.prototype.hasOwnProperty.call(variables, name)) return match;
    const value = variables[name];
    if (value === null || value === undefined) return match;
    return String(value);
  });
}

export function substituteValue(value, variables = {}) {
  if (typeof value === 'string') return substituteString(value, variables);
  if (Array.isArray(value)) return value.map((item) => substituteValue(item, variables));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = substituteValue(child, variables);
    }
    return out;
  }
  return value;
}

export function substituteRequest(request, variables = {}) {
  const src = request && typeof request === 'object' && !Array.isArray(request) ? request : {};
  return {
    ...src,
    path: substituteString(typeof src.path === 'string' ? src.path : '', variables),
    headers: substituteValue(src.headers && typeof src.headers === 'object' && !Array.isArray(src.headers)
      ? src.headers
      : {}, variables),
    body: substituteValue(src.body === undefined ? null : src.body, variables)
  };
}

export function resolveSuiteTests(tests, variables = {}) {
  return (Array.isArray(tests) ? tests : []).map((test) => ({
    ...test,
    request: substituteRequest(test.request, variables)
  }));
}

export function substituteTargetBaseUrl(baseUrl, variables = {}) {
  return substituteString(typeof baseUrl === 'string' ? baseUrl : '', variables);
}
