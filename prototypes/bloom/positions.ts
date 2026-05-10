/**
 * DFD logo grid — 56 dot positions extracted from
 * concept2/logo-wireframe-by-hand.svg.
 *
 * Coordinates are in the source SVG's 1920×1080 viewBox; the bloom-stack
 * canvas reuses the same viewBox so atoms render at literal (cx, cy).
 * Sorted by letter, then by row (cy), then by column (cx).
 */

export type Letter = 'D1' | 'F' | 'D2';

export interface DotPosition {
  /** Centre X in the 0..1920 viewBox. */
  cx: number;
  /** Centre Y in the 0..1080 viewBox. */
  cy: number;
  /** Source-SVG radius (purely informational; the atom decides its own radius). */
  r: number;
  /** Which letter this dot belongs to, for per-letter palette overrides later. */
  letter: Letter;
}

export const DFD_VIEWBOX = { width: 1920, height: 1080 } as const;

export const DFD_POSITIONS: readonly DotPosition[] = [
  { cx: 439.041, cy: 297.316, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 297.316, r: 36.0117, letter: 'D1' },
  { cx: 245.652, cy: 392.668, r: 36.0117, letter: 'D1' },
  { cx: 342.094, cy: 392.668, r: 36.0117, letter: 'D1' },
  { cx: 439.041, cy: 392.668, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 392.668, r: 36.0117, letter: 'D1' },
  { cx: 149.211, cy: 488.02, r: 36.0117, letter: 'D1' },
  { cx: 439.041, cy: 488.02, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 488.02, r: 36.0117, letter: 'D1' },
  { cx: 149.211, cy: 583.371, r: 36.0117, letter: 'D1' },
  { cx: 439.041, cy: 583.371, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 583.371, r: 36.0117, letter: 'D1' },
  { cx: 149.211, cy: 678.723, r: 36.0117, letter: 'D1' },
  { cx: 245.652, cy: 678.723, r: 36.0117, letter: 'D1' },
  { cx: 439.041, cy: 678.723, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 678.723, r: 36.0117, letter: 'D1' },
  { cx: 245.652, cy: 777.48, r: 36.0117, letter: 'D1' },
  { cx: 342.094, cy: 777.48, r: 36.0117, letter: 'D1' },
  { cx: 535.482, cy: 777.48, r: 36.0117, letter: 'D1' },
  { cx: 1635.96, cy: 297.316, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 297.316, r: 36.0117, letter: 'D2' },
  { cx: 1442.58, cy: 392.668, r: 36.0117, letter: 'D2' },
  { cx: 1539.02, cy: 392.668, r: 36.0117, letter: 'D2' },
  { cx: 1635.96, cy: 392.668, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 392.668, r: 36.0117, letter: 'D2' },
  { cx: 1346.13, cy: 488.02, r: 36.0117, letter: 'D2' },
  { cx: 1635.96, cy: 488.02, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 488.02, r: 36.0117, letter: 'D2' },
  { cx: 1346.13, cy: 583.371, r: 36.0117, letter: 'D2' },
  { cx: 1635.96, cy: 583.371, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 583.371, r: 36.0117, letter: 'D2' },
  { cx: 1346.13, cy: 678.723, r: 36.0117, letter: 'D2' },
  { cx: 1442.58, cy: 678.723, r: 36.0117, letter: 'D2' },
  { cx: 1635.96, cy: 678.723, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 678.723, r: 36.0117, letter: 'D2' },
  { cx: 1442.58, cy: 777.48, r: 36.0117, letter: 'D2' },
  { cx: 1539.02, cy: 777.48, r: 36.0117, letter: 'D2' },
  { cx: 1732.41, cy: 777.48, r: 36.0117, letter: 'D2' },
  { cx: 962.094, cy: 297.316, r: 36.0117, letter: 'F' },
  { cx: 1058.54, cy: 297.316, r: 36.0117, letter: 'F' },
  { cx: 1155.48, cy: 297.316, r: 36.0117, letter: 'F' },
  { cx: 865.146, cy: 392.668, r: 36.0117, letter: 'F' },
  { cx: 962.094, cy: 392.668, r: 36.0117, letter: 'F' },
  { cx: 768.705, cy: 488.02, r: 36.0117, letter: 'F' },
  { cx: 865.146, cy: 488.02, r: 36.0117, letter: 'F' },
  { cx: 962.094, cy: 488.02, r: 36.0117, letter: 'F' },
  { cx: 1058.61, cy: 488.02, r: 36.0117, letter: 'F' },
  { cx: 1155.56, cy: 488.02, r: 36.0117, letter: 'F' },
  { cx: 865.146, cy: 583.371, r: 36.0117, letter: 'F' },
  { cx: 962.094, cy: 583.371, r: 36.0117, letter: 'F' },
  { cx: 865.146, cy: 678.723, r: 36.0117, letter: 'F' },
  { cx: 962.094, cy: 678.723, r: 36.0117, letter: 'F' },
  { cx: 771.518, cy: 777.48, r: 36.0117, letter: 'F' },
  { cx: 865.146, cy: 777.48, r: 36.0117, letter: 'F' },
  { cx: 962.094, cy: 777.48, r: 36.0117, letter: 'F' },
  { cx: 1060.02, cy: 777.48, r: 36.0117, letter: 'F' },
];

