import express from 'express';
import { runTestSuite } from '../services/testRunner.js';

const router = express.Router();

// POST /api/run-tests - Deterministic test execution engine
router.post('/', async (req, res) => {
  const {
    targetBaseUrl = '',
    tests = [],
    timeoutMs = 6000
  } = req.body || {};

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'No tests provided to execute' });
  }

  try {
    const report = await runTestSuite({ tests, targetBaseUrl, timeoutMs });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to run tests' });
  }
});

export default router;
