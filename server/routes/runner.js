import express from 'express';
import { runTestSuite } from '../services/testRunner.js';
import {
  getSecretValues,
  getVariableValues,
  normalizeEnvironment,
  normalizeVariables,
  redactSecrets,
  substituteBaseUrl,
  substituteTests
} from '../utils/environmentResolver.js';

const router = express.Router();

// POST /api/run-tests - Deterministic test execution engine
router.post('/', async (req, res) => {
  const {
    targetBaseUrl = '',
    tests = [],
    timeoutMs = 6000,
    environment = null,
    variables = null,
    secretVariableNames = []
  } = req.body || {};

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'No tests provided to execute' });
  }

  try {
    // A named environment uses the same resolver as the CLI and client. The
    // legacy `variables` payload is still accepted. Substitution happens
    // before execution, so the SSRF guard sees the actual target URL.
    const env = environment && typeof environment === 'object' && !Array.isArray(environment)
      ? normalizeEnvironment(environment.name || 'selected', environment)
      : null;
    const records = env ? env.variables : normalizeVariables(variables);
    const values = getVariableValues(records);
    const secretValues = getSecretValues(records, secretVariableNames);
    const resolvedTests = substituteTests(tests, values);
    const resolvedBaseUrl = substituteBaseUrl(
      env && env.targetBaseUrl ? env.targetBaseUrl : targetBaseUrl,
      values
    );

    const report = await runTestSuite({ tests: resolvedTests, targetBaseUrl: resolvedBaseUrl, timeoutMs });
    res.json(redactSecrets(report, secretValues));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to run tests' });
  }
});

export default router;
