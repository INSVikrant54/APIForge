import React, { useRef, useState } from 'react';
import { AlertCircle, FileUp, LoaderCircle } from 'lucide-react';
import { parsePostmanCollection, MAX_POSTMAN_ITEMS } from '../../../server/utils/postmanParser.js';

const MAX_COLLECTION_BYTES = 1024 * 1024;

export default function PostmanImportPanel({ onChooseRequest }) {
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    setError('');
    setRequests([]);
    if (file.size > MAX_COLLECTION_BYTES) {
      setError('Choose a collection no larger than 1 MiB.');
      event.target.value = '';
      return;
    }
    try {
      setSource(await file.text());
      setFileName(file.name);
    } catch {
      setError('This file could not be read. Try pasting the collection instead.');
    }
  };

  const handleParse = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setRequests([]);
    try {
      const parsed = parsePostmanCollection(source);
      setRequests(parsed);
    } catch (parseError) {
      setError(parseError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card openapi-import-panel" aria-labelledby="postman-import-title" aria-busy={busy}>
      <div className="card-header">
        <div>
          <h1 id="postman-import-title" style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
            Import a Postman collection
          </h1>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Paste or choose a Collection v2.1 JSON file. Select one request to start. Scripts are never run.
          </p>
        </div>
      </div>

      <form onSubmit={handleParse}>
        <div className="form-group">
          <label className="form-label" htmlFor="postman-source">Collection JSON</label>
          <textarea
            id="postman-source"
            className="form-textarea openapi-source"
            disabled={busy}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setFileName('');
              setRequests([]);
              setError('');
            }}
            placeholder={'{\n  "info": { "name": "My API", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },\n  "item": []\n}'}
            spellCheck="false"
            aria-describedby="postman-format-help"
          />
          <div className="openapi-source-actions">
            <p id="postman-format-help" className="form-hint">
              Collection v2.1 only · Maximum {MAX_POSTMAN_ITEMS} requests · Maximum 1 MiB
            </p>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              disabled={busy}
              accept=".json,application/json"
              onChange={handleFile}
              aria-label="Choose a Postman collection file"
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
          <span>{busy ? 'Reading collection…' : 'Read collection'}</span>
        </button>
      </form>

      {requests.length > 0 && (
        <section className="openapi-operations" aria-labelledby="postman-requests-title" aria-live="polite">
          <div className="openapi-operations-heading">
            <h2 id="postman-requests-title">Choose a request</h2>
            <span>{requests.length} found</span>
          </div>
          {requests.map((request, index) => (
            <article className="openapi-operation" key={`${request.method}-${request.path}-${index}`}>
              <div className="openapi-operation-details">
                <span className={`openapi-method method-${request.method.toLowerCase()}`}>{request.method}</span>
                <code>{request.path}</code>
                <strong>{request.summary}</strong>
                <span className="openapi-meta openapi-review">Review the target and body after import</span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChooseRequest(request)}>
                Use request
              </button>
            </article>
          ))}
          <p className="openapi-note">
            Variables like {'{{baseUrl}}'} stay as placeholders. Set matching environment variables on the Settings tab
            before running. Private and local network targets are blocked by APIForge.
          </p>
        </section>
      )}
    </section>
  );
}
