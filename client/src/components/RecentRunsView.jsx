import React from 'react';
import { History, Play, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function RecentRunsView({ runs = [], onLoadRun, onClearRuns }) {
  if (runs.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#94a3b8' }}>
        <History size={40} color="#334155" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.05rem', color: '#f1f5f9', marginBottom: '0.4rem' }}>
          No Test Runs in History
        </h3>
        <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', color: '#64748b' }}>
          Execute test suites in the Test Lab to record runs locally in your session history.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <History size={18} color="#38bdf8" />
          <span>Session Test History ({runs.length})</span>
        </div>
        <button onClick={onClearRuns} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-fail)' }}>
          <Trash2 size={13} />
          <span>Clear History</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {runs.map((run, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
                {run.suiteName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Target: {run.path} • {new Date(run.timestamp).toLocaleTimeString()}
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
                onClick={() => onLoadRun(run)}
                className="btn btn-secondary btn-sm"
              >
                <span>Inspect Run</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
