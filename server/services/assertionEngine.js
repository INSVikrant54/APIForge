/**
 * Deterministic Assertion Engine
 * Evaluates API response against expected contracts without executing arbitrary code.
 */

// Helper to safely extract nested properties (e.g. 'body.order.totalPrice')
export function getValueByPath(obj, path) {
  if (!path || !obj) return undefined;
  const parts = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Evaluate deterministic assertions for a single test case
 * @param {Object} actual - { status, headers, body, durationMs }
 * @param {Object} expected - { statusCodes, description, assertions }
 * @param {Object} request - { method, path, headers, body }
 * @returns {Object} { passed: boolean, assertions: Array, failureReason: string|null }
 */
export function evaluateTestAssertions(actual, expected = {}, request = {}) {
  const results = [];
  let allPassed = true;
  let primaryFailure = null;

  // 1. Status Code Evaluation
  const expectedCodes = expected.statusCodes || (expected.statusCode ? [expected.statusCode] : []);
  if (expectedCodes.length > 0) {
    const isStatusMatch = expectedCodes.includes(actual.status);
    const statusAssertion = {
      id: 'assert-status',
      type: 'statusCode',
      description: expected.description || `Expected HTTP status ${expectedCodes.join(' or ')}`,
      expected: expectedCodes.length === 1 ? expectedCodes[0] : expectedCodes,
      actual: actual.status,
      passed: isStatusMatch,
      message: isStatusMatch
        ? `HTTP status ${actual.status} matches expected [${expectedCodes.join(', ')}]`
        : `Expected HTTP ${expectedCodes.join(' or ')}, but received ${actual.status}`
    };

    results.push(statusAssertion);
    if (!isStatusMatch) {
      allPassed = false;
      if (!primaryFailure) primaryFailure = statusAssertion.message;
    }
  }

  // 2. Structured Declarative Assertions (if any configured)
  const customAssertions = Array.isArray(expected.assertions) ? expected.assertions : [];
  for (let i = 0; i < customAssertions.length; i++) {
    const a = customAssertions[i];
    const targetPath = a.target || a.path || 'body';
    const operator = a.operator || 'equals';
    const targetVal = getValueByPath({ body: actual.body, headers: actual.headers, status: actual.status }, targetPath);
    let assertionPassed = false;
    let detailMessage = '';

    switch (operator) {
      case 'equals':
      case 'eq':
        assertionPassed = JSON.stringify(targetVal) === JSON.stringify(a.value);
        detailMessage = assertionPassed
          ? `${targetPath} equals ${JSON.stringify(a.value)}`
          : `Expected ${targetPath} to equal ${JSON.stringify(a.value)}, but got ${JSON.stringify(targetVal)}`;
        break;

      case 'notEquals':
      case 'neq':
        assertionPassed = JSON.stringify(targetVal) !== JSON.stringify(a.value);
        detailMessage = assertionPassed
          ? `${targetPath} does not equal ${JSON.stringify(a.value)}`
          : `Expected ${targetPath} to not equal ${JSON.stringify(a.value)}`;
        break;

      case 'exists':
        assertionPassed = targetVal !== undefined && targetVal !== null;
        detailMessage = assertionPassed
          ? `${targetPath} exists in response`
          : `Expected field '${targetPath}' to exist in response`;
        break;

      case 'notExists':
        assertionPassed = targetVal === undefined || targetVal === null;
        detailMessage = assertionPassed
          ? `${targetPath} does not exist in response`
          : `Expected field '${targetPath}' to NOT exist in response`;
        break;

      case 'type':
        const actualType = Array.isArray(targetVal) ? 'array' : typeof targetVal;
        assertionPassed = actualType === a.value;
        detailMessage = assertionPassed
          ? `${targetPath} is of type ${a.value}`
          : `Expected ${targetPath} to be of type ${a.value}, but got ${actualType}`;
        break;

      case 'greaterThan':
      case 'gt':
        assertionPassed = typeof targetVal === 'number' && targetVal > a.value;
        detailMessage = assertionPassed
          ? `${targetPath} (${targetVal}) > ${a.value}`
          : `Expected ${targetPath} (${targetVal}) to be > ${a.value}`;
        break;

      case 'lessThan':
      case 'lt':
        assertionPassed = typeof targetVal === 'number' && targetVal < a.value;
        detailMessage = assertionPassed
          ? `${targetPath} (${targetVal}) < ${a.value}`
          : `Expected ${targetPath} (${targetVal}) to be < ${a.value}`;
        break;

      case 'contains':
        if (typeof targetVal === 'string') {
          assertionPassed = targetVal.includes(String(a.value));
        } else if (Array.isArray(targetVal)) {
          assertionPassed = targetVal.includes(a.value);
        } else {
          assertionPassed = false;
        }
        detailMessage = assertionPassed
          ? `${targetPath} contains ${JSON.stringify(a.value)}`
          : `Expected ${targetPath} to contain ${JSON.stringify(a.value)}`;
        break;

      default:
        assertionPassed = true;
        detailMessage = `Unknown operator '${operator}', skipped`;
        break;
    }

    const item = {
      id: a.id || `assert-${i + 1}`,
      type: operator,
      target: targetPath,
      description: a.description || detailMessage,
      expected: a.value,
      actual: targetVal,
      passed: assertionPassed,
      message: detailMessage
    };

    results.push(item);
    if (!assertionPassed) {
      allPassed = false;
      if (!primaryFailure) primaryFailure = detailMessage;
    }
  }

  // 3. Business Rule Invariant: Total Price Math Check (if response contains totalPrice and order details)
  if (actual.status >= 200 && actual.status < 300 && actual.body && actual.body.order) {
    const order = actual.body.order;
    if (typeof order.quantity === 'number' && typeof order.unitPrice === 'number' && typeof order.totalPrice === 'number') {
      const calculatedExpected = Number((order.quantity * order.unitPrice).toFixed(2));
      const isMathValid = Math.abs(order.totalPrice - calculatedExpected) < 0.001;
      
      const mathAssertion = {
        id: 'assert-business-total-price',
        type: 'businessRule',
        description: 'Order totalPrice must equal quantity multiplied by unitPrice',
        expected: calculatedExpected,
        actual: order.totalPrice,
        passed: isMathValid,
        message: isMathValid
          ? `Total price (${order.totalPrice}) correctly equals ${order.quantity} × ${order.unitPrice}`
          : `Total price mismatch: got ${order.totalPrice}, expected ${calculatedExpected} (${order.quantity} × ${order.unitPrice})`
      };
      
      results.push(mathAssertion);
      if (!isMathValid) {
        allPassed = false;
        if (!primaryFailure) primaryFailure = mathAssertion.message;
      }
    }
  }

  return {
    passed: allPassed,
    assertions: results,
    primaryFailure: primaryFailure || (allPassed ? null : 'Assertion check failed')
  };
}
