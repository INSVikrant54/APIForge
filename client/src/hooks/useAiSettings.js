import { useState } from 'react';

const STORAGE_KEY_AI_SETTINGS = 'apiforge_ai_settings_v1';

/**
 * BYOK / model settings. Secrets are kept in React state and sessionStorage
 * only; any legacy localStorage copy is purged on load and on save.
 */
export function useAiSettings() {
  const [aiSettings, setAiSettings] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_AI_SETTINGS) || localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
      if (localStorage.getItem(STORAGE_KEY_AI_SETTINGS)) {
        localStorage.removeItem(STORAGE_KEY_AI_SETTINGS); // Purge from permanent disk
      }
      return saved ? JSON.parse(saved) : { useServerKey: true, customKey: '', model: 'gemini-3.5-flash-lite' };
    } catch {
      return { useServerKey: true, customKey: '', model: 'gemini-3.5-flash-lite' };
    }
  });
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  const handleSaveAiSettings = (newSettings) => {
    setAiSettings(newSettings);
    try {
      sessionStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(newSettings));
      localStorage.removeItem(STORAGE_KEY_AI_SETTINGS); // Ensure zero disk persistence
    } catch {
      // Ignore storage errors
    }
  };

  return { aiSettings, apiKeyModalOpen, setApiKeyModalOpen, handleSaveAiSettings };
}
