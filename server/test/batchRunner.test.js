import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  runBatch,
  createBatchLimiter,
  MAX_BATCH_ENDPOINTS,
  BATCH_INTERVAL_MS
} from '../../client/src/utils/batchRunner.js';

function fakeLimiter() {
  const calls = [];
  return { calls, limiter: async () => { calls.push(Date.now()); } };
}

function endpoints(count) {
  return Array.from({ length: count }, (_, i) => ({ method: 'GET', path: `/p${i}` }));
}

describe('bounded batch runner', () => {
  it('runs endpoints sequentially and paces all calls at 10/min', async () => {
    const order = [];
    const { calls, limiter } = fakeLimiter();
    const entries = await runBatch({
      endpoints: endpoints(2),
      limiter,
      prepare: async (endpoint) => { order.push(`prepare:${endpoint.path}`); return { endpoint }; },
      generate: async (config) => { order.push('generate'); return { tests: [] }; },
      execute: async () => { order.push('execute'); return { results: [], summary: { passed: 0 } }; }
    });

    assert.deepEqual(entries.map(e => e.status), ['complete', 'complete']);
    assert.deepEqual(order, [
      'prepare:/p0', 'generate', 'execute',
      'prepare:/p1', 'generate', 'execute'
    ]);
    assert.equal(calls.length, 6, 'prepare, generate and execute are all paced');
  });

  it('enforces the endpoint cap', async () => {
    await assert.rejects(
      () => runBatch({
        endpoints: endpoints(MAX_BATCH_ENDPOINTS + 1),
        limiter: async () => {},
        prepare: (e) => e,
        generate: () => ({}),
        execute: () => ({})
      }),
      /limited to 5 endpoints/
    );
  });

  it('records a failed endpoint and continues', async () => {
    const entries = await runBatch({
      endpoints: endpoints(3),
      limiter: async () => {},
      prepare: (endpoint) => endpoint,
      generate: (_, endpoint) => {
        if (endpoint.path === '/p1') throw new Error('analysis failed');
        return { tests: [] };
      },
      execute: () => ({ results: [{ id: 't1', status: 'PASS' }], summary: { passed: 1 } })
    });

    assert.equal(entries[1].status, 'error');
    assert.equal(entries[1].error, 'analysis failed');
    assert.equal(entries[2].status, 'complete');
    assert.equal(entries[2].results[0].status, 'PASS');
  });

  it('stops cleanly when cancelled', async () => {
    let active = true;
    const entries = await runBatch({
      endpoints: endpoints(3),
      limiter: async () => {},
      shouldContinue: () => active,
      prepare: (endpoint) => endpoint,
      generate: (config, endpoint) => {
        if (endpoint.path === '/p0') active = false;
        return { tests: [] };
      },
      execute: () => ({ results: [], summary: {} })
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].status, 'cancelled');
  });

  it('the default limiter admits at most ten calls per minute', async () => {
    let now = 0;
    const sleeps = [];
    const limiter = createBatchLimiter({
      now: () => now,
      sleep: async (ms) => { sleeps.push(ms); now += ms; }
    });
    const start = [];
    for (let i = 0; i < 12; i += 1) {
      await limiter();
      start.push(now);
    }
    assert.equal(start[0], 0);
    assert.equal(start[1] - start[0], BATCH_INTERVAL_MS);
    assert.ok(start[11] >= 60 * 1000, 'the 11th call waits for the one-minute window');
    assert.ok(sleeps.every((ms) => ms > 0));
  });
});
