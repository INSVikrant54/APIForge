import React, { useState } from 'react';
import { Play, Sparkles, Code, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PRESETS } from '../utils/presets.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ConfigPanel({
  config,
  onChangeConfig,
  onGeneratePlan,
  loading,
  error
}) {
  const [activeTab, setActiveTab] = useState('body'); // 'body' | 'headers' | 'response'
  const [jsonFormatError, setJsonFormatError] = useState(null);

  const handleMethodChange = (method) => {
    onChangeConfig({
      ...config,
      method,
      expectedStatus: method === 'POST' ? 201 : 200
    });
  };

  const handlePresetSelect = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    onChangeConfig({
      method: preset.method,
      path: preset.path,
      expectedStatus: preset.expectedStatus,
      headers: preset.headers,
      body: preset.body,
      sampleResponse: preset.sampleResponse,
      businessRules: preset.businessRules
    });
    setJsonFormatError(null);
  };

  const handleBodyChange = (rawText) => {
    try {
      if (rawText.trim() === '') {
        onChangeConfig({ ...config, body: null });
        setJsonFormatError(null);
        return;
      }
      const parsed = JSON.parse(rawText);
      onChangeConfig({ ...config, body: parsed });
      setJsonFormatError(null);
    } catch {
      // Keep as string in config while editing, but track validation state
      onChangeConfig({ ...config, body: rawText });
      setJsonFormatError('Invalid JSON format');
    }
  };

  const formatJson = () => {
    if (config.body && typeof config.body === 'object') {
      onChangeConfig({ ...config, body: { ...config.body } });
      setJsonFormatError(null);
    }
  };

  const bodyString = typeof config.body === 'object' && config.body !== null
    ? JSON.stringify(config.body, null, 2)
    : (config.body || '');

  const headersString = typeof config.headers === 'object' && config.headers !== null
    ? JSON.stringify(config.headers, null, 2)
    : (config.headers || '');

  const responseString = typeof config.sampleResponse === 'object' && config.sampleResponse !== null
    ? JSON.stringify(config.sampleResponse, null, 2)
    : (config.sampleResponse || '');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Code size={18} color="#38bdf8" />
          <span>API Specification & Business Rules</span>
        </div>

        {/* Preset Selector */}
        <select
          className="form-select"
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
          onChange={(e) => handlePresetSelect(e.target.value)}
          defaultValue="demo-orders"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{
          background: 'var(--bg-fail)',
          border: '1px solid var(--border-fail)',
          color: 'var(--color-fail)',
          padding: '0.6rem 0.8rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* HTTP Method Selector & Endpoint URL */}
      <div className="form-group">
        <label className="form-label">HTTP Method & Target Endpoint</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            {METHODS.map(m => {
              const isSelected = config.method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMethodChange(m)}
                  className={`method-pill method-${m.toLowerCase()}`}
                  style={{
                    background: isSelected ? undefined : 'transparent',
                    border: isSelected ? undefined : '1px solid transparent',
                    opacity: isSelected ? 1 : 0.45,
                    cursor: 'pointer'
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            className="form-input"
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            value={config.path}
            onChange={(e) => onChangeConfig({ ...config, path: e.target.value })}
            placeholder="/api/demo/orders or https://api.yoursite.com/orders"
          />

          <div style={{ width: '90px' }}>
            <input
              type="number"
              className="form-input"
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              value={config.expectedStatus}
              onChange={(e) => onChangeConfig({ ...config, expectedStatus: Number(e.target.value) })}
              title="Expected Success Status Code"
            />
          </div>
        </div>
      </div>

      {/* Tabs: Request Body | Headers | Sample Response */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '0.75rem',
        gap: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('body')}
          style={{
            padding: '0.45rem 0.8rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'body' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'body' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Request Body (JSON)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          style={{
            padding: '0.45rem 0.8rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'headers' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'headers' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Headers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('response')}
          style={{
            padding: '0.45rem 0.8rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'response' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'response' ? '#38bdf8' : '#94a3b8',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Sample Response
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'body' && (
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={5}
            value={bodyString}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder='{\n  "productId": 101,\n  "quantity": 2,\n  "unitPrice": 500\n}'
          />
          {jsonFormatError && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-fail)', marginTop: '2px' }}>
              ⚠️ {jsonFormatError}
            </span>
          )}
        </div>
      )}

      {activeTab === 'headers' && (
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={4}
            value={headersString}
            onChange={(e) => {
              try {
                onChangeConfig({ ...config, headers: JSON.parse(e.target.value) });
              } catch {
                onChangeConfig({ ...config, headers: e.target.value });
              }
            }}
            placeholder='{\n  "Content-Type": "application/json"\n}'
          />
        </div>
      )}

      {activeTab === 'response' && (
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={4}
            value={responseString}
            onChange={(e) => {
              try {
                onChangeConfig({ ...config, sampleResponse: JSON.parse(e.target.value) });
              } catch {
                onChangeConfig({ ...config, sampleResponse: e.target.value });
              }
            }}
            placeholder='{\n  "success": true,\n  "order": { "totalPrice": 1000 }\n}'
          />
        </div>
      )}

      {/* Business Rules Input */}
      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="form-label" style={{ fontWeight: 600, color: '#f8fafc' }}>
            What should this API guarantee?
          </label>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Plain English business rules</span>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
          value={config.businessRules}
          onChange={(e) => onChangeConfig({ ...config, businessRules: e.target.value })}
          placeholder="e.g. Quantity must be greater than zero. Unit price cannot be negative. Total price must equal quantity * unit price. Invalid orders must be rejected with 400 Bad Request."
        />
      </div>

      {/* CTA Button */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Gemma 4 will generate ~8–12 structured edge cases
        </div>

        <button
          type="button"
          onClick={onGeneratePlan}
          disabled={loading || !config.path}
          className="btn btn-primary"
          style={{ minWidth: '180px' }}
        >
          {loading ? (
            <>
              <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
              <span>Analyzing with Gemma 4...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate Test Plan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
