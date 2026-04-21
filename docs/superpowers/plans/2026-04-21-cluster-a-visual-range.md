# Cluster A — Visual Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 new Silhouette shapes, 4 silhouette set-operation blend modes, 5 Tint color blend modes, and 6 hand-curated Example presets in the Projects menu.

**Architecture:** All changes are purely additive. A new `silhouetteCoverage` field is added to `Cell` so silhouette composition stays independent of Tint opacity. New `blendMode` fields on `SilhouetteParams` and `TintParams` default to modes that preserve existing behavior. Presets ship as a static array loaded identically to imported JSON.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-20-cluster-a-visual-range-design.md`](../specs/2026-04-20-cluster-a-visual-range-design.md)

---

## File structure

```
type-loom/
├── src/
│   ├── core/
│   │   ├── types.ts                      (MODIFY) add silhouetteCoverage to Cell
│   │   ├── grid/
│   │   │   └── layout.ts                 (MODIFY) initialize silhouetteCoverage=1
│   │   ├── render/
│   │   │   └── canvas.ts                 (MODIFY) multiply opacity by silhouetteCoverage
│   │   ├── treatments/
│   │   │   ├── silhouette.ts             (MODIFY) 5 new shapes + blend modes; writes coverage not opacity
│   │   │   ├── silhouette.test.ts        (MODIFY) update for coverage + add tests
│   │   │   ├── tint.ts                   (MODIFY) add blendMode; extract blend helpers
│   │   │   ├── tint.test.ts              (NEW) tests for color blend modes
│   │   │   └── defaults.ts               (MODIFY) add new default fields
│   │   └── presets/
│   │       └── examples.ts               (NEW) six hand-curated ProjectSnapshot
│   └── ui/
│       ├── SilhouetteCard.tsx            (MODIFY) shape + blendMode dropdowns
│       ├── TintCard.tsx                  (MODIFY) blendMode dropdown (color mode only)
│       └── ProjectsMenu.tsx              (MODIFY) Examples section
```

---

## Task 1: Add silhouetteCoverage to Cell + layout initialization + render multiplication

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/grid/layout.ts`
- Modify: `src/core/render/canvas.ts`

- [ ] **Step 1: Extend Cell type**

In `src/core/types.ts`, find the `Cell` interface and add `silhouetteCoverage`:

```ts
export interface Cell {
  char: string;
  position: Vec2;
  scale: number;
  rotation: number;
  color: string;
  opacity: number;
  visible: boolean;
  silhouetteCoverage: number;  // 0..1, default 1. Written by Silhouette treatments, multiplied into final opacity at render.
}
```

Also update `IDENTITY_CELL` if present, and any mock cells in tests.

- [ ] **Step 2: Initialize silhouetteCoverage in computeLayout**

In `src/core/grid/layout.ts`, find the cell creation inside the `for` loop:

```ts
      cells.push({
        char: input[charIndexInWord],
        position: { x, y },
        scale: 1,
        rotation: 0,
        color: fgColor,
        opacity: 1,
        visible: true,
      });
```

Change to:

```ts
      cells.push({
        char: input[charIndexInWord],
        position: { x, y },
        scale: 1,
        rotation: 0,
        color: fgColor,
        opacity: 1,
        visible: true,
        silhouetteCoverage: 1,
      });
```

- [ ] **Step 3: Multiply opacity by coverage in render pass**

In `src/core/render/canvas.ts`, find the per-cell draw block. Find:

```ts
  for (const cell of cells) {
    if (!cell.visible || cell.opacity <= 0) continue;
    if (cell.char === ' ' || cell.char === '') continue;

    ctx.save();
    ctx.translate(cell.position.x, cell.position.y);
    if (cell.rotation !== 0) ctx.rotate(cell.rotation);
    if (cell.scale !== 1) ctx.scale(cell.scale, cell.scale);
    ctx.globalAlpha = cell.opacity;
```

Change to use effective opacity:

```ts
  for (const cell of cells) {
    const effectiveOpacity = cell.opacity * cell.silhouetteCoverage;
    if (!cell.visible || effectiveOpacity <= 0) continue;
    if (cell.char === ' ' || cell.char === '') continue;

    ctx.save();
    ctx.translate(cell.position.x, cell.position.y);
    if (cell.rotation !== 0) ctx.rotate(cell.rotation);
    if (cell.scale !== 1) ctx.scale(cell.scale, cell.scale);
    ctx.globalAlpha = effectiveOpacity;
```

