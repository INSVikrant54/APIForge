import { GoogleGenAI } from '@google/genai';
import { validateAndNormalizeTestPlan } from '../utils/schemaValidator.js';
import { getOfflineDemoPlan } from './offlineDemoPlan.js';

/**
 * Returns an instance of GoogleGenAI prioritizing custom key over server env
 */
function getGenAIClient(customApiKey = null) {
  const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim() !== '')
    ? customApiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Extracts and parses JSON from model output text
 */
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Model returned empty response');
  }

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const rawCandidate = codeBlockMatch ? codeBlockMatch[1] : text;

  // Find first { and last }
  const firstBrace = rawCandidate.indexOf('{');
  const lastBrace = rawCandidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No valid JSON object structure found in model output');
  }

  const jsonSubstring = rawCandidate.substring(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSubstring);
}

/**
 * Verifies if an API key is valid by calling a lightweight test
 */
export async function verifyApiKey(apiKey, testModel = null) {
  const isServerKey = !apiKey || apiKey === 'use-server' || (typeof apiKey === 'string' && apiKey.trim() === '');
  const effectiveKey = isServerKey
    ? process.env.GEMINI_API_KEY
    : (typeof apiKey === 'string' ? apiKey.trim() : null);

  if (!effectiveKey || effectiveKey.trim() === '' || effectiveKey === 'your_gemini_api_key_here') {
    return {
      valid: false,
      error: isServerKey
        ? 'Server GEMINI_API_KEY is not configured in environment variables. Please add GEMINI_API_KEY in Render Dashboard → Environment, or switch to "Custom Gemini API Key".'
        : 'API key is required'
    };
  }

  const client = new GoogleGenAI({ apiKey: effectiveKey.trim() });
  const model = testModel || process.env.GEMMA_MODEL || 'gemini-3.5-flash-lite';

  try {
    const res = await client.models.generateContent({
      model,
      contents: 'Respond with valid JSON: {"status":"verified"}'
    });
    return {
      valid: true,
      model,
      message: 'API Key connection verified successfully'
    };
  } catch (err) {
    let msg = err.message || 'Failed to verify API key with Google Gen AI';
    try {
      const parsed = JSON.parse(msg);
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    } catch (_) {}
    return {
      valid: false,
      error: msg
    };
  }
}

/**
 * Generates an adversarial test plan using Gemma 4 via Gemini API
 * @param {Object} apiConfig 
 * @returns {Promise<Object>}
 */
