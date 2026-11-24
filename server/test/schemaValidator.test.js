import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndNormalizeTestPlan } from '../utils/schemaValidator.js';

describe('validateAndNormalizeTestPlan', () => {
  describe('input validation', () => {
    it('throws on null, undefined, or non-object rawPlan', () => {
      for (const invalidPlan of [null, undefined, 'string', 42, true, false]) {
        assert.throws(
          () => validateAndNormalizeTestPlan(invalidPlan),
          {
            name: 'Error',
            message: 'Test plan must be a valid JSON object'
          }
        );
      }
    });

    it('throws when tests is missing, not an array, or empty', () => {
      for (const invalidPlan of [{}, { tests: null }, { tests: 'not-an-array' }, { tests: [] }]) {
        assert.throws(
          () => validateAndNormalizeTestPlan(invalidPlan),
          {
            name: 'Error',
            message: 'Test plan must contain at least one valid test case'
          }
        );
      }
    });
  });

  describe('test count capping', () => {
    it('caps tests at 15 items when given 20 tests and sets totalCount to 15', () => {
      const tests = Array.from({ length: 20 }, (_, index) => ({
        id: `t-${index + 1}`,
        name: `Test ${index + 1}`,
        category: 'happy_path',
        severity: 'low',
        request: { method: 'GET', path: `/items/${index + 1}` },
        expected: { statusCode: 200 }
      }));

      const result = validateAndNormalizeTestPlan({ tests });

      assert.equal(result.tests.length, 15);
      assert.equal(result.totalCount, 15);
      assert.equal(result.tests[0].id, 't-1');
      assert.equal(result.tests[14].id, 't-15');
    });
  });

  describe('method, category, and severity normalization', () => {
    it('normalizes valid lowercase HTTP methods and falls back on invalid methods', () => {
      const plan = {
        tests: [
          { request: { method: 'patch' } },
          { request: { method: 'OPTIONS' } },
          { request: {} }
        ]
      };

      const withDefault = validateAndNormalizeTestPlan(plan, { defaultMethod: 'PUT' });
      assert.equal(withDefault.tests[0].request.method, 'PATCH');
      assert.equal(withDefault.tests[1].request.method, 'PUT');
      assert.equal(withDefault.tests[2].request.method, 'PUT');

      const withoutDefault = validateAndNormalizeTestPlan(plan);
      assert.equal(withoutDefault.tests[0].request.method, 'PATCH');
      assert.equal(withoutDefault.tests[1].request.method, 'POST');
      assert.equal(withoutDefault.tests[2].request.method, 'POST');
    });

    it('normalizes invalid categories to "boundary" and preserves valid categories', () => {
      const validCategories = [
        'happy_path',
        'missing_field',
        'type_validation',
        'boundary',
        'business_rule',
        'malformed_input',
        'inconsistent_data'
      ];

      const plan = {
        tests: [
          ...validCategories.map(category => ({ category })),
          { category: 'unknown_category' },
          { category: 123 },
          {}
        ]
      };

      const result = validateAndNormalizeTestPlan(plan);

      validCategories.forEach((category, idx) => {
        assert.equal(result.tests[idx].category, category);
      });
      assert.equal(result.tests[validCategories.length].category, 'boundary');
      assert.equal(result.tests[validCategories.length + 1].category, 'boundary');
      assert.equal(result.tests[validCategories.length + 2].category, 'boundary');
    });

    it('normalizes invalid severities to "medium" and preserves valid severities', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low'];

      const plan = {
        tests: [
          ...validSeverities.map(severity => ({ severity })),
          { severity: 'blocker' },
          { severity: null },
          {}
        ]
      };

      const result = validateAndNormalizeTestPlan(plan);

      validSeverities.forEach((severity, idx) => {
        assert.equal(result.tests[idx].severity, severity);
      });
      assert.equal(result.tests[validSeverities.length].severity, 'medium');
      assert.equal(result.tests[validSeverities.length + 1].severity, 'medium');
      assert.equal(result.tests[validSeverities.length + 2].severity, 'medium');
    });
  });

  describe('expected status code normalization and fallbacks', () => {
    it('normalizes expected.statusCodes, expected.statusCode, and expected.status', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'happy_path',
            expected: { statusCodes: [200, 201, 99, 600, '204', null] }
          },
          {
            category: 'missing_field',
            expected: { statusCode: 422 }
          },
          {
            category: 'type_validation',
            expected: { status: 415 }
          }
        ]
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [200, 201]);
      assert.deepEqual(result.tests[1].expected.statusCodes, [422]);
      assert.deepEqual(result.tests[2].expected.statusCodes, [415]);
    });

    it('falls back to [200, 201] for happy_path and [400] for other categories when invalid or empty', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'happy_path',
            expected: { statusCodes: [] }
          },
          {
            category: 'happy_path',
            expected: { statusCode: 999 }
          },
          {
            category: 'business_rule',
            expected: { statusCodes: ['bad', 50] }
          },
          {
            category: 'boundary',
            expected: { status: 42 }
          },
          {
            category: 'malformed_input'
          }
        ]
      });

      assert.deepEqual(result.tests[0].expected.statusCodes, [200, 201]);
      assert.deepEqual(result.tests[1].expected.statusCodes, [200, 201]);
      assert.deepEqual(result.tests[2].expected.statusCodes, [400]);
      assert.deepEqual(result.tests[3].expected.statusCodes, [400]);
      assert.deepEqual(result.tests[4].expected.statusCodes, [400]);
    });
  });

  describe('requiresReview and confirmed flags', () => {
    it('sets requiresReview: true and confirmed: false when t.requiresReview is true', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'happy_path',
            requiresReview: true,
            expected: { statusCode: 200 }
          }
        ]
      });

      assert.equal(result.tests[0].requiresReview, true);
      assert.equal(result.tests[0].confirmed, false);
    });

    it('sets requiresReview: true and confirmed: false when inconsistent_data has multiple status codes', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'inconsistent_data',
            expected: { statusCodes: [400, 409] }
          }
        ]
      });

      assert.equal(result.tests[0].requiresReview, true);
      assert.equal(result.tests[0].confirmed, false);
    });

    it('sets requiresReview: false and confirmed: true when no review triggers are present', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'inconsistent_data',
            expected: { statusCode: 409 }
          },
          {
            category: 'boundary',
            expected: { statusCodes: [400, 422] }
          }
        ]
      });

      assert.equal(result.tests[0].requiresReview, false);
      assert.equal(result.tests[0].confirmed, true);
      assert.equal(result.tests[1].requiresReview, false);
      assert.equal(result.tests[1].confirmed, true);
    });

    it('sets requiresReview: true and confirmed: false when test-level assumptions are non-empty', () => {
      const result = validateAndNormalizeTestPlan({
        tests: [
          {
            category: 'business_rule',
            assumptions: ['Assumes discount cannot exceed subtotal'],
            expected: { statusCode: 400 }
          }
        ]
      });

      assert.equal(result.tests[0].requiresReview, true);
      assert.equal(result.tests[0].confirmed, false);
    });
  });

  describe('suite and test defaults', () => {
    it('applies suite defaults, request defaults, assertions normalization, and generatedAt', () => {
      const result = validateAndNormalizeTestPlan(
        {
          suiteName: '  ',
          assumptions: ['valid assumption', '   ', 42],
          tests: [
            {
              name: '  Custom Name  ',
              request: { path: '   ', headers: ['invalid-array'] },
              expected: {
                statusCode: 201,
                assertions: [{ path: 'body.id', operator: 'exists' }]
              }
            }
          ]
        },
        { defaultMethod: 'GET', defaultPath: '/api/v1/widgets' }
      );

      assert.equal(result.suiteName, 'API Behavior Verification Suite');
      assert.equal(result.summary, 'Automated test suite generated by Gemma 4');
      assert.deepEqual(result.assumptions, ['valid assumption']);
      assert.ok(!Number.isNaN(Date.parse(result.generatedAt)));
      assert.equal(result.totalCount, 1);

      const [testCase] = result.tests;
      assert.equal(testCase.id, 'test-001');
      assert.equal(testCase.name, 'Custom Name');
      assert.equal(testCase.description, 'Custom Name');
      assert.equal(testCase.rationale, '');
      assert.equal(testCase.request.method, 'GET');
      assert.equal(testCase.request.path, '/api/v1/widgets');
      assert.deepEqual(testCase.request.headers, { 'Content-Type': 'application/json' });
      assert.equal(testCase.request.body, null);
      assert.equal(testCase.expected.description, 'Expected HTTP status 201');
      assert.deepEqual(testCase.expected.assertions, [
        {
          id: 'assert-test-001-1',
          target: 'body.id',
          operator: 'exists',
          value: null,
          description: ''
        }
      ]);
    });
  });
});
