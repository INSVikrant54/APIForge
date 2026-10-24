import React from 'react';
import { Settings, Cpu, Shield, Key } from 'lucide-react';

export default function SettingsView({ health, timeoutMs, onChangeTimeout }) {
  const isAiConfigured = health?.aiConfigured;
  const model = health?.model || 'gemma-4-26b-a4b-it';

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <Settings size={18} color="#38bdf8" />
          <span>System Configuration & Security Safeguards</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Model Config */}
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Cpu size={16} color="#38bdf8" />
            <h4 style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Gemma 4 Model Configuration</h4>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
            <div>Active Model: <strong style={{ color: '#38bdf8' }}>{model}</strong></div>
            <div>API Status: <strong style={{ color: isAiConfigured ? 'var(--color-pass)' : 'var(--color-warn)' }}>
              {isAiConfigured ? 'Connected via GEMINI_API_KEY' : 'Not Configured (Running in Predefined Offline Mode)'}
            </strong></div>
            <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
              Set <code>GEMINI_API_KEY</code> and <code>GEMMA_MODEL</code> in your server <code>.env</code> file to customize.
            </p>
          </div>
        </div>

        {/* Execution Timeout */}
        <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Shield size={16} color="#10b981" />
            <h4 style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Test Runner Execution Safety</h4>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
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
              <li>Sensitive headers (Authorization, Cookie, x-api-key) automatically redacted in logs and exported tests.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
