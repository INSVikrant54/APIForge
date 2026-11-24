import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getValueByPath,
  evaluateTestAssertions,
  evaluateDemoOrderInvariants,
} from '../services/assertionEngine.js';

describe('getValueByPath', () => {
  it('extracts nested object properties', () => {
    const data = {
      body: {
        user: {
          profile: {
            email: 'ada@example.com',
            active: false,
            count: 0,
          },
        },
      },
    };

    assert.equal(getValueByPath(data, 'body.user.profile.email'), 'ada@example.com');
    assert.equal(getValueByPath(data, 'body.user.profile.active'), false);
    assert.equal(getValueByPath(data, 'body.user.profile.count'), 0);
  });

  it('supports array bracket notation including nested items[0].id', () => {
    const data = {
      body: {
        items: [
          { id: 'item-101', tags: ['alpha', 'beta'] },
          { id: 'item-202', tags: ['gamma'] },
        ],
      },
    };

    assert.equal(getValueByPath(data, 'body.items[0].id'), 'item-101');
    assert.equal(getValueByPath(data, 'body.items[1].id'), 'item-202');
    assert.equal(getValueByPath(data, 'body.items[0].tags[1]'), 'beta');
    assert.equal(getValueByPath([{ id: 42 }], '[0].id'), 42);
  });

  it('returns undefined for missing, null, or invalid paths and inputs', () => {
    const data = {
      body: {
        order: null,
        items: [{ id: 1 }],
      },
    };

    assert.equal(getValueByPath(data, 'body.order.totalPrice'), undefined);
    assert.equal(getValueByPath(data, 'body.items[5].id'), undefined);
    assert.equal(getValueByPath(data, 'body.nonexistent.deep.field'), undefined);
    assert.equal(getValueByPath(data, ''), undefined);
    assert.equal(getValueByPath(data, null), undefined);
    assert.equal(getValueByPath(null, 'body.id'), undefined);
    assert.equal(getValueByPath(undefined, 'body.id'), undefined);
  });
});

describe('evaluateTestAssertions - status code checks', () => {
  it('passes for a matching single statusCode or single-element statusCodes', () => {
    const res1 = evaluateTestAssertions(
      { status: 201, headers: {}, body: {} },
      { statusCode: 201, description: 'Resource created' }
    );
    assert.equal(res1.passed, true);
    assert.equal(res1.primaryFailure, null);
    assert.equal(res1.assertions.length, 1);
    assert.equal(res1.assertions[0].id, 'assert-status');
    assert.equal(res1.assertions[0].type, 'statusCode');
    assert.equal(res1.assertions[0].expected, 201);
    assert.equal(res1.assertions[0].actual, 201);
    assert.equal(res1.assertions[0].passed, true);

    const res2 = evaluateTestAssertions(
      { status: 200, headers: {}, body: {} },
      { statusCodes: [200] }
    );
    assert.equal(res2.passed, true);
    assert.equal(res2.assertions[0].expected, 200);
  });

  it('passes when actual status matches an array of expected statusCodes', () => {
    const res = evaluateTestAssertions(
      { status: 204, headers: {}, body: null },
      { statusCodes: [200, 204] }
    );

    assert.equal(res.passed, true);
    assert.equal(res.primaryFailure, null);
    assert.deepEqual(res.assertions[0].expected, [200, 204]);
    assert.equal(res.assertions[0].actual, 204);
    assert.equal(res.assertions[0].passed, true);
  });

  it('fails with descriptive message when status code does not match', () => {
    const res = evaluateTestAssertions(
      { status: 500, headers: {}, body: { error: 'Internal' } },
      { statusCodes: [200, 201] }
    );

    assert.equal(res.passed, false);
    assert.equal(res.assertions[0].passed, false);
    assert.equal(res.assertions[0].message, 'Expected HTTP 200 or 201, but received 500');
    assert.equal(res.primaryFailure, 'Expected HTTP 200 or 201, but received 500');
  });
});

