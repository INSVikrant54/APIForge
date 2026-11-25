/**
 * Bounded, sequential multi-endpoint runner.
 *
 * A single paced limiter is shared across BOTH analysis and execution calls so
 * a batch cannot exceed ten requests per minute end to end. The limiter is
 * additive to (never a replacement for) the server's existing rate limiters.
 */

export const MAX_BATCH_ENDPOINTS = 5;
export const BATCH_INTERVAL_MS = 6000;
export const BATCH_WINDOW_MS = 60 * 1000;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Create a paced gate: one call every intervalMs, with a sliding one-minute window. */
export function createBatchLimiter({
  intervalMs = BATCH_INTERVAL_MS,
  windowMs = BATCH_WINDOW_MS,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
} = {}) {
  const calls = [];
  let nextAt = 0;

  return async function waitForSlot() {
    for (;;) {
      const current = now();
      while (calls.length && calls[0] <= current - windowMs) calls.shift();
      if (calls.length < Math.floor(windowMs / intervalMs)) break;
      await sleep(Math.max(1, calls[0] + windowMs - current));
    }
    const start = Math.max(now(), nextAt);
    const delay = start - now();
    if (delay > 0) await sleep(delay);
    const admittedAt = now();
    calls.push(admittedAt);
    nextAt = admittedAt + intervalMs;
  };
}

/** Run endpoints one at a time; per-endpoint failures do not abort the batch. */
export async function runBatch({
  endpoints,
  prepare,
  generate,
  execute,
  onProgress,
  shouldContinue = () => true,
  limiter = createBatchLimiter()
}) {
  if (!Array.isArray(endpoints) || endpoints.length === 0) return [];
  if (endpoints.length > MAX_BATCH_ENDPOINTS) {
    throw new Error(`Batch runs are limited to ${MAX_BATCH_ENDPOINTS} endpoints. Import a smaller selection.`);
  }

  const entries = [];
  const publish = () => onProgress?.(entries.map((entry) => ({ ...entry })));

  for (let index = 0; index < endpoints.length; index += 1) {
    if (!shouldContinue()) break;
    const endpoint = endpoints[index];
    const label = `${endpoint.method || 'GET'} ${endpoint.path || ''}`.trim();
    const entry = { index, endpoint, label, status: 'running' };
    entries.push(entry);
    publish();

    try {
      const cancelled = () => {
        Object.assign(entry, { status: 'cancelled' });
        publish();
      };

      await limiter();
      if (!shouldContinue()) { cancelled(); break; }
      const prepared = await prepare(endpoint, index);
      await limiter();
      if (!shouldContinue()) { cancelled(); break; }
      const plan = await generate(prepared, endpoint, index);
      await limiter();
      if (!shouldContinue()) { cancelled(); break; }
      const outcome = await execute(prepared, plan, endpoint, index);
      Object.assign(entry, {
        status: 'complete',
        config: prepared,
        testSuite: plan,
        results: Array.isArray(outcome?.results) ? outcome.results : [],
        summary: isRecord(outcome?.summary) ? outcome.summary : null
      });
    } catch (error) {
      Object.assign(entry, { status: 'error', error: error instanceof Error ? error.message : String(error) });
    }
    publish();
  }

  return entries;
}
