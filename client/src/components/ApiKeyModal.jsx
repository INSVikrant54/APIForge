import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Check, AlertCircle, Cpu, ExternalLink, ShieldCheck } from 'lucide-react';
import { verifyApiKeyApi } from '../services/api.js';

const AVAILABLE_MODELS = [
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 (26B-A4B-IT) — Default Recommended' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 (31B-IT) — Larger Reasoning Model' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash — High-Speed General Model' },
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
  const [selectedModel, setSelectedModel] = useState(aiSettings.model || 'gemma-4-26b-a4b-it');
  const [customModelId, setCustomModelId] = useState(
    !AVAILABLE_MODELS.some(m => m.id === aiSettings.model && m.id !== 'custom')
      ? aiSettings.model
      : ''
  );
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { valid: boolean, message?: string, error?: string }

  if (!isOpen) return null;

  const activeModel = selectedModel === 'custom' ? (customModelId.trim() || 'gemma-4-26b-a4b-it') : selectedModel;

  const handleTestConnection = async () => {
    setVerifying(true);
    setVerifyResult(null);

    const keyToTest = useServerKey ? null : customKey;
    if (!useServerKey && (!keyToTest || keyToTest.trim() === '')) {
      setVerifyResult({ valid: false, error: 'Please enter a custom API key before testing.' });
      setVerifying(false);
      return;
    }

    try {
      const res = await verifyApiKeyApi({
        apiKey: keyToTest || 'use-server',
        model: activeModel
      });
      setVerifyResult(res);
    } catch (err) {
      setVerifyResult({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      useServerKey,
      customKey: customKey.trim(),
      model: activeModel
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1.5rem'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
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
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Key size={18} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                AI Model & API Key Configuration
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Switch between server defaults and your own Google AI Studio credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Key Mode Selection (Server Key vs BYOK) */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#f8fafc' }}>
              API Key Source
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.3rem' }}>
              {/* Option 1: Default Server Key */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
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
                  }}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Default Server Key (.env)</span>
                    <span style={{
                      fontSize: '0.68rem',
                      background: health?.aiConfigured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: health?.aiConfigured ? '#10b981' : '#f59e0b',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {health?.aiConfigured ? 'Configured on server' : 'Offline demo mode'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
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
                borderRadius: '8px',
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
                  }}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>
                    Custom Gemini API Key (Bring Your Own Key)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Use your personal Google AI Studio key. Stored only in your browser session and never saved on the server.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Custom API Key Input (if custom key selected) */}
          {!useServerKey && (
            <div className="form-group" style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <label className="form-label">Enter Gemini API Key</label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                >
                  <span>Get a free key</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem', fontFamily: 'var(--font-mono)' }}
                  placeholder="AIzaSy..."
                  value={customKey}
                  onChange={(e) => {
                    setCustomKey(e.target.value);
                    setVerifyResult(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={12} color="#10b981" />
                <span>Never stored on server disk or committed to Git.</span>
              </div>
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: '#f8fafc' }}>
              Target Model
            </label>
            <select
              className="form-select"
              value={AVAILABLE_MODELS.some(m => m.id === selectedModel) ? selectedModel : 'custom'}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setVerifyResult(null);
              }}
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
                placeholder="e.g. gemma-4-26b-a4b-it or gemini-3.8-flash"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
              />
            )}
          </div>

          {/* Verification Result Feedback */}
          {verifyResult && (
            <div style={{
              background: verifyResult.valid ? 'var(--bg-pass)' : 'var(--bg-fail)',
              border: `1px solid ${verifyResult.valid ? 'var(--border-pass)' : 'var(--border-fail)'}`,
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: verifyResult.valid ? 'var(--color-pass)' : 'var(--color-fail)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {verifyResult.valid ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{verifyResult.valid ? verifyResult.message : verifyResult.error}</span>
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
                <span className="pulse-dot" style={{ backgroundColor: '#fff' }} />
                <span>Testing Key...</span>
              </>
            ) : (
              <>
                <Cpu size={14} color="#38bdf8" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary btn-sm">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
