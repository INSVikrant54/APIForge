import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  CheckSquare,
  Square,
  Download,
  AlertCircle,
  ChevronsUpDown,
  Filter
} from 'lucide-react';
import TestCaseCard from './TestCaseCard.jsx';

export default function TestSuitePanel({
  testSuite,
  results,
  summary,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onUpdateTest,
  onRunSelected,
  onRunSingle,
  onInspectFailure,
  onOpenExport,
  running
}) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'failed' | 'review' | 'passed'
  const [expandAll, setExpandAll] = useState(false);

  if (!testSuite || !testSuite.tests || testSuite.tests.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#94a3b8' }}>
        <Layers size={40} color="#334155" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.05rem', color: '#f1f5f9', marginBottom: '0.4rem' }}>
          No Test Suite Generated Yet
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem', color: '#64748b' }}>
          Configure an endpoint on the left and click <strong>"Generate Test Plan"</strong>. Formulates adversarial edge cases, boundary checks, and business-rule verifications.
        </p>
      </div>
    );
  }

  const tests = testSuite.tests;
  const selectedCount = tests.filter(t => t.selected !== false).length;

  const filteredTests = tests.filter(t => {
    // Category filter
    if (filterCategory !== 'all' && t.category !== filterCategory) {
      return false;
    }
    // Execution status triage filter
    if (statusFilter !== 'all') {
      const testResult = results?.find(r => r.id === t.id);
      if (statusFilter === 'failed') {
        return testResult?.status === 'FAIL' || testResult?.status === 'ERROR';
      }
      if (statusFilter === 'review') {
        return t.requiresReview && !t.confirmed;
      }
      if (statusFilter === 'passed') {
        return testResult?.status === 'PASS';
      }
    }
    return true;
  });

  const categories = Array.from(new Set(tests.map(t => t.category)));

  return (
    <div className="card">
      {/* Suite Title & Summary Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              {testSuite.suiteName}
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
              {tests.length} Scenarios
            </span>
            {testSuite.isPredefinedDemo && (
              <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                Deterministic Demo Suite
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            {testSuite.summary}
          </p>
        </div>

        {/* Export Regression Suite Button */}
        {summary && (
          <button
            onClick={onOpenExport}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: 'var(--accent-indigo)', color: '#a5b4fc' }}
            title="Export verified tests as Jest / Pytest starter suites"
          >
            <Download size={13} />
            <span>Export Regression Tests</span>
          </button>
        )}
      </div>

      {/* Execution Results Summary Strip (if executed) */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '0.5rem',
          background: 'var(--bg-surface)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>TOTAL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{summary.total}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-pass)' }}>PASSED</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-pass)' }}>{summary.passed}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fail)' }}>FAILED</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-fail)' }}>{summary.failed}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ERRORS</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8' }}>{summary.errors}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-warn)' }}>NEEDS REVIEW</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-warn)' }}>{summary.needsReview}</div>
          </div>
        </div>
      )}

      {/* Control Toolbar Container: Tier 1 & Tier 2 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        marginBottom: '1rem',
        padding: '0.75rem 0.9rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)'
      }}>
        {/* Tier 1: Suite Execution & Status Triage Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}>
          {/* Suite Bulk Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={onSelectAll}
              disabled={running}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <CheckSquare size={13} />
              <span>Select All</span>
            </button>
            <button
              onClick={onDeselectAll}
              disabled={running}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              <Square size={13} />
              <span>Deselect All</span>
            </button>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
              title={expandAll ? "Collapse all test cards" : "Expand all test cards"}
            >
              <ChevronsUpDown size={13} />
              <span>{expandAll ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>

          {/* Status Triage Chips (when summary exists) */}
          {summary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginRight: '2px' }}>
                Triage:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: statusFilter === 'all' ? '#38bdf8' : '#94a3b8',
                  border: statusFilter === 'all' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)'
                }}
              >
                All Results
              </button>
              {summary.failed > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === 'failed' ? 'var(--bg-fail)' : 'transparent',
                    color: 'var(--color-fail)',
                    border: statusFilter === 'failed' ? '1px solid var(--border-fail)' : '1px solid rgba(244, 63, 94, 0.3)'
                  }}
                >
                  Failed Only ({summary.failed})
                </button>
              )}
              {summary.needsReview > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'review' ? 'all' : 'review')}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === 'review' ? 'var(--bg-warn)' : 'transparent',
                    color: 'var(--color-warn)',
                    border: statusFilter === 'review' ? '1px solid var(--border-warn)' : '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                >
                  Needs Review ({summary.needsReview})
                </button>
              )}
              {summary.passed > 0 && (
                <button
                  onClick={() => setStatusFilter(statusFilter === 'passed' ? 'all' : 'passed')}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: statusFilter === 'passed' ? 'var(--bg-pass)' : 'transparent',
                    color: 'var(--color-pass)',
                    border: statusFilter === 'passed' ? '1px solid var(--border-pass)' : '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Passed ({summary.passed})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tier 2: Category Domain Filtering Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(26, 38, 61, 0.6)'
        }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Domains:
          </span>
          <button
            onClick={() => setFilterCategory('all')}
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: filterCategory === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: filterCategory === 'all' ? '#38bdf8' : '#94a3b8',
              border: filterCategory === 'all' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap'
            }}
          >
            All ({tests.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                fontWeight: 500,
                cursor: 'pointer',
                background: filterCategory === cat ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: filterCategory === cat ? '#38bdf8' : '#94a3b8',
                border: filterCategory === cat ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Execution Trigger Bar */}
      <div style={{
        background: 'rgba(56, 189, 248, 0.05)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Ready to verify <strong style={{ color: '#fff' }}>{selectedCount}</strong> selected tests against target endpoint.
        </div>

        <button
          onClick={onRunSelected}
          disabled={running || selectedCount === 0}
          className="btn btn-primary"
          style={{ minWidth: '170px' }}
        >
          {running ? (
            <>
              <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
              <span>Executing Tests...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Run Selected Tests ({selectedCount})</span>
            </>
          )}
        </button>
      </div>

      {/* Test Cases List */}
      <div>
        {filteredTests.map((test) => {
          const testResult = results?.find(r => r.id === test.id);
          return (
            <TestCaseCard
              key={test.id}
              test={test}
              result={testResult}
              onToggleSelect={onToggleSelect}
              onUpdateTest={onUpdateTest}
              onRunSingle={onRunSingle}
              onInspectFailure={onInspectFailure}
              running={running}
              forceExpand={expandAll}
            />
          );
        })}
      </div>
    </div>
  );
}
