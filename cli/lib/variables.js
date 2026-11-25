/**
 * Backwards-compatible CLI surface for `{{variable}}` substitution.
 * The implementation lives in the shared, dependency-free resolver so the
 * CLI, server, and client all apply the same rules.
 */

import {
  substituteBaseUrl as substituteBaseUrlShared,
  substituteRequest as substituteRequestShared,
  substituteString as substituteStringShared,
  substituteTests,
  substituteValue as substituteValueShared
} from '../../server/utils/environmentResolver.js';

/** Flatten `{ value, secret }` records into plain substitution values. */
export function normalizeCliValues(variables) {
  const out = {};
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return out;
  for (const [name, raw] of Object.entries(variables)) {
    if (raw === null || raw === undefined) continue;
    out[name] = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.value : raw;
  }
  return out;
}

export function substituteString(text, variables = {}, options) {
  return substituteStringShared(text, normalizeCliValues(variables), options);
}

export function substituteValue(value, variables = {}, options) {
  return substituteValueShared(value, normalizeCliValues(variables), options);
}

export function substituteRequest(request, variables = {}, options) {
  return substituteRequestShared(request, normalizeCliValues(variables), options);
}

export function resolveSuiteTests(tests, variables = {}, options) {
  return substituteTests(tests, normalizeCliValues(variables), options);
}

export function substituteTargetBaseUrl(baseUrl, variables = {}, options) {
  return substituteBaseUrlShared(baseUrl, normalizeCliValues(variables), options);
}
