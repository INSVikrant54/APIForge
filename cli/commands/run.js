/**
 * `apiforge run [suite-file]` - execute a suite and emit a report.
 * Config/parse failures exit 2; FAIL/NEEDS REVIEW exit 1; all-pass exits 0.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from '../lib/args.js';
import { readSuite, resolveEnvironmentDetails, DEFAULT_SUITE_FILENAME } from '../lib/suite.js';
import { runTest } from '../lib/runTest.js';
import { decideExitCode, formatOutput, FORMATS, DEFAULT_FORMAT } from '../lib/output.js';
import { CONFIG_FILENAME, readConfig, mergeEnvironments, parseSecretFlags } from '../lib/config.js';
import {
  getSecretValues,
  getVariableValues,
  redactSecrets,
  redactText
} from '../../server/utils/environmentResolver.js';

export const help = `Usage: apiforge run [suite-file] [options]

Execute a suite and write a summary report to stdout (or --output).

Options:
  --env <name>        Environment to use (default: suite's selected environment)
  --secret NAME[=V]   Runtime secret; bare NAME reads process.env[NAME]; repeatable
  --format <format>   text | json | junit | sarif (default: text)
  --output <file>     Write the report to a file instead of stdout
  --ci                Non-interactive mode; defaults --format to junit
  --timeout <ms>      Per-request timeout in milliseconds (default: 6000)

Default suite file: ${DEFAULT_SUITE_FILENAME}`;

export function parseRunOptions(argv = []) {
  const { flags, positionals } = parseArgs(argv, {
    valueFlags: ['env', 'format', 'output', 'timeout'],
    multiValueFlags: ['secret'],
    booleanFlags: ['ci']
  });
  if (positionals.length > 1) {
    throw new Error(`Unexpected argument: ${positionals[1]}`);
  }

  const ci = flags.ci === true;
  const format = flags.format || (ci ? 'junit' : DEFAULT_FORMAT);
  if (!FORMATS.includes(format)) {
    throw new Error(`Unknown output format "${format}". Expected one of: ${FORMATS.join(', ')}`);
  }

  let timeoutMs;
  if (flags.timeout !== undefined) {
    timeoutMs = Number(flags.timeout);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error(`Invalid --timeout value "${flags.timeout}"`);
    }
  }

  return {
    suitePath: positionals[0]
      ? resolve(process.cwd(), positionals[0])
      : resolve(process.cwd(), DEFAULT_SUITE_FILENAME),
    env: flags.env,
    secretFlags: flags.secret || [],
    format,
    output: flags.output ? resolve(process.cwd(), flags.output) : null,
    ci,
    timeoutMs
  };
}

/**
 * Resolve environment/substitution, run the suite, and format a report.
 * Kept separate from I/O so tests can inject a fake `execute`.
 */
export async function executeRun({ suite, options = {}, execute } = {}) {
  const env = resolveEnvironmentDetails(suite, options.env);
  const variableRecords = { ...env.variableRecords };
  for (const [name, value] of Object.entries(options.secretOverrides || {})) {
    variableRecords[name] = { value, secret: true };
  }
  const values = getVariableValues(variableRecords);
  const secretValues = getSecretValues(variableRecords);

  const result = await runTest({
    tests: suite.tests,
    targetBaseUrl: env.targetBaseUrl,
    variables: values,
    timeoutMs: options.timeoutMs,
    localPort: options.localPort,
    execute
  });
  const safeResult = redactSecrets(result, secretValues);
  const meta = { suiteName: suite.name, environment: env.name };
  const format = options.format || DEFAULT_FORMAT;
  return {
    result: safeResult,
    meta,
    format,
    output: redactText(formatOutput(format, safeResult, meta), secretValues),
    exitCode: decideExitCode(safeResult)
  };
}

export async function runRun(argv = []) {
  const options = parseRunOptions(argv);
  let suite = readSuite(options.suitePath);
  const configPath = resolve(process.cwd(), CONFIG_FILENAME);
  if (existsSync(configPath)) {
    const config = readConfig(configPath);
    suite = { ...suite, environments: mergeEnvironments(suite.environments, config.environments) };
  }
  const secretOverrides = parseSecretFlags(options.secretFlags);
  const { output, exitCode } = await executeRun({ suite, options: { ...options, secretOverrides } });

  if (options.output) {
    try {
      writeFileSync(options.output, output, 'utf8');
    } catch (err) {
      throw new Error(`Failed to write output file "${options.output}": ${err.message}`);
    }
  } else {
    process.stdout.write(output);
  }
  return exitCode;
}
