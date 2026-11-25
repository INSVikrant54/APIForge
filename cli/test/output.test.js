import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeXml,
  decideExitCode,
  formatJson,
  formatJUnit,
  formatSarif,
  formatText
} from '../lib/output.js';

const sample = {
  success: true,
  summary: {
    total: 3,
    passed: 1,
    failed: 1,
    errors: 1,
    skipped: 0,
    needsReview: 0,
    durationMs: 12
  },
  results: [
    { id: 'pass-1', name: 'Pass', status: 'PASS', durationMs: 4 },
    { id: 'fail-1', name: 'Fail < & "', status: 'FAIL', durationMs: 5, failureReason: 'Expected 200 < 500' },
    { id: 'err-1', name: 'Error', status: 'ERROR', durationMs: 3, error: 'Boom & crash' }
  ]
};
const meta = { suiteName: 'S & S', environment: 'default' };

describe('output formatters', () => {
  it('escapes XML special characters', () => {
    assert.equal(escapeXml(`a&b<c>d"e'f`), 'a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });

  it('emits parseable JSON with only suite, environment, summary and results', () => {
    const parsed = JSON.parse(formatJson(sample, meta));
    assert.deepEqual(Object.keys(parsed).sort(), ['environment', 'results', 'suite', 'summary']);
    assert.deepEqual(parsed.summary, sample.summary);
    assert.equal(parsed.results.length, 3);
    assert.equal(parsed.suite, 'S & S');
  });

  it('emits well-formed JUnit with testsuite/testcase/failure/error entries', () => {
    const xml = formatJUnit(sample, meta);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<testsuite name="S &amp; S" tests="3" failures="1" errors="1"/);
    assert.match(xml, /<testcase name="Fail &lt; &amp; &quot;" classname="fail-1"/);
    assert.match(xml, /<failure message="Expected 200 &lt; 500">/);
    assert.match(xml, /<error message="Boom &amp; crash">/);
    assert.equal((xml.match(/<testcase /g) || []).length, 3);
    assert.ok(!/&(?!(amp|lt|gt|quot|apos);)/.test(xml));
  });

  it('emits SARIF 2.1.0 with results only for FAIL/ERROR/NEEDS REVIEW', () => {
    const withReview = {
      ...sample,
      summary: { ...sample.summary, needsReview: 1 },
      results: [
        ...sample.results,
        { id: 'rev-1', name: 'Review', status: 'NEEDS REVIEW', message: 'Confirm expected behavior' }
      ]
    };
    const sarif = JSON.parse(formatSarif(withReview, meta));
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.$schema, 'https://json.schemastore.org/sarif-2.1.0.json');
    assert.equal(sarif.runs.length, 1);
    assert.deepEqual(sarif.runs[0].results.map((r) => r.ruleId), ['FAIL', 'ERROR', 'NEEDS-REVIEW']);
    assert.equal(sarif.runs[0].results[2].level, 'warning');
    assert.equal(sarif.runs[0].tool.driver.name, 'APIForge');
  });

  it('decides exit codes from summaries and result statuses', () => {
    assert.equal(decideExitCode({ summary: { passed: 1 }, results: [] }), 0);
    assert.equal(decideExitCode(sample), 2);
    assert.equal(decideExitCode({
      summary: { ...sample.summary, failed: 1, errors: 0 },
      results: [sample.results[1]]
    }), 1);
    assert.equal(decideExitCode({
      summary: { total: 1, needsReview: 1 },
      results: [{ status: 'NEEDS REVIEW' }]
    }), 1);
    assert.equal(decideExitCode({}), 2);
  });

  it('keeps human text concise with a summary and issue rows', () => {
    const text = formatText(sample, meta);
    assert.match(text, /Passed: 1/);
    assert.match(text, /\[FAIL\] fail-1 - Fail < & ": Expected 200 < 500/);
    assert.match(text, /\[ERROR\] err-1 - Error: Boom & crash/);
  });
});
