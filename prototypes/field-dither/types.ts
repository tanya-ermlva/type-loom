// All falloff names map to functions in dither.ts → falloff().
export type FalloffKind =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'gaussian'
  | 'constant';

export type DitherAlgo =
  | 'floyd-steinberg'
  | 'atkinson'
  | 'sierra-2'
  | 'bayer-4'
  | 'bayer-8'
  | 'threshold';

export interface Field {
  id: string;
  /** Geometric center of the ellipse SHAPE in canvas px. */
  cx: number;
  cy: number;
  /** Radii in canvas px. */
  sx: number;
  sy: number;
  /** Force center: where falloff peaks. Decoupled from shape center. */
  fx: number;
  fy: number;
  /** Signed contribution to local intensity at force center (falloff = 1).
   *  Positive → bumps density up (more letters present). Negative → carves
   *  density down (fewer letters / void). Sums linearly across fields. */
  strength: number;
}

export interface GlobalParams {
  word: string;
  charCount: number;
  rowCount: number;
  letterSize: number;
  rowSpacing: number;
  columnSpacing: number;
  /** Default density everywhere when no field touches a cell. 0 = empty
   *  by default (only attraction adds letters), 1 = full by default
   *  (only repulsion can carve voids). */
  baseDensity: number;
  /** Threshold against which the dithered intensity is compared. Letters
   *  appear only where (intensity + diffused_error) > threshold. */
  threshold: number;
  /** Which dithering algorithm decides per-cell letter presence. */
  ditherAlgo: DitherAlgo;
  /** Falloff curve shared by every field. */
  falloff: FalloffKind;
  /** Canvas hex background. */
  backgroundColor: string;
  /** Hex letter color. Letters always render in this color. */
  letterColor: string;
}

export interface Cell {
  /** Grid index (0..rowCount-1, 0..charCount-1). */
  r: number;
  c: number;
  /** Pixel position on canvas. */
  x: number;
  y: number;
  /** Character to draw (cycled from `params.word`, ignoring whitespace). */
  char: string;
  /** True if dither said this cell renders a letter. */
  on: boolean;
  /** Raw intensity 0..1 used for the dither (for debug overlay). */
  intensity: number;
}