- [ ] **Step 4: Fix any tests that construct Cell directly**

Search for cell literals in tests:

```bash
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
grep -rn "position: { x: 0, y: 0 }" src --include "*.test.ts"
```

For each mock cell in tests, add `silhouetteCoverage: 1` to the object.

Files likely to need updates:
- `src/core/treatments/charSwap.test.ts`
- `src/core/treatments/charScramble.test.ts`
- `src/core/treatments/charField.test.ts`
- `src/core/treatments/silhouette.test.ts`

For each test file, find the `baseCell` definition and add `silhouetteCoverage: 1`.

- [ ] **Step 5: Verify build + tests**

```bash
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: build green; tests green. Silhouette tests still pass because currently only single silhouette tests run — multiplicative chain isn't tested yet, and single-silhouette behavior is unchanged (coverage replaces opacity path but renderer math is equivalent for single).

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/grid/layout.ts src/core/render/canvas.ts src/core/treatments/*.test.ts
git commit -m "feat(core): add silhouetteCoverage to Cell; layout inits it; render multiplies it into final opacity"
```

---

## Task 2: Silhouette — 5 new shapes

**Files:**
- Modify: `src/core/treatments/silhouette.ts`
- Modify: `src/core/treatments/silhouette.test.ts`

- [ ] **Step 1: Extend SilhouetteShape type and add distance functions**

Replace `src/core/treatments/silhouette.ts` entirely with:

```ts
import type { Cell } from '../types';
import type { Treatment } from './types';

export type SilhouetteShape = 'lens' | 'diamond' | 'hourglass' | 'wave' | 'x' | 'circle';

export type SilhouetteBlendMode = 'replace' | 'union' | 'intersect' | 'subtract';

export interface SilhouetteParams {
  shape: SilhouetteShape;
  size: number;       // 0..1
  softness: number;   // 0..1
  invert: boolean;
  blendMode: SilhouetteBlendMode;
}

/**
 * Normalized distance for each shape. All distances are such that
 * `distance ≤ size` means "fully inside" and `distance ≥ size + fade`
 * means "fully outside", with a soft fade in between.
 */
function shapeDistance(shape: SilhouetteShape, nx: number, ny: number): number {
  switch (shape) {
    case 'lens':
      return Math.sqrt(nx * nx + ny * ny);
    case 'circle':
      // Identical math to lens; kept separate so future tweaks (hard-edge defaults, etc.)
      // don't bleed between them.
      return Math.sqrt(nx * nx + ny * ny);
    case 'diamond':
      return Math.abs(nx) + Math.abs(ny);
    case 'hourglass': {
      // Two circles stacked vertically; min distance = union of the two lobes.
      const offset = 0.5;
      const top = Math.sqrt(nx * nx + (ny - offset) * (ny - offset));
      const bot = Math.sqrt(nx * nx + (ny + offset) * (ny + offset));
      return Math.min(top, bot);
    }
    case 'wave': {
      // Horizontal band around a sinusoidal centerline.
      const centerline = 0.6 * Math.sin(nx * Math.PI * 2);
      return Math.abs(ny - centerline);
    }
    case 'x': {
      // Two diagonal beams crossing at origin.
      return Math.min(Math.abs(nx - ny), Math.abs(nx + ny));
    }
  }
}

/**
 * Compute this silhouette's coverage for a cell at (row, col) in
 * a grid of (rows, columns). Returns 0..1 regardless of blendMode.
 */
function computeCoverage(
  params: SilhouetteParams,
  row: number,
  col: number,
  rows: number,
  columns: number,
): number {
  const nx = columns <= 1 ? 0 : (col / (columns - 1)) * 2 - 1;
  const ny = rows <= 1 ? 0 : (row / (rows - 1)) * 2 - 1;
  const dist = shapeDistance(params.shape, nx, ny);
  const size = Math.max(0.0001, params.size);

  let alpha: number;
  if (params.softness <= 0) {
    alpha = dist <= size ? 1 : 0;
  } else {
    const fadeStart = size * (1 - params.softness);
    const fadeEnd = size * (1 + params.softness);
    if (dist <= fadeStart) alpha = 1;
    else if (dist >= fadeEnd) alpha = 0;
    else alpha = 1 - (dist - fadeStart) / (fadeEnd - fadeStart);
  }

  return params.invert ? 1 - alpha : alpha;
}

/**
 * Combine this silhouette's coverage with the previous silhouetteCoverage
 * via the selected blend mode.
 */
function blend(prev: number, next: number, mode: SilhouetteBlendMode): number {
  switch (mode) {
    case 'replace':   return next;
    case 'union':     return 1 - (1 - prev) * (1 - next);
    case 'intersect': return prev * next;
    case 'subtract':  return prev * (1 - next);
  }
}

export function createSilhouette(params: SilhouetteParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'silhouette',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      const coverage = computeCoverage(params, row, col, ctx.rows, ctx.columns);
      const next = blend(cell.silhouetteCoverage, coverage, params.blendMode);
      return { ...cell, silhouetteCoverage: next };
    },
  };
}
```

