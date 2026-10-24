import express from 'express';
import { generateTestPlan } from '../services/gemmaService.js';

const router = express.Router();

// POST /api/analyze - Generates structured edge-case test suite using Gemma 4
router.post('/', async (req, res) => {
  const {
    method = 'POST',
    path = '/api/demo/orders',
    headers = {},
    body = null,
    expectedStatus = 200,
    sampleResponse = null,
    businessRules = '',
    useOfflineDemo = false
  } = req.body || {};

  // Validate method
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (!validMethods.includes(String(method).toUpperCase())) {
    return res.status(400).json({ error: `Invalid HTTP method: ${method}. Supported: ${validMethods.join(', ')}` });
  }

  // Validate path
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return res.status(400).json({ error: 'Endpoint path or URL is required' });
  }

  try {
    const testSuite = await generateTestPlan({
      method: String(method).toUpperCase(),
      path: path.trim(),
      headers,
      body,
      expectedStatus: Number(expectedStatus) || 200,
      sampleResponse,
      businessRules: typeof businessRules === 'string' ? businessRules.trim() : '',
      useOfflineDemo: Boolean(useOfflineDemo)
    });

    res.json({
      success: true,
      data: testSuite
    });
  } catch (err) {
    console.error('Analyze route error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate test plan'
    });
  }
});

export default router;
