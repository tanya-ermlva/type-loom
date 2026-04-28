import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';
import { DEFAULT_BASE_CONFIG, type Cell } from '../core/types';
import type { Treatment } from '../core/treatments/types';

describe('store', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('initializes with default base config and no treatments', () => {
    const s = useStore.getState();
    expect(s.config).toEqual(DEFAULT_BASE_CONFIG);
    expect(s.treatments).toEqual([]);
  });

  it('updateConfig merges partial updates', () => {
    useStore.getState().updateConfig({ charSize: 60 });
    expect(useStore.getState().config.charSize).toBe(60);
    expect(useStore.getState().config.input).toBe(DEFAULT_BASE_CONFIG.input);
  });

  it('addTreatment appends a treatment', () => {
    // params is required for snapshot/serialization (and history capture).
    const t: Treatment = Object.assign(
      { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c } as Treatment,
      { params: { shape: 'lens', size: 0.7, softness: 0.1, invert: false, blendMode: 'intersect' } },
    );
    useStore.getState().addTreatment(t);
    expect(useStore.getState().treatments).toHaveLength(1);
    expect(useStore.getState().treatments[0].id).toBe('x');
  });

  it('removeTreatment removes by id', () => {
    // params is required for snapshot/serialization (and history capture).
    const t: Treatment = Object.assign(
      { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c } as Treatment,
      { params: { shape: 'lens', size: 0.7, softness: 0.1, invert: false, blendMode: 'intersect' } },
    );
    useStore.getState().addTreatment(t);
    useStore.getState().removeTreatment('x');
    expect(useStore.getState().treatments).toHaveLength(0);
  });

  it('updateTreatment replaces a treatment by id', () => {
    // params is required for snapshot/serialization (and history capture).
    const t: Treatment = Object.assign(
      { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c } as Treatment,
      { params: { shape: 'lens', size: 0.7, softness: 0.1, invert: false, blendMode: 'intersect' } },
    );
    useStore.getState().addTreatment(t);
    const t2: Treatment = { ...t, enabled: false };
    useStore.getState().updateTreatment('x', t2);
    expect(useStore.getState().treatments[0].enabled).toBe(false);
  });

  describe('undo / redo', () => {
    it('undo restores prior config value', () => {
      useStore.getState().updateConfig({ charSize: 60 });
      expect(useStore.getState().config.charSize).toBe(60);
      const undone = useStore.getState().undo();
      expect(undone).toBe(true);
      expect(useStore.getState().config.charSize).toBe(DEFAULT_BASE_CONFIG.charSize);
    });

    it('redo re-applies the undone change', () => {
      useStore.getState().updateConfig({ charSize: 60 });
      useStore.getState().undo();
      const redone = useStore.getState().redo();
      expect(redone).toBe(true);
      expect(useStore.getState().config.charSize).toBe(60);
    });

    it('undo on empty history returns false', () => {
      expect(useStore.getState().undo()).toBe(false);
    });

    it('any new mutation clears the redo stack', () => {
      useStore.getState().updateConfig({ charSize: 60 });
      useStore.getState().undo();
      expect(useStore.getState().canRedo()).toBe(true);
      useStore.getState().updateConfig({ rowSpacing: 80 });
      expect(useStore.getState().canRedo()).toBe(false);
    });
  });
});
