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
    const t: Treatment = { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c };
    useStore.getState().addTreatment(t);
    expect(useStore.getState().treatments).toHaveLength(1);
    expect(useStore.getState().treatments[0].id).toBe('x');
  });

  it('removeTreatment removes by id', () => {
    const t: Treatment = { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c };
    useStore.getState().addTreatment(t);
    useStore.getState().removeTreatment('x');
    expect(useStore.getState().treatments).toHaveLength(0);
  });

  it('updateTreatment replaces a treatment by id', () => {
    const t: Treatment = { id: 'x', type: 'silhouette', enabled: true, apply: (c: Cell) => c };
    useStore.getState().addTreatment(t);
    const t2: Treatment = { ...t, enabled: false };
    useStore.getState().updateTreatment('x', t2);
    expect(useStore.getState().treatments[0].enabled).toBe(false);
  });
});
