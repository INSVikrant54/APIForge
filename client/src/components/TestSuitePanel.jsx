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
  AlertCircle
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

  if (!testSuite || !testSuite.tests || testSuite.tests.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#94a3b8' }}>
        <Layers size={40} color="#334155" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.05rem', color: '#f1f5f9', marginBottom: '0.4rem' }}>
          No Test Suite Generated Yet
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.5rem', color: '#64748b' }}>
          Configure an endpoint on the left and click <strong>"Generate Test Plan"</strong>. Gemma 4 will formulate adversarial edge cases, boundary checks, and business-rule verifications.
        </p>
      </div>
    );
  }

  const tests = testSuite.tests;
  const selectedCount = tests.filter(t => t.selected !== false).length;
  const filteredTests = filterCategory === 'all'
    ? tests
    : tests.filter(t => t.category === filterCategory);

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
            <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              {tests.length} Scenarios
            </span>
            {testSuite.isPredefinedDemo && (
              <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
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
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>{summary.total}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-pass)' }}>PASSED</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-pass)' }}>{summary.passed}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-fail)' }}>FAILED</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-fail)' }}>{summary.failed}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ERRORS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#94a3b8' }}>{summary.errors}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-warn)' }}>NEEDS REVIEW</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-warn)' }}>{summary.needsReview}</div>
          </div>
        </div>
      )}

      {/* Control Bar: Select All / Deselect All / Category Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem',
        marginBottom: '0.9rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
          <button
            onClick={() => setFilterCategory('all')}
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              background: filterCategory === 'all' ? 'var(--accent-cyan)' : 'var(--bg-surface)',
              color: filterCategory === 'all' ? '#000' : '#94a3b8',
              border: '1px solid var(--border-subtle)'
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
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 500,
                cursor: 'pointer',
                background: filterCategory === cat ? 'var(--accent-cyan)' : 'var(--bg-surface)',
                color: filterCategory === cat ? '#000' : '#94a3b8',
                border: '1px solid var(--border-subtle)',
                textTransform: 'capitalize'
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
            />
          );
        })}
      </div>
    </div>
  );
}