export async function generateTestPlan(apiConfig) {
  const {
    method = 'POST',
    path = '/api/demo/orders',
    headers = {},
    body = null,
    expectedStatus = 200,
    sampleResponse = null,
    businessRules = '',
    useOfflineDemo = false,
    customApiKey = null,
    customModel = null
  } = apiConfig;

  const client = getGenAIClient(customApiKey);
  const modelName = customModel || process.env.GEMMA_MODEL || 'gemini-3.5-flash-lite';

  // If client is missing or user explicitly requested offline demo for the demo route:
  if (!client || useOfflineDemo) {
    if (path.includes('/demo/') || useOfflineDemo) {
      console.log('ℹ️ Utilizing Predefined Offline Demo Suite (No Gemini API key or offline demo requested)');
      return getOfflineDemoPlan();
    }
    throw new Error(
      'No Gemini API key available. Configure your key in Settings or choose "Try Interactive Demo" for offline mode.'
    );
  }

  const prompt = `You are a Principal QA & Security Engineer using Gemma 4 to analyze API contracts and generate edge-case test suites.

Analyze this API endpoint specification and business rules:

### ENDPOINT CONTRACT
- HTTP Method: ${method}
- Target Path: ${path}
- Default Headers: ${JSON.stringify(headers, null, 2)}
- Expected Success Status: ${expectedStatus}
- Sample Request Body: ${body ? JSON.stringify(body, null, 2) : 'None provided'}
- Sample Expected Response: ${sampleResponse ? JSON.stringify(sampleResponse, null, 2) : 'None provided'}

### BUSINESS RULES & GUARANTEES
"${businessRules || 'Standard REST API behavior. Validate required fields, positive numbers, and correct data types.'}"

### TASK REQUIREMENTS
Generate a comprehensive, balanced collection of 8 to 12 realistic test cases across these categories:
1. "happy_path": Normal valid request expecting ${expectedStatus}
2. "missing_field": Omit one required field at a time
3. "type_validation": Supply incompatible data types (e.g. string for number)
4. "boundary": Values at logical limits (e.g. quantity 0, 1, or very large)
5. "business_rule": Adversarial payloads that violate the supplied plain-English rules (e.g. negative quantity, negative unit price)
6. "malformed_input": Empty bodies or malformed payloads
7. "inconsistent_data": Conflicting values (e.g. total does not match quantity * price)

### CRITICAL RULES
- Output strictly valid JSON matching the exact schema below.
- Do not invent speculative business rules not provided or implied by the contract.
- If expected outcome is uncertain, set "requiresReview": true and specify why in "rationale".
- Never output markdown conversational text outside the JSON structure.

### REQUIRED JSON SCHEMA
{
  "suiteName": "String title for suite",
  "summary": "Short 1-2 sentence description of what this suite verifies",
  "assumptions": ["List of key assumptions made about the API contract"],
  "tests": [
    {
      "id": "test-001",
      "name": "Concise test name",
      "category": "happy_path | missing_field | type_validation | boundary | business_rule | malformed_input | inconsistent_data",
      "severity": "critical | high | medium | low",
      "description": "What this test verifies",
      "rationale": "Why this scenario matters",
      "request": {
        "method": "${method}",
        "path": "${path}",
        "headers": { "Content-Type": "application/json" },
        "body": { ... }
      },
      "expected": {
        "statusCodes": [200],
        "description": "Expected outcome description",
        "assertions": [
          {
            "target": "status | body.<field>",
            "operator": "equals | notEquals | exists | type | greaterThan | lessThan | contains",
            "value": "expected value",
            "description": "Assertion summary"
          }
        ]
      },
      "requiresReview": false
    }
  ]
}`;

  async function executeWithRetry() {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });
      } catch (err) {
        lastError = err;
        const msg = String(err.message || '');
        if ((msg.includes('ECONNRESET') || msg.includes('fetch failed') || err.code === 'ECONNRESET') && attempt < 3) {
          console.warn(`⚠️ Transient network issue. Retrying Gemma 4 API (Attempt ${attempt + 1}/3)...`);
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  try {
    const response = await executeWithRetry();

    const responseText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
    const parsedJson = extractJsonFromText(responseText);

    // Validate and sanitize against schema
    const validated = validateAndNormalizeTestPlan(parsedJson, {
      defaultMethod: method,
      defaultPath: path
    });

    validated.engine = `Gemma 4 (${modelName})`;
    validated.isPredefinedDemo = false;

    return validated;
  } catch (err) {
    console.error('Error generating test plan with Gemma 4:', err);

    // If quota or API key issue occurs during demo route, provide offline demo plan with warning
    if (path.includes('/demo/')) {
      console.warn('⚠️ Gemma API call failed. Falling back to Predefined Offline Demo Suite for demo endpoint.');
      const fallback = getOfflineDemoPlan();
      fallback.warning = `Live Gemma API call failed (${err.message}). Loaded deterministic demo suite so testing can continue.`;
      return fallback;
    }

    throw new Error(`Gemma 4 test generation failed: ${err.message}`);
  }
}

/**
 * Uses Gemma 4 to formulate a failure explanation and developer remediation suggestion
 * @param {Object} details 
 * @returns {Promise<Object>}
 */
export async function explainFailure(details) {
  const { test, actual, businessRules, customApiKey, customModel } = details;
  const client = getGenAIClient(customApiKey);
  const modelName = customModel || process.env.GEMMA_MODEL || 'gemini-3.5-flash-lite';

  // Deterministic local explanation if client is not configured
  if (!client) {
    return {
      isAiRecommendation: false,
      modelUsed: 'Local Diagnostic Engine (Offline)',
      observedIssue: `The endpoint returned HTTP ${actual.status}, but the test contract expected HTTP ${test.expected?.statusCodes?.join(', ') || 400}.`,
      potentialImpact: 'Invalid or adversarial client inputs are being accepted by the backend instead of being rejected early.',
      recommendedFix: 'Implement server-side input validation on the request handler to check and reject invalid parameters before business processing.',
      suggestedCodeSnippet: `// Example Express validation fix:\nif (req.body.quantity <= 0) {\n  return res.status(400).json({ error: 'Quantity must be greater than zero' });\n}`
    };
  }

  const prompt = `You are a Principal Software Engineer explaining a verified API test failure.

### TEST SCENARIO
- Test Name: ${test.name}
- Category: ${test.category}
- Request: ${test.request?.method} ${test.request?.path}
- Request Body: ${JSON.stringify(test.request?.body, null, 2)}
- Expected HTTP Status: ${JSON.stringify(test.expected?.statusCodes)} (${test.expected?.description})
- Actual HTTP Status: ${actual.status}
- Actual Response Body: ${JSON.stringify(actual.body, null, 2)}
- Business Rules: "${businessRules || 'None specified'}"

### TASK
Explain this failure to the developer. Clearly distinguish observed facts from recommendations.
Return strictly valid JSON with this format:
{
  "observedIssue": "Concise summary of the discrepancy between expectation and actual behavior",
  "potentialImpact": "Risk or impact of this bug in production",
  "recommendedFix": "Clear, actionable recommendation for backend server code",
  "suggestedCodeSnippet": "Code snippet showing how to implement the fix"
}`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const responseText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
    const parsed = extractJsonFromText(responseText);

    return {
      isAiRecommendation: true,
      modelUsed: `Gemma 4 (${modelName})`,
      observedIssue: parsed.observedIssue || 'Discrepancy detected between expected contract and actual response.',
      potentialImpact: parsed.potentialImpact || 'Unvalidated inputs could cause data corruption or unexpected behavior.',
      recommendedFix: parsed.recommendedFix || 'Add defensive server-side validation.',
      suggestedCodeSnippet: parsed.suggestedCodeSnippet || ''
    };
  } catch (err) {
    console.error('Error generating AI failure explanation:', err);
    return {
      isAiRecommendation: false,
      modelUsed: 'Local Diagnostic Engine (Fallback)',
      observedIssue: `Actual HTTP status ${actual.status} did not match expected ${test.expected?.statusCodes?.join(', ')}.`,
      potentialImpact: 'Invalid payload bypassed validation.',
      recommendedFix: 'Add parameter validation before processing order creation.',
      suggestedCodeSnippet: `if (req.body.quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });`
    };
  }
}
