import React from 'react';
import { KeyRound } from 'lucide-react';
import { normalizeAuth } from '../../../server/utils/authResolver.js';

const AUTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'apiKeyHeader', label: 'API key (header)' },
  { value: 'apiKeyQuery', label: 'API key (query parameter)' },
  { value: 'basic', label: 'Basic auth' }
];

function VariableSelect({ id, label, variableNames, value, onChange }) {
  return (
    <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="form-input"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a variable…</option>
        {variableNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  );
}

export default function AuthConfigPanel({ auth, variableNames = [], environmentName, onChange }) {
  const config = normalizeAuth(auth);
  const update = (patch) => onChange(normalizeAuth({ ...config, ...patch }));

  return (
    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <KeyRound size={16} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, margin: 0 }}>
          Authentication
        </h3>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.6, marginTop: 0 }}>
        Configured per environment{environmentName ? ` (${environmentName})` : ''}. Credentials are read from
        environment variables at run time, masked here, and redacted from results and exports. They are never saved to disk.
      </p>

      <div className="form-group" style={{ maxWidth: '320px' }}>
        <label className="form-label" htmlFor="auth-type-select">Auth type</label>
        <select
          id="auth-type-select"
          className="form-input"
          value={config.type}
          onChange={(event) => update({ type: event.target.value })}
        >
          {AUTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {config.type === 'bearer' && (
        <VariableSelect
          id="auth-bearer-variable"
          label="Token variable"
          variableNames={variableNames}
          value={config.tokenVariable}
          onChange={(tokenVariable) => update({ tokenVariable })}
        />
      )}

      {config.type === 'apiKeyHeader' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className="form-label" htmlFor="auth-header-name">Header name</label>
            <input
              id="auth-header-name"
              className="form-input"
              type="text"
              value={config.headerName}
              autoComplete="off"
              onChange={(event) => update({ headerName: event.target.value })}
            />
          </div>
          <VariableSelect
            id="auth-header-variable"
            label="API key variable"
            variableNames={variableNames}
            value={config.keyVariable}
            onChange={(keyVariable) => update({ keyVariable })}
          />
        </div>
      )}

      {config.type === 'apiKeyQuery' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className="form-label" htmlFor="auth-query-name">Query parameter</label>
            <input
              id="auth-query-name"
              className="form-input"
              type="text"
              value={config.queryParam}
              autoComplete="off"
              onChange={(event) => update({ queryParam: event.target.value })}
            />
          </div>
          <VariableSelect
            id="auth-query-variable"
            label="API key variable"
            variableNames={variableNames}
            value={config.keyVariable}
            onChange={(keyVariable) => update({ keyVariable })}
          />
        </div>
      )}

      {config.type === 'basic' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <VariableSelect
            id="auth-basic-username"
            label="Username variable"
            variableNames={variableNames}
            value={config.usernameVariable}
            onChange={(usernameVariable) => update({ usernameVariable })}
          />
          <VariableSelect
            id="auth-basic-password"
            label="Password variable"
            variableNames={variableNames}
            value={config.passwordVariable}
            onChange={(passwordVariable) => update({ passwordVariable })}
          />
        </div>
      )}

      {variableNames.length === 0 && config.type !== 'none' && (
        <p className="form-hint" style={{ marginTop: '0.5rem' }}>
          Add a variable in the request panel first, then select it here.
        </p>
      )}
    </div>
  );
}
