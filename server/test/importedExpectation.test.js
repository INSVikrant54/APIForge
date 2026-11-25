import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  normalizeExpectedStatusCodes,
  validateAndNormalizeTestPlan
} from '../utils/schemaValidator.js';
import { generateTestPlan } from '../services/gemmaService.js';
import analyzeRouter from '../routes/analyze.js';

const samplePlan = () => ({
  tests: [
    {
      id: 'happy-1',
      category: 'happy_path',
      expected: { statusCodes: [200], description: 'Model guessed 200' }
    },
    {
      id: 'negative-1',
      category: 'missing_field',
      expected: { statusCodes: [422], description: 'Rejected' }
    }
  ]
});

describe('imported OpenAPI expected-status enforcement', () => {
  describe('normalizeExpectedStatusCodes', () => {
    it('keeps integer HTTP codes 100-599, drops invalid entries and duplicates', () => {
      assert.deepEqual(
        normalizeExpectedStatusCodes([200, 204, 99, 600, '201', 200.5, null, undefined, true, {}, 299, 100, 599]),
        [200, 204, 299, 100, 599]
      );
    });

    it('caps the list at 10 codes', () => {
      const input = [200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211];
      assert.equal(normalizeExpectedStatusCodes(input).length, 10);
      assert.deepEqual(normalizeExpectedStatusCodes(input), [200, 201, 202, 203, 204, 205, 206, 207, 208, 209]);
    });

    it('returns an empty list for non-arrays', () => {
      for (const value of [null, undefined, '200', 200, {}, true]) {
        assert.deepEqual(normalizeExpectedStatusCodes(value), []);
      }
    });
  });

  describe('validateAndNormalizeTestPlan with imported metadata', () => {
    it('forces happy_path codes to the declared list and leaves negative categories untouched', () => {
      const result = validateAndNormalizeTestPlan(samplePlan(), {
        expectedStatusCodes: [201, 204],
        expectedStatusReviewRequired: false
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [201, 204]);
      assert.deepEqual(result.tests[1].expected.statusCodes, [422]);
      assert.equal(result.tests[0].requiresReview, false);
      assert.equal(result.tests[0].confirmed, true);
    });

    it('normalizes invalid entries before enforcing them', () => {
      const result = validateAndNormalizeTestPlan(samplePlan(), {
        expectedStatusCodes: [99, 204, '200', 204, 600],
        expectedStatusReviewRequired: false
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [204]);
    });

    it('preserves an empty declared list, flags review and never invents 200', () => {
      const result = validateAndNormalizeTestPlan(samplePlan(), {
        expectedStatusCodes: [],
        expectedStatusReviewRequired: false
      });

      const [happy, negative] = result.tests;
      assert.deepEqual(happy.expected.statusCodes, []);
      assert.match(happy.expected.description, /confirm/i);
      assert.equal(happy.requiresReview, true);
      assert.equal(happy.confirmed, false);
      // Negative categories are not constrained by the imported success list.
      assert.deepEqual(negative.expected.statusCodes, [422]);
      assert.equal(negative.requiresReview, false);
    });

    it('flags happy_path for review when expectedStatusReviewRequired is true', () => {
      const result = validateAndNormalizeTestPlan(samplePlan(), {
        expectedStatusCodes: [200],
        expectedStatusReviewRequired: true
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [200]);
      assert.equal(result.tests[0].requiresReview, true);
      assert.equal(result.tests[0].confirmed, false);
    });

    it('treats a review flag without a status list as an empty declared list', () => {
      const result = validateAndNormalizeTestPlan(samplePlan(), {
        expectedStatusReviewRequired: true
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, []);
      assert.match(result.tests[0].expected.description, /confirm/i);
      assert.equal(result.tests[0].requiresReview, true);
      assert.equal(result.tests[0].confirmed, false);
    });

    it('leaves non-imported generation unchanged', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          { category: 'happy_path' },
          { category: 'missing_field' }
        ]
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [200, 201]);
      assert.deepEqual(result.tests[1].expected.statusCodes, [400]);
      assert.equal(result.tests[0].requiresReview, false);
      assert.equal(result.tests[0].confirmed, true);
    });
  });

  describe('generateTestPlan final enforcement', () => {
    // useOfflineDemo keeps these tests deterministic without an API key.
    const offlineRequest = (extra = {}) => ({
      path: '/api/demo/orders',
      useOfflineDemo: true,
      ...extra
    });

    const happyCases = (plan) => plan.tests.filter(t => t.category === 'happy_path');

    it('leaves offline demo mode unchanged when no imported metadata is supplied', async () => {
      const plan = await generateTestPlan(offlineRequest());
      const happy = happyCases(plan);

      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, [201]);
      assert.equal(happy[0].confirmed, true);
      assert.equal(plan.isPredefinedDemo, true);
    });

    it('overrides happy_path codes from imported metadata regardless of the predefined suite', async () => {
      const plan = await generateTestPlan(offlineRequest({
        expectedStatusCodes: [202, 204],
        expectedStatusReviewRequired: false
      }));
      const happy = happyCases(plan);

      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, [202, 204]);
      assert.equal(happy[0].requiresReview, false);
      assert.equal(happy[0].confirmed, true);
      // Negative categories keep their predefined expectations.
      const negative = plan.tests.find(t => t.category === 'missing_field');
      assert.ok(negative);
      assert.deepEqual(negative.expected.statusCodes, [400]);
    });

    it('preserves empty codes with a confirmation description and review flags', async () => {
      const plan = await generateTestPlan(offlineRequest({ expectedStatusCodes: [] }));
      const happy = happyCases(plan);

      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, []);
      assert.match(happy[0].expected.description, /confirm/i);
      assert.equal(happy[0].requiresReview, true);
      assert.equal(happy[0].confirmed, false);
    });

    it('applies codes and review flags together when review is required', async () => {
      const plan = await generateTestPlan(offlineRequest({
        expectedStatusCodes: [200],
        expectedStatusReviewRequired: true
      }));
      const happy = happyCases(plan);

      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, [200]);
      assert.equal(happy[0].requiresReview, true);
      assert.equal(happy[0].confirmed, false);
    });

    it('normalizes and caps the declared list before enforcement', async () => {
      const plan = await generateTestPlan(offlineRequest({
        expectedStatusCodes: [99, 201, '200', 201, 600, 202, 203, 204, 205, 206, 207, 208, 209, 210]
      }));
      const happy = happyCases(plan);

      assert.deepEqual(happy[0].expected.statusCodes, [201, 202, 203, 204, 205, 206, 207, 208, 209, 210]);
    });
  });

  describe('POST /api/analyze propagation', () => {
    let server;
    let baseUrl;

    before(async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/analyze', analyzeRouter);
      await new Promise(resolve => {
        server = app.listen(0, '127.0.0.1', resolve);
      });
      baseUrl = `http://127.0.0.1:${server.address().port}/api/analyze`;
    });

    after(async () => {
      if (server) await new Promise(resolve => server.close(resolve));
    });

    const post = async (payload) => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/api/demo/orders', useOfflineDemo: true, ...payload })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      return body.data;
    };

    it('forwards a declared status list to happy_path cases', async () => {
      const plan = await post({ expectedStatusCodes: [203], expectedStatusReviewRequired: false });
      const happy = plan.tests.filter(t => t.category === 'happy_path');
      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, [203]);
    });

    it('forwards review-required metadata and preserves empty codes', async () => {
      const plan = await post({ expectedStatusCodes: [], expectedStatusReviewRequired: true });
      const happy = plan.tests.filter(t => t.category === 'happy_path');
      assert.ok(happy.length > 0);
      assert.deepEqual(happy[0].expected.statusCodes, []);
      assert.match(happy[0].expected.description, /confirm/i);
      assert.equal(happy[0].requiresReview, true);
      assert.equal(happy[0].confirmed, false);
    });

    it('ignores a non-array expectedStatusCodes value instead of failing', async () => {
      const plan = await post({ expectedStatusCodes: '200', expectedStatusReviewRequired: false });
      const happy = plan.tests.filter(t => t.category === 'happy_path');
      assert.deepEqual(happy[0].expected.statusCodes, [201]);
    });
  });
});
