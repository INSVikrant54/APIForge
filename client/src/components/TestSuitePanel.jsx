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
      <div className="card empty-state">
        <Layers size={40} aria-hidden="true" />
        <h3>No tests generated yet</h3>
        <p>Describe the endpoint on the left, then generate a test plan.</p>
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
      <div className="suite-header">
        <div className="suite-heading">
          <h3 className="suite-title">{testSuite.suiteName}</h3>
          {targetPath && <p className="suite-target">Target: {targetPath}</p>}
          {testSuite.summary && <p className="suite-summary">{testSuite.summary}</p>}
        </div>

        {summary && (
          <button
            type="button"
            onClick={onOpenExport}
            className="btn btn-secondary btn-sm"
            title="Export as Jest or Pytest"
          >
            <Download size={13} aria-hidden="true" />
            <span>Export</span>
          </button>
        )}
      </div>

      {summary && (
        <div className="suite-stats">
          <span className="suite-stat suite-stat-neutral">{summary.total} tests</span>
          <span className="suite-stat suite-stat-pass">{summary.passed} passed</span>
          {summary.failed > 0 && <span className="suite-stat suite-stat-fail">{summary.failed} failed</span>}
          {summary.errors > 0 && <span className="suite-stat suite-stat-warn">{summary.errors} could not run</span>}
          {summary.needsReview > 0 && <span className="suite-stat suite-stat-warn">{summary.needsReview} need review</span>}
        </div>
      )}

      <div className="visually-hidden" role="status" aria-live="polite">
        {running
          ? `Running ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}${targetPath ? ` against ${targetPath}` : ''}.`
          : summary
            ? `Run complete: ${summary.passed} passed, ${summary.failed} failed${summary.errors ? `, ${summary.errors} could not run` : ''}.`
            : ''}
      </div>

      <div className="suite-toolbar">
        <div className="suite-toolbar-group">
          <button type="button" onClick={onSelectAll} disabled={running} className="btn btn-secondary btn-sm" title="Select all tests">
            <CheckSquare size={13} aria-hidden="true" />
            <span>All</span>
          </button>
          <button type="button" onClick={onDeselectAll} disabled={running} className="btn btn-secondary btn-sm" title="Deselect all tests">
            <Square size={13} aria-hidden="true" />
            <span>None</span>
          </button>
          <button type="button" onClick={() => setShowFilters(value => !value)} className="btn btn-secondary btn-sm" aria-expanded={showFilters}>
            <Filter size={13} aria-hidden="true" />
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
          {running ? <Loader2 size={13} className="spin-icon" aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
          <span>{running ? `Running ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}…` : `Run ${selectedCount} ${selectedCount === 1 ? 'test' : 'tests'}`}</span>
        </button>
      </div>

      {showFilters && (
        <div className="suite-filters">
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
              value={filterCategory}
              onChange={event => setFilterCategory(event.target.value)}
              aria-label="Filter tests by category"
              className="form-select filter-select"
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
        <div className="empty-state empty-state-compact">
          No tests match this filter.
        </div>
      )}
    </div>
  );
}
