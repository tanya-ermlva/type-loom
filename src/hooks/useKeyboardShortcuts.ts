import { useEffect } from 'react';

interface ShortcutHandlers {
  onPlayPause?: () => void;
  onRandomize?: () => void;
  onEscape?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
}

/**
 * Bind global keyboard shortcuts.
 *
 * - Space: play/pause (skipped while focus is in an input/textarea/select)
 * - R / r: randomize palette (skipped while typing)
 * - Escape: dispatched to onEscape handler (always fires, even from inputs)
 * - ⌘Z / Ctrl+Z: undo (always fires — undo even works mid-typing in an input)
 * - ⌘⇧Z / Ctrl+⇧Z (or ⌘Y / Ctrl+Y): redo
 * - ⌘S / Ctrl+S: save current project
 */
export function useKeyboardShortcuts({
  onPlayPause,
  onRandomize,
  onEscape,
  onUndo,
  onRedo,
  onSave,
}: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable = !!target?.closest?.('input, textarea, select, [contenteditable="true"]');
      const mod = e.metaKey || e.ctrlKey; // ⌘ on macOS, Ctrl elsewhere

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Cmd/Ctrl+S — save. Always preventDefault so the browser doesn't open
      // its "Save Page" dialog.
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }

      // Cmd/Ctrl+Z — undo, Cmd/Ctrl+Shift+Z (or Cmd/Ctrl+Y) — redo.
      // We let undo/redo fire even when an input is focused so users can
      // back out of a slider drag without first clicking elsewhere.
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          if (onRedo) onRedo();
        } else {
          if (onUndo) onUndo();
        }
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (onRedo) onRedo();
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
  }, [onPlayPause, onRandomize, onEscape, onUndo, onRedo, onSave]);
}
