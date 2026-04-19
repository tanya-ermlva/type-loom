import { useEffect } from 'react';

interface ShortcutHandlers {
  onPlayPause?: () => void;
  onRandomize?: () => void;
  onEscape?: () => void;
}

/**
 * Bind global keyboard shortcuts.
 *
 * - Space: play/pause (skipped while focus is in an input/textarea/select)
 * - R / r: randomize palette (skipped while typing)
 * - Escape: dispatched to onEscape handler if any (always fires, even from inputs)
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onRandomize,
  onEscape,
}: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable = !!target?.closest?.('input, textarea, select, [contenteditable="true"]');

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Other shortcuts skip when typing in an editable.
      if (inEditable) return;

      if (e.key === ' ' && onPlayPause) {
        e.preventDefault();
        onPlayPause();
      } else if ((e.key === 'r' || e.key === 'R') && onRandomize) {
        e.preventDefault();
        onRandomize();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPlayPause, onRandomize, onEscape]);
}
