# Cluster A — Visual range (shapes + blend modes + presets) — Design Spec

**Date:** 2026-04-20
**Status:** Draft (awaiting user review)
**Builds on:** [2026-04-19-type-loom-design.md](./2026-04-19-type-loom-design.md), [2026-04-19-char-treatments-design.md](./2026-04-19-char-treatments-design.md)

## Overview

This spec adds three purely-additive visual extensions to Type Loom:

1. **Five new Silhouette shapes** — diamond, hourglass, wave, X, circle — alongside the existing lens.
2. **Silhouette set-operation blend modes** — `replace / union / intersect / subtract` so multiple Silhouette treatments compose into compound shapes.
3. **Tint blend modes** — `normal / multiply / screen / overlay / add` for proper color composition when Tints stack.
4. **Six hand-curated preset compositions** — shown quietly as an "Examples" section inside the existing Projects menu.

None of the 9 existing treatments change behavior in the absence of the new options. Saved projects load unchanged. Build and test suite stay green.

## Motivation

Today's Silhouette ships only one shape (lens), and stacked Silhouettes or Tints fall back to last-writer-wins composition. That limits expressive range. Three targeted additions — more shape vocabulary, two flavors of blend math, and a quiet preset library — multiply what composers can produce without changing the architecture.

## Hard constraints

- **Purely additive.** Existing treatments behave identically when the new options are at their default values (`shape: 'lens'`, `blendMode: 'replace'`/`'normal'`).
- **Saved projects load unchanged.** New fields are optional with sensible defaults on load.
- **35+ existing tests stay green.** Tests are added, never rewritten.
- **No new top-level UI surface.** All new UI lives inside existing cards / menus.

## Architecture

### Silhouette — five new shapes

Extend `SilhouetteShape` type:

```ts
export type SilhouetteShape = 'lens' | 'diamond' | 'hourglass' | 'wave' | 'x' | 'circle';
```

Each shape is a distance function in the normalized (`nx, ny`) grid space where `nx, ny ∈ [−1, 1]`:

| Shape | Distance formula | Notes |
|---|---|---|
| `lens` *(existing)* | `sqrt(nx² + ny²)` | Radial circle |
| `diamond` | `|nx| + |ny|` | Manhattan distance → rhombus |
| `hourglass` | `min( sqrt(nx² + (ny + offset)²), sqrt(nx² + (ny − offset)²) )` with `offset = 0.5` | Two circles stacked vertically |
| `wave` | `|ny − 0.6·sin(nx·π·2)|` | Horizontal band that sinusoidally waves |
| `x` | `min(|nx − ny|, |nx + ny|)` | Two diagonal beams crossing |
| `circle` | `sqrt(nx² + ny²)` with default softness 0 (hard edge) | Equivalent to lens but seeded harder |

All shapes reuse the existing `size`, `softness`, `invert` params unchanged. The soft-edge fade math is identical across shapes — only the distance function differs.

### Silhouette — set-operation blend modes

New field on `SilhouetteParams`:

```ts
export type SilhouetteBlendMode = 'replace' | 'union' | 'intersect' | 'subtract';

export interface SilhouetteParams {
  shape: SilhouetteShape;
  size: number;
  softness: number;
  invert: boolean;
  blendMode: SilhouetteBlendMode;  // NEW, default 'intersect' (preserves existing multi-Silhouette multiplicative behavior)
}
```

To compose silhouette coverage independently of Tint's `opacity` work, add a new field to `Cell`:

```ts
export interface Cell {
  // ...existing fields
  silhouetteCoverage: number;  // NEW — 0..1, default 1 (fully visible). Separate from opacity.
}
```

Silhouette treatments operate on `cell.silhouetteCoverage` instead of `cell.opacity`:

| `blendMode` | Formula (`c_prev = cell.silhouetteCoverage`, `c_this = shape coverage 0..1`) |
|---|---|
| `replace` | `c_new = c_this` |
| `union` | `c_new = 1 − (1 − c_prev)(1 − c_this)` |
| `intersect` | `c_new = c_prev × c_this` |
| `subtract` | `c_new = c_prev × (1 − c_this)` |

`invert` flips `c_this` before blending.

At the end of the pipeline (in `renderToCanvas`), the cell's final opacity is multiplied by `silhouetteCoverage`:

```ts
const renderedOpacity = cell.opacity * cell.silhouetteCoverage;
```

If `renderedOpacity <= 0`, skip drawing. This keeps Silhouette and Tint opacity logic independent — they can be reordered freely without interference.

**Initial value:** layout pass sets `silhouetteCoverage = 1` on every cell (fully visible).

**Impact on existing projects:** default is `intersect`. A single Silhouette: `c_prev = 1`, `c_new = 1 × c_this = c_this` — same coverage as today. Two stacked Silhouettes: `c_new = c1 × c2` — same multiplicative behavior as today. Zero visual difference for existing projects. New users get natural "all masks apply together" behavior by default.

### Tint — color blend modes

New field on `TintParams`:

```ts
export type TintBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

export interface TintParams {
  mode: TintMode;           // 'opacity' | 'color'
  pattern: TintPattern;
  blendMode: TintBlendMode; // NEW, default 'normal', only used in 'color' mode
  // existing fields
}
```

