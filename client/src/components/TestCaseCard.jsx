import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Sparkles,
  Info
} from 'lucide-react';

const CATEGORY_COLORS = {
  happy_path: { bg: 'rgba(30, 41, 59, 0.7)', text: '#94a3b8', border: 'rgba(51, 65, 85, 0.6)', label: 'Happy Path' },
  missing_field: { bg: 'rgba(30, 41, 59, 0.7)', text: '#cbd5e1', border: 'rgba(51, 65, 85, 0.6)', label: 'Missing Field' },
  type_validation: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.25)', label: 'Type Validation' },
  boundary: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)', label: 'Boundary' },
  business_rule: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.25)', label: 'Business Rule' },
  malformed_input: { bg: 'rgba(236, 72, 153, 0.1)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.25)', label: 'Malformed' },
  inconsistent_data: { bg: 'rgba(251, 146, 60, 0.1)', text: '#fb923c', border: 'rgba(251, 146, 60, 0.25)', label: 'Inconsistent' }
};

function TestCaseCard({
  test,
  result,
  onToggleSelect,
  onUpdateTest,
  onRunSingle,
  onInspectFailure,
  running,
  forceExpand
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Sync with parent Expand/Collapse All state
  React.useEffect(() => {
    if (typeof forceExpand === 'boolean') {
      setExpanded(forceExpand);
    }
  }, [forceExpand]);

  const categoryStyle = CATEGORY_COLORS[test.category] || {
    bg: 'rgba(30, 41, 59, 0.7)',
    text: '#94a3b8',
    border: 'rgba(51, 65, 85, 0.6)',
    label: test.category
  };

  const isPass = result?.status === 'PASS';
  const isFail = result?.status === 'FAIL';
  const isError = result?.status === 'ERROR';
  const isNeedsReview = test.requiresReview && !test.confirmed;

  const handleCopyCurl = (e) => {
    e.stopPropagation();
    const curl = result?.curl || `curl -X ${test.request?.method || 'POST'} "${test.request?.path || ''}" -d '${JSON.stringify(test.request?.body || {})}'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid',
        borderColor: isFail ? 'var(--border-fail)' : isPass ? 'var(--border-pass)' : 'var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '0.6rem',
        overflow: 'hidden',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Main Row / Header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          background: isFail ? 'rgba(244, 63, 94, 0.04)' : isPass ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--accent-cyan)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={test.selected !== false}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(test.id);
          }}
          disabled={running}
          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
        />

        {/* Expand / Collapse Icon */}
        <span style={{ color: '#64748b' }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>

        {/* Category Pill */}
        <span
          style={{
            background: categoryStyle.bg,
            color: categoryStyle.text,
            border: `1px solid ${categoryStyle.border || 'var(--border-subtle)'}`,
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.15rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap'
          }}
        >
          {categoryStyle.label}
        </span>

        {/* Method, Path, Name & Description Cockpit Readout */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
            {/* Method Pill */}
            <span
              className={`method-pill method-${(test.request?.method || 'post').toLowerCase()}`}
              style={{ fontSize: '0.7rem', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-sm)' }}
            >
              {test.request?.method || 'POST'}
            </span>

            {/* Monospace Path */}
            {test.request?.path && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#94a3b8' }}>
                {test.request.path}
              </span>
            )}

            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
              {test.name}
            </span>

            {test.requiresReview && !test.confirmed && (
              <span
                style={{
                  background: 'var(--bg-warn)',
                  color: 'var(--color-warn)',
                  border: '1px solid var(--border-warn)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.12rem 0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <AlertTriangle size={12} />
                Requires Review
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
            {test.description}
          </div>
        </div>

        {/* Execution Status Badge */}
        <div>
          {isPass && (
            <span className="status-badge status-pass">
              <CheckCircle2 size={13} />
              PASS ({result.durationMs}ms)
            </span>
          )}
          {isFail && (
            <span className="status-badge status-fail">
              <XCircle size={13} />
              FAIL ({result.durationMs}ms)
            </span>
          )}
          {isError && (
            <span className="status-badge status-fail">
              <AlertTriangle size={13} />
              ERROR
            </span>
          )}
          {!result && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
              Expected: HTTP {test.expected?.statusCodes?.join('/') || 200}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
          {/* Quick cURL Copy in Collapsed State */}
          <button
            onClick={handleCopyCurl}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.22rem 0.5rem', fontSize: '0.72rem' }}
            title="Copy sanitized reproduction cURL"
          >
            {copiedCurl ? <Check size={12} color="var(--color-pass)" /> : <Copy size={12} />}
            <span style={{ fontSize: '0.7rem' }}>cURL</span>
          </button>

          {isFail && (
            <button
              onClick={() => onInspectFailure(test, result)}
              className="btn btn-sm btn-danger"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            >
              Inspect Bug
            </button>
          )}

          <button
            onClick={() => onRunSingle(test)}
            disabled={running || isNeedsReview}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.5rem' }}
            title="Execute this test individually"
          >
            <Play size={12} color="#38bdf8" />
          </button>
        </div>
      </div>

      {/* Expanded Details Panel */}
      {expanded && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          background: '#070b14',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.8rem'
        }}>
          {/* Rationale & Review Confirmation */}
          {test.rationale && (
            <div style={{ display: 'flex', gap: '0.5rem', color: '#94a3b8' }}>
              <Info size={15} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#f1f5f9' }}>Scenario Rationale:</strong> {test.rationale}
              </div>
            </div>
          )}

          {test.requiresReview && (
            <div style={{
              background: 'var(--bg-warn)',
              border: '1px solid var(--border-warn)',
              padding: '0.6rem 0.8rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: 'var(--color-warn)' }}>
                ⚠️ Contract behavior is ambiguous. Please confirm expected response before executing.
              </span>
              <button
                onClick={() => onUpdateTest(test.id, { confirmed: !test.confirmed })}
                className="btn btn-sm btn-secondary"
                style={{ borderColor: 'var(--color-warn)', color: 'var(--color-warn)' }}
              >
                {test.confirmed ? 'Confirmed ✓' : 'Confirm Expectation'}
              </button>
            </div>
          )}

          {/* Side by side: Request Payload vs Expected Assertions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                Request Input ({test.request?.method} {test.request?.path})
              </div>
              <pre className="code-block" style={{ maxHeight: '160px' }}>
                {JSON.stringify(test.request?.body, null, 2) || '// No request body'}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                Expected Assertions
              </div>
              <div style={{ background: '#040711', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.6rem', maxHeight: '160px', overflowY: 'auto' }}>
                <div style={{ color: '#38bdf8', marginBottom: '0.3rem' }}>
                  • HTTP Status: [{test.expected?.statusCodes?.join(', ') || 200}]
                </div>
                {test.expected?.description && (
                  <div style={{ color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                    {test.expected.description}
                  </div>
                )}
                {test.expected?.assertions?.map((a, i) => (
                  <div key={i} style={{ color: '#a5b4fc', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                    • {a.target} {a.operator} {JSON.stringify(a.value)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actual Execution Result (if already executed) */}
          {result && (
            <div style={{
              background: isFail ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${isFail ? 'var(--border-fail)' : 'var(--border-pass)'}`,
              borderRadius: '6px',
              padding: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <strong style={{ color: isFail ? 'var(--color-fail)' : 'var(--color-pass)' }}>
                  Actual Result: HTTP {result.actual?.status} {result.actual?.statusText || ''} ({result.durationMs}ms)
                </strong>
                <button type="button" onClick={handleCopyCurl} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}>
                  {copiedCurl ? <Check size={12} color="var(--color-pass)" /> : <Copy size={12} />}
                  <span>{copiedCurl ? 'cURL Copied!' : 'Copy cURL'}</span>
                </button>
              </div>

              {isFail && result.failureReason && (
                <div style={{ color: 'var(--color-fail)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                  <strong>Observed Failure:</strong> {result.failureReason}
                </div>
              )}

              <pre tabIndex={0} role="region" aria-label="Actual response body" className="code-block" style={{ maxHeight: '140px', color: isFail ? 'var(--color-fail)' : 'var(--color-pass)' }}>
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
