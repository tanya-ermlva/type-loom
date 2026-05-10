/**
 * ExportContext — generic bridge between the App (which knows how to drive
 * the animation per-frame and capture an SVG) and the Sidebar (which renders
 * the Export UI and runs the capture loop).
 *
 * The interface is intentionally generic so Pulse and Stack can plug in
 * different per-frame logic:
 *   • Pulse   — prepareFrame sets Atom.tOverride; getSvg returns the live <svg>.
 *   • Stack   — prepareFrame sets exportFrame; getSvg builds a composite of all
 *               visible atoms into one big <svg>.
 */
import { createContext, useContext } from 'react';

export interface ExportContextValue {
  /** Set state for the given frame so the next paint reflects it. */
  prepareFrame: (frameIdx: number, fps: number) => void;
  /** Reset any export-only state (called once before/after the loop). */
  finishExport: () => void;
  /** Return the SVG to capture for the current frame. May build a composite. */
  getSvg: () => SVGSVGElement | null;
}

export const ExportContext = createContext<ExportContextValue | null>(null);

export function useExportContext(): ExportContextValue | null {
  return useContext(ExportContext);
}
