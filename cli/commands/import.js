/**
 * `apiforge import <spec-file>` - convert an OpenAPI/Swagger document into a
 * versioned APIForge suite. Success codes are taken from the contract only;
 * none are invented when the contract is silent.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseOpenApiSpec } from '../../server/services/openApiParser.js';
import { createSuite, makeTestId, writeSuite, DEFAULT_SUITE_NAME, DEFAULT_SUITE_FILENAME } from '../lib/suite.js';
import { parseArgs } from '../lib/args.js';

export const help = `Usage: apiforge import <spec-file> [--out <suite-file>] [--name <suite-name>]

Convert an OpenAPI 3.0.x or Swagger 2.0 JSON/YAML document into a test suite.

Options:
  --out <suite-file>    Output suite path (default: ${DEFAULT_SUITE_FILENAME})
  --name <suite-name>   Suite name (default: API title from the spec)

Endpoints without an explicit 2xx response are flagged requiresReview=true and
confirmed=false. No success status codes are invented.`;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Convert one normalized endpoint into a deterministic suite test. */
export function endpointToTest(endpoint, index = 0) {
  const source = isPlainObject(endpoint) ? endpoint : {};
  const method = String(source.request?.method || source.method || 'GET').toUpperCase();
  const path = String(source.request?.path || source.path || '/');
  const statusCodes = Array.isArray(source.expected?.statusCodes)
    ? source.expected.statusCodes.filter((code) => Number.isInteger(code))
    : [];
  const summary = typeof source.summary === 'string' ? source.summary.trim() : '';
  const description = typeof source.description === 'string' ? source.description.trim() : '';
  const unresolvedPathParameter = /\{[^}]+\}/.test(path);
  const requiresReview = Boolean(source.requiresReview)
    || statusCodes.length === 0
    || unresolvedPathParameter;
  const rationale = unresolvedPathParameter
    ? `Imported from OpenAPI contract (${method} ${path}); provide a concrete path parameter value before running`
    : `Imported from OpenAPI contract (${method} ${path})`;

  return {
    id: makeTestId({ method, path, operationId: source.operationId }, index),
    name: summary || `${method} ${path}`,
    category: 'happy_path',
    severity: 'medium',
    request: {
      method,
      path,
      headers: isPlainObject(source.request?.headers) ? { ...source.request.headers } : {},
      body: source.request?.body === undefined ? null : source.request.body
    },
    expected: {
      statusCodes: [...statusCodes],
      description: typeof source.expected?.description === 'string' ? source.expected.description : ''
    },
    requiresReview,
    confirmed: false,
    description: description || summary,
    rationale
  };
}

/** Parse spec text, convert endpoints, and write the suite file. */
export function importSpec(sourceText, options = {}) {
  const endpoints = parseOpenApiSpec(sourceText);
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    throw new Error('No supported API operations were found in the specification');
  }

  const tests = endpoints.map(endpointToTest);
  const serverEndpoint = endpoints.find(
    (e) => typeof e.serverUrl === 'string' && e.serverUrl.trim()
  );
  const apiTitle = endpoints.find((e) => typeof e.apiTitle === 'string' && e.apiTitle.trim())?.apiTitle;
  const name = typeof options.name === 'string' && options.name.trim()
    ? options.name.trim()
    : (apiTitle || DEFAULT_SUITE_NAME);

  // A declared server URL becomes the base URL. No variables are invented.
  const suite = createSuite({
    name,
    targetBaseUrl: serverEndpoint ? serverEndpoint.serverUrl.trim() : '',
    variables: {},
    tests
  });
  const filePath = options.filePath || resolve(process.cwd(), DEFAULT_SUITE_FILENAME);
  writeSuite(filePath, suite);

  return {
    suite,
    filePath,
    total: tests.length,
    reviewCount: tests.filter((t) => t.requiresReview).length
  };
}

export async function runImport(argv = []) {
  const { flags, positionals } = parseArgs(argv, {
    valueFlags: ['out', 'name'],
    booleanFlags: []
  });
  if (positionals.length === 0) {
    throw new Error('Missing spec file. Usage: apiforge import <spec-file> [--out <suite-file>] [--name <suite-name>]');
  }
  if (positionals.length > 1) {
    throw new Error(`Unexpected argument: ${positionals[1]}`);
  }

  const specPath = resolve(process.cwd(), positionals[0]);
  let sourceText;
  try {
    sourceText = readFileSync(specPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read spec file "${specPath}": ${err.message}`);
  }

  const outPath = flags.out
    ? resolve(process.cwd(), flags.out)
    : resolve(process.cwd(), DEFAULT_SUITE_FILENAME);
  const result = importSpec(sourceText, { name: flags.name, filePath: outPath });

  process.stdout.write(`Imported ${result.total} test(s) into ${result.filePath}.\n`);
  if (result.reviewCount > 0) {
    process.stdout.write(`${result.reviewCount} test(s) flagged for review.\n`);
  }
  return 0;
}
