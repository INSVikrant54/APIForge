import { URL } from 'url';
import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks if an IPv4 address is in a private or reserved range.
 */
function isPrivateIpv4(ip) {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;

  const [, o1, o2] = match.map(Number);
  if (o1 === 10) return true;                          // 10.0.0.0/8
  if (o1 === 127) return true;                         // 127.0.0.0/8 (loopback)
  if (o1 === 169 && o2 === 254) return true;           // 169.254.0.0/16 (link-local / metadata)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
  if (o1 === 192 && o2 === 168) return true;           // 192.168.0.0/16
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (o1 === 0) return true;                           // 0.0.0.0/8
  return false;
}

/**
 * Checks if an IPv6 address is loopback, unspecified, link-local, unique-local, or IPv4-mapped private.
 */
function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7);
    if (net.isIPv4(mapped)) {
      return isPrivateIpv4(mapped);
    }
    // Hex form e.g. ::ffff:7f00:1
    const hexParts = mapped.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isPrivateIpv4(ipv4);
      }
    }
  }

  // Unique local (fc00::/7 -> fc.. or fd..) and link-local (fe80::/10 -> fe80..febf)
  const firstHextet = parseInt(normalized.split(':')[0], 16);
  if (!Number.isNaN(firstHextet)) {
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10
  }

  return false;
}

/**
 * Checks if an IP or hostname is private or reserved.
 */
export function isPrivateOrReservedHost(hostname) {
  const host = String(hostname || '').toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Common loopback / local names
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    return true;
  }

  // AWS/GCP/Azure instance metadata
  if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata.internal') {
    return true;
  }

  if (isPrivateIpv4(host)) return true;
  if (net.isIPv6(host) && isPrivateIpv6(host)) return true;

  return false;
}

/**
 * Validates a target URL before outbound dispatch, including DNS revalidation.
 * Returns { safe: boolean, error?: string, resolvedUrl?: string, isInternalDemo?: boolean }
 */
export async function validateTargetUrl(rawUrl, localPort = 5000, lookupFn = dns.lookup) {
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

  const cleanHost = parsed.hostname.replace(/^\[|\]$/g, '');

  // Special allowance: Requests to local server's own port for /api/demo/ routes are permitted
  const isLocalDemo = (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '::1') &&
    String(parsed.port || (parsed.protocol === 'http:' ? '80' : '443')) === String(localPort) &&
    parsed.pathname.startsWith('/api/demo/');

  if (isLocalDemo) {
    return {
      safe: true,
      isInternalDemo: true,
      resolvedUrl: parsed.toString()
    };
  }

  // Block private network and metadata endpoints by literal hostname/IP
  if (isPrivateOrReservedHost(cleanHost)) {
    return {
      safe: false,
      error: `SSRF Guard blocked access to restricted private network / metadata target: ${parsed.hostname}`
    };
  }

  // DNS resolution revalidation for non-IP hostnames
  if (net.isIP(cleanHost) === 0) {
    try {
      const addresses = await lookupFn(cleanHost, { all: true });
      if (!Array.isArray(addresses) || addresses.length === 0) {
        return {
          safe: false,
          error: `SSRF Guard could not resolve hostname: ${parsed.hostname}`
        };
      }
      for (const entry of addresses) {
        if (isPrivateOrReservedHost(entry.address)) {
          return {
            safe: false,
            error: `SSRF Guard blocked hostname resolving to private/reserved IP (${entry.address}): ${parsed.hostname}`
          };
        }
      }
    } catch (err) {
      return {
        safe: false,
        error: `SSRF Guard DNS resolution failed for ${parsed.hostname}: ${err.message}`
      };
    }
  }

  return {
    safe: true,
    isInternalDemo: false,
    resolvedUrl: parsed.toString()
  };
}
