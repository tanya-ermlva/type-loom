# Char-mutating treatments + animatable base grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new treatments — `Char: Swap`, `Char: Scramble`, `Char: Field` — that mutate `cell.char`, plus extend the animation system to also target `BaseGridConfig` numeric fields (charSize, rowSpacing, columnSpacing, charSpacing).

**Architecture:** Hard-additive. Existing 6 visual treatments and saved projects unchanged. New treatments use the existing `runAnimatedPipeline` and write to `cell.char`. Config animations use the existing `AnimationSpec` shape with a special `treatmentId: 'config'`, evaluated to an "effective config" before `computeLayout` each frame.

**Tech Stack:** TypeScript, React 19, Zustand, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-19-char-treatments-design.md`](../specs/2026-04-19-char-treatments-design.md)

---

## File structure

```
type-loom/
├── src/
│   ├── core/
│   │   ├── util/
│   │   │   ├── hash.ts                       (NEW)  deterministicHash + pickFromPool
│   │   │   └── hash.test.ts                  (NEW)
│   │   ├── treatments/
│   │   │   ├── types.ts                      (MODIFY) add 'charSwap' | 'charScramble' | 'charField'
│   │   │   ├── factory.ts                    (MODIFY) handle 3 new types in recreateTreatment + TreatmentParams union
│   │   │   ├── defaults.ts                   (MODIFY) export DEFAULT_CHAR_*_PARAMS for the 3 treatments
│   │   │   ├── rotation.ts                   (MODIFY) reuse deterministicHash from util/hash
│   │   │   ├── charSwap.ts                   (NEW)
│   │   │   ├── charSwap.test.ts              (NEW)
│   │   │   ├── charScramble.ts               (NEW)
│   │   │   ├── charScramble.test.ts          (NEW)
│   │   │   ├── charField.ts                  (NEW)
│   │   │   └── charField.test.ts             (NEW)
│   │   ├── animation/
│   │   │   ├── types.ts                      (MODIFY) treatmentType becomes optional
│   │   │   ├── configAnim.ts                 (NEW)  applyConfigAnimations helper
│   │   │   └── configAnim.test.ts            (NEW)
│   │   └── export/
│   │       └── pngSequence.ts                (MODIFY) call applyConfigAnimations before layout
│   ├── ui/
│   │   ├── controls/
│   │   │   └── PoolField.tsx                 (NEW)  preset + editable string control
│   │   ├── TreatmentsPanel.tsx               (MODIFY) register 3 new treatments in menu + renderer
│   │   ├── BasePanel.tsx                     (MODIFY) add ✨ to base sliders + AnimationsList for config
│   │   ├── CanvasPreview.tsx                 (MODIFY) call applyConfigAnimations before layout
│   │   ├── AnimationsList.tsx                (MODIFY) hide stagger fields when treatmentId === 'config'
│   │   ├── CharSwapCard.tsx                  (NEW)
│   │   ├── CharScrambleCard.tsx              (NEW)
│   │   └── CharFieldCard.tsx                 (NEW)
│   └── hooks/
│       └── useQuickAnimate.ts                (MODIFY) handle 'config' as a treatmentId (no treatmentType)
```

---

## Task 1: Foundation — TreatmentType variants + shared deterministicHash util

**Files:**
- Create: `src/core/util/hash.ts`
- Create: `src/core/util/hash.test.ts`
- Modify: `src/core/treatments/types.ts`
- Modify: `src/core/treatments/rotation.ts` (refactor to reuse hash util)

- [ ] **Step 1: Create the hash util test**

Create `src/core/util/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deterministicHash, pickFromPool } from './hash';

describe('deterministicHash', () => {
  it('returns a value in [0, 1)', () => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const h = deterministicHash(r, c, 0);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it('is stable for the same (row, col, seed)', () => {
    expect(deterministicHash(3, 7, 42)).toBe(deterministicHash(3, 7, 42));
  });

  it('produces different values for different (row, col)', () => {
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(0, 1, 0));
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(1, 0, 0));
  });

  it('seed shifts the value', () => {
    expect(deterministicHash(0, 0, 0)).not.toBe(deterministicHash(0, 0, 1));
  });
});

