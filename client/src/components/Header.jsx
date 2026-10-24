import React from 'react';
import { Cpu, ShieldAlert, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

export default function Header({
  health,
  demoMode,
  onToggleDemoMode,
  onLoadDemo,
  loading
}) {
  const isVulnerable = demoMode?.mode === 'vulnerable';
  const isAiConfigured = health?.aiConfigured;
  const modelName = health?.model || 'gemma-4-26b-a4b-it';

  return (
    <header className="top-header">
      {/* Left: View title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
          API Behavior Verification Lab
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>•</span>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Deterministic execution powered by Gemma 4
        </span>
      </div>

      {/* Right: Status Badges & Demo Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        {/* Gemma Model Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: isAiConfigured ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isAiConfigured ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          padding: '0.3rem 0.65rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          color: isAiConfigured ? '#38bdf8' : '#f59e0b'
        }}>
          <span
            className="pulse-dot"
            style={{ backgroundColor: isAiConfigured ? '#38bdf8' : '#f59e0b' }}
          />
          <Cpu size={13} />
          <span>
            {isAiConfigured ? `Gemma 4 (${modelName})` : 'Offline Demo Mode (No Key)'}
          </span>
        </div>

        {/* Demo Mode Toggle Controller */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#0e1626',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '0.2rem 0.35rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '0.3rem' }}>
            Demo Target:
          </span>
          <button
            onClick={() => onToggleDemoMode(isVulnerable ? 'safe' : 'vulnerable')}
            className="btn btn-sm"
            style={{
              background: isVulnerable ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${isVulnerable ? '#f43f5e' : '#10b981'}`,
              color: isVulnerable ? '#f43f5e' : '#10b981',
              fontWeight: 600
            }}
            title={isVulnerable ? 'Switch to Safe Mode (All rules enforced)' : 'Switch to Vulnerable Mode (Reproduce bug)'}
          >
            {isVulnerable ? (
              <>
                <ShieldAlert size={13} />
                <span>Vulnerable Demo Mode</span>
              </>
            ) : (
              <>
                <ShieldCheck size={13} />
                <span>Safe Mode Active</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Load Demo Button */}
        <button
          onClick={onLoadDemo}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ borderColor: '#38bdf8' }}
        >
          <Sparkles size={13} color="#38bdf8" />
          <span>Try Interactive Demo</span>
        </button>
      </div>
    </header>
  );
}
