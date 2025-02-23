import { useEffect, useCallback } from 'react';

type HotkeyCallback = (e: KeyboardEvent) => void;

export function useHotkeys(key: string, callback: HotkeyCallback) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    if (key === 'cmd+k' && cmdKey && e.key.toLowerCase() === 'k') {
      callback(e);
    } else if (key === 'esc' && e.key === 'Escape') {
      callback(e);
    }
  }, [key, callback]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
} 