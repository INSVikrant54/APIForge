/**
 * Generates an executable Jest (JavaScript) regression test file
 * Uses TEST_API_BASE_URL environment variable and deterministic assertions
 */

export function generateJestSuite(testSuite, results = []) {
  const testsToExport = testSuite.tests || [];
  
  const testCasesData = testsToExport.map(t => {
    const res = results.find(r => r.id === t.id);
    return {
      name: t.name,
      category: t.category,
      method: t.request?.method || 'POST',
      path: t.request?.path || '/api/demo/orders',
      headers: t.request?.headers || { 'Content-Type': 'application/json' },
      body: t.request?.body || null,
      expectedStatus: t.expected?.statusCodes?.[0] || 200,
      description: t.description,
      wasVerifiedFailure: res?.status === 'FAIL'
    };
  });

  return `/**
 * APIForge Generated Regression Test Suite
 * Suite: ${testSuite.suiteName || 'API Verification Suite'}
 * Generated: ${new Date().toISOString()}
 * 
 * Instructions:
 * 1. Install dependencies: npm install --save-dev jest
 * 2. Set TEST_API_BASE_URL environment variable:
 *    export TEST_API_BASE_URL="http://localhost:5000"
 * 3. Run tests: npx jest
 */

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:5000';

describe('${testSuite.suiteName || 'APIForge Verification Suite'}', () => {
  const testCases = ${JSON.stringify(testCasesData, null, 2)};

  testCases.forEach((tc) => {
    const testTitle = \`[\${tc.category.toUpperCase()}] \${tc.name} -> Expected HTTP \${tc.expectedStatus}\`;
    
    test(testTitle, async () => {
      const targetUrl = tc.path.startsWith('http') 
        ? tc.path 
        : \`\${BASE_URL.replace(/\\/$/, '')}/\${tc.path.replace(/^\\//, '')}\`;

      const options = {
        method: tc.method,
        headers: {
          'Content-Type': 'application/json',
          ...tc.headers
        }
      };

      if (tc.body && ['POST', 'PUT', 'PATCH'].includes(tc.method)) {
        options.body = JSON.stringify(tc.body);
      }

      const response = await fetch(targetUrl, options);
      
      // Verify expected HTTP status code
      expect(response.status).toBe(tc.expectedStatus);

      // Verify response body is parseable JSON if applicable
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });
  });
});
`;
}
