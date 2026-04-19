# Char-mutating treatments + animatable base grid — Design Spec

**Date:** 2026-04-19
**Status:** Draft (awaiting user review)
**Builds on:** [2026-04-19-type-loom-design.md](./2026-04-19-type-loom-design.md)

## Overview

This spec adds three new treatments that mutate **which character** a cell renders, alongside an extension of the animation system to also target **base-grid parameters**. The visual treatments (Silhouette, Drift, Spacing, Scale, Rotation, Tint) and existing UX are untouched.

The three new treatments are organized as a separate visual family in the UI, prefixed `Char:`:

- **`Char: Swap`** — replace cells with chars from a pool (random or cycling)
- **`Char: Scramble`** — flicker through random chars, then settle (or stay glitching)
- **`Char: Field`** — pick chars from a pool string by 2D field, like Tint for letters

The base-grid animation extension lets users animate `Char size`, `Row spacing`, `Column spacing`, and `Character spacing` directly via the existing `✨` Quick-Animate pattern.

## Motivation

Today the tool can shape, drift, scale, rotate, color, and mask letters — but it cannot change *which letters appear*. The reference compositions our typography library is inspired by (CAVALRY, GROWTH, Matrix-rain layouts) all use letter substitution, scrambling, or position-based glyph mapping as a core motion language. This spec opens that dimension while keeping the existing experience intact.

## Hard constraints

- **Purely additive.** No existing treatment changes behavior. No saved project changes meaning.
- **Existing tests remain green** (35/35). New tests are additive.
- **Existing UI is pixel-stable** for the parts the user already uses every day. The `+ Add` menu gains 3 items at the bottom; the BasePanel sliders gain a small `✨` button.
- **No new top-level concepts.** Reuses: animation system, mask system, stagger machinery, pool helpers.

## Audience

Same as the parent spec: primarily personal use, possibly shareable to other designers. Char treatments are aimed at users who already understand the visual treatments and want to compose letter-substitution effects in the same workflow.

## Architecture

### Cell mutation — minimal pipeline change

`Cell.char: string` already exists in the layout. Today only the layout pass writes it; the pipeline never touches it. The change: char-mutating treatments may write to `cell.char`. Visual treatments still write only `position / scale / rotation / color / opacity / visible`.

No new pipeline pass. The new treatments use the existing `runAnimatedPipeline` and the existing `Treatment` interface. Their `apply()` returns a cell with a different `char` property.

Stack-order semantics: **last writer wins.** Two char treatments stacked → the later one's char overrides. Visual + char treatments commute (different properties, no interaction).

### Char source — `PoolField` shared component

A small shared UI component used by all 3 char-treatment cards:

- A `<select>` of presets: `Uppercase A–Z`, `Lowercase a–z`, `Letters` (both cases), `Numbers`, `Symbols`, `Custom`
- Selecting a preset *seeds* an editable text field with the corresponding string
- The text field is always editable; editing automatically switches the dropdown to `Custom`
- The current pool string is persisted as part of the treatment params (`pool: string`)

Default pools per treatment are listed in the per-treatment sections below.

### Random helpers

A small shared helper module for deterministic-random per-cell picks (used by Swap/Random and Scramble):

```ts
function deterministicHash(row: number, col: number, seed: number): number  // returns 0..1
function pickFromPool(pool: string, index: number): string  // pool[index mod pool.length]
```

`deterministicHash` is the same `sin(row * 12.9898 + col * 78.233) * 43758.5453 → fract()` pattern already used by `Rotation`'s random pattern. Re-exported from a `src/core/util/hash.ts` so multiple treatments use the same primitive.

### Base-grid animation extension

The existing animation system targets a `treatmentId` + `paramKey`. Extended so `treatmentId` may also be the special string `'config'`, in which case the `paramKey` refers to a numeric field on `BaseGridConfig` (`charSize`, `rowSpacing`, `columnSpacing`, `charSpacing`).

Implementation:

- `AnimationSpec.treatmentId` continues to be a `string` — no type change.
- `AnimationSpec.treatmentType` becomes optional, omitted for config animations.
- A new helper `applyConfigAnimations(config, animations, t, loopDuration)` returns an "effective config" with animated values overlaid. Called from `CanvasPreview` and `pngSequence` *before* `computeLayout`.
- BasePanel `Slider` invocations gain `onAnimate` handlers (already supported by Slider) wired to a `useQuickAnimate('config', ...)` analogue.

