import { useEffect, useRef, useState } from 'react';
import { fetchDemoMode, setDemoMode } from '../services/api.js';

/** Loads and switches the backend demo mode; failures route to the app banner. */
export function useDemoMode(onError) {
  const [demoMode, setDemoModeState] = useState({ mode: 'vulnerable' });
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    fetchDemoMode()
      .then(setDemoModeState)
      .catch(err => console.warn('Could not reach demo mode route:', err.message));
  }, []);

  const handleToggleDemoMode = async (newMode) => {
    try {
      const res = await setDemoMode(newMode);
      setDemoModeState(res);
    } catch (err) {
      onErrorRef.current?.({ message: `Could not switch demo mode: ${err.message}. Check that the API server is running, then try again.` });
    }
  };

  return { demoMode, handleToggleDemoMode };
}
