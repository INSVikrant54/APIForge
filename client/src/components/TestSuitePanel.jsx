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
  Filter,
  Loader2
} from 'lucide-react';
import TestCaseCard from './TestCaseCard.jsx';

export default function TestSuitePanel({
  testSuite,
  results,
  summary,
  targetPath = '',
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  if (!testSuite?.tests?.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
        <Layers size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
          No tests generated yet
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', color: 'var(--text-muted)' }}>
          Describe the endpoint on the left, then generate a test plan.
        </p>
      </div>
    );
  }

  const tests = testSuite.tests;
  const selectedCount = tests.filter(t => t.selected !== false).length;
  const categories = Array.from(new Set(tests.map(t => t.category)));

  const filteredTests = tests.filter(test => {
    if (filterCategory !== 'all' && test.category !== filterCategory) return false;
    if (statusFilter === 'all') return true;

    const testResult = results?.find(result => result.id === test.id);
    if (statusFilter === 'failed') return testResult?.status === 'FAIL' || testResult?.status === 'ERROR';
    if (statusFilter === 'review') return test.requiresReview && !test.confirmed;
    if (statusFilter === 'passed') return testResult?.status === 'PASS';
    return true;
  });

  const filterLabel = statusFilter === 'all'
    ? 'All results'
    : statusFilter === 'failed'
      ? 'Failed'
      : statusFilter === 'review'
        ? 'Needs review'
        : 'Passed';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.9rem' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {testSuite.suiteName}
          </h3>
          {targetPath && (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              marginTop: '0.2rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Target: {targetPath}
            </p>
          )}
          {testSuite.summary && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {testSuite.summary}
            </p>
          )}
        </div>

        {summary && (
          <button
            type="button"
            onClick={onOpenExport}
            className="btn btn-secondary btn-sm"
            title="Export as Jest or Pytest"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        )}
      </div>

      {summary && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          flexWrap: 'wrap',
          padding: '0.65rem 0',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '0.75rem',
          fontSize: '0.78rem'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>{summary.total} tests</span>
          <span style={{ color: 'var(--color-pass)' }}>{summary.passed} passed</span>
          {summary.failed > 0 && <span style={{ color: 'var(--color-fail)' }}>{summary.failed} failed</span>}
          {summary.errors > 0 && <span style={{ color: 'var(--color-warn)' }}>{summary.errors} could not run</span>}
          {summary.needsReview > 0 && <span style={{ color: 'var(--color-warn)' }}>{summary.needsReview} need review</span>}
        </div>
      )}

      <div className="visually-hidden" role="status" aria-live="polite">
        {running
          ? `Running ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}${targetPath ? ` against ${targetPath}` : ''}.`
          : summary
            ? `Run complete: ${summary.passed} passed, ${summary.failed} failed${summary.errors ? `, ${summary.errors} could not run` : ''}.`
            : ''}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={onSelectAll} disabled={running} className="btn btn-secondary btn-sm" title="Select all tests">
            <CheckSquare size={13} />
            <span>All</span>
          </button>
          <button type="button" onClick={onDeselectAll} disabled={running} className="btn btn-secondary btn-sm" title="Deselect all tests">
            <Square size={13} />
            <span>None</span>
          </button>
          <button type="button" onClick={() => setShowFilters(value => !value)} className="btn btn-secondary btn-sm" aria-expanded={showFilters}>
            <Filter size={13} />
            <span>{filterLabel}</span>
          </button>
          <button type="button" onClick={() => setExpandAll(value => !value)} className="btn btn-secondary btn-sm">
            <span>{expandAll ? 'Collapse details' : 'Expand details'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRunSelected}
          disabled={running || selectedCount === 0}
          aria-busy={running}
          className="btn btn-primary btn-sm"
        >
          {running ? <Loader2 size={13} className="spin-icon" /> : <Play size={13} />}
          <span>{running ? `Running ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}…` : `Run ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}`}</span>
        </button>
      </div>

      {showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', padding: '0.65rem 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '0.65rem' }}>
          {[
            ['all', 'All results'],
            ['failed', 'Failed'],
            ['review', 'Needs review'],
            ['passed', 'Passed']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`filter-chip ${statusFilter === value ? 'filter-chip-active' : ''}`}
            >
              {label}
            </button>
          ))}

          {categories.length > 1 && (
            <select
              className="form-select"
              value={filterCategory}
              onChange={event => setFilterCategory(event.target.value)}
              aria-label="Filter tests by category"
              style={{ width: 'auto', minHeight: '30px', paddingTop: '0.25rem', paddingBottom: '0.25rem', fontSize: '0.75rem' }}
            >
              <option value="all">All categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        {filteredTests.map(test => (
          <TestCaseCard
            key={test.id}
            test={test}
            result={results?.find(result => result.id === test.id)}
            onToggleSelect={onToggleSelect}
            onUpdateTest={onUpdateTest}
            onRunSingle={onRunSingle}
            onInspectFailure={onInspectFailure}
            running={running}
            isRunning={running && test.selected !== false}
            forceExpand={expandAll}
          />
        ))}
      </div>

      {filteredTests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No tests match this filter.
        </div>
      )}
    </div>
  );
}
