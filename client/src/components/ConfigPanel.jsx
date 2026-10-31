import React, { useState } from 'react';
import { Sparkles, Code, AlertCircle, Wand2, Check } from 'lucide-react';
import { PRESETS } from '../utils/presets.js';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ConfigPanel({
  config,
  onChangeConfig,
  onGeneratePlan,
  loading,
  error,
  activeModel = 'gemini-3.5-flash-lite'
}) {
  const [activeTab, setActiveTab] = useState('body'); // 'body' | 'headers' | 'response'
  const [formatErrors, setFormatErrors] = useState({
    body: null,
    headers: null,
    response: null
  });
  const [beautified, setBeautified] = useState(false);
  const [undoBackup, setUndoBackup] = useState(null);

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

    // Snapshot existing config to allow instant undo if user had active edits
    const hasCustomEdits = Boolean(
      config.path ||
      config.businessRules ||
      (config.body && Object.keys(config.body).length > 0)
    );

    if (hasCustomEdits) {
      setUndoBackup({
        config: { ...config },
        errors: { ...formatErrors },
        presetName: preset.name
      });
      setTimeout(() => {
        setUndoBackup(prev => (prev?.presetName === preset.name ? null : prev));
      }, 10000);
    }

    onChangeConfig({
      method: preset.method,
      path: preset.path,
      expectedStatus: preset.expectedStatus,
      headers: preset.headers,
      body: preset.body,
      sampleResponse: preset.sampleResponse,
      businessRules: preset.businessRules
    });
    setFormatErrors({
      body: null,
      headers: null,
      response: null
    });
  };

  const handleUndoPresetOverwrite = () => {
    if (!undoBackup) return;
    onChangeConfig(undoBackup.config);
    setFormatErrors(undoBackup.errors || { body: null, headers: null, response: null });
    setUndoBackup(null);
  };

  const activeErrorTabs = Object.keys(formatErrors).filter(k => Boolean(formatErrors[k]));
  const hasAnyFormatError = activeErrorTabs.length > 0;

  const handleFormKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (!loading && config.path && !hasAnyFormatError) {
        e.preventDefault();
        onGeneratePlan();
      }
    }
  };

  const handleBodyChange = (rawText) => {
    try {
      if (rawText.trim() === '') {
        onChangeConfig({ ...config, body: null });
        setFormatErrors(prev => ({ ...prev, body: null }));
        return;
      }
      const parsed = JSON.parse(rawText);
      onChangeConfig({ ...config, body: parsed });
      setFormatErrors(prev => ({ ...prev, body: null }));
    } catch {
      // Keep as string in config while editing, but track validation state
      onChangeConfig({ ...config, body: rawText });
      setFormatErrors(prev => ({ ...prev, body: 'Invalid JSON format in Request Body' }));
    }
  };

  const handleHeadersChange = (rawText) => {
    try {
      if (rawText.trim() === '') {
        onChangeConfig({ ...config, headers: null });
        setFormatErrors(prev => ({ ...prev, headers: null }));
        return;
      }
      const parsed = JSON.parse(rawText);
      onChangeConfig({ ...config, headers: parsed });
      setFormatErrors(prev => ({ ...prev, headers: null }));
    } catch {
      onChangeConfig({ ...config, headers: rawText });
      setFormatErrors(prev => ({ ...prev, headers: 'Invalid JSON format in Headers' }));
    }
  };

  const handleResponseChange = (rawText) => {
    try {
      if (rawText.trim() === '') {
        onChangeConfig({ ...config, sampleResponse: null });
        setFormatErrors(prev => ({ ...prev, response: null }));
        return;
      }
      const parsed = JSON.parse(rawText);
      onChangeConfig({ ...config, sampleResponse: parsed });
      setFormatErrors(prev => ({ ...prev, response: null }));
    } catch {
      onChangeConfig({ ...config, sampleResponse: rawText });
      setFormatErrors(prev => ({ ...prev, response: 'Invalid JSON format in Sample Response' }));
    }
  };

  const formatJson = () => {
    let key = 'body';
    let errorKey = 'body';
    let label = 'Request Body';
    if (activeTab === 'headers') {
      key = 'headers';
      errorKey = 'headers';
      label = 'Headers';
    } else if (activeTab === 'response') {
      key = 'sampleResponse';
      errorKey = 'response';
      label = 'Sample Response';
    }

    const currentVal = config[key];
    try {
      const source = typeof currentVal === 'string'
        ? (currentVal.trim() ? JSON.parse(currentVal) : null)
        : currentVal;

      if (source && typeof source === 'object') {
        onChangeConfig({ ...config, [key]: source });
        setFormatErrors(prev => ({ ...prev, [errorKey]: null }));
        setBeautified(true);
        setTimeout(() => setBeautified(false), 2000);
      }
    } catch (err) {
      setFormatErrors(prev => ({ ...prev, [errorKey]: `Cannot format ${label}: ${err.message}` }));
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
          <Code size={18} color="var(--accent-cyan)" />
          <span>API Specification & Business Rules</span>
        </div>

        {/* Preset Selector */}
        <select
          className="form-select"
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
          onChange={(e) => handlePresetSelect(e.target.value)}
          defaultValue="demo-orders"
          aria-label="Load API Preset Scenario"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {undoBackup && (
        <div style={{
          background: 'var(--bg-card-hover)',
          border: '1px solid var(--accent-cyan)',
          padding: '0.45rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <span>Loaded preset <strong>{undoBackup.presetName}</strong>. Previous specification backed up.</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
            onClick={handleUndoPresetOverwrite}
          >
            Undo Overwrite
          </button>
        </div>
      )}

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
          <div
            role="radiogroup"
            aria-label="HTTP Method"
            style={{
              display: 'flex',
              background: 'var(--bg-input)',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {METHODS.map(m => {
              const isSelected = config.method === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
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
            onKeyDown={handleFormKeyDown}
            placeholder="/api/demo/orders or https://api.yoursite.com/orders"
            aria-label="Target Endpoint URL"
          />

          <div style={{ width: '90px' }}>
            <input
              type="number"
              className="form-input"
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
              value={config.expectedStatus}
              onChange={(e) => onChangeConfig({ ...config, expectedStatus: Number(e.target.value) })}
              onKeyDown={handleFormKeyDown}
              title="Expected Success Status Code"
              aria-label="Expected Success Status Code"
            />
          </div>
        </div>
      </div>

      {/* Tabs: Request Body | Headers | Sample Response */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '0.75rem'
      }}>
        <div
          role="tablist"
          aria-label="Request specification tabs"
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <button
            type="button"
            role="tab"
            id="tab-body"
            aria-selected={activeTab === 'body'}
            aria-controls="panel-body"
            onClick={() => setActiveTab('body')}
            style={{
              padding: '0.45rem 0.8rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'body' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'body' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Request Body (JSON)</span>
            {formatErrors.body ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-fail)' }}
                title="Syntax error in Request Body"
              />
            ) : Boolean(bodyString && bodyString.trim()) ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }}
                title="Has content"
              />
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-headers"
            aria-selected={activeTab === 'headers'}
            aria-controls="panel-headers"
            onClick={() => setActiveTab('headers')}
            style={{
              padding: '0.45rem 0.8rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'headers' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'headers' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Headers</span>
            {formatErrors.headers ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-fail)' }}
                title="Syntax error in Headers"
              />
            ) : Boolean(headersString && headersString.trim()) ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }}
                title="Has content"
              />
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-response"
            aria-selected={activeTab === 'response'}
            aria-controls="panel-response"
            onClick={() => setActiveTab('response')}
            style={{
              padding: '0.45rem 0.8rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'response' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'response' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Sample Response</span>
            {formatErrors.response ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-fail)' }}
                title="Syntax error in Sample Response"
              />
            ) : Boolean(responseString && responseString.trim()) ? (
              <span
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }}
                title="Has content"
              />
            ) : null}
          </button>
        </div>

        <button
          type="button"
          onClick={formatJson}
          className="btn btn-secondary"
          style={{
            padding: '0.25rem 0.6rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
          title={`Prettify ${activeTab === 'body' ? 'Request Body' : activeTab === 'headers' ? 'Headers' : 'Sample Response'} with 2-space indentation`}
        >
          {beautified ? (
            <>
              <Check size={13} color="var(--color-pass)" />
              <span style={{ color: 'var(--color-pass)' }}>Formatted</span>
            </>
          ) : (
            <>
              <Wand2 size={13} />
              <span>Beautify JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'body' && (
        <div
          role="tabpanel"
          id="panel-body"
          aria-labelledby="tab-body"
          className="form-group"
        >
          <textarea
            className="form-textarea"
            rows={5}
            value={bodyString}
            onChange={(e) => handleBodyChange(e.target.value)}
            onKeyDown={handleFormKeyDown}
            placeholder='{\n  "productId": 101,\n  "quantity": 2,\n  "unitPrice": 500\n}'
            aria-label="Request Body JSON payload"
          />
          {formatErrors.body && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--color-fail)',
              marginTop: '0.35rem'
            }}>
              <AlertCircle size={13} />
              <span>{formatErrors.body}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'headers' && (
        <div
          role="tabpanel"
          id="panel-headers"
          aria-labelledby="tab-headers"
          className="form-group"
        >
          <textarea
            className="form-textarea"
            rows={4}
            value={headersString}
            onChange={(e) => handleHeadersChange(e.target.value)}
            onKeyDown={handleFormKeyDown}
            placeholder='{\n  "Content-Type": "application/json"\n}'
            aria-label="Request Headers JSON"
          />
          {formatErrors.headers && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--color-fail)',
              marginTop: '0.35rem'
            }}>
              <AlertCircle size={13} />
              <span>{formatErrors.headers}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'response' && (
        <div
          role="tabpanel"
          id="panel-response"
          aria-labelledby="tab-response"
          className="form-group"
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Used by AI to synthesize contract schema assertions & invariants
            </span>
          </div>
          <textarea
            className="form-textarea"
            rows={4}
            value={responseString}
            onChange={(e) => handleResponseChange(e.target.value)}
            onKeyDown={handleFormKeyDown}
            placeholder='{\n  "success": true,\n  "order": { "totalPrice": 1000 }\n}'
            aria-label="Sample Response JSON"
          />
          {formatErrors.response && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--color-fail)',
              marginTop: '0.35rem'
            }}>
              <AlertCircle size={13} />
              <span>{formatErrors.response}</span>
            </div>
          )}
        </div>
      )}

      {/* Business Rules Input */}
      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
            What should this API guarantee?
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Plain English business rules</span>
        </div>
        <textarea
          className="form-textarea"
          rows={3}
          style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
          value={config.businessRules}
          onChange={(e) => onChangeConfig({ ...config, businessRules: e.target.value })}
          onKeyDown={handleFormKeyDown}
          placeholder="e.g. Quantity must be greater than zero. Unit price cannot be negative. Total price must equal quantity * unit price. Invalid orders must be rejected with 400 Bad Request."
          aria-label="API Contract Business Rules"
        />
      </div>

      {/* CTA Button */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {activeModel} will generate ~8–12 structured edge cases
        </div>

        <button
          type="button"
          onClick={onGeneratePlan}
          disabled={loading || !config.path || hasAnyFormatError}
          className="btn btn-primary"
          style={{ minWidth: '190px' }}
          title={hasAnyFormatError
            ? `Fix JSON formatting errors in: ${activeErrorTabs.map(t => t === 'body' ? 'Request Body' : t === 'headers' ? 'Headers' : 'Sample Response').join(', ')}`
            : "Generate Test Plan (Ctrl+Enter / ⌘+Enter)"}
        >
          {loading ? (
            <>
              <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
              <span>Analyzing with {activeModel}...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Generate Test Plan</span>
              <kbd style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                padding: '1px 5px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-sm)',
                marginLeft: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>⌘↵</kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
