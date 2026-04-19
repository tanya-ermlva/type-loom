import { useEffect } from 'react';
import { useStore } from '../state/store';
import { makeSnapshot } from '../core/persistence/serialize';
import { saveDraft } from '../core/persistence/storage';

/**
 * Periodically (debounced) snapshot the current editor state to
 * localStorage's draft slot, so a refresh / crash can restore it.
 *
 * We listen to changes on the relevant state slices and write 800ms
 * after the last change.
 */
export function useAutoSaveDraft(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useStore.subscribe((state, prev) => {
      // Only snapshot when one of the persisted-state slices changed.
      if (
        state.config === prev.config &&
        state.treatments === prev.treatments &&
        state.animations === prev.animations &&
        state.loopDuration === prev.loopDuration &&
        state.showMaskOverlays === prev.showMaskOverlays
      ) {
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        saveDraft(makeSnapshot(state));
      }, 800);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