describe('evaluateTestAssertions - all 8 operators and aliases', () => {
  const baseActual = {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      ok: true,
      disabled: false,
      count: 42,
      price: 19.5,
      zero: 0,
      emptyStr: '',
      nullable: null,
      message: 'Order confirmed successfully',
      tags: ['express', 'priority'],
      meta: { role: 'admin' },
    },
  };

  it('handles equals and eq including strict, JSON, stringified boolean, and numeric coercion', () => {
    const res = evaluateTestAssertions(baseActual, {
      statusCodes: [200],
      assertions: [
        { target: 'body.message', operator: 'equals', value: 'Order confirmed successfully' },
        { path: 'body.meta', operator: 'eq', value: { role: 'admin' } },
        { target: 'body.ok', operator: 'equals', value: 'true' },
        { target: 'body.disabled', operator: 'eq', value: 'false' },
        { target: 'body.count', operator: 'equals', value: '42' },
        { target: 'body.zero', operator: 'eq', value: '0' },
      ],
    });

    assert.equal(res.passed, true);
    assert.equal(res.primaryFailure, null);
    for (const item of res.assertions) {
      assert.equal(item.passed, true);
    }

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.count', operator: 'equals', value: '' },
        { target: 'body.ok', operator: 'eq', value: 'false' },
      ],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions[0].passed, false);
    assert.equal(failRes.assertions[1].passed, false);
  });

  it('handles notEquals and neq', () => {
    const passRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.count', operator: 'notEquals', value: 99 },
        { target: 'body.meta', operator: 'neq', value: { role: 'guest' } },
      ],
    });
    assert.equal(passRes.passed, true);

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [{ target: 'body.count', operator: 'neq', value: 42 }],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions[0].passed, false);
  });

  it('handles exists and notExists', () => {
    const passRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.zero', operator: 'exists' },
        { target: 'body.emptyStr', operator: 'exists' },
        { target: 'body.disabled', operator: 'exists' },
        { target: 'body.nullable', operator: 'notExists' },
        { target: 'body.missingField', operator: 'notExists' },
      ],
    });
    assert.equal(passRes.passed, true);

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.nullable', operator: 'exists' },
        { target: 'body.count', operator: 'notExists' },
      ],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions[0].passed, false);
    assert.equal(failRes.assertions[1].passed, false);
  });

  it('handles type including array, object, string, number, boolean', () => {
    const passRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.tags', operator: 'type', value: 'array' },
        { target: 'body.meta', operator: 'type', value: 'object' },
        { target: 'body.message', operator: 'type', value: 'string' },
        { target: 'body.count', operator: 'type', value: 'number' },
        { target: 'body.ok', operator: 'type', value: 'boolean' },
      ],
    });
    assert.equal(passRes.passed, true);

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [{ target: 'body.tags', operator: 'type', value: 'object' }],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions[0].passed, false);
    assert.match(failRes.assertions[0].message, /got array/);
  });

  it('handles greaterThan / gt and lessThan / lt', () => {
    const passRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.count', operator: 'greaterThan', value: 40 },
        { target: 'body.price', operator: 'gt', value: 19 },
        { target: 'body.count', operator: 'lessThan', value: 50 },
        { target: 'body.price', operator: 'lt', value: 20 },
      ],
    });
    assert.equal(passRes.passed, true);

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.count', operator: 'gt', value: 42 },
        { target: 'body.count', operator: 'lt', value: 42 },
        { target: 'body.message', operator: 'greaterThan', value: 0 },
      ],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions.every((a) => a.passed === false), true);
  });

  it('handles contains for both strings and arrays, and fails on other types', () => {
    const passRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.message', operator: 'contains', value: 'confirmed' },
        { target: 'body.tags', operator: 'contains', value: 'priority' },
        { target: 'headers.content-type', operator: 'contains', value: 'json' },
      ],
    });
    assert.equal(passRes.passed, true);

    const failRes = evaluateTestAssertions(baseActual, {
      assertions: [
        { target: 'body.message', operator: 'contains', value: 'cancelled' },
        { target: 'body.tags', operator: 'contains', value: 'standard' },
        { target: 'body.count', operator: 'contains', value: 4 },
      ],
    });
    assert.equal(failRes.passed, false);
    assert.equal(failRes.assertions.every((a) => a.passed === false), true);
  });
});

