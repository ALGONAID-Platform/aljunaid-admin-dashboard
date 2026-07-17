import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

export function useKeyboardShortcut(key: string, ctrlOrCmd: boolean, handler: KeyHandler, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.key.toLowerCase() === key.toLowerCase() && (!ctrlOrCmd || isCtrlOrCmd)) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ctrlOrCmd, handler, enabled]);
}
