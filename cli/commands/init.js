/**
 * `apiforge init` - scaffold apiforge.config.json.
 * Only variable names/placeholders are stored; no real secret values.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from '../lib/args.js';

export const CONFIG_FILENAME = 'apiforge.config.json';
const SECRET_PLACEHOLDER = 'REPLACE_ME';

export const help = `Usage: apiforge init [--target <url>] [--env <name>] [--yes]

Create ${CONFIG_FILENAME} in the current directory.

Options:
  --target <url>   Base URL for the initial environment (default: empty)
  --env <name>     Environment name (default: default)
  --yes            Non-interactive; accept flags/defaults and overwrite if needed

Secrets are never stored: only variable names and placeholder values are written.`;

export function buildConfig({ targetBaseUrl = '', environment = 'default' } = {}) {
  const envName = typeof environment === 'string' && environment.trim() ? environment.trim() : 'default';
  return {
    schemaVersion: 1,
    environment: envName,
    environments: {
      [envName]: {
        targetBaseUrl: typeof targetBaseUrl === 'string' ? targetBaseUrl : '',
        variables: { API_KEY: SECRET_PLACEHOLDER }
      }
    }
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
    valueFlags: ['target', 'env'],
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
      environment = await promptWithDefault(rl, 'Environment name', environment || 'default');
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

  const config = buildConfig({ targetBaseUrl: target || '', environment: environment || 'default' });
  writeConfig(filePath, config);
  process.stdout.write(`Created ${CONFIG_FILENAME} (environment: ${config.environment}).\n`);
  return 0;
}
