/**
 * Single bridge between the CLI and the shared deterministic runner.
 * `execute` is injectable so focused tests can avoid all network access.
 */

import { runTestSuite } from '../../server/services/testRunner.js';
import { resolveSuiteTests, substituteTargetBaseUrl } from './variables.js';

export async function runTest({
  tests = [],
  targetBaseUrl = '',
  variables = {},
  timeoutMs,
  localPort,
  execute
} = {}) {
  const resolvedTests = resolveSuiteTests(tests, variables);
  const resolvedBaseUrl = substituteTargetBaseUrl(targetBaseUrl, variables);

  const options = {
    tests: resolvedTests,
    targetBaseUrl: resolvedBaseUrl
  };
  if (timeoutMs !== undefined) options.timeoutMs = timeoutMs;
  if (localPort !== undefined) options.localPort = localPort;
  // The server executor sets `redirect: 'manual'`; redirects are never followed.
  if (execute !== undefined) options.execute = execute;

  return runTestSuite(options);
}
