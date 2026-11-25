/**
 * Result formatters. Machine formats (json/junit/sarif) emit only parseable
 * documents; human text stays concise with a summary and issue rows.
 */

export const FORMATS = ['text', 'json', 'junit', 'sarif'];
export const DEFAULT_FORMAT = 'text';

export function escapeXml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 0 = all pass, 1 = FAIL or NEEDS REVIEW, 2 = config/parse error or ERROR. */
export function decideExitCode(result) {
  if (!result || !result.summary) return 2;
  const results = Array.isArray(result.results) ? result.results : [];
  if (result.summary.errors > 0 || results.some((r) => r.status === 'ERROR')) return 2;
  const hasFailOrReview = result.summary.failed > 0
    || result.summary.needsReview > 0
    || results.some((r) => r.status === 'FAIL' || r.status === 'NEEDS REVIEW');
  return hasFailOrReview ? 1 : 0;
}

function summaryOf(result) {
  const s = result.summary || {};
  return {
    total: s.total || 0,
    passed: s.passed || 0,
    failed: s.failed || 0,
    errors: s.errors || 0,
    skipped: s.skipped || 0,
    needsReview: s.needsReview || 0,
    durationMs: s.durationMs || 0
  };
}

function seconds(ms) {
  return ((Number(ms) || 0) / 1000).toFixed(3);
}

export function formatText(result, meta = {}) {
  const s = summaryOf(result);
  const lines = [
    `APIForge run - suite: ${meta.suiteName || '(unnamed)'} - environment: ${meta.environment || 'default'}`,
    `Total: ${s.total}  Passed: ${s.passed}  Failed: ${s.failed}  Errors: ${s.errors}  `
      + `Needs review: ${s.needsReview}  Skipped: ${s.skipped}  Duration: ${s.durationMs}ms`
  ];
  const issues = (Array.isArray(result.results) ? result.results : [])
    .filter((r) => r.status === 'FAIL' || r.status === 'ERROR' || r.status === 'NEEDS REVIEW');
  if (issues.length > 0) {
    lines.push('', 'Issues:');
    for (const r of issues) {
      const detail = r.status === 'ERROR'
        ? (r.error || '')
        : (r.failureReason || r.message || '');
      const label = `${r.id || '(no id)'} - ${r.name || '(unnamed)'}`;
      lines.push(`  [${r.status}] ${label}${detail ? `: ${detail}` : ''}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function formatJson(result, meta = {}) {
  return `${JSON.stringify({
    suite: meta.suiteName || '(unnamed)',
    environment: meta.environment || 'default',
    summary: summaryOf(result),
    results: Array.isArray(result.results) ? result.results : []
  }, null, 2)}\n`;
}

export function formatJUnit(result, meta = {}) {
  const s = summaryOf(result);
  const cases = (Array.isArray(result.results) ? result.results : []).map((r) => {
    const name = escapeXml(r.name || r.id || 'test');
    const classname = escapeXml(r.id || 'test');
    let inner = '';
    if (r.status === 'FAIL') {
      const detail = escapeXml(r.failureReason || 'Assertion failed');
      inner = `      <failure message="${detail}">${detail}</failure>\n`;
    } else if (r.status === 'NEEDS REVIEW') {
      const detail = escapeXml(r.message || 'Expected behavior must be confirmed');
      inner = `      <failure message="${detail}">${detail}</failure>\n`;
    } else if (r.status === 'ERROR') {
      const detail = escapeXml(r.error || 'Execution error');
      inner = `      <error message="${detail}">${detail}</error>\n`;
    } else if (r.status === 'SKIPPED') {
      inner = '      <skipped/>\n';
    }
    return `    <testcase name="${name}" classname="${classname}" time="${seconds(r.durationMs)}">\n${inner}    </testcase>`;
  }).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<testsuite name="${escapeXml(meta.suiteName || '(unnamed)')}" `
    + `tests="${s.total}" failures="${s.failed + s.needsReview}" errors="${s.errors}" `
    + `skipped="${s.skipped}" time="${seconds(s.durationMs)}">\n`
    + `${cases}\n</testsuite>\n`;
}

export function formatSarif(result, meta = {}) {
  const rules = [
    {
      id: 'FAIL',
      name: 'Test failed',
      shortDescription: { text: 'An API test assertion failed' },
      defaultConfiguration: { level: 'error' }
    },
    {
      id: 'ERROR',
      name: 'Execution error',
      shortDescription: { text: 'An API test could not be executed' },
      defaultConfiguration: { level: 'error' }
    },
    {
      id: 'NEEDS-REVIEW',
      name: 'Needs review',
      shortDescription: { text: 'Expected behavior must be confirmed before execution' },
      defaultConfiguration: { level: 'warning' }
    }
  ];

  const results = (Array.isArray(result.results) ? result.results : [])
    .filter((r) => r.status === 'FAIL' || r.status === 'ERROR' || r.status === 'NEEDS REVIEW')
    .map((r) => {
      const ruleId = r.status === 'NEEDS REVIEW' ? 'NEEDS-REVIEW' : r.status;
      const level = r.status === 'NEEDS REVIEW' ? 'warning' : 'error';
      const detail = r.status === 'ERROR'
        ? (r.error || 'Execution error')
        : (r.failureReason || r.message || r.status);
      return {
        ruleId,
        level,
        message: { text: `${r.name || r.id || 'test'}: ${detail}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: String(r.id || 'test') },
            region: { startLine: 1, startColumn: 1 }
          }
        }]
      };
    });

  return `${JSON.stringify({
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'APIForge',
          version: meta.version || '1.0.0',
          rules
        }
      },
      results
    }]
  }, null, 2)}\n`;
}

export function formatOutput(format, result, meta = {}) {
  switch (format) {
    case 'text': return formatText(result, meta);
    case 'json': return formatJson(result, meta);
    case 'junit': return formatJUnit(result, meta);
    case 'sarif': return formatSarif(result, meta);
    default: throw new Error(`Unknown output format: ${format}`);
  }
}
