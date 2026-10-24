import React from 'react';
import { FlaskConical, History, BookOpen, Settings, Zap, Github } from 'lucide-react';

export default function Sidebar({ currentTab, onSelectTab, recentRunsCount = 0 }) {
  const navItems = [
    { id: 'lab', label: 'Test Lab', icon: FlaskConical },
    { id: 'history', label: 'Recent Runs', icon: History, badge: recentRunsCount > 0 ? recentRunsCount : null },
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(56, 189, 248, 0.3)'
        }}>
          <Zap size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            API<span style={{ color: '#38bdf8' }}>Forge</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '-2px' }}>
            Behavior Verification
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-active)' : 'transparent',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Icon size={16} color={isActive ? '#38bdf8' : '#64748b'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.72rem',
        color: '#64748b',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>AI Engine</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Gemma 4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Version</span>
          <span style={{ color: '#94a3b8' }}>v1.0.0 (Hackathon)</span>
        </div>
      </div>
    </aside>
  );
}
