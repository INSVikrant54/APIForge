import React from 'react';
import { Settings, Cpu, Shield, Key, ExternalLink } from 'lucide-react';

export default function SettingsView({ health, aiSettings, onOpenAiSettings, timeoutMs, onChangeTimeout }) {
  const isCustomKey = aiSettings && !aiSettings.useServerKey && aiSettings.customKey;
  const isServerConfigured = health?.aiConfigured;
  const activeModel = aiSettings?.model || health?.model || 'gemma-4-26b-a4b-it';

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <Settings size={18} color="#38bdf8" />
          <span>System Configuration & Security Safeguards</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Model Config & BYOK */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} color="#38bdf8" />
              <h4 style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600 }}>AI Engine & API Key (BYOK)</h4>
            </div>
            <button
              onClick={onOpenAiSettings}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            >
              <Key size={13} />
              <span>Configure Key & Model</span>
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <div>Active Model: <strong style={{ color: '#38bdf8' }}>{activeModel}</strong></div>
            <div>
              Key Source: <strong style={{ color: isCustomKey ? '#a855f7' : isServerConfigured ? 'var(--color-pass)' : 'var(--color-warn)' }}>
                {isCustomKey ? 'Custom User Key (Bring Your Own Key)' : isServerConfigured ? 'Default Server Key (.env)' : 'Offline Demo Mode (No Key)'}
              </strong>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
              You can toggle between the default server credentials and your personal Google AI Studio key at any time without restarting the server.
            </p>
          </div>
        </div>

        {/* Execution Timeout */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Shield size={16} color="#10b981" />
            <h4 style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600 }}>Test Runner Execution Safety</h4>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            <div className="form-group" style={{ maxWidth: '280px', marginTop: '0.5rem' }}>
              <label className="form-label">HTTP Request Timeout (milliseconds)</label>
              <input
                type="number"
                className="form-input"
                value={timeoutMs}
                onChange={(e) => onChangeTimeout(Number(e.target.value) || 5000)}
                min="1000"
                max="30000"
                step="1000"
              />
            </div>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6 }}>
              <li>SSRF protection active: Private IPs (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, etc.) are blocked except for internal demo API.</li>
              <li>Cloud metadata endpoints (169.254.169.254) strictly forbidden.</li>
              <li>Sensitive headers (Authorization, Cookie, x-api-key, x-gemini-api-key) automatically redacted in logs and exported tests.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
