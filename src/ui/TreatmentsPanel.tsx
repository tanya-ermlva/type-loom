import { useState, useRef, useEffect } from 'react';
import { useStore } from '../state/store';
import type { Treatment, TreatmentType } from '../core/treatments/types';

import { createSilhouette, type SilhouetteParams } from '../core/treatments/silhouette';
import { createDrift, type DriftParams } from '../core/treatments/drift';
import { createSpacing, type SpacingParams } from '../core/treatments/spacing';
import { createScale, type ScaleParams } from '../core/treatments/scale';
import { createRotation, type RotationParams } from '../core/treatments/rotation';
import { createTint, type TintParams } from '../core/treatments/tint';
import {
  DEFAULT_SILHOUETTE_PARAMS,
  DEFAULT_DRIFT_PARAMS,
  DEFAULT_SPACING_PARAMS,
  DEFAULT_SCALE_PARAMS,
  DEFAULT_ROTATION_PARAMS,
  DEFAULT_TINT_PARAMS,
} from '../core/treatments/defaults';

import { SilhouetteCard } from './SilhouetteCard';
import { DriftCard } from './DriftCard';
import { SpacingCard } from './SpacingCard';
import { ScaleCard } from './ScaleCard';
import { RotationCard } from './RotationCard';
import { TintCard } from './TintCard';

const TREATMENT_OPTIONS: Array<{ type: TreatmentType; label: string }> = [
  { type: 'silhouette', label: 'Silhouette' },
  { type: 'drift', label: 'Drift' },
  { type: 'spacing', label: 'Spacing rhythm' },
  { type: 'scale', label: 'Scale' },
  { type: 'rotation', label: 'Rotation' },
  { type: 'tint', label: 'Tint' },
];

function makeTreatment(type: TreatmentType): Treatment & { params: unknown } {
  switch (type) {
    case 'silhouette': {
      const t = createSilhouette(DEFAULT_SILHOUETTE_PARAMS);
      return Object.assign(t, { params: DEFAULT_SILHOUETTE_PARAMS });
    }
    case 'drift': {
      const t = createDrift(DEFAULT_DRIFT_PARAMS);
      return Object.assign(t, { params: DEFAULT_DRIFT_PARAMS });
    }
    case 'spacing': {
      const t = createSpacing(DEFAULT_SPACING_PARAMS);
      return Object.assign(t, { params: DEFAULT_SPACING_PARAMS });
    }
    case 'scale': {
      const t = createScale(DEFAULT_SCALE_PARAMS);
      return Object.assign(t, { params: DEFAULT_SCALE_PARAMS });
    }
    case 'rotation': {
      const t = createRotation(DEFAULT_ROTATION_PARAMS);
      return Object.assign(t, { params: DEFAULT_ROTATION_PARAMS });
    }
    case 'tint': {
      const t = createTint(DEFAULT_TINT_PARAMS);
      return Object.assign(t, { params: DEFAULT_TINT_PARAMS });
    }
  }
}

export function TreatmentsPanel() {
  const treatments = useStore((s) => s.treatments);
  const addTreatment = useStore((s) => s.addTreatment);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleAdd = (type: TreatmentType) => {
    addTreatment(makeTreatment(type));
    setMenuOpen(false);
  };

  return (
    <aside className="w-72 border-l border-gray-200 p-4 overflow-y-auto bg-white">
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Treatments</h2>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-sm px-2 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            + Add
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-md z-10">
              {TREATMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleAdd(opt.type)}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {treatments.length === 0 && (
          <p className="text-xs text-gray-400">No treatments yet. Click + Add to start.</p>
        )}
        {treatments.map((t) => {
          const params = (t as Treatment & { params?: unknown }).params;
          switch (t.type) {
            case 'silhouette':
              return <SilhouetteCard key={t.id} treatment={t} params={params as SilhouetteParams ?? DEFAULT_SILHOUETTE_PARAMS} />;
            case 'drift':
              return <DriftCard key={t.id} treatment={t} params={params as DriftParams ?? DEFAULT_DRIFT_PARAMS} />;
            case 'spacing':
              return <SpacingCard key={t.id} treatment={t} params={params as SpacingParams ?? DEFAULT_SPACING_PARAMS} />;
            case 'scale':
              return <ScaleCard key={t.id} treatment={t} params={params as ScaleParams ?? DEFAULT_SCALE_PARAMS} />;
            case 'rotation':
              return <RotationCard key={t.id} treatment={t} params={params as RotationParams ?? DEFAULT_ROTATION_PARAMS} />;
            case 'tint':
              return <TintCard key={t.id} treatment={t} params={params as TintParams ?? DEFAULT_TINT_PARAMS} />;
          }
        })}
      </div>
    </aside>
  );
}
