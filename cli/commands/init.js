/**
 * `apiforge init` - scaffold apiforge.config.json.
 * Only variable names/placeholders are stored; no real secret values.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from '../lib/args.js';
import { CONFIG_FILENAME } from '../lib/config.js';
import { normalizeVariables } from '../../server/utils/environmentResolver.js';

const SECRET_PLACEHOLDER = 'REPLACE_ME';

export const help = `Usage: apiforge init [--target <url>] [--env <name>...] [--var NAME=VALUE]... [--secret NAME]... [--yes]

Create ${CONFIG_FILENAME} in the current directory.

Options:
  --target <url>     Base URL for the first environment (default: empty)
  --env <name>       Environment name; repeat for development, staging, production
  --var NAME=VALUE   Plain (non-secret) variable value; repeatable
  --secret NAME      Variable name to mark as secret; repeatable
  --yes              Non-interactive; accept flags/defaults and overwrite if needed

Secret values are never written: only names and placeholder values are stored.`;

function splitNames(values, fallback = []) {
  const names = [];
  for (const entry of Array.isArray(values) ? values : []) {
    for (const part of String(entry).split(',')) {
      const name = part.trim();
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names.length ? names : [...fallback];
}

function parseAssignments(specs) {
  const out = {};
  for (const spec of Array.isArray(specs) ? specs : []) {
    const splitAt = spec.indexOf('=');
    if (splitAt <= 0) throw new Error(`Expected NAME=VALUE, got "${spec}"`);
    out[spec.slice(0, splitAt).trim()] = spec.slice(splitAt + 1);
  }
  return out;
}

export function buildConfig({
  targetBaseUrl = '',
  environment = 'default',
  environments = [],
  variables = {},
  secrets = []
} = {}) {
  const requestedEnvironments = Array.isArray(environments) ? environments : [];
  const names = splitNames(
    requestedEnvironments.length ? requestedEnvironments : [environment],
    ['default']
  );
  const plainVariables = variables && typeof variables === 'object' && !Array.isArray(variables) ? variables : {};
  const secretNames = splitNames(secrets, []);
  for (const secretName of secretNames) {
    if (Object.prototype.hasOwnProperty.call(plainVariables, secretName)) {
      throw new Error(`Variable "${secretName}" is a secret; pass its value at run time with --secret ${secretName}=VALUE`);
    }
  }
  const template = { ...plainVariables };
  for (const secretName of secretNames) {
    template[secretName] = { value: SECRET_PLACEHOLDER, secret: true };
  }
  const shared = normalizeVariables(template);

  return {
    schemaVersion: 1,
    environment: names[0],
    environments: Object.fromEntries(names.map((name, index) => [
      name,
      {
        targetBaseUrl: index === 0 && typeof targetBaseUrl === 'string' ? targetBaseUrl : '',
        variables: { ...shared }
      }
    ]))
  };
}

export function writeConfig(filePath, config) {
  try {
    writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  } catch (err) {
    throw new Error(`Failed to write config file "${filePath}": ${err.message}`);
  }
  return filePath;
}

async function promptWithDefault(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : ' [none]';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

export async function runInit(argv = []) {
  const { flags, positionals } = parseArgs(argv, {
    valueFlags: ['target', 'env', 'var'],
    multiValueFlags: ['env', 'var', 'secret'],
    booleanFlags: ['yes']
  });
  if (positionals.length > 0) {
    throw new Error(`Unexpected argument: ${positionals[0]}`);
  }

  const filePath = resolve(process.cwd(), CONFIG_FILENAME);
  const exists = existsSync(filePath);
  let target = flags.target;
  let environment = flags.env;
  let overwrite = flags.yes === true;

  if (!flags.yes) {
    const rl = createInterface({ input, output });
    try {
      target = await promptWithDefault(rl, 'Target base URL', target || '');
      environment = await promptWithDefault(rl, 'Environment name', (environment && environment[0]) || 'default');
      if (exists) {
        const answer = (await rl.question('Config file exists. Overwrite? [y/N]: ')).trim().toLowerCase();
        overwrite = answer === 'y' || answer === 'yes';
      }
    } finally {
      rl.close();
    }
  }

  if (exists && !overwrite) {
    process.stdout.write(`Kept existing ${CONFIG_FILENAME} (use --yes to overwrite).\n`);
    return 0;
  }

  const config = buildConfig({
    targetBaseUrl: target || '',
    environment: (environment && environment[0]) || 'default',
    environments: environment || [],
    variables: parseAssignments(flags.var),
    secrets: flags.secret || []
  });
  writeConfig(filePath, config);
  process.stdout.write(
    `Created ${CONFIG_FILENAME} (environments: ${Object.keys(config.environments).join(', ')}).\n`
  );
  return 0;
}
