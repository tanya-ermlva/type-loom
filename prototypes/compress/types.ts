// All falloff names map to functions in compress.ts → falloff().
// "Falloff" is the curve describing how a field's force fades from full
// strength at the field center (d=0) down to zero at the field edge (d=1).
// Same family of curves as CSS easings — just used for distance, not time.
export type FalloffKind =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'gaussian'
  | 'constant';

export type Alignment = 'left' | 'center' | 'right';

export interface Field {
  id: string;
  /** Geometric center of the ellipse SHAPE in canvas px. Defines the
   *  "zone of influence" — letters outside the ellipse don't feel force. */
  cx: number;
  cy: number;
  /** Radii in canvas px (half-width / half-height of the shape ellipse). */
  sx: number;
  sy: number;
  /** Force center: where falloff peaks at d=0 (max force). Decoupled from
   *  the shape center so the user can offset the "hot spot" of the field
   *  inside the shape. Constrained to stay inside the shape ellipse. */
  fx: number;
  fy: number;
  /** Signed pixel displacement applied to a letter sitting at the force
   *  center after falloff = 1. Positive = attraction (letter pulled toward
   *  fx,fy). Negative = repulsion (pushed away). */
  strength: number;
  /** Animation target for the force center. When playback is running, the
   *  effective force center pings between (fx,fy) and (targetFx,targetFy)
   *  over loopDuration. If equal to (fx,fy), the field is effectively static. */
  targetFx: number;
  targetFy: number;
}

export interface GlobalParams {
  /** Word that gets repeated to fill `charCount` slots per row. */
  word: string;
  /** Number of letter slots per row at zero force. */
  charCount: number;
  /** Number of rows in the grid (vertical resolution). */
  rowCount: number;
  /** Approximate letter rendered size in px. */
  letterSize: number;
  /** Hard minimum gap between adjacent letter centers (px). When the
   *  solver can't keep this constraint, it drops letters from the row. */
  minDistance: number;
  /** Space between row baselines (px). */
  rowSpacing: number;
  /** Space between adjacent letter centers when no field acts (px). */
  columnSpacing: number;
  alignment: Alignment;
  /** Number of rows from top/bottom that are fully pinned (no displacement
   *  regardless of field strength). */
  edgeRowsLocked: number;
  /** Rows past the locked band that ramp from 0 → 1 movability. */
  edgeFalloffRows: number;
  /** Falloff curve shared by every field (global, not per-field). */
  falloff: FalloffKind;
  /** How far (px) cascade can push a letter from its desired position
   *  before that letter is dropped instead of pushed further. Smaller
   *  values → more drops (chain breaks early). Larger values → longer
   *  cascade chains, fewer drops. Effectively "cascade tolerance". */
  dropTolerance: number;
  /** Seconds for one full animation cycle (ping-pong of force centers). */
  loopDuration: number;
  /** Show colored gooey blob behind each word. */
  wordBackgrounds: boolean;
  /** Blob size in px (footprint per letter — overlapping footprints merge
   *  via the gooey filter into a single blob). */
  wordBlobSize: number;
  /** Gaussian blur radius for the gooey merge (px). Higher = smoother,
   *  more "wet ink" feel. */
  wordBlobBlur: number;
  /** Wobble amount: how much the turbulence noise displaces blob edges.
   *  0 = clean rounded rect. Higher = more organic, hand-drawn feel. */
  wordBlobWobble: number;
  /** Per-word colors. Indexed by word position in the input string.
   *  Auto-extended with palette defaults when the user adds words; existing
   *  entries are preserved when the word string changes. */
  wordColors: string[];
  /** Canvas background color (hex). Independent of the palette presets —
   *  user can pick any color via the color picker or hex input. */
  backgroundColor: string;
  /** Canvas aspect / dimensions preset. Drives SVG viewBox + export size. */
  canvasFormat: 'a4' | '16:9';
}

export interface Letter {
  /** The character to draw. */
  char: string;
  /** Final x in canvas px after force + edge envelope + cascade clamp. */
  x: number;
  /** y is fixed at row baseline (1D-only physics for v1). */
  y: number;
  /** Identifies which word instance this letter belongs to. Letters
   *  sharing the same key are part of the same word in the same row +
   *  cycle, and get merged into a single colored blob during render.
   *  null = not part of a word (space character). */
  wordKey: string | null;
  /** Index of the word in the original word list (for stable color
   *  assignment — every "DIGITAL" gets the same color regardless of
   *  which row/cycle it appears in). null for spaces. */
  wordIdx: number | null;
}

export type Row = Letter[];
