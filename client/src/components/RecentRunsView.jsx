import React, { useState } from 'react';
import { History, Play, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function RecentRunsView({ runs = [], onLoadRun, onClearRuns }) {
  const [confirming, setConfirming] = useState(false);

  if (runs.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
        <History size={40} color="var(--border-active)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
          No runs yet
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', color: 'var(--text-dim)' }}>
          Run a test suite to save its results here.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={18} color="var(--accent-cyan)" />
          <span>Recent runs ({runs.length})</span>
        </div>
        {confirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clear all {runs.length} runs?</span>
            <button
              type="button"
              onClick={() => { onClearRuns(); setConfirming(false); }}
              aria-label="Confirm clear all session history runs"
              className="btn btn-danger btn-sm"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Cancel clearing history"
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Clear all session history runs"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--color-fail)' }}
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {runs.map((run, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {run.suiteName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Target: {run.path} • {new Date(run.timestamp).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--color-pass)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <CheckCircle2 size={13} /> {run.summary?.passed || 0}
                </span>
                <span style={{ color: 'var(--color-fail)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <XCircle size={13} /> {run.summary?.failed || 0}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onLoadRun(run)}
                aria-label={`Inspect results of ${run.suiteName}`}
                className="btn btn-secondary btn-sm"
              >
                <span>Open</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}