import React, { useRef, useState } from 'react';
import { AlertCircle, FileUp, LoaderCircle } from 'lucide-react';
import { parseOpenApiSpecApi } from '../services/api.js';
import { MAX_BATCH_ENDPOINTS } from '../utils/batchRunner.js';

const MAX_SPEC_BYTES = 1024 * 1024;

function formatOperation(operation) {
  const method = operation.method || 'GET';
  const summary = operation.summary || operation.operationId || 'Untitled operation';
  return { method, summary };
}

export default function OpenApiImportPanel({ onChooseEndpoint, onChooseEndpoints }) {
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [endpoints, setEndpoints] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    setError('');
    setEndpoints([]);
    setSelected([]);
    if (file.size > MAX_SPEC_BYTES) {
      setError('Choose a specification no larger than 1 MiB.');
      event.target.value = '';
      return;
    }
    try {
      setSource(await file.text());
      setFileName(file.name);
    } catch {
      setError('This file could not be read. Try pasting the specification instead.');
    }
  };

  const handleParse = async (event) => {
    event.preventDefault();
    const sourceToParse = source;
    if (new TextEncoder().encode(sourceToParse).byteLength > MAX_SPEC_BYTES) {
      setError('Choose a specification no larger than 1 MiB.');
      setEndpoints([]);
      return;
    }

    setBusy(true);
    setError('');
    setEndpoints([]);
    setSelected([]);
    try {
      const parsed = await parseOpenApiSpecApi(sourceToParse);
      setEndpoints(parsed);
      if (parsed.length === 0) setError('No supported operations were found.');
    } catch (parseError) {
      setError(parseError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card openapi-import-panel" aria-labelledby="openapi-import-title" aria-busy={busy}>
      <div className="card-header">
        <div>
          <h1 id="openapi-import-title" style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
            Import an API specification
          </h1>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Paste or choose an OpenAPI 3.0 or Swagger 2.0 JSON/YAML file. Select one operation to start.
          </p>
        </div>
      </div>

      <form onSubmit={handleParse}>
        <div className="form-group">
          <label className="form-label" htmlFor="openapi-source">Specification</label>
          <textarea
            id="openapi-source"
            className="form-textarea openapi-source"
            disabled={busy}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setFileName('');
              setEndpoints([]);
              setSelected([]);
              setError('');
            }}
            placeholder={'openapi: 3.0.3\ninfo:\n  title: My API\n  version: 1.0.0\npaths: {}'}
            spellCheck="false"
            aria-describedby="openapi-format-help"
          />
          <div className="openapi-source-actions">
            <p id="openapi-format-help" className="form-hint">
              JSON or YAML · Maximum 1 MiB · External references are not fetched
            </p>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              disabled={busy}
              accept=".json,.yaml,.yml,application/json,text/yaml,application/yaml"
              onChange={handleFile}
              aria-label="Choose an OpenAPI or Swagger file"
            />
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              <FileUp size={14} />
              <span>{fileName || 'Choose file'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="openapi-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy || !source.trim()}>
          {busy ? <LoaderCircle size={15} className="openapi-spinner" /> : null}
          <span>{busy ? 'Reading specification…' : 'Read specification'}</span>
        </button>
      </form>

      {endpoints.length > 0 && (
        <section className="openapi-operations" aria-labelledby="openapi-operations-title" aria-live="polite">
          <div className="openapi-operations-heading">
            <h2 id="openapi-operations-title">Choose an operation</h2>
            <span>{endpoints.length} found</span>
          </div>
          <div className="openapi-batch-controls">
            <label>
              <input
                type="checkbox"
                aria-label="Select all operations"
                checked={selected.length === endpoints.length}
                onChange={(event) => setSelected(event.target.checked ? endpoints.map((_, i) => i) : [])}
              />
              <span>Select all for batch</span>
            </label>
            <span>
              {selected.length} selected · up to {MAX_BATCH_ENDPOINTS} · calls run sequentially at 10/min
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={selected.length === 0 || selected.length > MAX_BATCH_ENDPOINTS || !onChooseEndpoints}
              onClick={() => onChooseEndpoints?.(selected.map((i) => endpoints[i]))}
            >
              Run selected batch
            </button>
          </div>
          {endpoints.map((endpoint, index) => {
            const { method, summary } = formatOperation(endpoint);
            const serverNeedsReview = endpoint.serverUrlNeedsReview || !endpoint.serverUrl;
            return (
              <article className="openapi-operation" key={`${method}-${endpoint.path}-${index}`}>
                <div className="openapi-operation-details">
                  <input
                    type="checkbox"
                    aria-label={`Select ${method} ${endpoint.path}`}
                    checked={selected.includes(index)}
                    onChange={(event) => setSelected((previous) => (
                      event.target.checked
                        ? [...previous, index]
                        : previous.filter((i) => i !== index)
                    ))}
                  />
                  <span className={`openapi-method method-${method.toLowerCase()}`}>{method}</span>
                  <code>{endpoint.path}</code>
                  <strong>{summary}</strong>
                  {endpoint.expected?.statusCodes?.length > 0 ? (
                    <span className="openapi-meta">Expected: {endpoint.expected.statusCodes.join(', ')}</span>
                  ) : (
                    <span className="openapi-meta openapi-review">No success status in spec · confirm after import</span>
                  )}
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChooseEndpoint(endpoint)}>
                  Use endpoint
                </button>
                {serverNeedsReview && (
                  <p className="openapi-note">
                    Server URL is missing or needs a variable. You can set the endpoint after importing.
                  </p>
                )}
              </article>
            );
          })}
          <p className="openapi-note">
            Private and local network targets are blocked by APIForge. Use a public HTTP/HTTPS endpoint or the built-in demo.
          </p>
        </section>
      )}
    </section>
  );
}