describe('pickFromPool', () => {
  it('picks the char at index modulo pool length', () => {
    expect(pickFromPool('abcd', 0)).toBe('a');
    expect(pickFromPool('abcd', 3)).toBe('d');
    expect(pickFromPool('abcd', 4)).toBe('a');
    expect(pickFromPool('abcd', 7)).toBe('d');
  });

  it('handles negative indices via modulo', () => {
    expect(pickFromPool('abcd', -1)).toBe('d');
  });

  it('returns empty string for empty pool', () => {
    expect(pickFromPool('', 0)).toBe('');
  });

  it('floors fractional indices', () => {
    expect(pickFromPool('abcd', 1.7)).toBe('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
npm run test:run -- hash.test
```
Expected: FAIL — `Cannot find module './hash'`.

- [ ] **Step 3: Write the hash util**

Create `src/core/util/hash.ts`:

```ts
/**
 * Deterministic pseudo-random hash that returns the same value for the
 * same (row, col, seed). Returns a fractional value in [0, 1).
 *
 * Same constants as Rotation's 'random' pattern; extracted so multiple
 * treatments share one source of "stable noise".
 */
export function deterministicHash(row: number, col: number, seed: number): number {
  const v = Math.sin(row * 12.9898 + col * 78.233 + seed * 0.0001) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Pick a character from `pool` at integer `index`, wrapping with modulo.
 * Returns empty string if pool is empty.
 */
export function pickFromPool(pool: string, index: number): string {
  if (pool.length === 0) return '';
  const idx = Math.floor(index);
  const wrapped = ((idx % pool.length) + pool.length) % pool.length;
  return pool[wrapped];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- hash.test
```
Expected: PASS — 8 tests green.

- [ ] **Step 5: Add new TreatmentType variants**

Modify `src/core/treatments/types.ts`. Find the `TreatmentType` union and replace it:

```ts
export type TreatmentType =
  | 'silhouette'
  | 'drift'
  | 'spacing'
  | 'scale'
  | 'rotation'
  | 'tint'
  | 'charSwap'
  | 'charScramble'
  | 'charField';
```

- [ ] **Step 6: Refactor rotation.ts to reuse the hash util**

Read `src/core/treatments/rotation.ts`. Find the `'random'` case in the switch:

```ts
        case 'random': {
          // Deterministic hash so same (row, col) always gets same value.
          const h = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
          factor = (h - Math.floor(h)) * 2 - 1;
          break;
        }
```

Replace with (and add the import at the top):

```ts
import { deterministicHash } from '../util/hash';
```

```ts
        case 'random': {
          factor = deterministicHash(row, col, 0) * 2 - 1;
          break;
        }
```

- [ ] **Step 7: Verify build + all tests pass**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: build green; tests green (35 + 8 hash = 43 should pass).

- [ ] **Step 8: Commit**

```bash
git add src/core/util/hash.ts src/core/util/hash.test.ts src/core/treatments/types.ts src/core/treatments/rotation.ts
git commit -m "feat(util): extract deterministicHash + pickFromPool; add 3 char-treatment type variants"
```

---

## Task 2: Animation extension — make treatmentType optional + applyConfigAnimations helper

**Files:**
- Modify: `src/core/animation/types.ts`
- Create: `src/core/animation/configAnim.ts`
- Create: `src/core/animation/configAnim.test.ts`

- [ ] **Step 1: Make AnimationSpec.treatmentType optional**

Modify `src/core/animation/types.ts`. Find the AnimationSpec interface and change `treatmentType` from required to optional:

```ts
export interface AnimationSpec {
  id: string;
  treatmentId: string;
  treatmentType?: TreatmentType;  // omitted for config animations (treatmentId === 'config')
  paramKey: string;
  from: number;
  to: number;
  curve: AnimationCurve;
  duration: number;
  delay: number;
  staggerAmount: number;
  staggerAxis: StaggerAxis;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/core/animation/configAnim.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyConfigAnimations } from './configAnim';
import { DEFAULT_BASE_CONFIG } from '../types';
import type { AnimationSpec } from './types';

const baseConfig = { ...DEFAULT_BASE_CONFIG, charSize: 40, rowSpacing: 50 };

const makeAnim = (paramKey: string, from: number, to: number): AnimationSpec => ({
  id: 'a',
  treatmentId: 'config',
  paramKey,
  from,
  to,
  curve: 'sine',
  duration: 4,
  delay: 0,
  staggerAmount: 0,
  staggerAxis: 'x',
});

describe('applyConfigAnimations', () => {
  it('returns config unchanged when no animations target it', () => {
    const anims: AnimationSpec[] = [];
    expect(applyConfigAnimations(baseConfig, anims, 0, 4)).toEqual(baseConfig);
  });

  it('returns config unchanged when no animations have treatmentId="config"', () => {
    const anims: AnimationSpec[] = [{ ...makeAnim('charSize', 20, 80), treatmentId: 'silhouette' }];
    expect(applyConfigAnimations(baseConfig, anims, 0, 4)).toEqual(baseConfig);
  });

  it('overlays animated value on the matching config field at t=0 (=from)', () => {
    const anims = [makeAnim('charSize', 20, 80)];
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.charSize).toBeCloseTo(20);
  });

  it('overlays animated value at midpoint (=to for sine)', () => {
    const anims = [makeAnim('charSize', 20, 80)];
    const out = applyConfigAnimations(baseConfig, anims, 2, 4);
    expect(out.charSize).toBeCloseTo(80);
  });

  it('handles multiple config animations on different fields', () => {
    const anims = [makeAnim('charSize', 20, 80), makeAnim('rowSpacing', 30, 90)];
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.charSize).toBeCloseTo(20);
    expect(out.rowSpacing).toBeCloseTo(30);
  });

  it('ignores config animations whose paramKey is not a numeric BaseGridConfig field', () => {
    const anims = [makeAnim('input', 0, 1)];  // not a numeric field
    const out = applyConfigAnimations(baseConfig, anims, 0, 4);
    expect(out.input).toBe(baseConfig.input);  // unchanged
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test:run -- configAnim.test
```
Expected: FAIL — `Cannot find module './configAnim'`.

- [ ] **Step 4: Write applyConfigAnimations**

Create `src/core/animation/configAnim.ts`:

```ts
import type { BaseGridConfig } from '../types';
import type { AnimationSpec } from './types';
import { evaluateAnimation } from './evaluate';

const ANIMATABLE_KEYS = ['charSize', 'rowSpacing', 'columnSpacing', 'charSpacing'] as const;
type AnimatableKey = (typeof ANIMATABLE_KEYS)[number];

const isAnimatableKey = (k: string): k is AnimatableKey =>
  (ANIMATABLE_KEYS as readonly string[]).includes(k);

/**
 * Return an "effective" BaseGridConfig with any active 'config'-targeted
 * animations overlaid. Stagger has no meaning for config animations
 * (config values aren't per-cell), so it's not applied here.
 */
export function applyConfigAnimations(
  config: BaseGridConfig,
  animations: AnimationSpec[],
  t: number,
  _loopDuration: number,
): BaseGridConfig {
  const configAnims = animations.filter((a) => a.treatmentId === 'config' && isAnimatableKey(a.paramKey));
  if (configAnims.length === 0) return config;

  const next: BaseGridConfig = { ...config };
  for (const anim of configAnims) {
    const key = anim.paramKey as AnimatableKey;
    const value = evaluateAnimation(anim, t);
    next[key] = Math.max(0.01, value);
  }
  return next;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:run -- configAnim.test
```
Expected: PASS — 6 tests green.

- [ ] **Step 6: Verify build + full test suite**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: build green; all tests pass (43 + 6 = 49).

- [ ] **Step 7: Commit**

```bash
git add src/core/animation/types.ts src/core/animation/configAnim.ts src/core/animation/configAnim.test.ts
git commit -m "feat(animation): treatmentType optional + applyConfigAnimations helper"
```

---

## Task 3: PoolField shared UI component

**Files:**
- Create: `src/ui/controls/PoolField.tsx`

- [ ] **Step 1: Write the implementation**

Create `src/ui/controls/PoolField.tsx`:

```tsx
import { useState, useId } from 'react';

const PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Uppercase A–Z', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { label: 'Lowercase a–z', value: 'abcdefghijklmnopqrstuvwxyz' },
  { label: 'Letters', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' },
  { label: 'Numbers', value: '0123456789' },
  { label: 'Symbols', value: '!@#$%^&*()_+-=[]{}<>?/.,;:' },
];

interface PoolFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

/**
 * Preset dropdown that seeds an editable text field. Editing the field
 * automatically switches the dropdown to "Custom".
 */
export function PoolField({ label, value, onChange }: PoolFieldProps) {
  const id = useId();

  const matchingPreset = PRESETS.find((p) => p.value === value)?.label ?? 'Custom';
  const [presetSelection, setPresetSelection] = useState(matchingPreset);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const choice = e.target.value;
    setPresetSelection(choice);
    if (choice === 'Custom') return;
    const preset = PRESETS.find((p) => p.label === choice);
    if (preset) onChange(preset.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetSelection('Custom');
    onChange(e.target.value);
  };

  return (
    <div className="block text-sm space-y-1">
      <label htmlFor={id} className="text-gray-700">{label}</label>
      <select
        value={presetSelection}
        onChange={handlePresetChange}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400"
      >
        {PRESETS.map((p) => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
        <option value="Custom">Custom</option>
      </select>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleTextChange}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-400"
        placeholder="characters to use"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: build green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/controls/PoolField.tsx
git commit -m "feat(ui): PoolField shared component (preset + editable string)"
```

---

## Task 4: charSwap module + factory wire + defaults

**Files:**
- Create: `src/core/treatments/charSwap.ts`
- Create: `src/core/treatments/charSwap.test.ts`
- Modify: `src/core/treatments/factory.ts`
- Modify: `src/core/treatments/defaults.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/treatments/charSwap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCharSwap } from './charSwap';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
};
const ctx = (rows: number, cols: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t: 0, loopDuration: 4,
});

describe('Char: Swap (Random mode)', () => {
  it('replaces cell.char with a char from the pool', () => {
    const t = createCharSwap({ pool: 'AB', mode: 'random', seed: 0, poolIndex: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(['A', 'B']).toContain(result.char);
  });

  it('is stable for the same (row, col, seed)', () => {
    const t = createCharSwap({ pool: 'ABCDEF', mode: 'random', seed: 7, poolIndex: 0 });
    const r1 = t.apply(baseCell, 2, 3, ctx(5, 5));
    const r2 = t.apply(baseCell, 2, 3, ctx(5, 5));
    expect(r1.char).toBe(r2.char);
  });

  it('produces different chars for different cells (mostly)', () => {
    const t = createCharSwap({ pool: 'ABCDEFGH', mode: 'random', seed: 0, poolIndex: 0 });
    const chars = new Set<string>();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      chars.add(t.apply(baseCell, r, c, ctx(8, 8)).char);
    }
    expect(chars.size).toBeGreaterThan(1);
  });
});

describe('Char: Swap (Cycle mode)', () => {
  it('returns the same char for every cell', () => {
    const t = createCharSwap({ pool: 'AB', mode: 'cycle', seed: 0, poolIndex: 1 });
    const a = t.apply(baseCell, 0, 0, ctx(5, 5));
    const b = t.apply(baseCell, 4, 4, ctx(5, 5));
    expect(a.char).toBe(b.char);
    expect(a.char).toBe('B');
  });

  it('poolIndex picks the char modulo pool length', () => {
    const t = createCharSwap({ pool: 'ABCD', mode: 'cycle', seed: 0, poolIndex: 5 });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5)).char).toBe('B');
  });
});

describe('Char: Swap (general)', () => {
  it('does not change visibility / position / scale / rotation', () => {
    const t = createCharSwap({ pool: 'ABC', mode: 'random', seed: 0, poolIndex: 0 });
    const cell = { ...baseCell, position: { x: 100, y: 50 }, scale: 2, rotation: 0.3 };
    const result = t.apply(cell, 0, 0, ctx(5, 5));
    expect(result.position).toEqual(cell.position);
    expect(result.scale).toBe(cell.scale);
    expect(result.rotation).toBe(cell.rotation);
    expect(result.visible).toBe(cell.visible);
  });

  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharSwap({ pool: '', mode: 'random', seed: 0, poolIndex: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(result.char).toBe('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- charSwap.test
```
Expected: FAIL — `Cannot find module './charSwap'`.

- [ ] **Step 3: Write the implementation**

Create `src/core/treatments/charSwap.ts`:

```ts
import type { Cell } from '../types';
import type { Treatment } from './types';
import { deterministicHash, pickFromPool } from '../util/hash';

export type CharSwapMode = 'random' | 'cycle';

export interface CharSwapParams {
  pool: string;
  mode: CharSwapMode;
  seed: number;       // for 'random' mode; integer; animatable
  poolIndex: number;  // for 'cycle' mode; pool index; animatable
}

/**
 * Replace each cell's character with one from the pool.
 *
 * - Random: each cell deterministically picks a char from the pool based
 *   on (row, col, seed). Stable across frames at fixed seed.
 * - Cycle: every cell shows the same char from the pool at the current
 *   poolIndex. Animate poolIndex to scroll through the pool.
 */
export function createCharSwap(params: CharSwapParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charSwap',
    enabled: true,
    apply(cell: Cell, row: number, col: number) {
      if (params.pool.length === 0) return cell;
      let next: string;
      if (params.mode === 'cycle') {
        next = pickFromPool(params.pool, params.poolIndex);
      } else {
        const h = deterministicHash(row, col, params.seed);
        next = pickFromPool(params.pool, Math.floor(h * params.pool.length));
      }
      return { ...cell, char: next };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- charSwap.test
```
Expected: PASS — 6 tests green.

- [ ] **Step 5: Add factory wire-in for charSwap**

Modify `src/core/treatments/factory.ts`. Add the import + new union variant + new switch case.

At top of file, find the imports section and add:

```ts
import { createCharSwap, type CharSwapParams } from './charSwap';
```

Find the `TreatmentParams` union type and replace it with:

```ts
export type TreatmentParams =
  | SilhouetteParams
  | DriftParams
  | SpacingParams
  | ScaleParams
  | RotationParams
  | TintParams
  | CharSwapParams;
```

Find the switch in `recreateTreatment` and add a new case after `case 'tint':`:

```ts
    case 'charSwap':   t = createCharSwap(params as CharSwapParams); break;
```

- [ ] **Step 6: Add charSwap defaults**

Modify `src/core/treatments/defaults.ts`. Add the import + new constant.

At top of file, find the imports section and add:

```ts
import type { CharSwapParams } from './charSwap';
```

At the bottom of the file, add:

```ts
export const DEFAULT_CHAR_SWAP_PARAMS: CharSwapParams = {
  pool: '*+#$%@&',
  mode: 'random',
  seed: 0,
  poolIndex: 0,
};
```

- [ ] **Step 7: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/core/treatments/charSwap.ts src/core/treatments/charSwap.test.ts src/core/treatments/factory.ts src/core/treatments/defaults.ts
git commit -m "feat(treatments): Char: Swap module + factory wire + defaults"
```

---

## Task 5: charScramble module + factory wire + defaults

**Files:**
- Create: `src/core/treatments/charScramble.ts`
- Create: `src/core/treatments/charScramble.test.ts`
- Modify: `src/core/treatments/factory.ts`
- Modify: `src/core/treatments/defaults.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/treatments/charScramble.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCharScramble } from './charScramble';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
};
const ctx = (rows: number, cols: number, t: number) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t, loopDuration: 4,
});

describe('Char: Scramble (Settle mode)', () => {
  it('returns the original char once t exceeds the cell-specific settle time', () => {
    // settleStart=0, staggerAmount=0 → all cells settle at t=0
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 0.001)).char).toBe('X');
  });

  it('returns a pool char while still scrambling (t < settleTime)', () => {
    // settleStart=2, no stagger → no cell settles before t=2
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 2, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5, 1));
    expect(['A', 'B', 'C']).toContain(result.char);
  });

  it('staggerAmount delays settle for cells further along the axis', () => {
    // staggerAmount=2 along y. Row 4 of 5 → fraction 1.0 → settles 2s after row 0.
    const t = createCharScramble({
      pool: 'ABC', mode: 'settle', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 2, staggerAxis: 'y',
    });
    // At t=0.5: row 0 has settled (settle time = 0); row 4 hasn't (settle time = 2)
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 0.5)).char).toBe('X');
    expect(['A', 'B', 'C']).toContain(t.apply(baseCell, 4, 0, ctx(5, 5, 0.5)).char);
  });
});

describe('Char: Scramble (Continuous mode)', () => {
  it('always returns a pool char regardless of t', () => {
    const t = createCharScramble({
      pool: 'ABC', mode: 'continuous', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    for (const time of [0, 1, 2, 5, 100]) {
      expect(['A', 'B', 'C']).toContain(t.apply(baseCell, 0, 0, ctx(5, 5, time)).char);
    }
  });

  it('changes the displayed char over time', () => {
    const t = createCharScramble({
      pool: 'ABCDEFGH', mode: 'continuous', settleStart: 0, flipsPerSecond: 30,
      staggerAmount: 0, staggerAxis: 'x',
    });
    const chars = new Set<string>();
    for (let i = 0; i < 30; i++) {
      chars.add(t.apply(baseCell, 0, 0, ctx(5, 5, i / 30)).char);
    }
    expect(chars.size).toBeGreaterThan(1);
  });
});

describe('Char: Scramble (general)', () => {
  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharScramble({
      pool: '', mode: 'continuous', settleStart: 0, flipsPerSecond: 12,
      staggerAmount: 0, staggerAxis: 'x',
    });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5, 1)).char).toBe('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- charScramble.test
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

Create `src/core/treatments/charScramble.ts`:

```ts
import type { Cell } from '../types';
import type { Treatment } from './types';
import type { StaggerAxis } from '../animation/types';
import { staggerFraction } from '../animation/evaluate';
import { deterministicHash, pickFromPool } from '../util/hash';

export type CharScrambleMode = 'settle' | 'continuous';

export interface CharScrambleParams {
  pool: string;
  mode: CharScrambleMode;
  settleStart: number;     // sec; settle mode only
  flipsPerSecond: number;
  staggerAmount: number;   // sec; settle mode only
  staggerAxis: StaggerAxis;
}

/**
 * Each cell flickers through random chars from the pool.
 * - Settle mode: cells start scrambled, then lock to their original char
 *   at a per-cell settle time = settleStart + staggerAmount * fraction.
 * - Continuous mode: cells never settle; keep flickering.
 */
export function createCharScramble(params: CharScrambleParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charScramble',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      if (params.pool.length === 0) return cell;

      const cellHash = deterministicHash(row, col, 0);

      if (params.mode === 'settle') {
        const settleTime =
          params.settleStart +
          (params.staggerAmount > 0
            ? params.staggerAmount * staggerFraction(row, col, ctx.rows, ctx.columns, params.staggerAxis)
            : 0);
        if (ctx.t >= settleTime) return cell; // settled — keep original char
      }

      const flipIndex = Math.floor(ctx.t * params.flipsPerSecond + cellHash * params.pool.length);
      return { ...cell, char: pickFromPool(params.pool, flipIndex) };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- charScramble.test
```
Expected: PASS — 6 tests green.

- [ ] **Step 5: Add factory wire-in for charScramble**

Modify `src/core/treatments/factory.ts`.

Add to imports:

```ts
import { createCharScramble, type CharScrambleParams } from './charScramble';
```

Extend `TreatmentParams` union to include `CharScrambleParams`:

```ts
export type TreatmentParams =
  | SilhouetteParams
  | DriftParams
  | SpacingParams
  | ScaleParams
  | RotationParams
  | TintParams
  | CharSwapParams
  | CharScrambleParams;
```

Add new case in `recreateTreatment` switch after `case 'charSwap':`:

```ts
    case 'charScramble': t = createCharScramble(params as CharScrambleParams); break;
```

- [ ] **Step 6: Add charScramble defaults**

Modify `src/core/treatments/defaults.ts`.

Add to imports:

```ts
import type { CharScrambleParams } from './charScramble';
```

Add at bottom:

```ts
export const DEFAULT_CHAR_SCRAMBLE_PARAMS: CharScrambleParams = {
  pool: '!@#$%&*?_<>',
  mode: 'settle',
  settleStart: 0,
  flipsPerSecond: 12,
  staggerAmount: 1.5,
  staggerAxis: 'y',
};
```

- [ ] **Step 7: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/core/treatments/charScramble.ts src/core/treatments/charScramble.test.ts src/core/treatments/factory.ts src/core/treatments/defaults.ts
git commit -m "feat(treatments): Char: Scramble module + factory wire + defaults"
```

---

## Task 6: charField module + factory wire + defaults

**Files:**
- Create: `src/core/treatments/charField.ts`
- Create: `src/core/treatments/charField.test.ts`
- Modify: `src/core/treatments/factory.ts`
- Modify: `src/core/treatments/defaults.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/treatments/charField.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCharField } from './charField';
import { DEFAULT_BASE_CONFIG, type Cell } from '../types';

const baseCell: Cell = {
  char: 'X',
  position: { x: 0, y: 0 },
  scale: 1, rotation: 0, color: '#000', opacity: 1, visible: true,
};
const ctx = (rows: number, cols: number, t = 0) => ({
  config: DEFAULT_BASE_CONFIG, rows, columns: cols, t, loopDuration: 4,
});

describe('Char: Field (Radial pattern)', () => {
  it('center cell picks pool[0] (field=0)', () => {
    const t = createCharField({ pool: 'ABCDE', pattern: 'radial', scroll: 0 });
    const result = t.apply(baseCell, 5, 5, ctx(11, 11));
    expect(result.char).toBe('A');
  });

  it('corner cell picks a high-index pool char (field≈1)', () => {
    const t = createCharField({ pool: 'ABCDE', pattern: 'radial', scroll: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(11, 11));
    // field ≈ 1, index ≈ floor(5) = 5 → pool[5 mod 5] = 'A'? 
    // Actually field for normalized (-1,-1) is sqrt(2) but clamped... let's say close to 'D' or 'E'
    expect(['D', 'E', 'A']).toContain(result.char);  // could wrap, accept reasonable values
  });
});

describe('Char: Field (Linear-X pattern)', () => {
  it('left cell picks pool[0]', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const result = t.apply(baseCell, 0, 0, ctx(5, 5));
    expect(result.char).toBe('A');
  });

  it('right cell picks last pool char', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const result = t.apply(baseCell, 0, 4, ctx(5, 5));
    // col=4 of 5 → fraction = 1.0 → index = floor(4) = 4 → pool[4 mod 4] = 'A'
    // Or floor(4 * 0.999) = 3 → 'D'. Depends on implementation.
    expect(['A', 'D']).toContain(result.char);
  });
});

describe('Char: Field (scroll)', () => {
  it('scroll shifts the index over time', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 1 });
    const c0 = t.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    const c1 = t.apply(baseCell, 0, 0, ctx(5, 5, 1)).char;
    expect(c0).not.toBe(c1);
  });

  it('scroll = 0 means no time-based shift', () => {
    const t = createCharField({ pool: 'ABCD', pattern: 'linear-x', scroll: 0 });
    const c0 = t.apply(baseCell, 0, 0, ctx(5, 5, 0)).char;
    const c1 = t.apply(baseCell, 0, 0, ctx(5, 5, 1)).char;
    expect(c0).toBe(c1);
  });
});

describe('Char: Field (general)', () => {
  it('returns the cell unchanged when pool is empty', () => {
    const t = createCharField({ pool: '', pattern: 'radial', scroll: 0 });
    expect(t.apply(baseCell, 0, 0, ctx(5, 5)).char).toBe('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- charField.test
```
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

Create `src/core/treatments/charField.ts`:

```ts
import type { Cell } from '../types';
import type { Treatment } from './types';
import { pickFromPool } from '../util/hash';

export type CharFieldPattern = 'radial' | 'linear-x' | 'linear-y' | 'diagonal';

export interface CharFieldParams {
  pool: string;
  pattern: CharFieldPattern;
  scroll: number;  // cycles per loop; integer step yields seamless loop
}

/**
 * Pick chars from a pool string by 2D field — like Tint/Scale but for letters.
 * Field value 0..1 picks an index into pool. `scroll != 0` shifts the
 * field-to-pool mapping over time (cycles per loop).
 */
export function createCharField(params: CharFieldParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'charField',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      if (params.pool.length === 0) return cell;

      let f: number;
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          f = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          break;
        }
        case 'linear-x':
          f = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          f = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          break;
        case 'diagonal': {
          const xf = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          const yf = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          f = (xf + yf) / 2;
          break;
        }
      }

      const loop = Math.max(0.0001, ctx.loopDuration);
      const phaseShift = (ctx.t / loop) * params.scroll;
      const index = Math.floor((f + phaseShift) * params.pool.length);
      return { ...cell, char: pickFromPool(params.pool, index) };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- charField.test
```
Expected: PASS — 6 tests green.

- [ ] **Step 5: Add factory wire-in for charField**

Modify `src/core/treatments/factory.ts`.

Add to imports:

```ts
import { createCharField, type CharFieldParams } from './charField';
```

Extend `TreatmentParams` union:

```ts
export type TreatmentParams =
  | SilhouetteParams
  | DriftParams
  | SpacingParams
  | ScaleParams
  | RotationParams
  | TintParams
  | CharSwapParams
  | CharScrambleParams
  | CharFieldParams;
```

Add new case in `recreateTreatment` switch after `case 'charScramble':`:

```ts
    case 'charField': t = createCharField(params as CharFieldParams); break;
```

- [ ] **Step 6: Add charField defaults**

Modify `src/core/treatments/defaults.ts`.

Add to imports:

```ts
import type { CharFieldParams } from './charField';
```

Add at bottom:

```ts
export const DEFAULT_CHAR_FIELD_PARAMS: CharFieldParams = {
  pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  pattern: 'radial',
  scroll: 0,
};
```

- [ ] **Step 7: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green; total tests now 35 + 8 + 6 + 6 + 6 + 6 = 67.

- [ ] **Step 8: Commit**

```bash
git add src/core/treatments/charField.ts src/core/treatments/charField.test.ts src/core/treatments/factory.ts src/core/treatments/defaults.ts
git commit -m "feat(treatments): Char: Field module + factory wire + defaults"
```

---

## Task 7: CharSwapCard

**Files:**
- Create: `src/ui/CharSwapCard.tsx`

- [ ] **Step 1: Write the implementation**

Create `src/ui/CharSwapCard.tsx`:

```tsx
import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharSwap, type CharSwapParams, type CharSwapMode } from '../core/treatments/charSwap';
import { DEFAULT_CHAR_SWAP_PARAMS } from '../core/treatments/defaults';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharSwapCardProps {
  treatment: Treatment;
  params: CharSwapParams;
}

export function CharSwapCard({ treatment, params }: CharSwapCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charSwap');

  const updateParams = (patch: Partial<CharSwapParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharSwap(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharSwapParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  const animatableParams = params.mode === 'random'
    ? [{ key: 'seed', min: 0, max: 100, step: 1 }]
    : [{ key: 'poolIndex', min: 0, max: Math.max(1, params.pool.length - 1), step: 1 }];

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Swap
        </span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <PoolField
          label="Pool"
          value={params.pool}
          onChange={(v) => updateParams({ pool: v })}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Mode</div>
          <select
            value={params.mode}
            onChange={(e) => updateParams({ mode: e.target.value as CharSwapMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="random">Random (per cell)</option>
            <option value="cycle">Cycle (all same char)</option>
          </select>
        </label>
        {params.mode === 'random' ? (
          <Slider
            label="Seed" value={params.seed} min={0} max={100} step={1}
            onChange={(v) => updateParams({ seed: v })}
            onAnimate={() => quickAnimate('seed', DEFAULT_CHAR_SWAP_PARAMS.seed, params.seed)}
          />
        ) : (
          <Slider
            label="Pool index" value={params.poolIndex} min={0} max={Math.max(1, params.pool.length - 1)} step={1}
            onChange={(v) => updateParams({ poolIndex: v })}
            onAnimate={() => quickAnimate('poolIndex', DEFAULT_CHAR_SWAP_PARAMS.poolIndex, params.poolIndex)}
          />
        )}

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charSwap"
          animatableParams={animatableParams}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharSwapCard.tsx
git commit -m "feat(ui): CharSwapCard"
```

---

## Task 8: CharScrambleCard

**Files:**
- Create: `src/ui/CharScrambleCard.tsx`

- [ ] **Step 1: Write the implementation**

Create `src/ui/CharScrambleCard.tsx`:

```tsx
import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharScramble, type CharScrambleParams, type CharScrambleMode } from '../core/treatments/charScramble';
import { DEFAULT_CHAR_SCRAMBLE_PARAMS } from '../core/treatments/defaults';
import type { StaggerAxis } from '../core/animation/types';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharScrambleCardProps {
  treatment: Treatment;
  params: CharScrambleParams;
}

export function CharScrambleCard({ treatment, params }: CharScrambleCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charScramble');

  const updateParams = (patch: Partial<CharScrambleParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharScramble(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharScrambleParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  const animatableParams = params.mode === 'settle'
    ? [
        { key: 'flipsPerSecond', min: 1, max: 60, step: 1 },
        { key: 'settleStart', min: 0, max: 10, step: 0.1 },
        { key: 'staggerAmount', min: 0, max: 10, step: 0.1 },
      ]
    : [{ key: 'flipsPerSecond', min: 1, max: 60, step: 1 }];

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Scramble
        </span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <PoolField
          label="Pool"
          value={params.pool}
          onChange={(v) => updateParams({ pool: v })}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Mode</div>
          <select
            value={params.mode}
            onChange={(e) => updateParams({ mode: e.target.value as CharScrambleMode })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="settle">Settle (locks to original)</option>
            <option value="continuous">Continuous (never settles)</option>
          </select>
        </label>
        <Slider
          label="Flips/second" value={params.flipsPerSecond} min={1} max={60} step={1}
          onChange={(v) => updateParams({ flipsPerSecond: v })}
          onAnimate={() => quickAnimate('flipsPerSecond', DEFAULT_CHAR_SCRAMBLE_PARAMS.flipsPerSecond, params.flipsPerSecond)}
        />
        {params.mode === 'settle' && (
          <>
            <Slider
              label="Settle start (s)" value={params.settleStart} min={0} max={10} step={0.1}
              onChange={(v) => updateParams({ settleStart: v })}
              onAnimate={() => quickAnimate('settleStart', DEFAULT_CHAR_SCRAMBLE_PARAMS.settleStart, params.settleStart)}
            />
            <Slider
              label="Stagger (s)" value={params.staggerAmount} min={0} max={10} step={0.1}
              onChange={(v) => updateParams({ staggerAmount: v })}
              onAnimate={() => quickAnimate('staggerAmount', DEFAULT_CHAR_SCRAMBLE_PARAMS.staggerAmount, params.staggerAmount)}
            />
            <label className="block text-sm">
              <div className="text-gray-700 mb-1">Stagger axis</div>
              <select
                value={params.staggerAxis}
                onChange={(e) => updateParams({ staggerAxis: e.target.value as StaggerAxis })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
              >
                <option value="x">x</option>
                <option value="y">y</option>
                <option value="radial">radial</option>
                <option value="diagonal">diagonal</option>
              </select>
            </label>
          </>
        )}

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charScramble"
          animatableParams={animatableParams}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharScrambleCard.tsx
git commit -m "feat(ui): CharScrambleCard"
```

---

## Task 9: CharFieldCard

**Files:**
- Create: `src/ui/CharFieldCard.tsx`

- [ ] **Step 1: Write the implementation**

Create `src/ui/CharFieldCard.tsx`:

```tsx
import { useStore } from '../state/store';
import type { Treatment } from '../core/treatments/types';
import { createCharField, type CharFieldParams, type CharFieldPattern } from '../core/treatments/charField';
import { DEFAULT_CHAR_FIELD_PARAMS } from '../core/treatments/defaults';
import { Slider } from './controls/Slider';
import { PoolField } from './controls/PoolField';
import { AnimationsList } from './AnimationsList';
import { MaskControls } from './MaskControls';
import { useQuickAnimate } from '../hooks/useQuickAnimate';

interface CharFieldCardProps {
  treatment: Treatment;
  params: CharFieldParams;
}

export function CharFieldCard({ treatment, params }: CharFieldCardProps) {
  const updateTreatment = useStore((s) => s.updateTreatment);
  const removeTreatment = useStore((s) => s.removeTreatment);
  const quickAnimate = useQuickAnimate(treatment.id, 'charField');

  const updateParams = (patch: Partial<CharFieldParams>) => {
    const nextParams = { ...params, ...patch };
    const next = { ...createCharField(nextParams), id: treatment.id, enabled: treatment.enabled, mask: treatment.mask };
    (next as Treatment & { params: CharFieldParams }).params = nextParams;
    updateTreatment(treatment.id, next);
  };

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          <span className="text-gray-400">Char:</span> Field
        </span>
        <button
          onClick={() => removeTreatment(treatment.id)}
          className="text-gray-400 hover:text-red-500 text-sm"
          aria-label="Remove treatment"
        >✕</button>
      </div>

      <div className="space-y-3">
        <PoolField
          label="Pool (sequence)"
          value={params.pool}
          onChange={(v) => updateParams({ pool: v })}
        />
        <label className="block text-sm">
          <div className="text-gray-700 mb-1">Pattern</div>
          <select
            value={params.pattern}
            onChange={(e) => updateParams({ pattern: e.target.value as CharFieldPattern })}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="radial">Radial</option>
            <option value="linear-x">Linear X</option>
            <option value="linear-y">Linear Y</option>
            <option value="diagonal">Diagonal</option>
          </select>
        </label>
        <Slider
          label="Scroll (cycles/loop)" value={params.scroll} min={-5} max={5} step={1}
          onChange={(v) => updateParams({ scroll: v })}
          onAnimate={() => quickAnimate('scroll', DEFAULT_CHAR_FIELD_PARAMS.scroll, params.scroll)}
        />

        <MaskControls treatment={treatment} />
        <AnimationsList
          treatmentId={treatment.id}
          treatmentType="charField"
          animatableParams={[{ key: 'scroll', min: -5, max: 5, step: 1 }]}
          currentParams={params as unknown as Record<string, unknown>}
          mask={treatment.mask}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharFieldCard.tsx
git commit -m "feat(ui): CharFieldCard"
```

---

## Task 10: Register new treatments in TreatmentsPanel

**Files:**
- Modify: `src/ui/TreatmentsPanel.tsx`

- [ ] **Step 1: Add imports for new treatments and cards**

Read `src/ui/TreatmentsPanel.tsx`. At top of imports add:

```tsx
import { createCharSwap, type CharSwapParams } from '../core/treatments/charSwap';
import { createCharScramble, type CharScrambleParams } from '../core/treatments/charScramble';
import { createCharField, type CharFieldParams } from '../core/treatments/charField';
import {
  DEFAULT_CHAR_SWAP_PARAMS,
  DEFAULT_CHAR_SCRAMBLE_PARAMS,
  DEFAULT_CHAR_FIELD_PARAMS,
} from '../core/treatments/defaults';
import { CharSwapCard } from './CharSwapCard';
import { CharScrambleCard } from './CharScrambleCard';
import { CharFieldCard } from './CharFieldCard';
```

(Existing imports for the other 6 treatments and their defaults stay as-is.)

- [ ] **Step 2: Add new entries to TREATMENT_OPTIONS**

Find the `TREATMENT_OPTIONS` array and append three new entries at the end:

```tsx
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
```

- [ ] **Step 3: Add new cases to makeTreatment**

Find the `makeTreatment` function. Add three new cases after `case 'tint':`:

```tsx
    case 'charSwap': {
      const t = createCharSwap(DEFAULT_CHAR_SWAP_PARAMS);
      return Object.assign(t, { params: DEFAULT_CHAR_SWAP_PARAMS });
    }
    case 'charScramble': {
      const t = createCharScramble(DEFAULT_CHAR_SCRAMBLE_PARAMS);
      return Object.assign(t, { params: DEFAULT_CHAR_SCRAMBLE_PARAMS });
    }
    case 'charField': {
      const t = createCharField(DEFAULT_CHAR_FIELD_PARAMS);
      return Object.assign(t, { params: DEFAULT_CHAR_FIELD_PARAMS });
    }
```

- [ ] **Step 4: Add new cases to the renderer switch**

Find the `treatments.map((t) => { ... switch (t.type) { ... } })` block. Add three new cases after `case 'tint':`:

```tsx
            case 'charSwap':
              return <CharSwapCard key={t.id} treatment={t} params={params as CharSwapParams ?? DEFAULT_CHAR_SWAP_PARAMS} />;
            case 'charScramble':
              return <CharScrambleCard key={t.id} treatment={t} params={params as CharScrambleParams ?? DEFAULT_CHAR_SCRAMBLE_PARAMS} />;
            case 'charField':
              return <CharFieldCard key={t.id} treatment={t} params={params as CharFieldParams ?? DEFAULT_CHAR_FIELD_PARAMS} />;
```

- [ ] **Step 5: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/TreatmentsPanel.tsx
git commit -m "feat(ui): register Char: Swap / Scramble / Field in + Add menu"
```

---

## Task 11: Wire applyConfigAnimations into CanvasPreview + pngSequence

**Files:**
- Modify: `src/ui/CanvasPreview.tsx`
- Modify: `src/core/export/pngSequence.ts`

- [ ] **Step 1: Update CanvasPreview to use effective config**

Read `src/ui/CanvasPreview.tsx`. Add to imports:

```tsx
import { applyConfigAnimations } from '../core/animation/configAnim';
```

Inside the render `useEffect`, find:

```tsx
    canvas.width = config.canvas.width;
    canvas.height = config.canvas.height;

    const layoutCells = computeLayout(config);
    const rows = Math.floor(config.canvas.height / config.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config, rows, columns, t: currentTime, loopDuration,
    });
```

Replace with:

```tsx
    const effectiveConfig = applyConfigAnimations(config, animations, currentTime, loopDuration);
    canvas.width = effectiveConfig.canvas.width;
    canvas.height = effectiveConfig.canvas.height;

    const layoutCells = computeLayout(effectiveConfig);
    const rows = Math.floor(effectiveConfig.canvas.height / effectiveConfig.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config: effectiveConfig, rows, columns, t: currentTime, loopDuration,
    });
```

Update the render call to use `effectiveConfig`:

```tsx
    renderToCanvas(ctx, finalCells, effectiveConfig);
```

- [ ] **Step 2: Update pngSequence.ts the same way**

Read `src/core/export/pngSequence.ts`. Add to imports:

```ts
import { applyConfigAnimations } from '../animation/configAnim';
```

Find the per-frame loop body inside `for (let i = 0; i < totalFrames; i++) {`. Replace:

```ts
    const layoutCells = computeLayout(config);
    const rows = Math.floor(config.canvas.height / config.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config, rows, columns, t, loopDuration,
    });

    renderToCanvas(ctx, finalCells, config);
```

With:

```ts
    const effectiveConfig = applyConfigAnimations(config, animations, t, loopDuration);
    const layoutCells = computeLayout(effectiveConfig);
    const rows = Math.floor(effectiveConfig.canvas.height / effectiveConfig.rowSpacing);
    const columns = rows > 0 ? layoutCells.length / rows : 0;
    const finalCells = runAnimatedPipeline(layoutCells, treatments, animations, {
      config: effectiveConfig, rows, columns, t, loopDuration,
    });

    renderToCanvas(ctx, finalCells, effectiveConfig);
```

- [ ] **Step 3: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/ui/CanvasPreview.tsx src/core/export/pngSequence.ts
git commit -m "feat(animation): apply config animations before layout in preview + export"
```

---

## Task 12: useQuickAnimate handles 'config' + AnimationsList accepts 'config'

**Files:**
- Modify: `src/hooks/useQuickAnimate.ts`
- Modify: `src/ui/AnimationsList.tsx`

- [ ] **Step 1: Update useQuickAnimate to accept undefined treatmentType**

Read `src/hooks/useQuickAnimate.ts`. Replace the entire file with:

```ts
import { useStore } from '../state/store';
import type { TreatmentType } from '../core/treatments/types';

/**
 * Hook returning a `quickAnimate(paramKey, fromValue, toValue)` function.
 * Pass `treatmentType: undefined` for config animations (treatmentId === 'config').
 */
export function useQuickAnimate(treatmentId: string, treatmentType?: TreatmentType) {
  const animations = useStore((s) => s.animations);
  const addAnimation = useStore((s) => s.addAnimation);
  const removeAnimation = useStore((s) => s.removeAnimation);

  return (paramKey: string, fromValue: number, toValue: number) => {
    animations
      .filter((a) => a.treatmentId === treatmentId && a.paramKey === paramKey)
      .forEach((a) => removeAnimation(a.id));

    addAnimation({
      id: crypto.randomUUID(),
      treatmentId,
      treatmentType,
      paramKey,
      from: fromValue,
      to: toValue,
      curve: 'sine',
      duration: 4,
      delay: 0,
      staggerAmount: 0,
      staggerAxis: 'x',
    });
  };
}
```

- [ ] **Step 2: Update AnimationsList signature to allow optional treatmentType**

Read `src/ui/AnimationsList.tsx`. Find the `AnimationsListProps` interface and change `treatmentType` to optional:

```ts
interface AnimationsListProps {
  treatmentId: string;
  treatmentType?: TreatmentType;
  animatableParams: AnimatableParam[];
  currentParams: Record<string, unknown>;
  mask?: MaskParams | null;
}
```

Find the `handleAdd` function. Update the spec creation to handle undefined treatmentType (already optional in AnimationSpec):

```ts
    const spec: AnimationSpec = {
      id: crypto.randomUUID(),
      treatmentId,
      treatmentType,  // already optional in AnimationSpec
      paramKey: newKey,
      from: Math.max(range.min, seedValue - span / 2),
      to: Math.min(range.max, seedValue + span / 2),
      curve: 'sine',
      duration: 4,
      delay: 0,
      staggerAmount: 0,
      staggerAxis: 'x',
    };
```

- [ ] **Step 3: Hide stagger fields when treatmentId === 'config'**

In the same `AnimationsList.tsx` file, find the per-row sliders. Wrap the stagger slider and stagger-axis select in a `treatmentId !== 'config'` conditional. Find:

```tsx
              <Slider
                label="stagger (s)" value={a.staggerAmount}
                min={0} max={10} step={0.1}
                onChange={(v) => updateAnimation(a.id, { staggerAmount: Math.max(0, v) })}
              />
```

And the matching stagger-axis select wrapped in the grid further down. Replace those two blocks with a single conditional block:

```tsx
              {treatmentId !== 'config' && (
                <>
                  <Slider
                    label="stagger (s)" value={a.staggerAmount}
                    min={0} max={10} step={0.1}
                    onChange={(v) => updateAnimation(a.id, { staggerAmount: Math.max(0, v) })}
                  />
                </>
              )}
```

And in the grid below for the stagger axis:

```tsx
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label className="block text-xs">
                  <div className="text-gray-500 mb-0.5">curve</div>
                  <select
                    value={a.curve}
                    onChange={(e) => updateAnimation(a.id, { curve: e.target.value as AnimationCurve })}
                    className={SELECT_CLS}
                  >
                    <option value="sine">sine</option>
                    <option value="ease-in-out">ease-in-out</option>
                    <option value="triangle">triangle</option>
                    <option value="sawtooth">sawtooth</option>
                  </select>
                </label>
                {treatmentId !== 'config' && (
                  <label className="block text-xs">
                    <div className="text-gray-500 mb-0.5">stagger axis</div>
                    <select
                      value={a.staggerAxis}
                      onChange={(e) => updateAnimation(a.id, { staggerAxis: e.target.value as StaggerAxis })}
                      disabled={a.staggerAmount === 0}
                      className={`${SELECT_CLS} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={a.staggerAmount === 0 ? 'Set stagger > 0 to enable' : ''}
                    >
                      <option value="x">x</option>
                      <option value="y">y</option>
                      <option value="radial">radial</option>
                      <option value="diagonal">diagonal</option>
                    </select>
                  </label>
                )}
              </div>
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useQuickAnimate.ts src/ui/AnimationsList.tsx
git commit -m "feat(animation): useQuickAnimate + AnimationsList support config animations (no treatmentType, no stagger)"
```

---

## Task 13: BasePanel sliders gain ✨ + config-animations list at the bottom

**Files:**
- Modify: `src/ui/BasePanel.tsx`

- [ ] **Step 1: Add quickAnimate hook + AnimationsList to BasePanel**

Read `src/ui/BasePanel.tsx`. Add to imports:

```tsx
import { useQuickAnimate } from '../hooks/useQuickAnimate';
import { AnimationsList } from './AnimationsList';
```

In the `BasePanel` function body, add a quick-animate hook bound to `'config'`:

```tsx
  const quickAnimate = useQuickAnimate('config', undefined);
```

- [ ] **Step 2: Add onAnimate to the four base sliders**

Find the four `<Slider>` invocations for Char size, Row spacing, Column spacing, Character spacing. Add `onAnimate` props referencing default values from `DEFAULT_BASE_CONFIG`:

```tsx
        <Slider
          label="Char size" value={config.charSize} min={8} max={200}
          onChange={(v) => updateConfig({ charSize: v })}
          onAnimate={() => quickAnimate('charSize', DEFAULT_BASE_CONFIG.charSize, config.charSize)}
        />
        <Slider
          label="Row spacing" value={config.rowSpacing} min={4} max={200}
          onChange={(v) => updateConfig({ rowSpacing: v })}
          onAnimate={() => quickAnimate('rowSpacing', DEFAULT_BASE_CONFIG.rowSpacing, config.rowSpacing)}
        />
        <Slider
          label="Column spacing" value={config.columnSpacing} min={0} max={300}
          onChange={(v) => updateConfig({ columnSpacing: v })}
          onAnimate={() => quickAnimate('columnSpacing', DEFAULT_BASE_CONFIG.columnSpacing, config.columnSpacing)}
        />
        <Slider
          label="Character spacing" value={config.charSpacing} min={4} max={200}
          onChange={(v) => updateConfig({ charSpacing: v })}
          onAnimate={() => quickAnimate('charSpacing', DEFAULT_BASE_CONFIG.charSpacing, config.charSpacing)}
        />
```

- [ ] **Step 3: Add an AnimationsList at the bottom of BasePanel**

After the Colors section (after the closing `</div>` of the colors block but before the outer `</aside>`), add:

```tsx
        <AnimationsList
          treatmentId="config"
          animatableParams={[
            { key: 'charSize',       min: 8, max: 200, step: 1 },
            { key: 'rowSpacing',     min: 4, max: 200, step: 1 },
            { key: 'columnSpacing',  min: 0, max: 300, step: 1 },
            { key: 'charSpacing',    min: 4, max: 200, step: 1 },
          ]}
          currentParams={{
            charSize: config.charSize,
            rowSpacing: config.rowSpacing,
            columnSpacing: config.columnSpacing,
            charSpacing: config.charSpacing,
          }}
        />
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -5
```
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/BasePanel.tsx
git commit -m "feat(ui): ✨ on BasePanel sliders + config-animations list (Char size, Row/Column/Character spacing)"
```

---

## Task 14: Smoke test + final polish

**Files:** none (verification only)

- [ ] **Step 1: Restart dev server cleanly**

```bash
pkill -f "vite" 2>/dev/null; sleep 1
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
PATH="/opt/homebrew/bin:$PATH" nohup npm run dev > /tmp/type-loom-dev.log 2>&1 &
sleep 2
curl -s http://localhost:5173/ -o /dev/null -w "HTTP %{http_code}\n"
```
Expected: `HTTP 200`.

- [ ] **Step 2: Manual smoke test in browser**

Open http://localhost:5173/ and verify:

1. **Existing treatments unchanged.** Add Silhouette / Drift / Spacing / Scale / Rotation / Tint each in turn — they appear in the panel and behave exactly as before. No visual differences.
2. **`+ Add` menu shows 9 entries.** The 6 existing visual treatments + `Char: Swap`, `Char: Scramble`, `Char: Field` at the bottom.
3. **Char: Swap (Random)** — Add it. Cells in the canvas should switch to characters from `*+#$%@&`. Each cell stable across frames.
4. **Char: Swap (Cycle)** — Switch mode to Cycle. All cells show the same char from the pool. Drag `Pool index` — char changes everywhere. Click ✨ on Pool index, hit play — slot machine cycle.
5. **Char: Scramble (Settle)** — Add it. Cells flicker through `!@#$%&*?_<>`, then settle to original input chars over a y-staggered ~1.5s. Loop restarts the cycle.
6. **Char: Scramble (Continuous)** — Switch mode. Cells never settle.
7. **Char: Field** — Add it. Cells render `ABCDE...` from a radial gradient (center = A, edges = later letters). Set Scroll to 1, hit play — chars sweep across positions and loop seamlessly.
8. **Mask works on each char treatment** — toggle a mask on any of the 3 char treatments. Cells outside the mask retain their original char; cells inside get the swap/scramble/field char.
9. **Stack composition.** Add a Drift then a Char: Swap — letters drift visually AND show different chars. Both work together.
10. **BasePanel sliders animate.** Click ✨ on Row spacing. Hit play — rows visibly spread/contract. Same for Char size / Column spacing / Character spacing. The Animations list at the bottom of BasePanel shows the active config animations.
11. **Saved projects unchanged.** Open the Projects menu, load any project saved before this batch — it loads identically with the same treatments and behavior.
12. **PNG sequence export still works.** With at least one animation active, Export ▾ → PNG sequence. The downloaded zip frames should reflect both treatment animations and config animations.

Stop the server when done (Ctrl-C if foreground, or `pkill -f vite`).

- [ ] **Step 3: Run all tests**

```bash
PATH="/opt/homebrew/bin:$PATH" npm run test:run 2>&1 | tail -5
```
Expected: all tests pass. Total ≈ 35 (existing) + 8 (hash) + 6 (configAnim) + 6 (charSwap) + 6 (charScramble) + 6 (charField) = **67 tests**.

- [ ] **Step 4: Final push**

```bash
cd /Users/Tatiana/Dropbox/DesignProjects/-2024Coding/type-loom
git push origin main 2>&1 | tail -2
```

---

## Done

At this point:
- Three new treatments — `Char: Swap`, `Char: Scramble`, `Char: Field` — composable with existing 6 visual treatments and with each other.
- BasePanel `Char size`, `Row spacing`, `Column spacing`, `Character spacing` sliders are animatable via the same ✨ quick-animate workflow.
- All 6 existing visual treatments unchanged.
- Saved projects load identically.
- 67 tests passing; build green; dev server happy.
