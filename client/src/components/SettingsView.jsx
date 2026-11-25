import React from 'react';
import { Settings, Cpu, Shield, Key } from 'lucide-react';
import AuthConfigPanel from './AuthConfigPanel.jsx';

export default function SettingsView({
  health,
  aiSettings,
  onOpenAiSettings,
  timeoutMs,
  onChangeTimeout,
  authConfig,
  variableNames,
  environmentName,
  onChangeAuth
}) {
  const isCustomKey = aiSettings && !aiSettings.useServerKey && aiSettings.customKey;
  const isServerConfigured = health?.aiConfigured;
  const activeModel = aiSettings?.model || health?.model || 'gemini-3.5-flash-lite';

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <Settings size={18} color="var(--accent-cyan)" />
          <span>Settings</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, margin: 0 }}>AI model</h3>
            </div>
            <button type="button" onClick={onOpenAiSettings} aria-haspopup="dialog" className="btn btn-secondary btn-sm">
              <Key size={13} />
              <span>Configure</span>
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div>Model: <strong style={{ color: 'var(--text-main)' }}>{activeModel}</strong></div>
            <div>
              Key source:{' '}
              <strong style={{ color: isCustomKey ? 'var(--text-main)' : isServerConfigured ? 'var(--color-pass)' : 'var(--color-warn)' }}>
                {isCustomKey ? 'Your key' : isServerConfigured ? 'Server key' : 'Offline demo'}
              </strong>
            </div>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-dim)' }}>
              APIForge uses AI to prepare tests. Test results come from real HTTP requests and assertions.
            </p>
          </div>
        </div>

        <AuthConfigPanel
          auth={authConfig}
          variableNames={variableNames}
          environmentName={environmentName}
          onChange={onChangeAuth}
        />

        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Shield size={16} color="var(--color-pass)" />
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, margin: 0 }}>Request safety</h3>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div className="form-group" style={{ maxWidth: '280px', marginTop: '0.5rem' }}>
              <label htmlFor="http-timeout-input" className="form-label">Request timeout</label>
              <input
                id="http-timeout-input"
                type="number"
                className="form-input"
                value={timeoutMs}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (next) onChangeTimeout(Math.min(30000, Math.max(1000, next)));
                }}
                onBlur={() => {
                  const value = Number(timeoutMs);
                  if (!value || value < 1000 || value > 30000) onChangeTimeout(5000);
                }}
                min="1000"
                max="30000"
                step="1000"
              />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Private network addresses and cloud metadata endpoints are blocked. Sensitive headers are removed from exported requests and logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
