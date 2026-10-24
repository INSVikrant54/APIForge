/**
 * Generates copy-pasteable, reproducible cURL command for a test request
 * Automatically redacts sensitive headers (Authorization, Cookie, etc.)
 */

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];

export function generateCurlCommand(method, url, headers = {}, body = null) {
  const parts = ['curl -X', method.toUpperCase(), `"${url}"`];

  // Headers
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const displayVal = SENSITIVE_HEADERS.includes(lowerKey)
        ? 'REDACTED_FOR_SECURITY'
        : value;
      parts.push(`-H "${key}: ${displayVal}"`);
    });
  }

  // Request Body
  if (body !== null && body !== undefined && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
    // Escape double quotes for shell compatibility
    const escaped = jsonStr.replace(/"/g, '\\"');
    parts.push(`-d "${escaped}"`);
  }

  return parts.join(' ');
}
