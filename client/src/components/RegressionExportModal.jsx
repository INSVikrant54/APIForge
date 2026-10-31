import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, FileCode } from 'lucide-react';
import { generateJestSuite } from '../utils/exportJest.js';
import { generatePytestSuite } from '../utils/exportPytest.js';

export default function RegressionExportModal({
  testSuite,
  results,
  onClose
}) {
  const [format, setFormat] = useState('jest'); // 'jest' | 'pytest'
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!testSuite) return null;

  // Filter if failures only requested
  const filteredSuite = failuresOnly
    ? {
        ...testSuite,
        tests: testSuite.tests.filter(t => {
          const res = results?.find(r => r.id === t.id);
          return res?.status === 'FAIL';
        })
      }
    : testSuite;

  const generatedCode = format === 'jest'
    ? generateJestSuite(filteredSuite, results)
    : generatePytestSuite(filteredSuite, results);

  const fileName = format === 'jest' ? 'api_regression.test.js' : 'test_api_regression.py';

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="regression-export-title"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileCode size={20} color="var(--accent-cyan)" />
            <div>
              <h3 id="regression-export-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Export Regression Test Suite
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Generate reproducible starter test suites for continuous integration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar */}
        <div style={{
          padding: '0.9rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }}>
          {/* Format Toggle */}
          <div role="tablist" aria-label="Export format selection" style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              role="tab"
              aria-selected={format === 'jest'}
              onClick={() => setFormat('jest')}
              className="btn btn-sm"
              style={{
                background: format === 'jest' ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: format === 'jest' ? '#000' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                fontWeight: format === 'jest' ? 600 : 500
              }}
            >
              Jest (JavaScript)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={format === 'pytest'}
              onClick={() => setFormat('pytest')}
              className="btn btn-sm"
              style={{
                background: format === 'pytest' ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: format === 'pytest' ? '#000' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                fontWeight: format === 'pytest' ? 600 : 500
              }}
            >
              Pytest (Python)
            </button>
          </div>

          {/* Failures Only Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={failuresOnly}
              onChange={(e) => setFailuresOnly(e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <span>Export Verified Failures Only</span>
          </label>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleCopy} className="btn btn-secondary btn-sm">
              {copied ? <Check size={13} color="var(--color-pass)" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button type="button" onClick={handleDownload} className="btn btn-primary btn-sm">
              <Download size={13} />
              <span>Download {fileName}</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <pre
            tabIndex={0}
            role="region"
            aria-label="Generated regression code preview"
            className="code-block"
            style={{ maxHeight: '420px', fontSize: '0.78rem', overflowX: 'auto', overflowY: 'auto' }}
          >
            {generatedCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
