import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, Cpu, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import { verifyApiKeyApi } from '../services/api.js';

const AVAILABLE_MODELS = [
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite — Fastest Response' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash — High-Speed General Model' },
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 (26B-A4B-IT) — High Quality Reasoning' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 (31B-IT) — Largest Reasoning Model' },
  { id: 'custom', name: 'Custom Model ID...' }
];

export default function ApiKeyModal({
  isOpen,
  onClose,
  health,
  aiSettings,
  onSaveSettings
}) {
  const [useServerKey, setUseServerKey] = useState(aiSettings.useServerKey);
  const [customKey, setCustomKey] = useState(aiSettings.customKey || '');
  const [selectedModel, setSelectedModel] = useState(aiSettings.model || 'gemini-3.5-flash-lite');
  const [customModelId, setCustomModelId] = useState(
    !AVAILABLE_MODELS.some(m => m.id === aiSettings.model && m.id !== 'custom')
      ? aiSettings.model
      : ''
  );
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { valid: boolean, message?: string, error?: string, durationMs?: number }
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeModel = selectedModel === 'custom' ? (customModelId.trim() || 'gemini-3.5-flash-lite') : selectedModel;

  const handleTestConnection = async () => {
    setVerifying(true);
    setVerifyResult(null);
    setValidationError(null);

    const keyToTest = useServerKey ? null : customKey;
    if (!useServerKey && (!keyToTest || keyToTest.trim() === '')) {
      setVerifyResult({ valid: false, error: 'Please enter a custom API key before testing.' });
      setVerifying(false);
      return;
    }

    const startTime = performance.now();
    try {
      const res = await verifyApiKeyApi({
        apiKey: keyToTest || 'use-server',
        model: activeModel
      });
      const durationMs = Math.round(performance.now() - startTime);
      setVerifyResult({ ...res, durationMs });
    } catch (err) {
      setVerifyResult({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = () => {
    // P0 Validation: prevent saving empty or malformed custom keys
    if (!useServerKey) {
      const trimmed = customKey.trim();
      if (!trimmed) {
        setValidationError('Please enter a Gemini API key or switch to Default Server Key.');
        return;
      }
      if (trimmed.length < 20) {
        setValidationError('API key appears too short. Standard Google AI Studio keys begin with AIzaSy.');
        return;
      }
    }

    onSaveSettings({
      useServerKey,
      customKey: customKey.trim(),
      model: activeModel
    });
    onClose();
  };

  const handleClearKey = () => {
    setCustomKey('');
    setVerifyResult(null);
    setValidationError(null);
  };

  const handleFormKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(6, 9, 17, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1.5rem'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apiKeyModalTitle"
        aria-describedby="apiKeyModalDescription"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(56, 189, 248, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Key size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 id="apiKeyModalTitle" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                AI Model & API Key Configuration
              </h3>
              <p id="apiKeyModalDescription" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Switch between server defaults and your own Google AI Studio credentials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close API key settings dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Key Mode Selection (Server Key vs BYOK) */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              API Key Source
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.3rem' }}>
              {/* Option 1: Default Server Key */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: useServerKey ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: useServerKey ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="keyMode"
                  checked={useServerKey}
                  onChange={() => {
                    setUseServerKey(true);
                    setVerifyResult(null);
                    setValidationError(null);
                  }}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Default Server Key (.env)</span>
                    <span style={{
                      fontSize: '0.75rem',
                      background: health?.aiConfigured ? 'var(--bg-pass)' : 'rgba(245, 158, 11, 0.15)',
                      color: health?.aiConfigured ? 'var(--color-pass)' : 'var(--color-warn)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 500
                    }}>
                      {health?.aiConfigured ? 'Configured on server' : 'Offline demo mode'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Standard environment credentials. Recommended for hackathon judges and local testing.
                  </div>
                </div>
              </label>

              {/* Option 2: Custom BYOK Key */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: !useServerKey ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                background: !useServerKey ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="keyMode"
                  checked={!useServerKey}
                  onChange={() => {
                    setUseServerKey(false);
                    setVerifyResult(null);
                    setValidationError(null);
                  }}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Custom Gemini API Key (Bring Your Own Key)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Use your personal Google AI Studio key. Stored only in your browser session and never saved on the server.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Custom API Key Input (if custom key selected) */}
          {!useServerKey && (
            <div className="form-group" style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Enter Gemini API Key</label>
                  {customKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Clear stored custom key"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                >
                  <span>Get a free key</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem', fontFamily: 'var(--font-mono)' }}
                  placeholder="AIzaSy..."
                  value={customKey}
                  onKeyDown={handleFormKeyDown}
                  onChange={(e) => {
                    setCustomKey(e.target.value);
                    setVerifyResult(null);
                    setValidationError(null);
                  }}
                  aria-label="Gemini API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShieldCheck size={13} color="var(--color-pass)" />
                <span>Memory-only session storage. Never stored on server disk or committed to Git.</span>
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div style={{
              background: 'var(--bg-fail)',
              border: '1px solid var(--border-fail)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: 'var(--color-fail)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              Target Model
            </label>
            <select
              className="form-select"
              value={AVAILABLE_MODELS.some(m => m.id === selectedModel) ? selectedModel : 'custom'}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setVerifyResult(null);
              }}
              aria-label="Select AI Target Model"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {selectedModel === 'custom' && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                placeholder="e.g. gemma-4-26b-a4b-it, gemini-3.8-flash, gemini-2.5-flash"
                value={customModelId}
                onKeyDown={handleFormKeyDown}
                onChange={(e) => setCustomModelId(e.target.value)}
                aria-label="Custom Model Identifier"
              />
            )}
          </div>

          {/* Verification Result Feedback */}
          {verifyResult && (
            <div style={{
              background: verifyResult.valid ? 'var(--bg-pass)' : 'var(--bg-fail)',
              border: `1px solid ${verifyResult.valid ? 'var(--border-pass)' : 'var(--border-fail)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: verifyResult.valid ? 'var(--color-pass)' : 'var(--color-fail)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {verifyResult.valid ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{verifyResult.valid ? verifyResult.message : verifyResult.error}</span>
              </div>
              {verifyResult.valid && verifyResult.durationMs && (
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', opacity: 0.9 }}>
                  ⚡ {verifyResult.durationMs}ms
                </span>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={verifying}
            className="btn btn-secondary btn-sm"
          >
            {verifying ? (
              <>
                <span className="pulse-dot" style={{ backgroundColor: 'var(--accent-cyan)' }} />
                <span>Testing Key...</span>
              </>
            ) : (
              <>
                <Cpu size={14} color="var(--accent-cyan)" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              title="Save settings (Ctrl+Enter / ⌘+Enter)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>Save Settings</span>
              <kbd style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                padding: '1px 4px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>⌘↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
