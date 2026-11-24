import React from 'react';
import { BookOpen } from 'lucide-react';

export default function DocsView() {
  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">
          <BookOpen size={18} color="var(--accent-cyan)" />
          <span>How it works</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '0.95rem', margin: 0, marginBottom: '0.3rem' }}>Verify an API</h3>
          <p style={{ lineHeight: 1.6 }}>
            Describe the endpoint and expected behavior. APIForge prepares test cases, sends them to the API, and records each pass or failure.
          </p>
        </div>

        <div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '0.95rem', margin: 0, marginBottom: '0.5rem' }}>Test coverage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              ['Happy path', 'Normal requests and expected responses'],
              ['Missing fields', 'Required values omitted'],
              ['Type validation', 'Unexpected value types'],
              ['Boundary values', 'Zero, negative, and limits'],
              ['Business rules', 'Your plain-language requirements'],
              ['Malformed input', 'Invalid or unexpected payloads'],
              ['Inconsistent data', 'The same input behaving differently between requests']
            ].map(([title, description]) => (
              <div key={title} style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-main)' }}>{title}: </strong>{description}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '0.95rem', margin: 0, marginBottom: '0.3rem' }}>Built-in demo</h3>
          <p style={{ lineHeight: 1.6 }}>
            The local orders API has two modes:
          </p>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 1.7 }}>
            <li><strong style={{ color: 'var(--text-main)' }}>Vulnerable:</strong> accepts negative quantities so APIForge can find a verified defect.</li>
            <li><strong style={{ color: 'var(--text-main)' }}>Safe:</strong> rejects invalid quantities with a 400 response.</li>
          </ul>
        </div>

        <div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '0.95rem', margin: 0, marginBottom: '0.3rem' }}>Where AI is used</h3>
          <p style={{ lineHeight: 1.6 }}>
            AI prepares test cases and optional failure explanations. Each pass or fail result comes from a real HTTP response and the assertion engine.
          </p>
        </div>
      </div>
    </div>
  );
}
