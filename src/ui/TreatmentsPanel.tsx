import { useState, useRef, useEffect } from 'react';
import { useStore } from '../state/store';
import type { Treatment, TreatmentType } from '../core/treatments/types';

import { createSilhouette, type SilhouetteParams } from '../core/treatments/silhouette';
import { createDrift, type DriftParams } from '../core/treatments/drift';
import { createSpacing, type SpacingParams } from '../core/treatments/spacing';
import { createScale, type ScaleParams } from '../core/treatments/scale';
import { createRotation, type RotationParams } from '../core/treatments/rotation';
import { createTint, type TintParams } from '../core/treatments/tint';
import { createCharSwap, type CharSwapParams } from '../core/treatments/charSwap';
import { createCharScramble, type CharScrambleParams } from '../core/treatments/charScramble';
import { createCharField, type CharFieldParams } from '../core/treatments/charField';
import {
  DEFAULT_SILHOUETTE_PARAMS,
  DEFAULT_DRIFT_PARAMS,
  DEFAULT_SPACING_PARAMS,
  DEFAULT_SCALE_PARAMS,
  DEFAULT_ROTATION_PARAMS,
  DEFAULT_TINT_PARAMS,
  DEFAULT_CHAR_SWAP_PARAMS,
  DEFAULT_CHAR_SCRAMBLE_PARAMS,
  DEFAULT_CHAR_FIELD_PARAMS,
} from '../core/treatments/defaults';

import { SilhouetteCard } from './SilhouetteCard';
import { DriftCard } from './DriftCard';
import { SpacingCard } from './SpacingCard';
import { ScaleCard } from './ScaleCard';
import { RotationCard } from './RotationCard';
import { TintCard } from './TintCard';
import { CharSwapCard } from './CharSwapCard';
import { CharScrambleCard } from './CharScrambleCard';
import { CharFieldCard } from './CharFieldCard';

const TREATMENT_OPTIONS: Array<{ type: TreatmentType; label: string }> = [
  { type: 'silhouette', label: 'Silhouette' },
  { type: 'drift', label: 'Drift' },
  { type: 'spacing', label: 'Spacing rhythm' },
  { type: 'scale', label: 'Scale' },
  { type: 'rotation', label: 'Rotation' },
  { type: 'tint', label: 'Tint' },
  { type: 'charSwap', label: 'Char: Swap' },
  { type: 'charScramble', label: 'Char: Scramble' },
  { type: 'charField', label: 'Char: Field' },
];

function labelFor(type: TreatmentType): string {
  return TREATMENT_OPTIONS.find((o) => o.type === type)?.label ?? type;
}

function makeTreatment(type: TreatmentType): Treatment & { params: unknown } {
  switch (type) {
    case 'silhouette':   return Object.assign(createSilhouette(DEFAULT_SILHOUETTE_PARAMS),       { params: DEFAULT_SILHOUETTE_PARAMS });
    case 'drift':        return Object.assign(createDrift(DEFAULT_DRIFT_PARAMS),                 { params: DEFAULT_DRIFT_PARAMS });
    case 'spacing':      return Object.assign(createSpacing(DEFAULT_SPACING_PARAMS),             { params: DEFAULT_SPACING_PARAMS });
    case 'scale':        return Object.assign(createScale(DEFAULT_SCALE_PARAMS),                 { params: DEFAULT_SCALE_PARAMS });
    case 'rotation':     return Object.assign(createRotation(DEFAULT_ROTATION_PARAMS),           { params: DEFAULT_ROTATION_PARAMS });
    case 'tint':         return Object.assign(createTint(DEFAULT_TINT_PARAMS),                   { params: DEFAULT_TINT_PARAMS });
    case 'charSwap':     return Object.assign(createCharSwap(DEFAULT_CHAR_SWAP_PARAMS),          { params: DEFAULT_CHAR_SWAP_PARAMS });
    case 'charScramble': return Object.assign(createCharScramble(DEFAULT_CHAR_SCRAMBLE_PARAMS),  { params: DEFAULT_CHAR_SCRAMBLE_PARAMS });
    case 'charField':    return Object.assign(createCharField(DEFAULT_CHAR_FIELD_PARAMS),        { params: DEFAULT_CHAR_FIELD_PARAMS });
  }
}

function renderCard(t: Treatment): React.ReactNode {
  const params = (t as Treatment & { params?: unknown }).params;
  switch (t.type) {
    case 'silhouette':   return <SilhouetteCard   treatment={t} params={params as SilhouetteParams   ?? DEFAULT_SILHOUETTE_PARAMS} />;
    case 'drift':        return <DriftCard        treatment={t} params={params as DriftParams        ?? DEFAULT_DRIFT_PARAMS} />;
    case 'spacing':      return <SpacingCard      treatment={t} params={params as SpacingParams      ?? DEFAULT_SPACING_PARAMS} />;
    case 'scale':        return <ScaleCard        treatment={t} params={params as ScaleParams        ?? DEFAULT_SCALE_PARAMS} />;
    case 'rotation':     return <RotationCard     treatment={t} params={params as RotationParams     ?? DEFAULT_ROTATION_PARAMS} />;
    case 'tint':         return <TintCard         treatment={t} params={params as TintParams         ?? DEFAULT_TINT_PARAMS} />;
    case 'charSwap':     return <CharSwapCard     treatment={t} params={params as CharSwapParams     ?? DEFAULT_CHAR_SWAP_PARAMS} />;
    case 'charScramble': return <CharScrambleCard treatment={t} params={params as CharScrambleParams ?? DEFAULT_CHAR_SCRAMBLE_PARAMS} />;
    case 'charField':    return <CharFieldCard    treatment={t} params={params as CharFieldParams    ?? DEFAULT_CHAR_FIELD_PARAMS} />;
  }
}

export function TreatmentsPanel() {
  const treatments = useStore((s) => s.treatments);
  const addTreatment = useStore((s) => s.addTreatment);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Accordion: only one expanded at a time. When a treatment is added, auto-focus it.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (treatments.length === 0) {
      if (expandedId !== null) setExpandedId(null);
      return;
    }
    // If the expanded one was removed or there's none expanded, focus the last one.
    const stillExists = treatments.some((t) => t.id === expandedId);
    if (!stillExists) setExpandedId(treatments[treatments.length - 1].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatments.length]);

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
    const t = makeTreatment(type);
    addTreatment(t);
    setExpandedId(t.id);
    setMenuOpen(false);
  };

  return (
    <aside className="w-72 border-l border-gray-200 p-4 overflow-y-auto bg-white">
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Treatments</h2>
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

      <div className="space-y-1.5">
        {treatments.length === 0 && (
          <p className="text-xs text-gray-400">No treatments yet. Click + Add to start.</p>
        )}
        {treatments.map((t) => {
          const isExpanded = expandedId === t.id;
          if (isExpanded) {
            return <div key={t.id}>{renderCard(t)}</div>;
          }
          return (
            <button
              key={t.id}
              onClick={() => setExpandedId(t.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              title={`Expand ${labelFor(t.type)}`}
            >
              <span>{labelFor(t.type)}</span>
              <span className="text-gray-300 text-xs">›</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
