import React, { useState } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';

function statusLabel(entry) {
  if (entry.status === 'running') return 'Running';
  if (entry.status === 'error') return 'Error';
  if (entry.status === 'cancelled') return 'Cancelled';
  return 'Done';
}

export default function BatchResultsView({ entries = [], running = false, onOpenEntry, onClose }) {
  const [active, setActive] = useState(0);
  const current = entries[Math.min(active, Math.max(entries.length - 1, 0))];

  return (
    <section className="card openapi-import-panel" aria-labelledby="batch-results-title" aria-busy={running}>
      <div className="card-header">
        <div>
          <h1 id="batch-results-title" style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
            Batch results
          </h1>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Endpoints run one at a time, paced at ten calls per minute. Failures in one endpoint do not stop the batch.
          </p>
        </div>
        {onClose && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Back to start
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Preparing the batch…</p>
      ) : (
        <>
          <div role="tablist" aria-label="Batch endpoints" className="openapi-batch-controls">
            {entries.map((entry, index) => (
              <button
                key={entry.index ?? index}
                type="button"
                role="tab"
                aria-selected={index === active}
                className="btn btn-sm"
                onClick={() => setActive(index)}
                style={{
                  background: index === active ? 'var(--accent-cyan)' : 'var(--bg-card)',
                  color: index === active ? '#000' : 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {entry.index + 1}. {entry.label} · {statusLabel(entry)}
              </button>
            ))}
          </div>

          {current && (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
              <code style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{current.label}</code>

              {current.status === 'running' && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LoaderCircle size={14} className="openapi-spinner" /> Generating and running tests…
                </p>
              )}

              {current.status === 'error' && (
                <div className="openapi-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{current.error}</span>
                </div>
              )}

              {current.status === 'complete' && (
                <>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {current.summary?.passed ?? 0} passed · {current.summary?.failed ?? 0} failed ·{' '}
                    {current.summary?.skipped ?? 0} skipped
                  </p>
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {(current.results || []).map((result) => (
                      <div
                        key={result.id}
                        className="openapi-operation"
                        style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
                      >
                        <div className="openapi-operation-details">
                          <span className={`status-badge status-${(result.status || '').toLowerCase()}`}>
                            {result.status}
                          </span>
                          <span style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>{result.testName || result.name || result.id}</span>
                          <code style={{ color: 'var(--text-muted)' }}>
                            {result.actual?.status ?? result.actual?.statusCode ?? '—'}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                  {onOpenEntry && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenEntry(current)}>
                      Open in workspace
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
