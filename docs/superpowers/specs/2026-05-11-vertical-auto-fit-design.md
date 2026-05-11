# Vertical Auto-fit — Design

**Date:** 2026-05-11
**Location:** `type-loom/prototypes/pulse/`, `type-loom/prototypes/stack/`
**Status:** Awaiting user review

## Concept

When a composition's text would overflow or underfill its canvas vertically — or when a stack canvas can't be evenly tiled by atoms at their current aspect — auto-fit makes things fit. One global toggle, two coupled behaviors:

1. **Atom-level fit:** scale `lineHeight` and `interLineGap` so the text block fills the atom canvas vertically (with a small padding), centered.
2. **Stack-level tile-fit:** adjust atom display height so atoms tile the stack canvas exactly — no clipped partial atom at the bottom.

The two are linked: stack-level tile-fit changes each atom's effective canvas height, and the atom-level fit then makes the text fill that new height nicely.

## Problem statement (the screenshot)

When the Stack canvas is changed to a shape that the Pulse atom aspect doesn't divide cleanly into (e.g. switching to a square canvas with a wide atom aspect), the current code path produces:

```
atomCount = floor(stackH / naturalAtomDisplayH)
slotCount = ceil(stackH / naturalAtomDisplayH) + 1
```

— so the last visible slot is a *partial* atom whose content gets clipped by the canvas bottom edge. The user sees an atom's second line ("Resilience") cut in half. Separately, in Pulse view, manually changing `canvasHeight` while `lineHeight × lineCount` exceeds the canvas height also produces silent vertical overflow of the bottom line.

## Use cases

