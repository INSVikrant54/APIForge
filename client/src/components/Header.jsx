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
  const activeModel = aiSettings?.model || health?.model || 'gemma-4-26b-a4b-it';

  // Determine badge text and styling
  let badgeLabel = `Gemma 4 (${activeModel})`;
  let badgeColor = '#38bdf8';
  let badgeBg = 'rgba(56, 189, 248, 0.1)';
  let badgeBorder = 'rgba(56, 189, 248, 0.3)';

  if (isCustomKeyActive) {
    badgeLabel = `Custom Key • ${activeModel}`;
    badgeColor = '#a855f7';
    badgeBg = 'rgba(168, 85, 247, 0.12)';
    badgeBorder = 'rgba(168, 85, 247, 0.35)';
  } else if (!isServerConfigured) {
    badgeLabel = 'Offline Demo Mode (No Key)';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.1)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
  }

  return (
    <header className="top-header">
      {/* Left: View title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
          API Behavior Verification Lab
        </h2>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '9999px',
          padding: '0.18rem 0.55rem',
          fontSize: '0.72rem',
          color: '#fbbf24',
          fontWeight: 600
        }}>
          <span>🏆</span>
          <span>Hacktoberfest Track Winner — Best Use of Gemma 4</span>
        </div>
      </div>

      {/* Right: Status Badges & Demo Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        {/* Clickable Model & Key Settings Pill */}
        <button
          onClick={onOpenAiSettings}
          type="button"
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
          <Settings2 size={12} style={{ opacity: 0.6, marginLeft: '2px' }} />
        </button>

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
