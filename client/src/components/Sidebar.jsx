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
      <div className="brand">
        <Zap size={16} color="var(--accent-text)" aria-hidden="true" />
        <span className="brand-name">APIForge</span>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Sidebar Navigation" className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="nav-item"
            >
              <span className="nav-item-inner">
                <Icon className="nav-icon" size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span>Local workspace</span>
          <span>v2.0.0</span>
        </div>
        {activeModel && (
          <div className="sidebar-model" title={activeModel}>
            {activeModel}
          </div>
        )}
      </div>
    </aside>
  );
}
