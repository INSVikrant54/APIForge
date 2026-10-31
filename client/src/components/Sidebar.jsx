import React from 'react';
import { FlaskConical, History, BookOpen, Settings, Zap } from 'lucide-react';

export default function Sidebar({
  currentTab,
  onSelectTab,
  recentRunsCount = 0,
  activeModel = 'gemini-3.5-flash-lite'
}) {
  const navItems = [
    { id: 'lab', label: 'Test Lab', icon: FlaskConical },
    { id: 'history', label: 'Recent Runs', icon: History, badge: recentRunsCount > 0 ? recentRunsCount : null },
    { id: 'docs', label: 'Documentation', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const engineName = activeModel.startsWith('gemma')
    ? 'Gemma 4'
    : activeModel.startsWith('gemini')
      ? 'Gemini 3.5'
      : 'BYOK Custom';

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
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(56, 189, 248, 0.25)'
        }}>
          <Zap size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            API<span style={{ color: 'var(--accent-cyan)' }}>Forge</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-2px' }}>
            Behavior Verification
          </p>
        </div>
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
                borderColor: isActive ? 'var(--border-active)' : 'transparent',
                background: isActive ? 'var(--bg-card)' : 'transparent',
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
                  background: 'rgba(56, 189, 248, 0.15)',
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

      {/* Footer info */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.55rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-warn)', fontWeight: 600, fontSize: '0.75rem' }}>
            <span>🏆</span>
            <span>Hacktoberfest Track Winner</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
            Best Use of Gemma 4
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>AI Engine</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{engineName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Version</span>
          <span style={{ color: 'var(--text-muted)' }}>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
