/**
 * Client-side environment helpers built on the shared, dependency-free
 * resolver. Secret values live only in React state for the current session:
 * they are never written to localStorage or sent to the AI analyzer.
 */

import {
  getSecretValues,
  getVariableValues,
  normalizeEnvironments,
  substituteBaseUrl,
  substituteRequest,
  substituteString,
  substituteValue
} from '../../../server/utils/environmentResolver.js';

export const ENVIRONMENT_NAMES = ['development', 'staging', 'production'];

export function createDefaultEnvironments() {
  const raw = {};
  for (const name of ENVIRONMENT_NAMES) {
    raw[name] = {
      targetBaseUrl: '',
      variables: {
        baseUrl: { value: '', secret: false },
        apiKey: { value: '', secret: true }
      }
    };
  }
  return normalizeEnvironments(raw);
}

export function currentEnvironment(config = {}) {
  const environments = normalizeEnvironments(config.environments || createDefaultEnvironments());
  const selected = config.environment;
  if (selected && environments[selected]) return environments[selected];
  return environments[ENVIRONMENT_NAMES[0]] || Object.values(environments)[0];
}

export function environmentValues(config = {}) {
  return getVariableValues(currentEnvironment(config).variables);
}

export function environmentSecrets(config = {}) {
  return getSecretValues(currentEnvironment(config).variables);
}

/** Only non-secret values are safe to send to the AI plan generator. */
export function nonSecretValues(config = {}) {
  const variables = currentEnvironment(config).variables || {};
  const out = {};
  for (const [name, raw] of Object.entries(variables)) {
    const record = raw && typeof raw === 'object' ? raw : { value: raw, secret: false };
    if (record.secret) continue;
    if (record.value === null || record.value === undefined) continue;
    out[name] = record.value;
  }
  return out;
}

/**
 * Endpoint, headers, body, sample response, and business rules with non-secret
 * placeholders resolved for the AI. Secret placeholders stay verbatim and the
 * environments map (which holds secret values) is stripped entirely, so no
 * secret value ever reaches the analyzer. The source config is never mutated.
 */
export function buildGenerationConfig(config = {}) {
  const values = nonSecretValues(config);
  // The analyzer only consumes endpoint fields; never transmit the raw
  // environments map, which contains secret values in React state.
  const { environments, environment, ...endpointConfig } = config;
  const request = substituteRequest({
    path: config.path || '',
    headers: config.headers || {},
    body: config.body === undefined ? null : config.body
  }, values);
  return {
    ...endpointConfig,
    path: request.path,
    headers: request.headers,
    body: request.body,
    sampleResponse: substituteValue(config.sampleResponse === undefined ? null : config.sampleResponse, values),
    businessRules: substituteString(config.businessRules || '', values)
  };
}

/** Base URL for the runner: an environment target wins over imported/absolute URLs. */
export function resolvedBaseUrl(config = {}) {
  const env = currentEnvironment(config);
  const values = environmentValues(config);
  const fallback = config.importMetadata?.serverBaseUrl
    || (typeof config.path === 'string' && config.path.startsWith('http') ? config.path : '');
  return substituteBaseUrl(env.targetBaseUrl || fallback, values);
}
