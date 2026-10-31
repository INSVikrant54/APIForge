import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Code2,
  Cpu,
  Clock,
  Terminal,
  Play
} from 'lucide-react';

export default function FailureDetailModal({
  test,
  result,
  businessRules,
  onClose,
  onExplainFailure,
  explaining,
  explanation,
  activeModel = 'gemma-4-26b-a4b-it',
  onRunSingle,
  runningTests = false
}) {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!test || !result) return null;

  const handleCopyCurl = () => {
    if (result.curl) {
      navigator.clipboard.writeText(result.curl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleCopySnippet = (snippet) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="failure-dialog-title"
        aria-describedby="failure-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-fail)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(244, 63, 94, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-fail)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={18} color="var(--color-fail)" />
            </div>
            <div>
              <h3 id="failure-dialog-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Failure Analysis: {test.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Reproducible discrepancy between confirmed contract and actual backend behavior
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {onRunSingle && (
              <button
                type="button"
                onClick={() => onRunSingle(test)}
                disabled={runningTests}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem'
                }}
                title="Re-run this test against the backend to verify your fix"
              >
                {runningTests ? (
                  <>
                    <span className="pulse-dot" style={{ backgroundColor: 'var(--accent-cyan)' }} />
                    <span>Re-testing...</span>
                  </>
                ) : (
                  <>
                    <Play size={12} color="var(--accent-cyan)" />
                    <span>Re-test Endpoint</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close failure analysis dialog"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>EXPECTED STATUS</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                HTTP {test.expected?.statusCodes?.join(', ') || 400}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>ACTUAL STATUS</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-fail)' }}>
                HTTP {result.actual?.status} {result.actual?.statusText || ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>RESPONSE TIME</div>
              <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Clock size={13} /> {result.durationMs}ms
              </div>
            </div>
          </div>

          {/* Failed Assertion Callout */}
          <div style={{
            background: 'var(--bg-fail)',
            border: '1px solid var(--border-fail)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-fail)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Observed Discrepancy
            </div>
            <div id="failure-dialog-desc" style={{ fontSize: '0.85rem', color: '#fecdd3' }}>
              {result.failureReason || `Expected HTTP status ${test.expected?.statusCodes?.join('/')}, but endpoint responded with ${result.actual?.status}`}
            </div>
          </div>

          {/* Side by side: Request Input vs Actual Response */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span className={`method-pill method-${test.request?.method?.toLowerCase() || 'get'}`} style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                  {test.request?.method}
                </span>
                <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {test.request?.path}
                </span>
              </div>
              <pre className="code-block" style={{ maxHeight: '240px' }}>
                {JSON.stringify(test.request?.body, null, 2) || '// Empty Body'}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Actual Response Body
              </div>
              <pre className="code-block" style={{ maxHeight: '240px', color: '#fca5a5' }}>
                {JSON.stringify(result.actual?.body, null, 2)}
              </pre>
            </div>
          </div>

          {/* Reproduction Command */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={14} color="var(--accent-cyan)" />
                <span>Exact cURL Reproduction Command</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
              >
                {copiedCurl ? <Check size={12} color="var(--color-pass)" /> : <Copy size={12} />}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>
            <pre className="code-block" style={{ color: 'var(--accent-cyan)', padding: '0.65rem' }}>
              {result.curl}
            </pre>
          </div>

          {/* AI Remediation Suggestion Section */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={16} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  AI Failure Diagnosis & Fix Recommendation
                </h4>
              </div>

              {!explanation && (
                <button
                  type="button"
                  onClick={() => onExplainFailure(test, result)}
                  disabled={explaining}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)' }}
                >
                  {explaining ? (
                    <>
                      <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
                      <span>Consulting {activeModel}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Generate Fix Suggestion</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {explanation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div style={{ color: 'var(--text-main)' }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Remediation Guidance: </strong>
                  {explanation.recommendedFix}
                </div>

                {explanation.suggestedCodeSnippet && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommended Server Validation Code:</span>
                      <button
                        type="button"
                        onClick={() => handleCopySnippet(explanation.suggestedCodeSnippet)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {copiedSnippet ? <Check size={12} color="var(--color-pass)" /> : <Copy size={12} />}
                        <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="code-block" style={{ color: 'var(--color-pass)', maxHeight: '220px' }}>
                      {explanation.suggestedCodeSnippet}
                    </pre>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '0.3rem' }}>
                  * AI-generated suggestion by {explanation.modelUsed || activeModel}. Verify against your codebase requirements before committing.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Click "Generate Fix Suggestion" to have {activeModel} analyze this failure against the configured business rules and provide concrete server-side code remediation snippets.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
