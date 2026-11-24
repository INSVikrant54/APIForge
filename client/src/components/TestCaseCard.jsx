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
      style={{
        background: 'var(--bg-card)',
        border: '1px solid',
        borderColor: isError
          ? 'var(--border-warn)'
          : isFail
            ? 'var(--border-fail)'
            : isPass
              ? 'var(--border-pass)'
              : isRunning
                ? 'var(--accent-border)'
                : 'var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '0.6rem',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          display: 'grid',
          gridTemplateColumns: '15px 16px minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: '0.65rem',
          background: isError ? 'var(--bg-warn)' : isFail ? 'var(--bg-fail)' : isPass ? 'var(--bg-pass)' : 'transparent'
        }}
      >
        <input
          type="checkbox"
          checked={test.selected !== false}
          onChange={(event) => {
            event.stopPropagation();
            onToggleSelect(test.id);
          }}
          disabled={running}
          aria-label={`Select ${test.name}`}
          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
        />

        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${test.name}`}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer'
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flexWrap: 'wrap' }}>
            <span className={`method-pill method-${(test.request?.method || 'post').toLowerCase()}`}>
              {test.request?.method || 'POST'}
            </span>
            {test.request?.path && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {test.request.path}
              </span>
            )}
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {test.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem', minWidth: 0 }}>
            <span className="category-chip" style={{ flexShrink: 0 }}>
              {CATEGORY_LABELS[test.category] || test.category}
            </span>
            {test.description && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {test.description}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }} onClick={(event) => event.stopPropagation()}>
          {isRunning && (
            <span className="status-badge status-running">
              <span className="pulse-dot" style={{ background: 'var(--accent-cyan)' }} />
              Running
            </span>
          )}
          {!isRunning && isPass && (
            <span className="status-badge status-pass">
              <CheckCircle2 size={13} /> Pass · {result.durationMs}ms
            </span>
          )}
          {!isRunning && isFail && (
            <>
              <span className="status-badge status-fail">
                <XCircle size={13} /> Fail · {result.durationMs}ms
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
                <XCircle size={12} /> Inspect failure <ArrowRight size={12} />
              </button>
            </>
          )}
          {!isRunning && isError && (
            <>
              <span className="status-badge status-warn">
                <AlertTriangle size={13} /> Could not run · {result.durationMs}ms
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onInspectFailure(test, result);
                }}
                className="btn btn-sm btn-secondary"
                style={{ borderColor: 'var(--border-warn)', color: 'var(--color-warn)' }}
                aria-label={`Inspect execution error: ${test.name}`}
              >
                Inspect error <ArrowRight size={12} />
              </button>
            </>
          )}
          {!isRunning && isNeedsReview && (
            <span className="status-badge status-warn">
              <AlertTriangle size={12} /> Confirm
            </span>
          )}
          {!isRunning && !result && !isNeedsReview && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Not run
            </span>
          )}
          {!isRunning && !isFail && !isError && (
            <button
              type="button"
              onClick={() => onRunSingle(test)}
              disabled={running || isNeedsReview}
              className="btn btn-secondary btn-sm"
              title="Run this test"
            >
              <Play size={12} />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.8rem'
        }}>
          {test.rationale && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Info size={15} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div><strong style={{ color: 'var(--text-main)' }}>Why this test: </strong>{test.rationale}</div>
            </div>
          )}

          {test.requiresReview && (
            <div style={{
              background: 'var(--bg-warn)',
              border: '1px solid var(--border-warn)',
              padding: '0.65rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}>
              <span style={{ color: 'var(--color-warn)' }}>Confirm the expected behavior before running this test.</span>
              <button
                type="button"
                onClick={() => onUpdateTest(test.id, { confirmed: !test.confirmed })}
                className="btn btn-sm btn-secondary"
                style={{ borderColor: 'var(--border-warn)', color: 'var(--color-warn)', flexShrink: 0 }}
              >
                {test.confirmed ? 'Confirmed' : 'Confirm'}
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="test-detail-grid">
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Request
              </div>
              <pre className="code-block" style={{ maxHeight: '160px' }}>
                {JSON.stringify(test.request?.body, null, 2) || '// No request body'}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Expected
              </div>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.6rem', maxHeight: '160px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                <div style={{ color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>
                  HTTP {test.expected?.statusCodes?.join(', ') || 200}
                </div>
                {test.expected?.description && (
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: 'var(--font-sans)' }}>
                    {test.expected.description}
                  </div>
                )}
                {test.expected?.assertions?.map((assertion, index) => (
                  <div key={index} style={{ color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {assertion.target} {assertion.operator} {JSON.stringify(assertion.value)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result && (
            <div style={{
              background: isError ? 'var(--bg-warn)' : isFail ? 'var(--bg-fail)' : 'var(--bg-pass)',
              border: `1px solid ${isError ? 'var(--border-warn)' : isFail ? 'var(--border-fail)' : 'var(--border-pass)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <strong style={{ color: isError ? 'var(--color-warn)' : isFail ? 'var(--color-fail)' : 'var(--color-pass)' }}>
                  {isError ? 'No response' : `HTTP ${result.actual?.status}`} · {result.durationMs}ms
                </strong>
                <button type="button" onClick={handleCopyCurl} className="btn btn-secondary btn-sm">
                  {copiedCurl ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>

              {isError && (
                <div style={{ color: 'var(--color-warn)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  {result.error || 'The request could not be completed. The endpoint may be unreachable, refused the connection, or timed out.'}
                </div>
              )}

              {isFail && result.failureReason && (
                <div style={{ color: 'var(--color-fail)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                  {result.failureReason}
                </div>
              )}

              <pre tabIndex={0} role="region" aria-label="Actual response body" className="code-block" style={{ maxHeight: '140px' }}>
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