- **Stack canvas preset swap.** Switching from `wide → square` (or any preset that doesn't evenly tile the current atom aspect) shouldn't produce clipping.
- **Adding/removing a line in Pulse.** Two lines fit; adding a third should rescale `lineHeight + interLineGap` so all three fit without manual slider fiddling.
- **Changing atom `canvasHeight` in Pulse.** Dragging the Canvas H slider should keep the text block filling the canvas instead of overflowing or floating.
- **Authoring an "designed-loose" composition manually.** Toggle auto-fit off and use the sliders directly. Auto-fit is a mode, not a forced behavior.

## Non-goals

- **Horizontal auto-fit.** Lines that overflow horizontally (text wider than `canvasWidth`) are *not* in scope for v1. `fontSize` is not touched.
- **Bloom-stack.** Bloom-stack has its own state model and doesn't share the Composition. Out of scope.
- **Per-line independent fitting.** Auto-fit treats the text block as one unit; the line/gap ratio set by the user is preserved, and the block scales uniformly.
- **Word-flow / gooey-poster / other prototypes.** Pulse and Stack only.

## UI

### Pulse sidebar — Typography section

Existing controls ([prototypes/pulse/Sidebar.tsx:159-177](prototypes/pulse/Sidebar.tsx)) are extended with two new rows inserted between **Inter gap** and **Token sp**:

```
─── Typography ───────────────────────────────
Font size      [────●──]  136
Letter sp      [─●────]  −1.0%
Line ht        [────●─]  138.5 → 126.2   ← faded when auto-fit on; effective value shown
Inter gap      [●─────]  −8 →  −7.3      ← faded when auto-fit on; effective value shown
☑ Auto-fit vertical                       ← NEW toggle row
   Padding     [●─────]  5%               ← NEW, shown only when toggle is on
Token sp       [─●────]  51
```

- **Auto-fit toggle:** checkbox or switch labeled "Auto-fit vertical". Stored on the composition.
- **Padding slider:** range `0%`–`25%`, step `0.5%`, default `5%`. Represents fraction of `canvasHeight` reserved as empty space split equally above and below the text block. Only visible when toggle is on.
- **Line ht / Inter gap sliders when auto-fit is on:** rendered with reduced opacity. **Still draggable** — the user is setting the *ratio* between line height and gap; auto-fit scales both. The numeric display shows raw → effective (e.g. `138.5 → 126.2`) so the math stays visible.

### Stack sidebar — Atom count label

The existing "Atoms" badge in [prototypes/stack/Sidebar.tsx](prototypes/stack/Sidebar.tsx) (currently shows just the count) gains a status suffix:

- Auto-fit on: `7 atoms · auto-fitted`
- Auto-fit off: `7 atoms · floor (last clipped)` if the canvas doesn't divide cleanly, else `7 atoms` plain.

No new controls in Stack. The toggle lives only in Pulse and propagates to Stack via the shared composition.

## Data model

Two new fields on `Composition` ([prototypes/pulse/store.ts:85](prototypes/pulse/store.ts)):

```ts
interface Composition {
  // ... existing fields ...

  /**
   * When true, the atom's text block is scaled to fit canvasHeight (minus 2 × autoFitPadding),
   * centered vertically. lineHeight and interLineGap stored on the composition are treated
   * as a ratio between line and gap; auto-fit preserves the ratio and rescales both.
   * Stack tile-fit (atoms tiling the stack canvas exactly) is also gated by this flag.
   */
  autoFitVertical: boolean;        // default: true (new compositions)

  /**
   * Fraction of canvasHeight reserved as empty space, split equally above and below
   * the text block. 0 = text fills canvas exactly. 0.25 = 25% empty on top, 25% bottom.
   * Only consulted when autoFitVertical is true.
   */
  autoFitPadding: number;          // 0..0.25, default: 0.05
}
```

**Defaults:**
- New compositions: `autoFitVertical: true`, `autoFitPadding: 0.05`.
- Existing saved projects loaded from `localStorage` or `shared/projects.ts` that lack these fields: `autoFitVertical: false` (to preserve the visual state the user designed without auto-fit), `autoFitPadding: 0.05`. Loaders use a defensive default-spread pattern.

**Persistence:** Already handled by Pulse's existing `persist` middleware and `shared/projects.ts` JSON serialization. No new persistence code required.

## Architecture

### New: `prototypes/pulse/autoFit.ts`

Pure functions, no React, no DOM. Both deterministic and unit-testable.

```ts
/**
 * Atom-level fit. Given a canvas height, a number of lines, and the raw
 * lineHeight / interLineGap (which represent a *ratio* set by the user),
 * returns the scaled values that make the text block fill `canvasH × (1 - 2 × padding)`
 * exactly, centered with `topOffset` empty space above the first line.
 *
 * If naturalTotalH is 0 (lineCount 0 or both lineHeight and interLineGap 0),
 * returns raw values with topOffset = canvasH / 2 (degenerate, but doesn't crash).
 */
export function fitTextBlock(
  canvasH: number,
  lineCount: number,
  rawLineHeight: number,
  rawInterLineGap: number,
  padding: number,           // 0..0.5, fraction of canvasH
): {
  lineHeight: number;        // scaled
  interLineGap: number;      // scaled
  topOffset: number;         // y offset for the first line's bgY
};

/**
 * Stack-level tile-fit. Given the stack canvas size and an atom's natural aspect,
 * returns an atomCount that tiles the canvas best (rounded to nearest, ≥ 1) and
 * the adjusted display height + adjusted internal canvasHeight that makes each
 * atom's viewBox aspect match its rendered slot aspect (no letterbox, no distortion).
 *
 * adjustedAtomCanvasH is computed so that:
 *   adjustedAtomCanvasH / atomNaturalCanvasW === adjustedAtomDisplayH / stackW
 *
 * which means the SVG viewBox produced by stack atoms is shaped exactly like the
 * slot it renders into.
 */
export function fitAtomsToStack(
  stackW: number,
  stackH: number,
  atomNaturalCanvasW: number,
  atomNaturalCanvasH: number,
): {
  atomCount: number;
  atomDisplayH: number;        // pixel height in stack-canvas space
  adjustedAtomCanvasH: number; // internal canvas height for atom's viewBox
};
```

### New: `prototypes/pulse/autoFit.test.ts`

Vitest cases:
- **Exact fit:** `canvasH=270, lineCount=2, lineHeight=135, gap=0, padding=0` → `lineHeight=135, gap=0, topOffset=0`.
- **Overflow correction:** `canvasH=270, lineCount=2, lineHeight=138.5, gap=0, padding=0` → text fills exactly (scale ≈ 0.974).
- **Underflow:** `canvasH=400, lineCount=2, lineHeight=100, gap=10` → scale > 1.
- **Padding applied:** `canvasH=270, lineCount=2, lineHeight=135, padding=0.05` → top offset = 13.5, total block = 243.
- **Ratio preserved:** `canvasH=270, lineCount=3, lineHeight=100, gap=20` → returned `gap / lineHeight === 0.2` exactly.
- **Degenerate inputs:** `lineCount=0`, `canvasH=0`, `padding=0.5` (no room) — function returns sane values without throwing.
- **Tile-fit exact:** `stackW=1920, stackH=1080, atomW=1920, atomH=270` → `atomCount = round(1080/270) = 4`, `atomDisplayH = 270`, `adjustedAtomCanvasH = 270`.
- **Tile-fit needing flex:** `stackW=1000, stackH=1000, atomW=1920, atomH=270` → naturalDisplay ≈ 141, `atomCount = round(7.09) = 7`, `atomDisplayH = 142.857…`, `adjustedAtomCanvasH ≈ 274.3`.
- **Tile-fit minimum:** `stackH < naturalDisplay` → `atomCount = 1`, displayH = stackH.

### Edit: `prototypes/pulse/Atom.tsx`

At the top of the component ([Atom.tsx:65](prototypes/pulse/Atom.tsx)), destructure `autoFitVertical` and `autoFitPadding`. Compute:

```ts
const lineCount = lines.length;
const { lineHeight: effLineHeight, interLineGap: effGap, topOffset } = autoFitVertical
  ? fitTextBlock(canvasHeight, lineCount, lineHeight, interLineGap, autoFitPadding)
  : { lineHeight, interLineGap, topOffset: 0 };
```

Then in the render at [Atom.tsx:254](prototypes/pulse/Atom.tsx), replace:

```ts
const bgY = li * (lineHeight + interLineGap);
const baselineY = bgY + lineHeight * 0.8;
```

with:

```ts
const bgY = topOffset + li * (effLineHeight + effGap);
const baselineY = bgY + effLineHeight * 0.8;
```

Other references to `lineHeight` inside the render (e.g. the `<rect height={lineHeight} />` for backgrounds) use `effLineHeight`.

No changes to animation math, RAF loop, or layout.ts.

### Edit: `prototypes/stack/App.tsx`

Replace the atom-count derivation block ([stack/App.tsx:37-43](prototypes/stack/App.tsx)) with a branch on `baseComposition.autoFitVertical`:

```ts
const naturalAtomDisplayH = stackCanvasWidth * atomAspect;
const tile = baseComposition.autoFitVertical
  ? fitAtomsToStack(stackCanvasWidth, stackCanvasHeight,
                    baseComposition.canvasWidth, baseComposition.canvasHeight)
  : {
      atomCount: Math.max(1, Math.floor(stackCanvasHeight / Math.max(1, naturalAtomDisplayH))),
      atomDisplayH: naturalAtomDisplayH,
      adjustedAtomCanvasH: baseComposition.canvasHeight,
    };
const { atomCount, atomDisplayH, adjustedAtomCanvasH } = tile;
```

When building per-atom compositions ([stack/App.tsx:74-88](prototypes/stack/App.tsx)), include the adjusted canvas height so the atom's viewBox matches its slot:

```ts
return {
  ...baseComposition,
  canvasHeight: adjustedAtomCanvasH,    // ← NEW: makes atom viewBox match slot aspect
  blockColor: ...,
  // ... existing fields unchanged ...
};
```

Update `slotCount` ([stack/App.tsx:102](prototypes/stack/App.tsx)) to:

```ts
const slotCount = baseComposition.autoFitVertical && !scrollEnabled
  ? atomCount                              // exact tile, no overflow slot
  : Math.ceil(canvas.height / atomDisplayH) + (scrollEnabled ? 1 : 0);
```

(When scroll is enabled, we still need the +1 seam slot regardless of auto-fit — but the per-frame `cycleIdx` math at [stack/App.tsx:130-137](prototypes/stack/App.tsx) keeps atoms aligned because `atomDisplayH × atomCount` now equals `canvas.height` exactly.)

Shared widths measurement at [stack/App.tsx:94-97](prototypes/stack/App.tsx) is unchanged — the atom's text content is the same; only `canvasHeight` flexes.

### Edit: `prototypes/pulse/Sidebar.tsx`

In `TypographySection` ([Sidebar.tsx:159-177](prototypes/pulse/Sidebar.tsx)):

1. Read `autoFitVertical` and `autoFitPadding` from composition.
2. When auto-fit is on, compute the effective `lineHeight` and `interLineGap` for the display (using `fitTextBlock` or by reading from a memoized selector — see "Avoiding duplicate work" below). Pass these to the existing `Slider` component as a `display={...}` prop that shows both raw → effective.
3. Add disabled-style prop to the `Line ht` and `Inter gap` sliders when auto-fit is on (e.g. CSS `opacity: 0.5` on the slider track, draggable still).
4. After the `Inter gap` slider, render the new toggle row and (conditionally) the padding slider:

```tsx
<Toggle
  label="Auto-fit vertical"
  checked={c.autoFitVertical}
  onChange={(v) => update({ autoFitVertical: v })}
/>
{c.autoFitVertical && (
  <Slider label="Padding" value={c.autoFitPadding * 100}
    min={0} max={25} step={0.5}
    onChange={(v) => update({ autoFitPadding: v / 100 })}
    format={(v) => `${v.toFixed(1)}%`} />
)}
```

`Toggle` may already exist in the sidebar (used for `useStateC`, `trailsEnabled`, etc.) — reuse the same component.

### Edit: `prototypes/stack/Sidebar.tsx`

Where the atom count is currently displayed, append a status suffix derived from `autoFitVertical` + whether the natural aspect divides cleanly. One-line change to the existing JSX.

## Data flow

```
Pulse user toggles auto-fit ON
    ↓
composition.autoFitVertical = true  (Pulse store)
    ↓
    ├─── Pulse view ─────────────────────────────────────────
    │    Atom reads composition → fitTextBlock(canvasH, ...) → render
    │
    └─── Stack view ─────────────────────────────────────────
         App.tsx reads composition
            ↓
         fitAtomsToStack(stackW, stackH, atomW, atomH)
            → { atomCount, atomDisplayH, adjustedAtomCanvasH }
            ↓
         Per-atom composition built with canvasHeight = adjustedAtomCanvasH
            ↓
         Atom reads adjusted composition → fitTextBlock(adjustedCanvasH, ...) → render
```

The chain is unidirectional. No new stores, no new effects, no new RAF.

## Avoiding duplicate work

`fitTextBlock` runs once inside Atom per render. `fitAtomsToStack` runs once at the top of Stack's `App.tsx` per render. Both are O(1) arithmetic — no measurement, no DOM access — so memoization is unnecessary. The sidebar's "raw → effective" display can call `fitTextBlock` directly with the same arguments; results are identical.

## Edge cases & error handling

| Case | Behavior |
|---|---|
| `lineCount === 0` | `fitTextBlock` returns raw values with `topOffset = canvasH / 2`. No render anyway (no lines). |
| `canvasHeight === 0` | `fitTextBlock` returns raw values, `topOffset = 0`. Atom renders empty (degenerate but doesn't crash). |
| `padding ≥ 0.5` | Clamped to `0.49` inside `fitTextBlock` so target height is always positive. |
| Negative `interLineGap` (currently allowed via slider: `-20..60`) | Auto-fit preserves the ratio — `gap` stays negative-scaled. Visually equivalent to today's behavior, just scaled. |
| `stackH < naturalAtomDisplayH` | `fitAtomsToStack` returns `atomCount = 1`, `atomDisplayH = stackH`. Single atom fills stack, atom's internal aspect flexes. |
| Pulse atom aspect = stack aspect (clean divisor) | `atomCount` stays the same as `floor()` path; `adjustedAtomCanvasH === canvasHeight` (no change). Auto-fit is invisible. |
| Saved project loaded without `autoFitVertical` field | Loader defaults to `false` → preserves the project's designed look. User can flip the toggle on if desired. |

## Testing strategy

- **Unit tests** for `autoFit.ts` (see test list under "Architecture").
- **No new integration tests required** for v1. The existing Atom render tests (if any) keep passing because auto-fit is gated by a flag that defaults to off for legacy projects and runs through pure arithmetic.
- **Manual verification:**
  1. Open Pulse, toggle auto-fit on, drag `Canvas H` from 200 → 600 — text block stays centered and fills proportionally.
  2. Open Pulse, add a third line — text block rescales so all three fit without overflow.
  3. Open Stack, switch canvas preset wide → square → portrait — no clipped bottom atom in any preset.
  4. Toggle auto-fit off in Pulse — original clipping returns in Stack (signal that manual mode is active).

## Visible UI footprint summary

- **Pulse Typography section:** +1 toggle row, +1 conditional slider, faded styling on 2 existing sliders.
- **Stack Atoms label:** +status suffix on existing line.

That's it. No new panels, no new menus, no new modes.

## Files touched

| File | Change | Lines (approx) |
|---|---|---|
| `prototypes/pulse/autoFit.ts` | NEW | ~80 |
| `prototypes/pulse/autoFit.test.ts` | NEW | ~120 |
| `prototypes/pulse/store.ts` | Add 2 fields + defaults + loader fallback | ~10 |
| `prototypes/pulse/Atom.tsx` | Compute effective values, apply `topOffset` | ~10 |
| `prototypes/stack/App.tsx` | Branch atom-count math, pass `adjustedAtomCanvasH` | ~15 |
| `prototypes/pulse/Sidebar.tsx` | Toggle + padding slider + raw→effective display | ~25 |
| `prototypes/stack/Sidebar.tsx` | Atom count label suffix | ~5 |
| `prototypes/shared/projects.ts` | Default-spread fallback for legacy projects | ~5 |

**Total new code:** ~270 lines including tests.
