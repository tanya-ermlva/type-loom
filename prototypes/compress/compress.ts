import type {
  Alignment,
  FalloffKind,
  Field,
  GlobalParams,
  Row,
} from './types';

// ---------- Falloff curves ----------
//
// All curves take normalized distance d ∈ [0, 1] (0 = field center,
// 1 = field edge) and return a force multiplier in [0, 1].
//
// Same family of shapes as CSS easing — used here for distance, not time.

export function falloff(d: number, kind: FalloffKind): number {
  if (d <= 0) return 1;
  if (d >= 1) return 0;
  switch (kind) {
    case 'linear':
      return 1 - d;
    case 'smoothstep': {
      // Hermite interpolant 3d² − 2d³ inverted: full near center, soft drop.
      const t = 1 - d;
      return t * t * (3 - 2 * t);
    }
    case 'smootherstep': {
      // Ken Perlin's improved version — flatter at both ends.
      const t = 1 - d;
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    case 'gaussian': {
      // Bell curve mapped so that f(0)=1, f(1)≈0.018. Tight peak.
      const sigma = 0.4;
      return Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    case 'constant':
      return 1; // flat plateau, then sudden cliff at d=1 handled above
  }
}

// ---------- Edge lock envelope ----------
//
// Returns multiplier ∈ [0, 1] applied to total force on a letter at row r.
// 0 = fully pinned (Dirichlet boundary), 1 = fully free.
// Top + bottom rows lock symmetrically.

export function edgeFactor(
  row: number,
  rowCount: number,
  locked: number,
  falloffRows: number,
): number {
  if (rowCount <= 1) return 1;
  const distFromEdge = Math.min(row, rowCount - 1 - row);
  if (distFromEdge < locked) return 0;
  if (distFromEdge >= locked + falloffRows) return 1;
  const t = (distFromEdge - locked) / Math.max(1, falloffRows);
  // Smoothstep transition into freedom — avoids visible kink at the band edge.
  return t * t * (3 - 2 * t);
}

// ---------- Natural (zero-force) positions ----------

export function naturalX(
  slot: number,
  charCount: number,
  columnSpacing: number,
  letterSize: number,
  canvasW: number,
  alignment: Alignment,
): number {
  const totalWidth = (charCount - 1) * columnSpacing;
  const halfLetter = letterSize / 2;
  switch (alignment) {
    case 'left':
      return halfLetter + slot * columnSpacing;
    case 'right':
      return canvasW - halfLetter - (charCount - 1 - slot) * columnSpacing;
    case 'center':
      return canvasW / 2 + (slot - (charCount - 1) / 2) * columnSpacing;
    default: {
      // Exhaustive fallback — keeps types honest and silences unused-var.
      void totalWidth;
      return halfLetter + slot * columnSpacing;
    }
  }
}

export function naturalY(
  row: number,
  rowCount: number,
  rowSpacing: number,
  letterSize: number,
  canvasH: number,
): number {
  const totalHeight = (rowCount - 1) * rowSpacing;
  const topMargin = (canvasH - totalHeight) / 2;
  const halfLetter = letterSize / 2;
  // Clamp top margin so first row is never pushed off the canvas if rows
  // overflow the available height. Also keeps rendering stable when the
  // user dials rowCount up beyond what the canvas can fit.
  const margin = Math.max(halfLetter, topMargin);
  return margin + row * rowSpacing;
}

// ---------- Per-letter force ----------
//
// For a letter at natural (x0, y0), sum the displacement contribution from
// each field. Each field's contribution = strength · sign(fx − x0) · falloff(d),
// where d is normalized distance from the FORCE CENTER (fx,fy) to the letter,
// scaled so d=0 at the force center and d=1 where the ray exits the SHAPE
// ellipse boundary. When the force center sits at the shape center, this
// simplifies to the classical elliptical distance formula.
//
// Direction is purely horizontal (toward fx) — vertical force is reserved
// for v2; current model is 1D-spacing only.

export function forceOnLetter(
  x0: number,
  y0: number,
  fields: Field[],
  falloffKind: FalloffKind,
): number {
  let dx = 0;
  for (const f of fields) {
    if (f.sx <= 0 || f.sy <= 0) continue;

    // Ray from (fx,fy) toward (x0,y0): P(t) = (fx,fy) + t·((x0,y0) - (fx,fy)).
    // t=0 at force center, t=1 at letter, t=t_exit where ray exits shape.
    // Substitute P(t) into ((px-cx)/sx)² + ((py-cy)/sy)² = 1, solve for t.
    const A = (f.fx - f.cx) / f.sx;
    const B = (x0 - f.fx) / f.sx;
    const C = (f.fy - f.cy) / f.sy;
    const D = (y0 - f.fy) / f.sy;
    const aq = B * B + D * D;
    if (aq === 0) continue; // letter sits exactly at the force center
    const bq = 2 * (A * B + C * D);
    const cq = A * A + C * C - 1;
    const disc = bq * bq - 4 * aq * cq;
    if (disc < 0) continue; // ray misses the shape (only possible if force center is outside)

    // Largest positive root = where ray exits the shape going outward.
    const sqrtDisc = Math.sqrt(disc);
    const tExit = Math.max((-bq - sqrtDisc) / (2 * aq), (-bq + sqrtDisc) / (2 * aq));
    if (tExit <= 0) continue; // exit lies behind us — letter is outside the shape on the wrong side
    const d = 1 / tExit;
    if (d >= 1) continue; // letter outside shape along this ray

    const mag = falloff(d, falloffKind);
    // sign(fx - x0): direction TOWARD force center. Positive strength
    // moves the letter that way (attraction). Negative inverts it.
    const dir = f.fx === x0 ? 0 : f.fx > x0 ? 1 : -1;
    dx += f.strength * dir * mag;
  }
  return dx;
}

// ---------- Constraint solver ----------
//
// Walks slots in slot order and checks: positions[next] - positions[prev]
// must be ≥ minDistance. This single check covers BOTH "letters too close"
// and "letters crossed over" (where positions[next] < positions[prev]).
//
// On violation, drops ONE slot from the offending pair, picked by the
// alignment rule:
//   - left:   drop the slot with higher index (right side of pair)
//   - right:  drop the slot with lower index  (left side of pair)
//   - center: drop the slot whose index is further from the middle slot
//
// Out-of-canvas letters are unconditionally dropped first (they're
// invisible anyway, no point keeping them in the spacing math).

function pickDropFromPair(
  a: number,
  b: number,
  alignment: Alignment,
  middleSlot: number,
): number {
  if (alignment === 'left') return Math.max(a, b);
  if (alignment === 'right') return Math.min(a, b);
  // center: equidistant ties tip to the right (b is always > a in our use).
  const distA = Math.abs(a - middleSlot);
  const distB = Math.abs(b - middleSlot);
  return distB >= distA ? b : a;
}

export function solveRow(
  positions: number[],
  alignment: Alignment,
  letterSize: number,
  canvasW: number,
  minDistance: number,
): boolean[] {
  const n = positions.length;
  const kept = new Array<boolean>(n).fill(true);
  const minX = letterSize / 2;
  const maxX = canvasW - letterSize / 2;
  const middleSlot = (n - 1) / 2;

  // Pre-pass: drop letters that ended up off-canvas. These can't satisfy
  // any constraint and shouldn't influence neighbor checks.
  for (let i = 0; i < n; i++) {
    if (positions[i] < minX || positions[i] > maxX) kept[i] = false;
  }

  // Iteratively find the WORST violation (smallest gap or biggest crossover)
  // anywhere in the row, drop one slot from that pair, repeat. Searching for
  // the worst (not the first) violation makes the solver order-independent —
  // mirror-image rows produce mirror-image results, no left-bias from the
  // iteration direction.
  for (let safety = 0; safety < n; safety++) {
    let worstA = -1;
    let worstB = -1;
    let worstGap = minDistance; // anything < this is a violation
    let prevSlot = -1;

    for (let i = 0; i < n; i++) {
      if (!kept[i]) continue;
      if (prevSlot >= 0) {
        const gap = positions[i] - positions[prevSlot];
        if (gap < worstGap) {
          worstGap = gap;
          worstA = prevSlot;
          worstB = i;
        }
      }
      prevSlot = i;
    }

    if (worstA < 0) break; // no violations remain
    kept[pickDropFromPair(worstA, worstB, alignment, middleSlot)] = false;
  }
  return kept;
}

// ---------- Cascade clamping ----------
//
// After force displacement, walk the row and ensure each adjacent pair sits
// at least min_distance apart. When they don't, push the "downstream" letter
// outward — the cascade direction comes from the alignment:
//
//   left   → walk left→right, push subsequent letters rightward
//   right  → walk right→left, push earlier letters leftward
//   center → walk both ways outward from the slot midpoint
//
// `kept` filters out dropped letters so they neither push nor get pushed.

function cascadeOneSide(
  positions: number[],
  kept: boolean[],
  minDistance: number,
  startIdx: number,
  step: 1 | -1,
): void {
  const n = positions.length;
  let prevIdx = -1;
  for (let i = startIdx; i >= 0 && i < n; i += step) {
    if (!kept[i]) continue;
    if (prevIdx >= 0) {
      // step=+1 → push current rightward off previous; step=-1 → push leftward
      const target = step > 0 ? positions[prevIdx] + minDistance : positions[prevIdx] - minDistance;
      if (step > 0 ? positions[i] < target : positions[i] > target) {
        positions[i] = target;
      }
    }
    prevIdx = i;
  }
}

function cascadeClamp(
  positions: number[],
  kept: boolean[],
  alignment: Alignment,
  minDistance: number,
): void {
  const n = positions.length;
  if (n < 2) return;

  if (alignment === 'left') {
    cascadeOneSide(positions, kept, minDistance, 0, +1);
    return;
  }
  if (alignment === 'right') {
    cascadeOneSide(positions, kept, minDistance, n - 1, -1);
    return;
  }
  const mid = Math.floor((n - 1) / 2);
  cascadeOneSide(positions, kept, minDistance, mid + 1, +1);
  cascadeOneSide(positions, kept, minDistance, mid - 1, -1);
}

// ---------- Smart drop ----------
//
// Combines cascade with selective dropping. Iteration:
//   1. Reset positions to physics-desired
//   2. Cascade clamp respecting current `kept`
//   3. Find the kept letter whose cascade-induced shift |final − desired|
//      is largest AND exceeds dropTolerance
//   4. If found: drop it, goto 1
//   5. Else: done
//
// This breaks long cascade chains at their highest-stress link (always at the
// chain's outer end) — the few letters that suffered most from cascade get
// removed, and the rest can settle closer to where the field actually wants
// them. dropTolerance = 0 means "drop on any cascade", dropTolerance = ∞
// means "pure cascade, never drop".

export function cascadeAndDrop(
  desired: readonly number[],
  alignment: Alignment,
  minDistance: number,
  dropTolerance: number,
): { positions: number[]; kept: boolean[] } {
  const n = desired.length;
  const positions = desired.slice();
  const kept = new Array<boolean>(n).fill(true);

  // Hard safety: each iteration drops 1 letter, so at most n iterations.
  for (let iter = 0; iter < n; iter++) {
    // Reset and re-cascade with current kept set.
    for (let i = 0; i < n; i++) positions[i] = desired[i];
    cascadeClamp(positions, kept, alignment, minDistance);

    // Find the most stressed kept letter beyond tolerance.
    let toDrop = -1;
    let maxStress = dropTolerance;
    for (let i = 0; i < n; i++) {
      if (!kept[i]) continue;
      const stress = Math.abs(positions[i] - desired[i]);
      if (stress > maxStress) {
        maxStress = stress;
        toDrop = i;
      }
    }
    if (toDrop < 0) break;
    kept[toDrop] = false;
  }

  return { positions, kept };
}

// ---------- Time interpolation ----------
//
// `progress` ∈ [0, 1] over loopDuration. The weight curve sin(π·progress)
// goes 0 → 1 → 0 over one cycle, so the loop seamlessly returns to its
// starting frame — no jarring snap when the recorded video repeats.

function pingPongWeight(progress: number): number {
  return Math.sin(Math.PI * progress);
}

/** Resolve a field's effective state at the given progress (0..1).
 *  When playback is stopped or progress=0, returns the field as-is. */
export function fieldAtProgress(field: Field, progress: number): Field {
  if (field.fx === field.targetFx && field.fy === field.targetFy) return field;
  const w = pingPongWeight(progress);
  return {
    ...field,
    fx: field.fx + (field.targetFx - field.fx) * w,
    fy: field.fy + (field.targetFy - field.fy) * w,
  };
}

// ---------- Word tokenization ----------
//
// Splits the user's word string into per-character tokens that remember
// which word they belong to. Used downstream to color/group letters that
// share a word into one merged blob.

interface Token {
  char: string;
  /** Index into the word list (0 = first word). −1 for whitespace tokens. */
  wordIdx: number;
}

function tokenizeWord(word: string): Token[] {
  const tokens: Token[] = [];
  let currentIdx = -1;
  let prevWasSpace = true;
  for (const ch of word) {
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      tokens.push({ char: ch, wordIdx: -1 });
      prevWasSpace = true;
    } else {
      if (prevWasSpace) currentIdx++;
      tokens.push({ char: ch, wordIdx: currentIdx });
      prevWasSpace = false;
    }
  }
  return tokens;
}

// ---------- Top-level: build all rows ----------

export function buildRows(
  fields: Field[],
  params: GlobalParams,
  canvasW: number,
  canvasH: number,
): Row[] {
  const tokens = tokenizeWord(params.word.length > 0 ? params.word : ' ');
  const rows: Row[] = [];
  const minX = params.letterSize / 2;
  const maxX = canvasW - params.letterSize / 2;

  for (let r = 0; r < params.rowCount; r++) {
    const y = naturalY(r, params.rowCount, params.rowSpacing, params.letterSize, canvasH);
    const eFactor = edgeFactor(r, params.rowCount, params.edgeRowsLocked, params.edgeFalloffRows);

    // Pass 1: compute the desired position for every slot from physics.
    const desired: number[] = new Array(params.charCount);
    for (let i = 0; i < params.charCount; i++) {
      const x0 = naturalX(i, params.charCount, params.columnSpacing, params.letterSize, canvasW, params.alignment);
      const dx = forceOnLetter(x0, y, fields, params.falloff) * eFactor;
      desired[i] = x0 + dx;
    }

    // Pass 2: cascade + smart drop. Letters that cascade would shove farther
    // than dropTolerance from their desired position are dropped instead,
    // breaking the chain at its highest-stress point.
    const { positions, kept } = cascadeAndDrop(
      desired, params.alignment, params.minDistance, params.dropTolerance,
    );

    // Pass 3: filter off-canvas (cascade can still push letters past the edge
    // before reaching the dropTolerance threshold, especially when min_distance
    // is large). Each surviving letter is tagged with the word instance it
    // belongs to so the renderer can group same-word letters into one blob.
    const row: Row = [];
    for (let i = 0; i < params.charCount; i++) {
      if (!kept[i]) continue;
      const x = positions[i];
      if (x < minX || x > maxX) continue;
      const token = tokens[i % tokens.length];
      const cycleIdx = Math.floor(i / tokens.length);
      const wordKey = token.wordIdx >= 0 ? `r${r}w${token.wordIdx}c${cycleIdx}` : null;
      row.push({
        char: token.char,
        x, y,
        wordKey,
        wordIdx: token.wordIdx >= 0 ? token.wordIdx : null,
      });
    }
    rows.push(row);
  }

  return rows;
}
