import JSZip from 'jszip';
import type { BaseGridConfig } from '../types';
import type { Treatment } from '../treatments/types';
import type { AnimationSpec } from '../animation/types';
import { computeLayout } from '../grid/layout';
import { runPipeline } from '../treatments/pipeline';
import { renderToCanvas } from '../render/canvas';
import { evaluateAnimation } from '../animation/evaluate';
import { recreateTreatment, type TreatmentParams } from '../treatments/factory';

export interface PngSequenceOptions {
  config: BaseGridConfig;
  treatments: Treatment[];
  animations: AnimationSpec[];
  loopDuration: number;
  fps: number;
  /** Optional progress callback: receives (framesRendered, totalFrames). */
  onProgress?: (done: number, total: number) => void;
  filename?: string;
}

/**
 * Render every frame of one full animation loop to PNG, bundle into a zip,
 * trigger download. Renders happen offscreen; the visible canvas is unaffected.
 */
export async function exportPngSequence(opts: PngSequenceOptions): Promise<void> {
  const { config, treatments, animations, loopDuration, fps, onProgress } = opts;
  const filename = opts.filename ?? 'type-loom-sequence.zip';

  const totalFrames = Math.max(1, Math.round(loopDuration * fps));
  const offscreen = document.createElement('canvas');
  offscreen.width = config.canvas.width;
  offscreen.height = config.canvas.height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for offscreen canvas');

  const zip = new JSZip();
  const pad = (n: number) => String(n).padStart(4, '0');

  for (let i = 0; i < totalFrames; i++) {
    const t = totalFrames === 1 ? 0 : (i / totalFrames) * loopDuration;

    // Apply animated values to each treatment's params.
    const animatedTreatments: Treatment[] = treatments.map((tr) => {
      const animsForThis = animations.filter((a) => a.treatmentId === tr.id);
      if (animsForThis.length === 0) return tr;
      const baseParams = (tr as Treatment & { params?: TreatmentParams }).params;
      if (!baseParams) return tr;
      const newParams = { ...baseParams } as Record<string, unknown>;
      for (const anim of animsForThis) {
        newParams[anim.paramKey] = evaluateAnimation(anim, t);
      }
      return recreateTreatment(tr.type, newParams as unknown as TreatmentParams, tr.id, tr.enabled);
    });

    const layoutCells = computeLayout(config);
    const rows = Math.floor(config.canvas.height / config.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runPipeline(layoutCells, animatedTreatments, {
      config, rows, columns, t,
    });

    renderToCanvas(ctx, finalCells, config);

    const blob: Blob = await new Promise((resolve, reject) => {
      offscreen.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
    });
    zip.file(`frame_${pad(i + 1)}.png`, blob);

    onProgress?.(i + 1, totalFrames);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