The existing `addAnimation` / `removeAnimation` / `updateAnimation` actions need no changes — they already accept any AnimationSpec.

## The three treatments

### `Char: Swap`

Replace cells with chars from a pool.

**Module:** `src/core/treatments/charSwap.ts`
**Card:** `src/ui/CharSwapCard.tsx`
**TreatmentType union addition:** `'charSwap'`

**Params:**
| Field | Type | Default | Notes |
|---|---|---|---|
| `pool` | `string` | `"*+#$%@&"` | Char source pool |
| `mode` | `'random' \| 'cycle'` | `'random'` | See below |
| `seed` | `number` | `0` | Random mode only; integer that re-shuffles. Animatable. |
| `poolIndex` | `number` | `0` | Cycle mode only; which char shows. Animatable. |

**Random mode:** Each cell picks `pickFromPool(pool, floor(deterministicHash(row, col, seed) * pool.length))`. Stable across frames at fixed `seed`. Animating `seed` 0→pool.length produces a "twinkle / re-shuffle" animation.

**Cycle mode:** All cells in the masked region show `pickFromPool(pool, floor(poolIndex))`. Animating `poolIndex` 0→pool.length over the loop produces a slot-machine cycle through the pool.

**Animatable params:** `seed`, `poolIndex` (whichever is active for the current mode).

**Mask:** supported (the standard mask attached to any treatment).

### `Char: Scramble`

Cells flicker through random chars from the pool.

**Module:** `src/core/treatments/charScramble.ts`
**Card:** `src/ui/CharScrambleCard.tsx`
**TreatmentType union addition:** `'charScramble'`

**Params:**
| Field | Type | Default | Notes |
|---|---|---|---|
| `pool` | `string` | `"!@#$%&*?_<>"` | Char source pool |
| `mode` | `'settle' \| 'continuous'` | `'settle'` | See below |
| `settleStart` | `number` (sec) | `0` | Settle mode only; global delay before any cell starts settling |
| `flipsPerSecond` | `number` | `12` | How fast cells flicker through pool |
| `staggerAmount` | `number` (sec) | `1.5` | Settle mode only; per-cell time offset across grid (reuses existing stagger) |
| `staggerAxis` | `StaggerAxis` | `'y'` | Settle mode only |

**Settle mode:** Each cell has a per-cell settle time = `settleStart + staggerAmount × staggerFraction(row, col, axis)`. Before that time, the cell shows `pickFromPool(pool, floor(t × flipsPerSecond + cellHash))` — a flicker. After that time, the cell shows its layout-original char. Loop restarts the cycle automatically because `t` wraps to 0.

**Continuous mode:** The cell never settles. Always shows `pickFromPool(pool, floor(t × flipsPerSecond + cellHash))`. `staggerAmount`/`staggerAxis` ignored.

**Animatable params:** `flipsPerSecond`, `settleStart`, `staggerAmount`.

**Mask:** supported.

### `Char: Field`

Pick chars from a pool string by 2D field — like Tint/Scale but for characters.

**Module:** `src/core/treatments/charField.ts`
**Card:** `src/ui/CharFieldCard.tsx`
**TreatmentType union addition:** `'charField'`

**Params:**
| Field | Type | Default | Notes |
|---|---|---|---|
| `pool` | `string` | `"ABCDEFGHIJKLMNOPQRSTUVWXYZ"` | Char source string (order matters) |
| `pattern` | `'radial' \| 'linear-x' \| 'linear-y' \| 'diagonal'` | `'radial'` | Same set as Scale/Rotation/Tint |
| `scroll` | `number` | `0` | Cycles per loop (integer step). Same loop math as Spacing-rhythm Sine. Animatable. |

For each cell:
1. Compute field value `f` ∈ [0, 1] from `pattern` and (row, col).
2. `phaseShift = (t / loopDuration) × scroll`
3. `index = floor((f + phaseShift) × pool.length) mod pool.length`
4. `cell.char = pool[index]`

When `scroll == 0`, the field is purely spatial. When `scroll != 0` (integer), chars sweep across positions and the loop is seamless.

**Animatable params:** `scroll`.

**Mask:** supported.

## Base-grid animation extension

### Targets

