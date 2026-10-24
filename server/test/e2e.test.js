import test from 'node:test';
import assert from 'node:assert/strict';

const SERVER_URL = 'http://localhost:5000';

test('Stage 8: Live End-to-End API Integration Verification', async (t) => {
  await t.test('1. Health Check Endpoint', async () => {
    const res = await fetch(`${SERVER_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.app, 'APIForge');
    assert.ok(data.model);
  });

  await t.test('2. Demo Mode Initial State & Toggle', async () => {
    // Set to vulnerable mode first
    const setRes = await fetch(`${SERVER_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vulnerable' })
    });
    assert.strictEqual(setRes.status, 200);
    const modeData = await setRes.json();
    assert.strictEqual(modeData.mode, 'vulnerable');
    assert.strictEqual(modeData.isVulnerable, true);
  });

  let generatedPlan = null;

  await t.test('3. Test Plan Generation via /api/analyze', async () => {
    const res = await fetch(`${SERVER_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST',
        path: '/api/demo/orders',
        expectedStatus: 201,
        useOfflineDemo: true,
        businessRules: 'Quantity must be greater than zero. Unit price cannot be negative.'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.tests.length >= 8);
    generatedPlan = data.data;
  });

  await t.test('4. Run Tests against Vulnerable Demo Mode (Catches Bug)', async () => {
    assert.ok(generatedPlan, 'Plan must exist');

    const res = await fetch(`${SERVER_URL}/api/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetBaseUrl: SERVER_URL,
        tests: generatedPlan.tests
      })
    });
    assert.strictEqual(res.status, 200);
    const runData = await res.json();

    // Verification: At least 1 test MUST fail (the deliberate negative quantity defect demo-004)
    assert.strictEqual(runData.summary.failed >= 1, true);
    assert.strictEqual(runData.summary.passed >= 1, true);

    const negativeQtyResult = runData.results.find(r => r.id === 'demo-004');
    assert.ok(negativeQtyResult, 'demo-004 must be present in execution results');
    assert.strictEqual(negativeQtyResult.status, 'FAIL');
    assert.strictEqual(negativeQtyResult.actual.status, 201); // Deliberate defect: returns 201 instead of 400!
    assert.match(negativeQtyResult.failureReason, /Expected HTTP 400, but received 201/);
  });

  await t.test('5. AI Failure Diagnosis via /api/explain-failure', async () => {
    const testCase = generatedPlan.tests.find(t => t.id === 'demo-004');
    const actual = { status: 201, body: { success: true, order: { quantity: -1 } } };

    const res = await fetch(`${SERVER_URL}/api/explain-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: testCase,
        actual,
        businessRules: 'Quantity must be greater than zero.'
      })
    });
    assert.strictEqual(res.status, 200);
    const explainData = await res.json();
    assert.strictEqual(explainData.success, true);
    assert.ok(explainData.data.observedIssue);
    assert.ok(explainData.data.recommendedFix);
  });

  await t.test('6. Toggle to Safe Mode and Re-verify (All Tests Pass)', async () => {
    // Switch to Safe Mode
    await fetch(`${SERVER_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'safe' })
    });

    // Re-run test suite
    const res = await fetch(`${SERVER_URL}/api/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetBaseUrl: SERVER_URL,
        tests: generatedPlan.tests
      })
    });
    assert.strictEqual(res.status, 200);
    const runData = await res.json();

    // Now all 8 tests must PASS because Safe Mode rejects quantity <= 0 with 400!
    assert.strictEqual(runData.summary.failed, 0);
    assert.strictEqual(runData.summary.passed, 8);

    const negativeQtyResult = runData.results.find(r => r.id === 'demo-004');
    assert.strictEqual(negativeQtyResult.status, 'PASS');
    assert.strictEqual(negativeQtyResult.actual.status, 400);
  });
});