describe('evaluateTestAssertions - fail-closed behavior for unknown operators', () => {
  it('fails closed when encountering unknown operators such as regex or unknownOp', () => {
    const regexRes = evaluateTestAssertions(
      { status: 200, headers: {}, body: { code: 'ABC-123' } },
      {
        statusCodes: [200],
        assertions: [{ target: 'body.code', operator: 'regex', value: '^ABC-\\d+$' }],
      }
    );

    assert.equal(regexRes.passed, false);
    assert.equal(regexRes.assertions[1].passed, false);
    assert.match(regexRes.assertions[1].message, /Unknown assertion operator 'regex' \(fail-closed\)/);
    assert.equal(regexRes.primaryFailure, "Unknown assertion operator 'regex' (fail-closed)");

    const unknownRes = evaluateTestAssertions(
      { status: 200, headers: {}, body: { id: 1 } },
      {
        assertions: [{ target: 'body.id', operator: 'unknownOp', value: 1 }],
      }
    );

    assert.equal(unknownRes.passed, false);
    assert.equal(unknownRes.assertions[0].passed, false);
    assert.match(unknownRes.assertions[0].message, /Unknown assertion operator 'unknownOp' \(fail-closed\)/);
  });
});

describe('Demo-logic isolation and evaluateDemoOrderInvariants', () => {
  const mismatchedOrderResponse = {
    status: 201,
    headers: {},
    body: {
      order: {
        id: 'ord-1',
        quantity: 3,
        unitPrice: 10.5,
        totalPrice: 99.99, // expected 31.5
      },
    },
  };

  it('does NOT trigger demo order invariant for external /api/orders requests', () => {
    const res = evaluateTestAssertions(
      mismatchedOrderResponse,
      { statusCodes: [201] },
      { method: 'POST', path: '/api/orders' }
    );

    assert.equal(res.passed, true);
    assert.equal(res.primaryFailure, null);
    assert.equal(res.assertions.length, 1);
    assert.equal(
      res.assertions.some((a) => a.id === 'assert-business-total-price'),
      false
    );
  });

  it('triggers evaluateDemoOrderInvariants for /api/demo/orders and fails on totalPrice mismatch', () => {
    const res = evaluateTestAssertions(
      mismatchedOrderResponse,
      { statusCodes: [201] },
      { method: 'POST', path: '/api/demo/orders' }
    );

    assert.equal(res.passed, false);
    const demoAssertion = res.assertions.find((a) => a.id === 'assert-business-total-price');
    assert.ok(demoAssertion, 'Expected demo businessRule assertion to be present');
    assert.equal(demoAssertion.type, 'businessRule');
    assert.equal(demoAssertion.expected, 31.5);
    assert.equal(demoAssertion.actual, 99.99);
    assert.equal(demoAssertion.passed, false);
    assert.match(demoAssertion.message, /Total price mismatch: got 99\.99, expected 31\.5/);
    assert.equal(res.primaryFailure, demoAssertion.message);
  });

  it('passes /api/demo/orders when totalPrice matches quantity * unitPrice', () => {
    const validOrderResponse = {
      status: 200,
      headers: {},
      body: {
        order: {
          id: 'ord-2',
          quantity: 3,
          unitPrice: 10.5,
          totalPrice: 31.5,
        },
      },
    };

    const res = evaluateTestAssertions(
      validOrderResponse,
      { statusCodes: [200] },
      { method: 'GET', path: '/api/demo/orders/ord-2' }
    );

    assert.equal(res.passed, true);
    assert.equal(res.primaryFailure, null);
    const demoAssertion = res.assertions.find((a) => a.id === 'assert-business-total-price');
    assert.ok(demoAssertion);
    assert.equal(demoAssertion.passed, true);
  });

  it('evaluateDemoOrderInvariants returns null for non-2xx responses or incomplete order objects', () => {
    assert.equal(
      evaluateDemoOrderInvariants({
        status: 400,
        body: { order: { quantity: 2, unitPrice: 5, totalPrice: 99 } },
      }),
      null
    );
    assert.equal(evaluateDemoOrderInvariants({ status: 200, body: {} }), null);
    assert.equal(
      evaluateDemoOrderInvariants({
        status: 200,
        body: { order: { quantity: '2', unitPrice: 5, totalPrice: 10 } },
      }),
      null
    );
  });
});
