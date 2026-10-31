import React from 'react';
import { Cpu, ShieldAlert, ShieldCheck, Sparkles, Key, Settings2 } from 'lucide-react';

export default function Header({
  health,
  demoMode,
  aiSettings,
  onOpenAiSettings,
  onToggleDemoMode,
  onLoadDemo,
  loading
}) {
  const isVulnerable = demoMode?.mode === 'vulnerable';
  const isCustomKeyActive = aiSettings && !aiSettings.useServerKey && aiSettings.customKey;
  const isServerConfigured = health?.aiConfigured;
  const activeModel = aiSettings?.model || health?.model || 'gemini-3.5-flash-lite';

  // Determine badge text and styling dynamically based on model family
  const modelFamily = activeModel.startsWith('gemma')
    ? 'Gemma 4'
    : activeModel.startsWith('gemini')
      ? 'Gemini'
      : 'Model';

  let badgeLabel = `${modelFamily} • ${activeModel}`;
  let badgeColor = 'var(--accent-cyan)';
  let badgeBg = 'rgba(56, 189, 248, 0.1)';
  let badgeBorder = 'rgba(56, 189, 248, 0.3)';

  if (isCustomKeyActive) {
    badgeLabel = `BYOK Key • ${activeModel}`;
    badgeColor = '#c084fc';
    badgeBg = 'rgba(168, 85, 247, 0.12)';
    badgeBorder = 'rgba(168, 85, 247, 0.35)';
  } else if (!isServerConfigured) {
    badgeLabel = 'Offline Demo Mode (No Key)';
    badgeColor = 'var(--color-warn)';
    badgeBg = 'rgba(245, 158, 11, 0.1)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
  }

  return (
    <header className="top-header">
      {/* Left: View title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
          API Behavior Verification Lab
        </h2>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '9999px',
          padding: '0.2rem 0.6rem',
          fontSize: '0.75rem',
          color: 'var(--color-warn)',
          fontWeight: 600
        }}>
          <span>🏆</span>
          <span>Hacktoberfest Track Winner — Best Use of Gemma 4</span>
        </div>
      </div>

      {/* Right: Status Badges & Demo Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {/* Clickable Model & Key Settings Pill */}
        <button
          onClick={onOpenAiSettings}
          type="button"
          aria-haspopup="dialog"
          aria-label={`Configure AI Model and API Key. Currently active: ${badgeLabel}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            padding: '0.3rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: badgeColor,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to change AI Model or configure your personal Gemini API Key (BYOK)"
        >
          <span
            className="pulse-dot"
            style={{ backgroundColor: badgeColor }}
          />
          {isCustomKeyActive ? <Key size={13} /> : <Cpu size={13} />}
          <span style={{ fontWeight: 500 }}>{badgeLabel}</span>
          <Settings2 size={12} style={{ opacity: 0.7, marginLeft: '2px' }} />
        </button>

        {/* Demo Mode Toggle Controller */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.2rem 0.35rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.3rem' }}>
            Demo Target:
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isVulnerable}
            aria-label="Toggle between vulnerable and safe demo targets"
            onClick={() => onToggleDemoMode(isVulnerable ? 'safe' : 'vulnerable')}
            className="btn btn-sm"
            style={{
              background: isVulnerable ? 'var(--bg-fail)' : 'var(--bg-pass)',
              border: isVulnerable ? '1px solid var(--border-fail)' : '1px solid var(--border-pass)',
              color: isVulnerable ? 'var(--color-fail)' : 'var(--color-pass)',
              fontWeight: 600,
              fontSize: '0.75rem'
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
          type="button"
          onClick={onLoadDemo}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ borderColor: 'var(--accent-cyan)' }}
        >
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span>Try Interactive Demo</span>
        </button>
      </div>
    </header>
  );
}
