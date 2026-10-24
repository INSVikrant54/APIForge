import { validateTargetUrl } from '../middleware/ssrfGuard.js';
import { generateCurlCommand } from '../utils/curlGenerator.js';

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];
const MAX_RESPONSE_BYTES = 100 * 1024; // 100 KB limit
const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Sanitizes headers for safe logging and response transport
 */
function sanitizeHeaders(rawHeaders) {
  const result = {};
  if (!rawHeaders) return result;

  // Handle Fetch Headers object or plain object
  if (typeof rawHeaders.forEach === 'function') {
    rawHeaders.forEach((val, key) => {
      const lower = key.toLowerCase();
      result[key] = SENSITIVE_HEADERS.includes(lower) ? '[REDACTED]' : val;
    });
  } else {
    Object.entries(rawHeaders).forEach(([key, val]) => {
      const lower = key.toLowerCase();
      result[key] = SENSITIVE_HEADERS.includes(lower) ? '[REDACTED]' : val;
    });
  }
  return result;
}

/**
 * Executes a single HTTP request with SSRF guard and bounded resources
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
export async function executeHttpRequest({
  method = 'GET',
  targetUrl,
  headers = {},
  body = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  localPort = 5000
}) {
  const normalizedMethod = String(method).toUpperCase();

  // 1. SSRF validation & URL resolution
  const urlCheck = validateTargetUrl(targetUrl, localPort);
  if (!urlCheck.safe) {
    return {
      success: false,
      isExecutionError: true,
      error: urlCheck.error || 'Target URL failed security verification',
      status: 0,
      durationMs: 0,
      curl: generateCurlCommand(normalizedMethod, targetUrl, headers, body)
    };
  }

  const resolvedUrl = urlCheck.resolvedUrl;
  const curlCommand = generateCurlCommand(normalizedMethod, resolvedUrl, headers, body);

  // 2. Prepare Fetch options
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions = {
    method: normalizedMethod,
    headers: {
      'User-Agent': 'APIForge-Test-Runner/1.0',
      ...headers
    },
    signal: controller.signal
  };

  if (body !== null && body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
    if (typeof body === 'string') {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }
  }

  const startTime = performance.now();

  try {
    const response = await fetch(resolvedUrl, fetchOptions);
    const durationMs = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);

    // 3. Read response body safely within limits
    const contentType = response.headers.get('content-type') || '';
    let responseBody = null;
    let rawText = '';

    try {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_RESPONSE_BYTES) {
        rawText = new TextDecoder().decode(arrayBuffer.slice(0, MAX_RESPONSE_BYTES)) + '... [TRUNCATED - EXCEEDED 100KB]';
      } else {
        rawText = new TextDecoder().decode(arrayBuffer);
      }

      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          responseBody = JSON.parse(rawText);
        } catch {
          responseBody = rawText;
        }
      } else {
        responseBody = rawText;
      }
    } catch (readErr) {
      responseBody = `[Unable to read response body: ${readErr.message}]`;
    }

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: sanitizeHeaders(response.headers),
      body: responseBody,
      durationMs,
      curl: curlCommand
    };

  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);

    const isTimeout = err.name === 'AbortError';
    const message = isTimeout
      ? `Request timed out after ${timeoutMs}ms`
      : `Network / connection error: ${err.message}`;

    return {
      success: false,
      isExecutionError: true,
      error: message,
      status: 0,
      durationMs,
      curl: curlCommand
    };
  }
}