- [ ] **Step 2: Update silhouette tests**

Rewrite `src/core/treatments/silhouette.test.ts`. Replace the entire file with:

```ts
import { describe, it, expect } from 'vitest';
import { createSilhouette } from './silhouette';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
  silhouetteCoverage: 1,
};

const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0, loopDuration: 4,
});

describe('Silhouette — shape: lens', () => {
  it('center cell has full coverage at size=1', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('far corner has zero coverage at size=0.5', () => {
    const t = createSilhouette({ shape: 'lens', size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — shape: diamond', () => {
  it('center has full coverage', () => {
    const t = createSilhouette({ shape: 'diamond', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('diagonal point (corner) is farther than cardinal point at same radius', () => {
    // Diamond uses manhattan distance: |nx| + |ny|. Corner (nx=1,ny=1) → dist 2.
    // Cardinal (nx=1,ny=0) → dist 1. So at size=1.5, cardinal in, corner out.
    const t = createSilhouette({ shape: 'diamond', size: 1.5, softness: 0, invert: false, blendMode: 'replace' });
    expect(t.apply(baseCell, 5, 10, ctx(11, 11)).silhouetteCoverage).toBe(1);   // cardinal right
    expect(t.apply(baseCell, 0, 0, ctx(11, 11)).silhouetteCoverage).toBe(0);    // corner
  });
});

describe('Silhouette — shape: hourglass', () => {
  it('top and bottom regions have higher coverage than middle', () => {
    const t = createSilhouette({ shape: 'hourglass', size: 0.3, softness: 0, invert: false, blendMode: 'replace' });
    const top = t.apply(baseCell, 0, 5, ctx(11, 11));      // ny=-1
    const mid = t.apply(baseCell, 5, 5, ctx(11, 11));      // ny=0
    expect(top.silhouetteCoverage).toBeGreaterThanOrEqual(mid.silhouetteCoverage);
  });
});

describe('Silhouette — shape: wave', () => {
  it('cells along the sinusoidal centerline have full coverage', () => {
    const t = createSilhouette({ shape: 'wave', size: 0.2, softness: 0, invert: false, blendMode: 'replace' });
    // Center column, center row (nx=0, ny=0) → centerline = 0 → distance = 0.
    const r = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });
});

describe('Silhouette — shape: x', () => {
  it('cells on the diagonals have full coverage', () => {
    const t = createSilhouette({ shape: 'x', size: 0.1, softness: 0, invert: false, blendMode: 'replace' });
    // Diagonal: (row=0, col=0) nx=-1, ny=-1 → |nx - ny| = 0.
    const r = t.apply(baseCell, 0, 0, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(1);
  });

  it('cells off the diagonals have zero coverage at size=0.1', () => {
    const t = createSilhouette({ shape: 'x', size: 0.1, softness: 0, invert: false, blendMode: 'replace' });
    // (row=0, col=10) nx=1, ny=-1 → min(|1-(-1)|, |1+(-1)|) = 0.
    // Wait: (0,10) on 11x11 grid: nx = 10/10 * 2 - 1 = 1. ny = 0/10 * 2 - 1 = -1. |1-(-1)|=2, |1+(-1)|=0. min=0.
    // That's on the ANTI-diagonal. Let's pick (0,5): nx=0, ny=-1. |0-(-1)|=1, |0+(-1)|=1. min=1. Far off.
    const r = t.apply(baseCell, 0, 5, ctx(11, 11));
    expect(r.silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — shape: circle', () => {
  it('behaves identically to lens for a given size', () => {
    const lens   = createSilhouette({ shape: 'lens',   size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const circle = createSilhouette({ shape: 'circle', size: 0.5, softness: 0, invert: false, blendMode: 'replace' });
    const a = lens.apply(baseCell, 3, 3, ctx(11, 11));
    const b = circle.apply(baseCell, 3, 3, ctx(11, 11));
    expect(a.silhouetteCoverage).toBe(b.silhouetteCoverage);
  });
});

describe('Silhouette — blend modes', () => {
  const fullCov: Cell = { ...baseCell, silhouetteCoverage: 0.8 };
  const halfCov: Cell = { ...baseCell, silhouetteCoverage: 0.5 };

  it('replace overrides prior coverage', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'replace' });
    // At center, this shape's coverage = 1. Replace gives 1.
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(1);
  });

  it('intersect multiplies with prior coverage', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'intersect' });
    // 0.8 * 1 = 0.8.
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBeCloseTo(0.8);
  });

  it('union combines prior and current via probabilistic OR', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'union' });
    // 1 - (1-0.5)*(1-1) = 1 (because current coverage is 1).
    expect(t.apply(halfCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(1);
  });

  it('subtract removes current from prior', () => {
    const t = createSilhouette({ shape: 'lens', size: 1.0, softness: 0, invert: false, blendMode: 'subtract' });
    // 0.8 * (1 - 1) = 0.
    expect(t.apply(fullCov, 5, 5, ctx(11, 11)).silhouetteCoverage).toBe(0);
  });
});

describe('Silhouette — invert', () => {
  it('flips the coverage per cell before blending', () => {
    const normal = createSilhouette({ shape: 'lens', size: 0.3, softness: 0, invert: false, blendMode: 'replace' });
    const inverted = createSilhouette({ shape: 'lens', size: 0.3, softness: 0, invert: true,  blendMode: 'replace' });
    const rNormal = normal.apply(baseCell, 5, 5, ctx(11, 11));
    const rInv    = inverted.apply(baseCell, 5, 5, ctx(11, 11));
    expect(rNormal.silhouetteCoverage + rInv.silhouetteCoverage).toBe(1);
  });
});
```