The four numeric BasePanel sliders gain `✨` Quick-Animate buttons:

- `charSize` (range 8–200)
- `rowSpacing` (range 4–200)
- `columnSpacing` (range 0–300)
- `charSpacing` (range 4–200)

### Behavior

Clicking `✨` on, say, the `Row spacing` slider:
1. Adds an animation with `treatmentId: 'config'`, `paramKey: 'rowSpacing'`, `from: <DEFAULT_BASE_CONFIG.rowSpacing>`, `to: <current value>`, sine, 4s, no stagger.
2. Each frame, before layout, `applyConfigAnimations` overlays the animated value onto the live config.
3. Layout uses the effective config — cells reflow at the animated spacing.

### Stagger and config animations

`staggerAmount` is meaningless for config animations (config values aren't per-cell), so the AnimationsList for config animations hides the stagger fields. (Or simply: stagger=0 always for config animations.)

### Composition with treatments

Config animations resolve first (produce effective config), then layout, then treatment pipeline. Treatments see the post-layout cell positions as usual; they don't know whether the spacing was animated or static.

## UI changes — full enumeration

| Where | Change |
|---|---|
| `+ Add` dropdown in TreatmentsPanel | Three new entries appended at bottom: `Char: Swap`, `Char: Scramble`, `Char: Field`. Existing 6 unchanged. |
| New treatment cards | Three new cards, same visual layout as existing cards. Title shows `Char:` in muted gray + name in normal weight. |
| BasePanel `Char size` slider | Gains `✨` button (uses existing Slider's `onAnimate` prop). |
| BasePanel `Row spacing` slider | Gains `✨` button. |
| BasePanel `Column spacing` slider | Gains `✨` button. |
| BasePanel `Character spacing` slider | Gains `✨` button. |
| Existing 6 visual treatment cards | Unchanged. |
| Existing canvas / timeline / project menu / export menu | Unchanged. |

## Persistence (saved projects)

- The `SerializedTreatment` type already supports any `TreatmentType` and any `params` shape — no schema change needed.
- Char treatments serialize their `pool / mode / etc.` exactly like visual treatments serialize theirs.
- Config animations serialize identically to treatment animations (just with `treatmentId: 'config'`).
- Schema version stays at `1`. Old projects load identically (no char treatments, no config animations → behavior unchanged).

## Testing

New unit tests:
- `src/core/util/hash.test.ts` — deterministic hash returns 0..1 and is stable.
- `src/core/treatments/charSwap.test.ts` — Random mode determinism, Cycle mode picks expected char.
- `src/core/treatments/charScramble.test.ts` — Settle math (cell with t > settleTime returns original char), Continuous mode never returns original.
- `src/core/treatments/charField.test.ts` — Radial pattern picks pool[0] at center, near-last char at corners; scroll shifts the index.
- `src/core/animation/configAnim.test.ts` (or extend `evaluate.test.ts`) — `applyConfigAnimations` overlays correctly.

Integration: existing pipeline tests still pass with new TreatmentType variants present in the union.

## Out of scope for this spec

- SVG / custom-glyph upload (renderer would need path rendering, not just `fillText`)
- Per-letter targeting by which letter ("animate only the Y's")
- Char treatments without a pool (e.g., random Unicode)
- Migrating animation `delay` field
- Read-from-previous-char composition modes
- New animation curves

## Implementation staging

Single plan, ~14 tasks:

1. **Foundation** (4 tasks)
   - Add `'charSwap' | 'charScramble' | 'charField'` to `TreatmentType` union.
   - Extract `deterministicHash` to `src/core/util/hash.ts` (used by Rotation already).
   - Add `applyConfigAnimations` helper + thread effective config through CanvasPreview and pngSequence.
   - Build shared `PoolField` UI component.

2. **`Char: Swap`** (2 tasks): module + card.

3. **`Char: Scramble`** (2 tasks): module + card.

4. **`Char: Field`** (2 tasks): module + card.

5. **Wire-up + UI polish** (3 tasks)
   - Register new treatments in TreatmentsPanel `+ Add` menu and renderer switch.
   - Add `onAnimate` to BasePanel sliders, wired to `useQuickAnimate('config', ...)` analogue.
   - Adjust AnimationsList to hide stagger fields for config animations.

6. **Smoke test + final review** (1 task).

Each task includes its own tests where applicable.
