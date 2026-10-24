import { URL } from 'url';

/**
 * Checks if an IP or hostname is private or reserved
 */
function isPrivateOrReservedHost(hostname) {
  // Normalize
  const host = hostname.toLowerCase().trim();

  // Common loopback / local names
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    return true;
  }

  // AWS/GCP/Azure instance metadata
  if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata.internal') {
    return true;
  }

  // Check IPv4 ranges:
  // 10.0.0.0 - 10.255.255.255
  // 172.16.0.0 - 172.31.255.255
  // 192.168.0.0 - 192.168.255.255
  // 127.0.0.0 - 127.255.255.255
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const [_, o1, o2, o3, o4] = match.map(Number);
    if (o1 === 10) return true;
    if (o1 === 127) return true;
    if (o1 === 169 && o2 === 254) return true;
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    if (o1 === 192 && o2 === 168) return true;
    if (o1 === 0) return true;
  }

  return false;
}

/**
 * Validates a target URL before outbound dispatch
 * Returns { safe: boolean, error?: string, url?: URL, isInternalDemo?: boolean }
 */
export function validateTargetUrl(rawUrl, localPort = 5000) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, error: 'Target URL is required' };
  }

  // Handle relative internal demo paths (e.g. '/api/demo/orders')
  if (rawUrl.startsWith('/api/demo/')) {
    return {
      safe: true,
      isInternalDemo: true,
      resolvedUrl: `http://127.0.0.1:${localPort}${rawUrl}`
    };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    return { safe: false, error: `Invalid URL format: ${err.message}` };
  }

  // Only http and https protocols allowed
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: `Unsupported protocol '${parsed.protocol}'. Only http: and https: are allowed.` };
  }

  // Special allowance: Requests to local server's own port for /api/demo/ routes are permitted
  const isLocalDemo = (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
    String(parsed.port || (parsed.protocol === 'http:' ? '80' : '443')) === String(localPort) &&
    parsed.pathname.startsWith('/api/demo/');

  if (isLocalDemo) {
    return {
      safe: true,
      isInternalDemo: true,
      resolvedUrl: parsed.toString()
    };
  }

  // Block private network and metadata endpoints
  if (isPrivateOrReservedHost(parsed.hostname)) {
    return {
      safe: false,
      error: `SSRF Guard blocked access to restricted private network / metadata target: ${parsed.hostname}`
    };
  }

  return {
    safe: true,
    isInternalDemo: false,
    resolvedUrl: parsed.toString()
  };
}