- [ ] **Step 3: Update Silhouette defaults**

In `src/core/treatments/defaults.ts`, find `DEFAULT_SILHOUETTE_PARAMS` and add the new fields:

```ts
export const DEFAULT_SILHOUETTE_PARAMS: SilhouetteParams = {
  shape: 'lens',
  size: 0.7,
  softness: 0.1,
  invert: false,
  blendMode: 'intersect',
};
```

- [ ] **Step 4: Verify build + tests**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: green. Silhouette tests now include ~13 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/treatments/silhouette.ts src/core/treatments/silhouette.test.ts src/core/treatments/defaults.ts
git commit -m "feat(silhouette): 5 new shapes (diamond/hourglass/wave/X/circle) + 4 blend modes on silhouetteCoverage"
```

---

## Task 3: SilhouetteCard UI — shape + blendMode dropdowns

**Files:**
- Modify: `src/ui/SilhouetteCard.tsx`

- [ ] **Step 1: Add dropdowns**

Read `src/ui/SilhouetteCard.tsx`. Find the JSX where the shape was previously hardcoded to display "Shape: Lens":

```tsx
        <div className="text-xs text-gray-500">Shape: Lens</div>
```

Replace with real shape + blendMode selects. Add imports if needed (`SilhouetteShape`, `SilhouetteBlendMode`):

```tsx
import { createSilhouette, type SilhouetteParams, type SilhouetteShape, type SilhouetteBlendMode } from '../core/treatments/silhouette';
```

And in the card JSX (replacing the static label):

```tsx
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Shape</div>
          <select
            value={params.shape}
            onChange={(e) => updateParams({ shape: e.target.value as SilhouetteShape })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="lens">Lens</option>
            <option value="circle">Circle</option>
            <option value="diamond">Diamond</option>
            <option value="hourglass">Hourglass</option>
            <option value="wave">Wave</option>
            <option value="x">X</option>
          </select>
        </label>
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Blend mode</div>
          <select
            value={params.blendMode}
            onChange={(e) => updateParams({ blendMode: e.target.value as SilhouetteBlendMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
            title="How this silhouette composes with any previous silhouette"
          >
            <option value="intersect">Intersect (AND)</option>
            <option value="replace">Replace</option>
            <option value="union">Union (OR)</option>
            <option value="subtract">Subtract (cut)</option>
          </select>
        </label>
```

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/SilhouetteCard.tsx
git commit -m "feat(ui): SilhouetteCard — shape + blendMode dropdowns"
```

---

## Task 4: Tint — color blend modes + helper functions

**Files:**
- Modify: `src/core/treatments/tint.ts`
- Create: `src/core/treatments/tint.test.ts`
- Modify: `src/core/treatments/defaults.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/treatments/tint.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createTint } from './tint';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const cell = (overrides: Partial<Cell> = {}): Cell => ({
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#ff0000', opacity: 1, visible: true,
  silhouetteCoverage: 1,
  ...overrides,
});

const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0, loopDuration: 4,
});

describe('Tint — color blend modes', () => {
  it('normal overrides the prior color', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'normal',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#00ff00');
  });

  it('multiply darkens: red × green = black', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#000000');
  });

  it('multiply: red × red = red', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#ff0000', colorB: '#ff0000',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ff0000');
  });

  it('screen lightens: red screen green = yellow', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'screen',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#00ff00', colorB: '#00ff00',
    });
    const result = t.apply(cell({ color: '#ff0000' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ffff00');
  });

  it('add clamps at white: white + anything = white', () => {
    const t = createTint({
      mode: 'color', pattern: 'linear-x', blendMode: 'add',
      minOpacity: 1, maxOpacity: 1,
      colorA: '#808080', colorB: '#808080',
    });
    const result = t.apply(cell({ color: '#ffffff' }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ffffff');
  });

  it('opacity mode ignores blendMode', () => {
    const t = createTint({
      mode: 'opacity', pattern: 'linear-x', blendMode: 'multiply',
      minOpacity: 0.5, maxOpacity: 0.5,
      colorA: '#000', colorB: '#000',
    });
    const result = t.apply(cell({ color: '#ff0000', opacity: 1 }), 0, 0, ctx(5, 5));
    expect(result.color).toBe('#ff0000');
    expect(result.opacity).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run test:run -- tint.test
```
Expected: FAIL — `createTint` takes different param shape (no blendMode yet).

- [ ] **Step 3: Update tint.ts to support blend modes**

Replace `src/core/treatments/tint.ts` with:

```ts
import type { Cell } from '../types';
import type { Treatment } from './types';

export type TintMode = 'opacity' | 'color';
export type TintPattern = 'radial' | 'linear-x' | 'linear-y';
export type TintBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

export interface TintParams {
  mode: TintMode;
  pattern: TintPattern;
  blendMode: TintBlendMode;
  minOpacity: number;
  maxOpacity: number;
  colorA: string;
  colorB: string;
}

/** Per-channel blend math. a = prior channel value (0..1), b = incoming. */
function blendChannel(a: number, b: number, mode: TintBlendMode): number {
  switch (mode) {
    case 'normal':   return b;
    case 'multiply': return a * b;
    case 'screen':   return 1 - (1 - a) * (1 - b);
    case 'overlay':  return a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
    case 'add':      return Math.min(1, a + b);
  }
}

export function createTint(params: TintParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'tint',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      let t: number;
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          t = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          break;
        }
        case 'linear-x':
          t = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          t = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          break;
      }

      if (params.mode === 'opacity') {
        const opacity = params.minOpacity + (params.maxOpacity - params.minOpacity) * t;
        return { ...cell, opacity: cell.opacity * opacity };
      }
      // Color mode: compute interpolated target color, then blend with cell.color.
      const targetHex = lerpHexColor(params.colorA, params.colorB, t);
      const blended = blendHexColors(cell.color, targetHex, params.blendMode);
      return { ...cell, color: blended };
    },
  };
}

function lerpHexColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return toHex(r, g, bl);
}

function blendHexColors(prev: string, next: string, mode: TintBlendMode): string {
  const [pr, pg, pb] = parseHex(prev);
  const [nr, ng, nb] = parseHex(next);
  const r = Math.round(blendChannel(pr / 255, nr / 255, mode) * 255);
  const g = Math.round(blendChannel(pg / 255, ng / 255, mode) * 255);
  const b = Math.round(blendChannel(pb / 255, nb / 255, mode) * 255);
  return toHex(r, g, b);
}

function parseHex(hex: string): [number, number, number] {
  const s = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
```

- [ ] **Step 4: Update Tint defaults**

In `src/core/treatments/defaults.ts`, find `DEFAULT_TINT_PARAMS` and add `blendMode`:

```ts
export const DEFAULT_TINT_PARAMS: TintParams = {
  mode: 'opacity',
  pattern: 'radial',
  blendMode: 'normal',
  minOpacity: 0.2,
  maxOpacity: 1,
  colorA: '#1a1a4d',
  colorB: '#f0bb44',
};
```

- [ ] **Step 5: Verify tint tests pass**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run test:run -- tint.test
```
Expected: PASS — 6 tests.

- [ ] **Step 6: Verify build + full suite**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/core/treatments/tint.ts src/core/treatments/tint.test.ts src/core/treatments/defaults.ts
git commit -m "feat(tint): color blend modes (normal/multiply/screen/overlay/add)"
```

---

## Task 5: TintCard UI — blendMode dropdown

**Files:**
- Modify: `src/ui/TintCard.tsx`

- [ ] **Step 1: Add blendMode dropdown in color-mode branch**

Read `src/ui/TintCard.tsx`. Find the `params.mode === 'opacity' ? (...) : (...)` branch. Inside the color-mode branch (the `else`), add a blend-mode select ABOVE the ColorSwatch inputs:

Add to imports:

```tsx
import type { TintBlendMode } from '../core/treatments/tint';
```

In the card JSX, in the color branch:

```tsx
        ) : (
          <>
            <label className="block text-sm">
              <div className="text-gray-700 mb-1">Blend mode</div>
              <select
                value={params.blendMode}
                onChange={(e) => updateParams({ blendMode: e.target.value as TintBlendMode })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
                title="How this tint's color composes with the cell's current color (last prior Tint or base FG)"
              >
                <option value="normal">Normal (replace)</option>
                <option value="multiply">Multiply (darken)</option>
                <option value="screen">Screen (lighten)</option>
                <option value="overlay">Overlay</option>
                <option value="add">Add</option>
              </select>
            </label>
            <div className="space-y-2">
              <ColorSwatch label="From" value={params.colorA} onChange={(v) => updateParams({ colorA: v })} />
              <ColorSwatch label="To" value={params.colorB} onChange={(v) => updateParams({ colorB: v })} />
            </div>
          </>
        )}
```

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/TintCard.tsx
git commit -m "feat(ui): TintCard — blend mode dropdown in color mode"
```

---

## Task 6: Presets — examples module

**Files:**
- Create: `src/core/presets/examples.ts`

- [ ] **Step 1: Create the examples module**

Create folder and file:

```bash
mkdir -p /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom/src/core/presets
```

Create `src/core/presets/examples.ts`:

```ts
import type { ProjectSnapshot } from '../persistence/serialize';
import { DEFAULT_BASE_CONFIG } from '../types';

export interface Example {
  id: string;
  name: string;
  description: string;
  snapshot: ProjectSnapshot;
}

// Each example is a literal ProjectSnapshot. Treatment `id`s inside the
// snapshot must be unique within the snapshot but can repeat across
// examples — each load creates a new project that doesn't compete with
// the user's saved ones.

export const EXAMPLES: Example[] = [
  {
    id: 'cavalry',
    name: 'Cavalry',
    description: 'Tight-middle spacing rhythm + lens mask on a warm cream/forest palette.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 52,
        rowSpacing: 62,
        charSpacing: 28,
        columnSpacing: 40,
        input: 'CAVALRY',
        fgColor: '#0f5132',
        bgColor: '#f0ead6',
      },
      treatments: [
        {
          id: 'cav-1',
          type: 'silhouette',
          enabled: true,
          params: { shape: 'lens', size: 0.85, softness: 0.1, invert: false, blendMode: 'intersect' },
          mask: null,
        },
        {
          id: 'cav-2',
          type: 'spacing',
          enabled: true,
          params: { pattern: 'tight-middle', amplitude: 0.6, frequency: 1, scroll: 0 },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'together',
    name: 'Together',
    description: 'Sine spacing with scroll animation and diagonal stagger.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 44,
        rowSpacing: 54,
        charSpacing: 26,
        columnSpacing: 34,
        input: 'TOGETHER',
        fgColor: '#1a1a4d',
        bgColor: '#dde9d4',
      },
      treatments: [
        {
          id: 'tog-1',
          type: 'spacing',
          enabled: true,
          params: { pattern: 'sine', amplitude: 0.5, frequency: 1.5, scroll: 0 },
          mask: null,
        },
      ],
      animations: [
        {
          id: 'tog-a1',
          treatmentId: 'tog-1',
          treatmentType: 'spacing',
          paramKey: 'scroll',
          from: 0,
          to: 1,
          curve: 'sawtooth',
          duration: 6,
          delay: 0,
          staggerAmount: 2,
          staggerAxis: 'diagonal',
        },
      ],
      loopDuration: 6,
      showMaskOverlays: true,
    },
  },
  {
    id: 'tapestry',
    name: 'Tapestry',
    description: 'Hourglass silhouette on repeated OK tiles; a nod to the kielm _v.Tapestry.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1350 },
        charSize: 38,
        rowSpacing: 46,
        charSpacing: 24,
        columnSpacing: 30,
        input: 'OK',
        fgColor: '#000000',
        bgColor: '#f5f5dc',
      },
      treatments: [
        {
          id: 'tap-1',
          type: 'silhouette',
          enabled: true,
          params: { shape: 'hourglass', size: 0.55, softness: 0.08, invert: false, blendMode: 'intersect' },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Drift + linear-x scale for a perspective-like sweep.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1920, height: 1080 },
        charSize: 44,
        rowSpacing: 58,
        charSpacing: 28,
        columnSpacing: 22,
        input: 'GROWTH',
        fgColor: '#3E49B8',
        bgColor: '#fef3c7',
      },
      treatments: [
        {
          id: 'grw-1',
          type: 'scale',
          enabled: true,
          params: { pattern: 'linear-x', min: 0.4, max: 1.6 },
          mask: null,
        },
        {
          id: 'grw-2',
          type: 'drift',
          enabled: true,
          params: { axis: 'both', amplitude: 22, frequency: 0.45 },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
  {
    id: 'matrix',
    name: 'Matrix rain',
    description: 'Settle-mode char scramble with y-axis stagger on a dark palette.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1920 },
        charSize: 36,
        rowSpacing: 44,
        charSpacing: 22,
        columnSpacing: 18,
        input: 'WAKE UP',
        fgColor: '#D1E043',
        bgColor: '#434625',
      },
      treatments: [
        {
          id: 'mtx-1',
          type: 'charScramble',
          enabled: true,
          params: {
            pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            mode: 'settle',
            settleStart: 0,
            flipsPerSecond: 18,
            staggerAmount: 2.5,
            staggerAxis: 'y',
          },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 6,
      showMaskOverlays: true,
    },
  },
  {
    id: 'noise',
    name: 'Color noise',
    description: 'Char swap (random) + two tints layered with multiply.',
    snapshot: {
      schemaVersion: 1,
      config: {
        ...DEFAULT_BASE_CONFIG,
        canvas: { width: 1080, height: 1080 },
        charSize: 42,
        rowSpacing: 50,
        charSpacing: 26,
        columnSpacing: 18,
        input: 'FOCUS',
        fgColor: '#ffffff',
        bgColor: '#564391',
      },
      treatments: [
        {
          id: 'nse-1',
          type: 'charSwap',
          enabled: true,
          params: { pool: '*+#$%@&', mode: 'random', seed: 12, poolIndex: 0 },
          mask: null,
        },
        {
          id: 'nse-2',
          type: 'tint',
          enabled: true,
          params: {
            mode: 'color', pattern: 'radial', blendMode: 'multiply',
            minOpacity: 1, maxOpacity: 1,
            colorA: '#FF91E0', colorB: '#FFDEF6',
          },
          mask: null,
        },
      ],
      animations: [],
      loopDuration: 4,
      showMaskOverlays: true,
    },
  },
];
```

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/core/presets/examples.ts
git commit -m "feat(presets): six hand-curated example compositions"
```

---

## Task 7: Presets — menu integration

**Files:**
- Modify: `src/ui/ProjectsMenu.tsx`

- [ ] **Step 1: Add Examples section to the Projects dropdown**

Read `src/ui/ProjectsMenu.tsx`. Add to imports:

```tsx
import { EXAMPLES } from '../core/presets/examples';
```

In the render, find the section between Recent and "Manage projects…". Add a new Examples section. Replace the existing block around Recent and Manage with:

```tsx
          {recents.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400">Recent</div>
              {recents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLoad(p.id)}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 truncate"
                  title={`Saved ${new Date(p.updatedAt).toLocaleString()}`}
                >
                  {p.name}
                </button>
              ))}
              <div className="border-t border-gray-100" />
            </>
          )}

          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400">Examples</div>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setOpen(false);
                if (isDirty && !confirm('Unsaved changes will be lost. Load this example?')) return;
                useStore.getState().loadSnapshot(ex.snapshot);
              }}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 truncate"
              title={ex.description}
            >
              {ex.name}
            </button>
          ))}
          <div className="border-t border-gray-100" />

          <button onClick={() => { setOpen(false); onOpenManage(); }} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
            Manage projects…
          </button>
```

- [ ] **Step 2: Verify build**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run build 2>&1 | tail -3
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: green; all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ProjectsMenu.tsx
git commit -m "feat(ui): Examples section in Projects menu (loads curated snapshots)"
```

---

## Task 8: Smoke test + push

**Files:** none (verification only)

- [ ] **Step 1: Restart dev server**

```bash
pkill -f "vite" 2>/dev/null; sleep 1
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
PATH="/opt/homebrew/bin:$PATH" nohup npm run dev > /tmp/type-loom-dev.log 2>&1 &
sleep 2
curl -s http://localhost:5173/ -o /dev/null -w "HTTP %{http_code}\n"
```
Expected: `HTTP 200`.

- [ ] **Step 2: Manual smoke test**

Open http://localhost:5173/ and verify:

1. **Existing single-Silhouette projects unchanged** — add a Silhouette at default params. Behaves as before.
2. **New shapes** — change shape dropdown to Diamond, Hourglass, Wave, X, Circle. Each produces a recognizably different silhouette.
3. **Silhouette blend modes** — add two Silhouettes. Default (intersect) produces a compound shape. Change 2nd to Replace → only 2nd visible. Change to Union → combined mask. Change to Subtract → 1st minus 2nd (hole).
4. **Tint blend modes** — add two Tints in color mode. Default (normal) overrides. Multiply → darkens overlap. Screen → lightens. Add → brightens to white at full saturation.
5. **Existing saved projects load** — open Projects menu → load any old saved project → looks identical to before.
6. **Examples** — open Projects menu → Examples section visible below Recent. Click Cavalry → loads as Untitled with CAVALRY composition. Try all 6. Each should look distinct and tasteful.
7. **Unsaved-changes guard** — make a change, click an example. Confirm prompt appears. Cancel → still on current state. Confirm → example loads.

- [ ] **Step 3: Run full test suite**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: all tests pass. Approx 70 (existing) + 13 (new silhouette) + 6 (new tint) = ~89 tests.

- [ ] **Step 4: Push to main**

```bash
git push origin main 2>&1 | tail -2
```

Expected: push succeeds. GH Pages CI fires and redeploys within ~40s.

---

## Done

After this plan:
- Silhouette treatment has 6 shapes and 4 set-op blend modes.
- Tint treatment has 5 color blend modes that compose layered tints properly.
- Projects menu has a quiet "Examples" section with 6 hand-curated starting compositions.
- All existing treatments and saved projects behave identically.
- Build + tests green; live app at tanya-ermlva.github.io/type-loom gets the updates on next deploy.
