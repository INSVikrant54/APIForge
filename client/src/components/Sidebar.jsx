import React from 'react';
import { FlaskConical, History, BookOpen, Settings, Zap } from 'lucide-react';

export default function Sidebar({
  currentTab,
  onSelectTab,
  recentRunsCount = 0,
  activeModel = ''
}) {
  const navItems = [
    { id: 'lab', label: 'Workspace', icon: FlaskConical },
    { id: 'history', label: 'Recent runs', icon: History, badge: recentRunsCount > 0 ? recentRunsCount : null },
    { id: 'docs', label: 'How it works', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Zap size={16} color="var(--accent-cyan)" aria-hidden="true" />
        <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
          APIForge
        </span>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Sidebar Navigation"
        style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent-border)' : 'transparent',
                background: isActive ? 'var(--accent-surface)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Icon size={16} color={isActive ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  background: 'var(--accent-surface)',
                  color: 'var(--accent-cyan)',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Local workspace</span>
          <span>v1.8.0</span>
        </div>
        {activeModel && (
          <div
            title={activeModel}
            style={{
              marginTop: '0.4rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {activeModel}
          </div>
        )}
      </div>
    </aside>
  );
}
