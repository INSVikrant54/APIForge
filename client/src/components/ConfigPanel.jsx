import React, { useState } from 'react';
import { Sparkles, Code, AlertCircle, Wand2, Check } from 'lucide-react';
import { currentEnvironment, createDefaultEnvironments } from '../utils/environments.js';
import {
  getSecretValues,
  getVariableValues,
  redactText,
  substituteString
} from '../../../server/utils/environmentResolver.js';


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
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent || '');

  const environments = config.environments || createDefaultEnvironments();
  const environment = currentEnvironment(config);
  const resolvedPreview = redactText(
    substituteString(config.path || '', getVariableValues(environment.variables)),
    getSecretValues(environment.variables)
  );

  const updateEnvironment = (updater) => {
    const next = { ...environments };
    next[environment.name] = updater(next[environment.name] || { targetBaseUrl: '', variables: {} });
    onChangeConfig({ ...config, environments: next });
  };

  const setVariable = (name, patch) => updateEnvironment((env) => ({
    ...env,
    variables: {
      ...env.variables,
      [name]: { ...(env.variables?.[name] || { value: '', secret: false }), ...patch }
    }
  }));

  const renameVariable = (oldName, newName) => {
    if (oldName === newName) return;
    updateEnvironment((env) => {
      const variables = {};
      for (const [key, value] of Object.entries(env.variables || {})) {
        variables[key === oldName ? newName : key] = value;
      }
      return { ...env, variables };
    });
  };

  const removeVariable = (name) => updateEnvironment((env) => {
    const variables = { ...env.variables };
    delete variables[name];
    return { ...env, variables };
  });

  const addVariable = () => {
    let index = 1;
    while (Object.prototype.hasOwnProperty.call(environment.variables || {}, `variable-${index}`)) index += 1;
    setVariable(`variable-${index}`, { value: '', secret: false });
  };

  const updateEndpointConfig = (patch) => {
    const keys = Object.keys(patch);
    const pathOnly = keys.length === 1 && keys[0] === 'path';

    if (pathOnly) {
      const metadata = config.importMetadata
        ? {
            ...config.importMetadata,
            serverNeedsReview: false,
            serverBaseUrl: '',
            parameterNeedsReview: false,
            unresolvedParameters: []
          }
        : undefined;
      onChangeConfig({ ...config, ...patch, importMetadata: metadata });
      return;
    }

    const {
      expectedStatusCodes,
      expectedStatusReviewRequired,
      importMetadata,
      ...baseConfig
    } = config;
    onChangeConfig({ ...baseConfig, ...patch });
  };

  const handleMethodChange = (method) => {
    updateEndpointConfig({
      method,
      expectedStatus: method === 'POST' ? 201 : 200
    });
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
    <div className="card request-panel">
      <div className="card-header">
        <div className="card-title">
          <Code size={18} />
          <span>Describe the request</span>
        </div>
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

      {/* HTTP Method & Endpoint */}
      <div className="form-group">
        <label className="form-label">Endpoint</label>
        <div className="endpoint-row">
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
                    color: isSelected ? undefined : 'var(--text-muted)',
                    opacity: 1,
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
            className="form-input endpoint-input"
            value={config.path}
            onChange={(e) => updateEndpointConfig({ path: e.target.value })}
            onKeyDown={handleFormKeyDown}
            placeholder="/api/demo/orders or https://api.yoursite.com/orders"
            aria-label="Target Endpoint URL"
            aria-describedby="endpoint-guard-hint"
          />

          <div className="status-field">
            <label className="status-label" htmlFor="expected-status">Success</label>
            <input
              id="expected-status"
              type="number"
              className="form-input status-input"
              value={config.expectedStatus ?? ''}
              onChange={(e) => updateEndpointConfig({ expectedStatus: e.target.value === '' ? '' : Number(e.target.value) })}
              onKeyDown={handleFormKeyDown}
              title="Expected Success Status Code"
              aria-label="Expected Success Status Code"
              aria-describedby="endpoint-guard-hint"
            />
          </div>
        </div>
        <p id="endpoint-guard-hint" className="endpoint-hint">
          Success is the status code that counts as a passing response (usually 200 or 201). Relative{' '}
          <code>/api/demo/...</code> paths run in this app&apos;s sandbox; absolute local, private and cloud-metadata URLs are
          blocked by the SSRF guard.
        </p>
        {Array.isArray(config.expectedStatusCodes) && config.expectedStatusCodes.length > 0 && (
          <p className="form-hint" role="status">
            Imported success responses: {config.expectedStatusCodes.join(', ')}. These are used when generating tests.
          </p>
        )}
        {(config.expectedStatusReviewRequired || config.importMetadata?.serverNeedsReview) && (
          <p className="openapi-review-hint" role="status">
            {config.expectedStatusReviewRequired && !config.expectedStatusCodes?.length
              ? 'The specification does not declare a success response. Confirm the expected status before running tests.'
              : 'Review the imported server URL before running tests.'}
          </p>
        )}
      </div>

      {/* Named environment and its variables */}
      <div className="form-group">
        <label className="form-label" htmlFor="environment-select">Environment</label>
        <select
          id="environment-select"
          className="form-input"
          value={config.environment || environment.name}
          aria-describedby="environment-hint"
          onChange={(e) => onChangeConfig({ ...config, environment: e.target.value })}
        >
          {Object.keys(environments).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <p id="environment-hint" className="form-hint">
          Use <code style={{ fontFamily: 'var(--font-mono)' }}>{'{{baseUrl}}'}</code> and{' '}
          <code style={{ fontFamily: 'var(--font-mono)' }}>{'{{apiKey}}'}</code> in the endpoint, headers, or body.
          Secret values are used at run time and are never saved in the browser.
        </p>
        {resolvedPreview !== (config.path || '') && (
          <p className="form-hint">
            Resolved endpoint: <code style={{ fontFamily: 'var(--font-mono)' }}>{resolvedPreview}</code>
          </p>
        )}
        <details style={{ marginTop: '0.5rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Environment variables
          </summary>
          <div style={{ marginTop: '0.5rem' }}>
            {Object.entries(environment.variables || {}).map(([name, raw], index) => {
              const record = raw && typeof raw === 'object' ? raw : { value: raw, secret: false };
              return (
                <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: '1 1 110px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                    value={name}
                    aria-label={`Variable ${name} name`}
                    onChange={(e) => renameVariable(name, e.target.value)}
                  />
                  <input
                    type={record.secret ? 'password' : 'text'}
                    className="form-input"
                    style={{ flex: '1 1 160px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                    value={record.value ?? ''}
                    placeholder={record.secret ? 'Not saved' : ''}
                    autoComplete="off"
                    aria-label={`Value for ${name}`}
                    onChange={(e) => setVariable(name, { value: e.target.value })}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(record.secret)}
                      aria-label={`Mark ${name} as secret`}
                      onChange={(e) => setVariable(name, { secret: e.target.checked })}
                    />
                    Secret
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                    aria-label={`Remove variable ${name}`}
                    onClick={() => removeVariable(name)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={addVariable}>
              Add variable
            </button>
          </div>
        </details>
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
            : `Generate Test Plan (${isMac ? '⌘+Enter' : 'Ctrl+Enter'})`}
        >
          {loading ? (
            <>
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
              }}>{isMac ? 'Cmd+Enter' : 'Ctrl+Enter'}</kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
