import React from 'react';
import { ArrowLeft, Moon, Settings, Sun } from 'lucide-react';

export default function Header({
  health,
  demoMode,
  aiSettings,
  onOpenAiSettings,
  onToggleDemoMode,
  onLoadDemo,
  loading,
  customRequestActive = false,
  importActive = false,
  theme = 'dark',
  onChangeTheme,
  showBack = false,
  onBack,
  targetPath = ''
}) {
  const isVulnerable = demoMode?.mode === 'vulnerable';
  const contextLabel = importActive
    ? 'Importing API specification'
    : customRequestActive
      ? 'Custom API'
      : isVulnerable
        ? 'Demo API'
        : 'Demo API · Safe mode';

  return (
    <header className="top-header">
      <div className="header-context">
        {showBack && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to start</span>
          </button>
        )}
        <div>
          <h2 className="header-title">Test workspace</h2>
          <p className="header-subtitle" title={targetPath ? `${contextLabel} · ${targetPath}` : contextLabel}>
            {targetPath ? `${contextLabel} · ${targetPath}` : contextLabel}
          </p>
        </div>
      </div>

      <div className="header-actions">
        <span
          className="connection-status"
          title={health ? `Connected · ${health.model || 'local API'}` : 'No response from the API server'}
        >
          <span
            className={`status-lamp${health ? (demoMode ? ' status-lamp-demo' : '') : ' status-lamp-offline'}`}
            aria-hidden="true"
          />
          <span className="visually-hidden">
            {health ? 'API server connected.' : 'API server offline.'}
          </span>
          <span aria-hidden="true">{health ? 'Connected' : 'Offline'}</span>
        </span>
        {onChangeTheme && (
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'light'}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="theme-switch"
            onClick={() => onChangeTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        )}
        {!customRequestActive && !importActive && onToggleDemoMode && (
          <button
            type="button"
            role="switch"
            aria-checked={!isVulnerable}
            onClick={() => onToggleDemoMode(isVulnerable ? 'safe' : 'vulnerable')}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            {isVulnerable ? 'Use safe demo' : 'Use vulnerable demo'}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenAiSettings}
          aria-label="Open settings"
          className="btn btn-secondary btn-sm"
          title="AI key, model and request settings"
        >
          <Settings size={14} aria-hidden="true" />
          <span>AI settings</span>
        </button>
      </div>
    </header>
  );
}
