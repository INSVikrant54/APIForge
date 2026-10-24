/**
 * Generates an executable Pytest (Python) regression test file
 * Uses TEST_API_BASE_URL environment variable and requests library
 */

export function generatePytestSuite(testSuite, results = []) {
  const testsToExport = testSuite.tests || [];

  const testCasesData = testsToExport.map(t => {
    const res = results.find(r => r.id === t.id);
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      method: t.request?.method || 'POST',
      path: t.request?.path || '/api/demo/orders',
      headers: t.request?.headers || { 'Content-Type': 'application/json' },
      body: t.request?.body || null,
      expected_status: t.expected?.statusCodes?.[0] || 200,
      was_verified_failure: res?.status === 'FAIL'
    };
  });

  return `"""
APIForge Generated Regression Test Suite
Suite: ${testSuite.suiteName || 'API Verification Suite'}
Generated: ${new Date().toISOString()}

Instructions:
1. Install requirements: pip install pytest requests
2. Set environment variable:
   export TEST_API_BASE_URL="http://localhost:5000"
3. Run tests: pytest -v test_api_regression.py
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("TEST_API_BASE_URL", "http://localhost:5000")

TEST_CASES = ${JSON.stringify(testCasesData, null, 4).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}

@pytest.mark.parametrize("tc", TEST_CASES, ids=lambda x: f"{x['id']}_{x['category']}")
def test_api_behavior(tc):
    target_url = tc["path"] if tc["path"].startswith("http") else f"{BASE_URL.rstrip('/')}/{tc['path'].lstrip('/')}"
    
    headers = tc.get("headers", {})
    body = tc.get("body")
    method = tc.get("method", "POST").upper()

    response = requests.request(
        method=method,
        url=target_url,
        json=body if body and method in ["POST", "PUT", "PATCH"] else None,
        headers=headers,
        timeout=10
    )

    # Assert expected HTTP status code
    assert response.status_code == tc["expected_status"], (
        f"Expected HTTP {tc['expected_status']} but got {response.status_code}. "
        f"Response body: {response.text}"
    )
`;
}
