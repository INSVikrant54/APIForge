import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';
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

  return (
    <div style={{
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
    }}>
      <div style={{
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
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileCode size={20} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Export Regression Test Suite
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Generate reproducible starter test suites for continuous integration
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
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setFormat('jest')}
              className="btn btn-sm"
              style={{
                background: format === 'jest' ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: format === 'jest' ? '#000' : '#94a3b8',
                border: '1px solid var(--border-subtle)'
              }}
            >
              Jest (JavaScript)
            </button>
            <button
              onClick={() => setFormat('pytest')}
              className="btn btn-sm"
              style={{
                background: format === 'pytest' ? 'var(--accent-cyan)' : 'var(--bg-card)',
                color: format === 'pytest' ? '#000' : '#94a3b8',
                border: '1px solid var(--border-subtle)'
              }}
            >
              Pytest (Python)
            </button>
          </div>

          {/* Failures Only Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={failuresOnly}
              onChange={(e) => setFailuresOnly(e.target.checked)}
            />
            <span>Export Verified Failures Only</span>
          </label>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm">
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button onClick={handleDownload} className="btn btn-primary btn-sm">
              <Download size={13} />
              <span>Download {fileName}</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <pre className="code-block" style={{ maxHeight: '420px', fontSize: '0.78rem' }}>
            {generatedCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