Only affects Tints running in `color` mode. Per-channel math (treating `a` = previous cell.color channel 0..1, `b` = this Tint's target channel 0..1):

| Mode | Formula (per channel) |
|---|---|
| `normal` | `b` (replace — current behavior) |
| `multiply` | `a × b` |
| `screen` | `1 − (1 − a)(1 − b)` |
| `overlay` | `a < 0.5 ? 2ab : 1 − 2(1 − a)(1 − b)` |
| `add` | `min(1, a + b)` |

The lerpHexColor utility (already present in `tint.ts`) stays for interpolation between `colorA` and `colorB`. The blend applies AFTER the interpolation, combining the interpolated target color with `cell.color`.

Implementation: extract a `blendChannels(a, b, mode)` helper + a `blendHexColors(prev, next, mode)` wrapper. Small, ~40 lines.

**Impact on existing Tints:** `blendMode` defaults to `normal`. `normal` replaces — same as today. Zero visual change unless the user switches mode.

### Presets — "Examples" in Projects menu

A new top-level constant exported from a new file `src/core/presets/examples.ts`:

```ts
import type { ProjectSnapshot } from '../persistence/serialize';

export interface Example {
  id: string;                    // stable id for de-dup / routing
  name: string;
  description: string;           // shown in hover/tooltip
  snapshot: ProjectSnapshot;     // full project state, same shape as saved projects
}

export const EXAMPLES: Example[] = [
  { id: 'cavalry',   name: 'Cavalry',   description: '…', snapshot: {...} },
  // six total
];
```

The six examples:

| id | Name | Shape & effect | Input |
|---|---|---|---|
| `cavalry` | **Cavalry** | Lens silhouette + Spacing rhythm (tight-middle, amplitude 0.6) + warm palette (forest/cream) | `CAVALRY` |
| `together` | **Together** | Sine Spacing + scroll animation 0→1 sawtooth + diagonal stagger | `TOGETHER` |
| `tapestry` | **Tapestry** | Hourglass silhouette + monochrome + tight char spacing | `OK` |
| `growth` | **Growth** | Drift (both axes) + Scale (linear-x) + perspective-y rotation | `GROWTH` |
| `matrix` | **Matrix rain** | Char: Scramble (settle, y-stagger 2s) + dark palette + alphabet pool | `WAKE UP` |
| `noise` | **Color noise** | Char: Swap (random) + Tint color multiply + radial Tint overlay | `FOCUS` |

Each snapshot is a hand-crafted `ProjectSnapshot` object constructed literally in code. No build-time generation, no external JSON files.

**UI — inside existing Projects menu:**

```
[Untitled ▾]
├─ Save
├─ Save as new…
├─ New project
├─ ─────────────
├─ Recent (user's saved projects)
├─   • …
├─ ─────────────
├─ Examples
├─   • Cavalry
├─   • Together
├─   • Tapestry
├─   • Growth
├─   • Matrix rain
├─   • Color noise
├─ ─────────────
├─ Manage projects…
├─ Export .json
└─ Import .json…
```

Clicking an example calls `loadSnapshot(example.snapshot)` — same action that handles imported JSON. Loads as a new unsaved project (currentProjectId=null, currentProjectName="Untitled", isDirty=false). User can immediately tweak without overwriting saved work.

**No thumbnails in v1.** Just names. Keeps the spec small and the menu tight. Could add later.

## Persistence

- Existing saved projects don't have `blendMode` on Silhouette/Tint or `silhouetteCoverage` on Cell. On load, deserializer populates these fields with defaults (`'replace'`, `'normal'`, `1`).
- New saved projects include the new fields. Schema version stays at 1 — the additions are purely additive optional fields.

## Testing

New unit tests:
- `src/core/treatments/silhouette.test.ts` — already exists; add tests for each new shape (distance-function math) + set-op blend modes.
- `src/core/treatments/tint.test.ts` — new file. Tests for each of the 5 color blend modes.
- `src/core/render/canvas.test.ts` — optional; test that `silhouetteCoverage` multiplies into final opacity.

Rough test count added: ~15–20.

## Out of scope for this spec

- Live inputs (cursor, audio) — Cluster B, separate spec
- Keyframes — Cluster C, separate spec
- Power mode (formula editing) — separate initiative
- SVG / custom-glyph upload — separate initiative
- Thumbnails for examples — can add later if desired
- Categorization or search within Examples — 6 is small enough to scan

## Implementation staging

One plan, estimated ~10 tasks:

1. **Foundation** (2 tasks)
   - Add `silhouetteCoverage` to `Cell` + layout pass initialization + render pass multiplication.
   - Add new fields to `SilhouetteParams` (`blendMode`) and `TintParams` (`blendMode`) with defaults.

2. **Silhouette — 5 new shapes** (1 task)
   - Extend `SilhouetteShape` type + add distance-function cases to `createSilhouette`.
   - Tests for each shape.

3. **Silhouette — set-op blend modes** (1 task)
   - Implement the 4 blend-mode composition formulas using `silhouetteCoverage`.
   - Tests for each mode.

4. **SilhouetteCard UI** (1 task)
   - Add `shape` dropdown (6 options) and `blendMode` dropdown (4 options).

5. **Tint — blend modes** (1 task)
   - Extract `blendChannels` helper; wire into `createTint` for color mode.
   - Tests for each mode.

6. **TintCard UI** (1 task)
   - Add `blendMode` dropdown; hide when `mode === 'opacity'`.

7. **Presets — examples module** (1 task)
   - Create `src/core/presets/examples.ts` with the 6 hand-crafted snapshots.

8. **Presets — menu integration** (1 task)
   - Add `Examples` section to `ProjectsMenu` between Recent and Manage.

9. **Smoke test + final review** (1 task)

Estimated ~12–15 tasks when each shape and blend mode gets its own TDD cycle. Fits in one plan.
