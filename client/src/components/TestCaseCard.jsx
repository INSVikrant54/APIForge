import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Info
} from 'lucide-react';

const CATEGORY_LABELS = {
  happy_path: 'Happy path',
  missing_field: 'Missing field',
  type_validation: 'Type validation',
  boundary: 'Boundary',
  business_rule: 'Business rule',
  malformed_input: 'Malformed input',
  inconsistent_data: 'Inconsistent data'
};

function TestCaseCard({
  test,
  result,
  onToggleSelect,
  onUpdateTest,
  onRunSingle,
  onInspectFailure,
  running,
  isRunning = false,
  forceExpand
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  React.useEffect(() => {
    if (typeof forceExpand === 'boolean') setExpanded(forceExpand);
  }, [forceExpand]);

  const isPass = result?.status === 'PASS';
  const isFail = result?.status === 'FAIL';
  const isError = result?.status === 'ERROR';
  const isNeedsReview = test.requiresReview && !test.confirmed;

  const handleCopyCurl = (event) => {
    event?.stopPropagation();
    const curl = result?.curl || `curl -X ${test.request?.method || 'POST'} "${test.request?.path || ''}" -d '${JSON.stringify(test.request?.body || {})}'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    window.setTimeout(() => setCopiedCurl(false), 2000);
  };

  const toggleExpanded = () => setExpanded(value => !value);

  return (
    <div
      aria-busy={isRunning || undefined}
      className={`test-card${isError ? ' test-card-error' : isFail ? ' test-card-fail' : isPass ? ' test-card-pass' : isRunning ? ' test-card-running' : ''}`}
    >
      <div className="test-card-head">
        <input
          type="checkbox"
          checked={test.selected !== false}
          onChange={(event) => {
            event.stopPropagation();
            onToggleSelect(test.id);
          }}
          disabled={running}
          aria-label={`Select ${test.name}`}
          className="test-card-checkbox"
        />

        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${test.name}`}
          className="test-expand"
        >
          {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </button>

        <div className="test-main">
          <div className="test-title-row">
            <span className={`method-pill method-${(test.request?.method || 'post').toLowerCase()}`}>
              {test.request?.method || 'POST'}
            </span>
            {test.request?.path && <span className="test-path">{test.request.path}</span>}
            <span className="test-name">{test.name}</span>
          </div>

          <div className="test-meta">
            <span className="category-chip">
              {CATEGORY_LABELS[test.category] || test.category}
            </span>
            {test.description && <span className="test-description">{test.description}</span>}
          </div>
        </div>

        <div className="test-actions" onClick={(event) => event.stopPropagation()}>
          {isRunning && (
            <span className="status-badge status-running">
              <span className="pulse-dot" style={{ background: 'var(--accent-cyan)' }} />
              Running
            </span>
          )}
          {!isRunning && isPass && (
            <span className="status-badge status-pass">
              <CheckCircle2 size={13} aria-hidden="true" /> Pass · {result.durationMs}ms
            </span>
          )}
          {!isRunning && isFail && (
            <>
              <span className="status-badge status-fail">
                <XCircle size={13} aria-hidden="true" /> Fail · {result.durationMs}ms
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onInspectFailure(test, result);
                }}
                className="btn btn-sm btn-danger inspect-button"
                aria-label={`Inspect failure: ${test.name}`}
              >
                <XCircle size={12} aria-hidden="true" /> Inspect failure <ArrowRight size={12} aria-hidden="true" />
              </button>
            </>
          )}
          {!isRunning && isError && (
            <>
              <span className="status-badge status-warn">
                <AlertTriangle size={13} aria-hidden="true" /> Could not run · {result.durationMs}ms
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onInspectFailure(test, result);
                }}
                className="btn btn-sm btn-secondary inspect-error-button"
                aria-label={`Inspect execution error: ${test.name}`}
              >
                Inspect error <ArrowRight size={12} aria-hidden="true" />
              </button>
            </>
          )}
          {!isRunning && isNeedsReview && (
            <span className="status-badge status-warn">
              <AlertTriangle size={12} aria-hidden="true" /> Confirm
            </span>
          )}
          {!isRunning && !result && !isNeedsReview && <span className="test-not-run">Not run</span>}
          {!isRunning && !isFail && !isError && (
            <button
              type="button"
              onClick={() => onRunSingle(test)}
              disabled={running || isNeedsReview}
              className="btn btn-secondary btn-sm"
              title="Run this test"
            >
              <Play size={12} aria-hidden="true" />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="test-details">
          {test.rationale && (
            <div className="test-rationale">
              <Info size={15} aria-hidden="true" />
              <div><strong>Why this test: </strong>{test.rationale}</div>
            </div>
          )}

          {test.requiresReview && (
            <div className="review-note">
              <span>Confirm the expected behavior before running this test.</span>
              <button
                type="button"
                onClick={() => onUpdateTest(test.id, { confirmed: !test.confirmed })}
                className="btn btn-sm btn-secondary"
              >
                {test.confirmed ? 'Confirmed' : 'Confirm'}
              </button>
            </div>
          )}

          <div className="test-detail-grid">
            <div>
              <div className="test-detail-label">Request</div>
              <pre className="code-block">
                {JSON.stringify(test.request?.body, null, 2) || '// No request body'}
              </pre>
            </div>

            <div>
              <div className="test-detail-label">Expected</div>
              <div className="expected-box">
                <div className="expected-status">
                  HTTP {test.expected?.statusCodes?.join(', ') || 200}
                </div>
                {test.expected?.description && (
                  <div className="expected-description">{test.expected.description}</div>
                )}
                {test.expected?.assertions?.map((assertion, index) => (
                  <div key={index} className="assertion">
                    {assertion.target} {assertion.operator} {JSON.stringify(assertion.value)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result && (
            <div className={`result-box${isError ? ' result-box-error' : isFail ? ' result-box-fail' : ''}`}>
              <div className="result-header">
                <strong className={isError ? 'result-error' : isFail ? 'result-fail' : 'result-pass'}>
                  {isError ? 'No response' : `HTTP ${result.actual?.status}`} · {result.durationMs}ms
                </strong>
                <button type="button" onClick={handleCopyCurl} className="btn btn-secondary btn-sm">
                  {copiedCurl ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>

              {isError && (
                <div className="result-message result-error">
                  {result.error || 'The request could not be completed. The endpoint may be unreachable, refused the connection, or timed out.'}
                </div>
              )}

              {isFail && result.failureReason && (
                <div className="result-message result-fail">{result.failureReason}</div>
              )}

              <pre tabIndex={0} role="region" aria-label="Actual response body" className="code-block">
                {JSON.stringify(result.actual?.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(TestCaseCard);
