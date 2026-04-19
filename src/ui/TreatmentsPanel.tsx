import { useStore } from '../state/store';
import { createSilhouette, type SilhouetteParams } from '../core/treatments/silhouette';
import type { Treatment } from '../core/treatments/types';
import { SilhouetteCard } from './SilhouetteCard';

const DEFAULT_SILHOUETTE_PARAMS: SilhouetteParams = {
  shape: 'lens',
  size: 0.7,
  softness: 0.1,
  invert: false,
};

export function TreatmentsPanel() {
  const treatments = useStore((s) => s.treatments);
  const addTreatment = useStore((s) => s.addTreatment);

  const handleAddSilhouette = () => {
    const t = createSilhouette(DEFAULT_SILHOUETTE_PARAMS);
    (t as Treatment & { params: SilhouetteParams }).params = DEFAULT_SILHOUETTE_PARAMS;
    addTreatment(t);
  };

  return (
    <aside className="w-72 border-l border-gray-200 p-4 overflow-y-auto bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Treatments</h2>
        <button
          onClick={handleAddSilhouette}
          className="text-sm px-2 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
        >
          + Add
        </button>
      </div>

      <div className="space-y-3">
        {treatments.length === 0 && (
          <p className="text-xs text-gray-400">No treatments yet. Click + Add to start.</p>
        )}
        {treatments.map((t) => {
          const params = (t as Treatment & { params?: SilhouetteParams }).params ?? DEFAULT_SILHOUETTE_PARAMS;
          if (t.type === 'silhouette') {
            return <SilhouetteCard key={t.id} treatment={t} params={params} />;
          }
          return null;
        })}
      </div>
    </aside>
  );
}
