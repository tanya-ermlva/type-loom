# Type Loom — Design Spec

**Date:** 2026-04-19
**Status:** Draft (awaiting user review)

## Overview

Type Loom is a browser-based generator for kinetic typography compositions. Users start with a wall of repeated text on a monospace grid, then stack visual treatments — silhouette, spacing rhythm, drift, scale, rotation, tint — to shape the composition. Any property can be animated over time. Outputs export as single PNGs or PNG sequences for use in motion software (After Effects, Premiere, ffmpeg).

## Audience

- **Primary:** the designer building it, for personal creative work and portfolio pieces.
- **Secondary:** other designers who may use the tool publicly if/when shared.

This shapes scope: the tool prioritizes expressive ceiling and a clean designer UX over multi-user features (no accounts, saving, sharing, or collaboration in v1).

## Core mental model

A composition has two layers:

1. **Base grid** — a uniform monospace grid of repeated text. Set once, applies everywhere.
2. **Treatments** — stacked modifiers that vary specific properties of cells across the composition (and optionally over time).

Treatments are purely additive. With zero treatments active, the canvas renders a uniform wall of text — the "honest baseline."

The math expression of this: every treatment is a function `f(row, col, t) → modifier`. With no treatments, every function returns its identity value (silhouette returns "draw," drift returns 0 offset, scale returns 1, etc.), so the wall renders at base values.

## Base grid

### Properties

| Property | Default | Notes |
|---|---|---|
| Canvas size | 1080 × 1080 px | Width × height. Presets (1080×1080, 1920×1080, 1080×1920) + custom |
| Character size | 40 px | Uniform font size |
| Vertical distance | font-natural line height | Distance between rows |
| Horizontal distance | widest glyph advance in font | Cell width (monospace) |
| Flow | per-row | `per-row` (each row independently fills) or `continuous` (input wraps across rows) |
| Foreground color | `#1a1a4d` (dark blue) | Letter color |
| Background color | `#f0ead6` (cream) | Canvas color |

### Input

- Single text field at the top of the UI.
- Default placeholder: `TYPE`.
- Linebreaks (`\n`) in the input are respected: each break starts a new tile in per-row mode, or forces a wrap in continuous mode.
- One input only. No multi-input compositions in MVP.

### Flow modes

**Per-row** (default): each row independently fills with `input + " "` repeated to fill canvas width. Every row starts with the same letter.

```
TYPE TYPE TYPE TYPE TYPE TYPE
TYPE TYPE TYPE TYPE TYPE TYPE
TYPE TYPE TYPE TYPE TYPE TYPE
```

**Continuous**: the input string + space repeats once and wraps across rows like a typewriter. Different rows start with different letters.

```
TYPE TYPE TYPE TYPE TYPE TYPE
 TYPE TYPE TYPE TYPE TYPE TYP
E TYPE TYPE TYPE TYPE TYPE TY
```

### Font handling

- Default: system sans-serif.
- User can upload `.otf` or `.ttf` files via drag-and-drop or click.
- On font change:
  - Glyph metrics re-measured (advance widths, ascent, descent, line height).
  - Base `vertical distance` and `horizontal distance` reset to the new font's natural values, unless the user has manually overridden them.
  - All treatments re-render against the new metrics.

## Treatments

Six treatment types, each modifying a single cell property. They stack in a user-defined order.

### 1. Silhouette
Modifies cell **visibility** (which cells draw vs. blank).
- `shape`: Lens / Diamond / Hourglass / Wave / X / Circle / Custom (formula)
- `size`: 0.0–1.0 (how much of the canvas the shape fills)
- `softness`: 0.0–1.0 (edge fade from solid to blank)
- `invert`: boolean (flip mask)

### 2. Spacing rhythm
Varies horizontal **cell width** across rows or regions.
- `pattern`: Tight-middle / Tight-edges / Linear-ramp / Sine / Custom
- `amplitude`: how dramatic the variation
- `frequency`: for periodic patterns
- `axis`: row / column / both

### 3. Drift
Offsets cells from their grid position.
- `axis`: X / Y / both
- `pattern`: Sine wave / Arc / Spiral / Perspective / Custom
- `amplitude`: max displacement in px
- `frequency`: for periodic patterns

### 4. Scale
Per-cell font size modifier.
- `pattern`: same family as Drift
- `range`: min and max scale factor (e.g. 0.5 → 1.5)

### 5. Rotation
Per-cell rotation angle in degrees.
- `pattern`: same family as Drift
- `range`: min and max degrees (e.g. -45 → 45)

### 6. Tint
Per-cell color/opacity modifier.
- `mode`: opacity-only / color
- `pattern`: linear gradient / radial / distance-from-point / custom
- `color stops`: when in color mode
- `range`: min and max opacity (in opacity mode)

### Treatment ordering

Treatments compose top-to-bottom in the stack. Order is significant for treatments that depend on cell positions:

- `[Drift] → [Silhouette]`: cells drift first, then silhouette masks at the *new* positions.
- `[Silhouette] → [Drift]`: silhouette masks at original grid positions, then visible cells drift.

The UI allows drag-to-reorder. Default order when adding new treatments: append to bottom of stack.

