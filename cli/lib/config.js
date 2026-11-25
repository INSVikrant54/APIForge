/**
 * Local `apiforge.config.json` support. Config environments are merged into
 * suite environments so a committed suite can stay placeholder-only while the
 * developer keeps local targets and secret values out of source control.
 */

import { readFileSync } from 'node:fs';
import { normalizeEnvironments } from '../../server/utils/environmentResolver.js';

export const CONFIG_FILENAME = 'apiforge.config.json';

export function readConfig(filePath) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to read config file "${filePath}": ${err.message}`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Config file "${filePath}" must be a JSON object`);
  }
  return {
    schemaVersion: raw.schemaVersion,
    environment: typeof raw.environment === 'string' ? raw.environment : undefined,
    environments: normalizeEnvironments(raw.environments)
  };
}

/** Merge suite and config environments; local config values take precedence. */
export function mergeEnvironments(suiteEnvironments = {}, configEnvironments = {}) {
  const merged = normalizeEnvironments(suiteEnvironments);
  for (const [name, local] of Object.entries(normalizeEnvironments(configEnvironments))) {
    const current = merged[name] || { name, targetBaseUrl: '', variables: {} };
    merged[name] = {
      name,
      targetBaseUrl: local.targetBaseUrl || current.targetBaseUrl,
      variables: { ...current.variables, ...local.variables }
    };
  }
  return merged;
}

/**
 * Parse repeatable `--secret NAME[=VALUE]` flags. Bare names read from the
 * process environment, so CI can inject masked values without writing them
 * into a file. Missing values are skipped: placeholders stay visible.
 */
export function parseSecretFlags(specs = [], env = process.env) {
  const out = {};
  for (const spec of Array.isArray(specs) ? specs : []) {
    const splitAt = spec.indexOf('=');
    const name = (splitAt === -1 ? spec : spec.slice(0, splitAt)).trim();
    if (!name) throw new Error('A --secret flag needs a variable name');
    const value = splitAt === -1 ? env[name] : spec.slice(splitAt + 1);
    if (value === undefined || value === '') continue;
    out[name] = String(value);
  }
  return out;
}
