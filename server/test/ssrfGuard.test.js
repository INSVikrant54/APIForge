import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateTargetUrl, isPrivateOrReservedHost } from '../middleware/ssrfGuard.js';

describe('ssrfGuard - isPrivateOrReservedHost', () => {
  it('detects literal private/reserved hostnames and IPv4 addresses', () => {
    const privateHosts = [
      'localhost',
      'sub.localhost',
      '127.0.0.1',
      '10.0.0.1',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      'metadata.google.internal',
      'metadata.internal',
      '100.64.0.1',
      '0.0.0.0',
    ];

    for (const host of privateHosts) {
      assert.equal(isPrivateOrReservedHost(host), true, `Expected ${host} to be private/reserved`);
    }
  });

  it('detects private/reserved IPv6 addresses', () => {
    const privateIpv6 = ['::1', '[::1]', '::', 'fc00::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1'];

    for (const host of privateIpv6) {
      assert.equal(isPrivateOrReservedHost(host), true, `Expected ${host} to be private/reserved`);
    }
  });

  it('allows public IP addresses and external domain names', () => {
    const publicHosts = ['93.184.216.34', '8.8.8.8', '172.15.255.255', '172.32.0.1', 'example.com', '2606:2800:220:1:248:1893:25c8:1946'];

    for (const host of publicHosts) {
      assert.equal(isPrivateOrReservedHost(host), false, `Expected ${host} to be public`);
    }
  });
});

describe('ssrfGuard - validateTargetUrl', () => {
  it('allows relative /api/demo/ paths as internal demo targets', async () => {
    const result = await validateTargetUrl('/api/demo/orders');
    assert.equal(result.safe, true);
    assert.equal(result.isInternalDemo, true);
    assert.equal(result.resolvedUrl, 'http://127.0.0.1:5000/api/demo/orders');

    const customPortResult = await validateTargetUrl('/api/demo/orders?limit=5', 8080);
    assert.equal(customPortResult.safe, true);
    assert.equal(customPortResult.isInternalDemo, true);
    assert.equal(customPortResult.resolvedUrl, 'http://127.0.0.1:8080/api/demo/orders?limit=5');
  });

  it('allows localhost demo URL on matching localPort and blocks non-demo localhost paths', async () => {
    const allowed = await validateTargetUrl('http://localhost:5000/api/demo/orders', 5000);
    assert.equal(allowed.safe, true);
    assert.equal(allowed.isInternalDemo, true);
    assert.equal(allowed.resolvedUrl, 'http://localhost:5000/api/demo/orders');

    const blockedOtherPath = await validateTargetUrl('http://localhost:5000/api/other', 5000);
    assert.equal(blockedOtherPath.safe, false);
    assert.ok(blockedOtherPath.error);

    const blockedWrongPort = await validateTargetUrl('http://localhost:4000/api/demo/orders', 5000);
    assert.equal(blockedWrongPort.safe, false);
    assert.ok(blockedWrongPort.error);
  });

  it('blocks non-http/https protocols', async () => {
    const blockedUrls = [
      'file:///etc/passwd',
      'ftp://example.com',
      'gopher://127.0.0.1:6379/',
      'javascript:alert(1)',
    ];

    for (const url of blockedUrls) {
      const result = await validateTargetUrl(url);
      assert.equal(result.safe, false, `Expected ${url} to be blocked`);
      assert.match(result.error, /Unsupported protocol/i);
    }
  });

  it('blocks literal private/reserved hostnames and IPv4 addresses', async () => {
    const blockedTargets = [
      'http://localhost/admin',
      'http://sub.localhost/admin',
      'http://127.0.0.1/admin',
      'http://10.0.0.1/internal',
      'http://172.16.0.1/internal',
      'http://192.168.1.1/router',
      'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://100.64.0.1/cgnat',
    ];

    for (const url of blockedTargets) {
      const result = await validateTargetUrl(url);
      assert.equal(result.safe, false, `Expected ${url} to be blocked`);
      assert.match(result.error, /SSRF Guard blocked/i);
    }
  });

  it('blocks IPv6 private and reserved addresses', async () => {
    const blockedIpv6Urls = [
      'http://[::1]:8080/test',
      'http://[fc00::1]/',
      'http://[fe80::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fd12:3456:789a::1]/',
      'http://[::]/',
    ];

    for (const url of blockedIpv6Urls) {
      const result = await validateTargetUrl(url);
      assert.equal(result.safe, false, `Expected ${url} to be blocked`);
      assert.match(result.error, /SSRF Guard blocked/i);
    }
  });

  it('allows public literal IPv4 and IPv6 URLs', async () => {
    const ipv4Result = await validateTargetUrl('https://93.184.216.34/api');
    assert.equal(ipv4Result.safe, true);
    assert.equal(ipv4Result.isInternalDemo, false);

    const ipv6Result = await validateTargetUrl('http://[2606:2800:220:1:248:1893:25c8:1946]/');
    assert.equal(ipv6Result.safe, true);
    assert.equal(ipv6Result.isInternalDemo, false);
  });

  it('performs DNS revalidation via lookupFn and blocks hostnames resolving to private IPs', async () => {
    const calls = [];
    const mockBlockedLookup = async (hostname, options) => {
      calls.push({ hostname, options });
      return [{ address: '127.0.0.1', family: 4 }];
    };

    const blockedResult = await validateTargetUrl('https://evil.example.com/api', 5000, mockBlockedLookup);
    assert.equal(blockedResult.safe, false);
    assert.match(blockedResult.error, /127\.0\.0\.1/);
    assert.deepEqual(calls, [{ hostname: 'evil.example.com', options: { all: true } }]);

    const mockMixedLookup = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '::1', family: 6 },
    ];
    const mixedResult = await validateTargetUrl('https://evil.example.com/api', 5000, mockMixedLookup);
    assert.equal(mixedResult.safe, false);
    assert.match(mixedResult.error, /::1/);
  });

  it('allows external hostnames when DNS revalidation returns only public IPs', async () => {
    const mockPublicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

    const allowedResult = await validateTargetUrl('https://evil.example.com/api', 5000, mockPublicLookup);
    assert.equal(allowedResult.safe, true);
    assert.equal(allowedResult.isInternalDemo, false);
    assert.equal(allowedResult.resolvedUrl, 'https://evil.example.com/api');
  });

  it('blocks when DNS lookup fails or returns no addresses, and rejects invalid/missing URLs', async () => {
    const emptyLookup = async () => [];
    const emptyResult = await validateTargetUrl('https://unresolvable.example.com/api', 5000, emptyLookup);
    assert.equal(emptyResult.safe, false);
    assert.match(emptyResult.error, /could not resolve/i);

    const failingLookup = async () => {
      throw new Error('ENOTFOUND');
    };
    const failResult = await validateTargetUrl('https://missing.example.com/api', 5000, failingLookup);
    assert.equal(failResult.safe, false);
    assert.match(failResult.error, /DNS resolution failed/i);

    for (const invalid of ['', null, undefined, 'not-a-valid-url', '/api/other']) {
      const res = await validateTargetUrl(invalid);
      assert.equal(res.safe, false);
      assert.ok(res.error);
    }
  });
});
