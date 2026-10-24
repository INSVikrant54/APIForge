import express from 'express';
import { explainFailure } from '../services/gemmaService.js';

const router = express.Router();

// POST /api/explain-failure - Generates AI failure diagnosis & fix recommendation
router.post('/', async (req, res) => {
  const { test, actual, failedAssertion, businessRules } = req.body || {};

  if (!test || !actual) {
    return res.status(400).json({ error: 'test and actual response details are required' });
  }

  try {
    const diagnosis = await explainFailure({
      test,
      actual,
      failedAssertion,
      businessRules
    });

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (err) {
    console.error('Explain failure error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to diagnose failure'
    });
  }
});

export default router;
