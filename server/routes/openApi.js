import express from 'express';
import { parseOpenApiSpec } from '../services/openApiParser.js';

const router = express.Router();
const MAX_SPEC_BYTES = 1024 * 1024;

// POST /api/openapi/parse - Parse an OpenAPI 3.0 or Swagger 2.0 JSON/YAML spec.
router.post('/parse', (req, res) => {
  const source = req.body?.source;
  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(400).json({ success: false, error: 'Provide the specification as a non-empty source string.' });
  }
  if (Buffer.byteLength(source, 'utf8') > MAX_SPEC_BYTES) {
    return res.status(413).json({ success: false, error: 'The specification must be 1 MiB or smaller.' });
  }

  try {
    const endpoints = parseOpenApiSpec(source);
    if (endpoints.length === 0) {
      return res.status(422).json({ success: false, error: 'No supported API operations were found in this specification.' });
    }
    return res.json({ success: true, data: endpoints });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Could not parse this API specification.'
    });
  }
});

export default router;