## Animation (per-property)

Every numeric slider has a clock icon (🕐). Clicking opens a small popover next to that slider:

- `from` value
- `to` value
- `curve`: Sine / Sawtooth / Triangle / Ease in/out / Custom
- `duration` (seconds)
- `delay` (seconds, optional)

Animated parameters show a small pulsing dot indicator on the slider. Click the dot to remove animation.

### Timeline

Bottom of the canvas:
- Scrubbable playhead.
- Play/pause controls.
- Loop length: auto-derived as the least-common-multiple of all active animation durations (so each one completes cleanly at the loop boundary), or user-overridable.
- Loop toggle (default on).

## Power mode

Each treatment has a collapsible "Formula" section showing the underlying expression:

```
density(x, y) = 1 - sqrt(x*x + y*y)
offset_x(x, y) = sin(y * 0.1) * amplitude
```

Editing a formula switches that treatment to "custom" mode. Selecting a preset auto-fills the formula. This serves the power user without complicating the default designer UX.

## Export

### PNG (single frame)
Captures the canvas at its current state (current playhead position) at the canvas's native resolution.

### PNG sequence
Opens a dialog:
- `frame count`: default = `loop_length × frame_rate`
- `frame rate`: default 30 fps
- `resolution scale`: 1x / 2x / 4x of canvas resolution
- Output: `.zip` of `frame_0001.png`, `frame_0002.png`, ...

Workflow assumption: user runs the sequence through ffmpeg / After Effects / Premiere to produce video.

## UI layout

Three-column layout with top bar and bottom timeline.

```
┌───────────────────────────────────────────────────────────────────┐
│  [Font ↑]   "TYPE_______________"   ▶ ⏸  [Export ▾]              │
├──────────────┬──────────────────────────────┬─────────────────────┤
│   BASE       │                              │   TREATMENTS        │
│   Canvas     │                              │   [+ Add]           │
│   Char size  │      live canvas preview     │                     │
│   V-distance │      (fits to view)          │   ▾ Silhouette      │
│   H-distance │                              │     shape, size...  │
│   Flow       │                              │   ▸ Drift           │
│   Colors     │                              │   ▸ Tint            │
├──────────────┴──────────────────────────────┴─────────────────────┤
│  ◀──────●─────────────────────▶   loop 4.0s   🔁                  │
└───────────────────────────────────────────────────────────────────┘
```

### Treatment panel interactions
- `[+ Add]` opens a menu of the six treatment types.
- Each treatment is a card with: drag handle, expand/collapse arrow, visibility toggle (eye), delete (✕).
- Expanded cards show inline controls (sliders, dropdowns, color pickers).
- Each numeric slider has the 🕐 animation icon.

### Base panel
- Sliders with numeric input fallback.
- Color swatches that open a color picker on click.
- Flow as a radio toggle.

### Top bar
- Font upload zone (drag-drop or click). Shows current font name.
- Input text field — wide, single-line by default; expands to multi-line when the user hits Enter.
- Play/pause and "jump to start" buttons.
- Export menu with the two options.

## Architecture (high-level)

The render pipeline runs in four passes:

1. **Layout pass** — compute baseline grid positions for each cell from `(canvas size, char size, V/H distance, font metrics, flow, input)`. Re-runs when the base grid or input or font changes.
2. **Animation pass** — for any animated parameters, evaluate at current `t`. Re-runs every animation frame.
3. **Treatment pass** — for each cell, run all active treatments in stack order, accumulating modifiers, producing a final `{x, y, scale, rotation, color, opacity, draw_or_skip}` per cell. Re-runs whenever a parameter changes or animation pass updates values.
4. **Render pass** — draw all visible cells to the canvas using their final values.

Performance implications:
- Font swap → layout + treatment + render.
- Slider drag → animation (if active) + treatment + render.
- Animation tick (no slider activity) → animation + treatment + render.
- Export PNG sequence → loop `t = 0..loop_length` running passes 2–4 per frame.

A 60×60 grid with all 6 treatments active should render at 60fps on a modern laptop. A 200×200 grid will need careful work (Web Workers, canvas batching, possibly WebGL).

## Out of scope for MVP

- Multi-input compositions (e.g. *TYPOGRAPHY IN* style with two separate word groups).
- Variations view (3×3 poster-grid generator).
- Saving/loading compositions to disk or browser storage.
- Account system / cloud sync.
- SVG export.
- Video (mp4/webm) export — sequence-to-video is delegated to user's ffmpeg/AE workflow.
- Variable font axes beyond standard weight (would add complexity to font handling).
- Public sharing/embedding.

## Open questions for implementation

- **Performance ceiling**: at what grid size does per-frame rendering become laggy? Initial target 60×60; profile and decide if Canvas2D suffices or WebGL is needed.
- **Color picker**: native browser picker vs. a custom one (e.g. for HSL precision)? Native is simpler; custom is nicer.
- **Custom-formula sandbox**: how to safely evaluate user-typed formulas? Use a small expression parser, not raw `eval()`.
- **Font metrics library**: roll our own using `<canvas>` measurement, or use `opentype.js` for richer metrics? Choose during build.
