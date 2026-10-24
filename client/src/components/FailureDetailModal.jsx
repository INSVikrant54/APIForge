import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Code2,
  Cpu,
  Clock,
  Terminal
} from 'lucide-react';

export default function FailureDetailModal({
  test,
  result,
  businessRules,
  onClose,
  onExplainFailure,
  explaining,
  explanation
}) {
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!test || !result) return null;

  const handleCopyCurl = () => {
    if (result.curl) {
      navigator.clipboard.writeText(result.curl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleCopySnippet = (snippet) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-fail)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column'
      }}>
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
              borderRadius: '6px',
              background: 'var(--bg-fail)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={18} color="var(--color-fail)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Failure Analysis: {test.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Reproducible discrepancy between confirmed contract and actual backend behavior
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
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
            borderRadius: '6px',
            padding: '0.75rem 1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>EXPECTED STATUS</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                HTTP {test.expected?.statusCodes?.join(', ') || 400}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ACTUAL STATUS</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-fail)' }}>
                HTTP {result.actual?.status} {result.actual?.statusText || ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>RESPONSE TIME</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} /> {result.durationMs}ms
              </div>
            </div>
          </div>

          {/* Failed Assertion Callout */}
          <div style={{
            background: 'var(--bg-fail)',
            border: '1px solid var(--border-fail)',
            borderRadius: '6px',
            padding: '0.85rem 1rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-fail)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Observed Discrepancy
            </div>
            <div style={{ fontSize: '0.85rem', color: '#fecdd3' }}>
              {result.failureReason || `Expected HTTP status ${test.expected?.statusCodes?.join('/')}, but endpoint responded with ${result.actual?.status}`}
            </div>
          </div>

          {/* Side by side: Request Input vs Actual Response */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}>
                Request Payload ({test.request?.method} {test.request?.path})
              </div>
              <pre className="code-block" style={{ maxHeight: '180px' }}>
                {JSON.stringify(test.request?.body, null, 2) || '// Empty Body'}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}>
                Actual Response Body
              </div>
              <pre className="code-block" style={{ maxHeight: '180px', color: '#fca5a5' }}>
                {JSON.stringify(result.actual?.body, null, 2)}
              </pre>
            </div>
          </div>

          {/* Reproduction Command */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={14} color="#38bdf8" />
                <span>Exact cURL Reproduction Command</span>
              </div>
              <button onClick={handleCopyCurl} className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                {copiedCurl ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>
            <pre className="code-block" style={{ color: '#38bdf8', padding: '0.65rem' }}>
              {result.curl}
            </pre>
          </div>

          {/* AI Remediation Suggestion Section */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={16} color="#818cf8" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c7d2fe' }}>
                  AI Failure Diagnosis & Fix Recommendation
                </h4>
              </div>

              {!explanation && (
                <button
                  onClick={() => onExplainFailure(test, result)}
                  disabled={explaining}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)' }}
                >
                  {explaining ? (
                    <>
                      <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
                      <span>Consulting Gemma 4...</span>
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
                <div style={{ color: '#cbd5e1' }}>
                  <strong style={{ color: '#a5b4fc' }}>Remediation Guidance: </strong>
                  {explanation.recommendedFix}
                </div>

                {explanation.suggestedCodeSnippet && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Recommended Server Validation Code:</span>
                      <button
                        onClick={() => handleCopySnippet(explanation.suggestedCodeSnippet)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                      >
                        {copiedSnippet ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                        <span>{copiedSnippet ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="code-block" style={{ color: '#86efac' }}>
                      {explanation.suggestedCodeSnippet}
                    </pre>
                  </div>
                )}

                <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.3rem' }}>
                  * AI-generated suggestion by {explanation.modelUsed || 'Gemma 4'}. Verify against your codebase requirements before committing.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Click "Generate Fix Suggestion" to have Gemma 4 analyze this failure against the configured business rules and provide concrete server-side code remediation snippets.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
