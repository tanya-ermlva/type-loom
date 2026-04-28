# Gooey Poster Playground — Design

**Date:** 2026-04-27
**Location:** `type-loom/prototypes/gooey-poster/`
**Status:** Approved (verbal, in brainstorm session)

## Concept

Browser-based playground for making static and animated posters in the spirit of Feeld and Studio Gusto, where a gooey/blur effect is applied to a region defined by one of four mask sources: words, shape, gradient, or alpha image. Single editable paragraph, custom font upload, live preview, PNG export. Pure exploration — no project save/load, no galleries, persistence via `localStorage`.

## Use cases

- **Feeld-style:** static paragraph with selected words gooey-stylized.
- **Studio Gusto-style:** text with a moving shape blob participating in the gooey.
- **Top-to-bottom:** gradient mask with vertical sweep over text.
- **Custom alpha:** user uploads a PNG mask and animates its position.

## UI

Standard editor layout: top bar (project name, Export menu) → canvas left / right panel.

The canvas shows a live preview of the poster. Interactive overlays on the canvas depend on the active mask source:

- **Words mode:** hover highlights words; click toggles inclusion.
- **Shape mode:** draggable shape with corner resize handles.
- **Gradient mode:** draggable start/end points.
- **Image mode:** uploaded alpha rendered semi-transparent, draggable; scale handles.

The right panel groups: Mask Source (tabs) → Effect (blur/threshold) → Animation (toggle + duration/mode) → Text (size, line-height, alignment, color, font upload) → Background (color picker, aspect ratio).

Double-click in the text area enters `contenteditable`; Esc exits. Only one mask source is active at a time; switching sources does NOT lose state of the others.

## Data model

Single Zustand store with one `Poster` object:

```ts
type Poster = {
  text: string;
  font: 'system' | { name: string; objectUrl: string };
  fontSize: number;
  lineHeight: number;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';

  background: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | 'free';

  activeSource: 'words' | 'shape' | 'gradient' | 'image';
  sources: {
    words: { selectedWordIds: string[] };
    shape: {
      kind: 'circle' | 'rect' | 'blob';
      x: number; y: number; width: number; height: number;
      animatePath: 'none' | 'horizontal' | 'vertical' | 'circular';
      animateAmplitude: number;
    };
    gradient: {
      angle: number; startOffset: number; endOffset: number;
      animateDirection: 'none' | 'forward' | 'reverse';
      animateRange: number;
    };
    image: {
      url: string | null;
      x: number; y: number; scale: number; rotation: number;
      animatePath: 'none' | 'horizontal' | 'vertical' | 'circular';
      animateAmplitude: number;
    };
  };

  effect: { blur: number; threshold: number; offset: number };
  animation: { enabled: boolean; duration: number; mode: 'pingpong' | 'loop' };
};
```

State persisted via Zustand `persist` middleware to `localStorage`. Object URLs (uploaded images, fonts) do NOT persist — UI shows a non-blocking warning when reload loses them.

## Rendering pipeline

Two distinct rendering paths depending on the active mask source.

### Words mode (per-span filter)

Text is split into words. Each word is rendered as a `<span class="word">`; selected words receive an additional `gooey` class that applies `filter: url(#gooey)`. No mask layer needed.

### Shape / Gradient / Image modes (two-layer + CSS mask)

Two text layers are stacked:
- Layer 1 (clean) — text rendered normally.
- Layer 2 (gooey) — same text with `filter: url(#gooey)`, on top, with a `mask-image` derived from the active source.

Where the mask is opaque, layer 2 is visible and the text appears gooey. Where the mask is transparent, layer 1 shows through and the text is clean. Same text in both layers means glyphs align exactly.

Mask sources map to `mask-image`:
- Shape → `radial-gradient(...)` for circles, generated SVG `mask` for rects/blobs.
- Gradient → `linear-gradient(...)` with the chosen angle and offsets.
- Image → `url(uploadedObjectUrl)`.

## Animation

A single global `requestAnimationFrame` loop runs while `animation.enabled` is true. Computed `t ∈ [0..1]` (from `pingpong` or `loop` mode + duration) is written to CSS custom properties on the canvas root:

- `--mask-x`, `--mask-y` for shape/image translation.
- `--mask-pos` for gradient offset along its axis.

Browser interpolates the mask via these CSS variables. No per-frame JavaScript reflow except updating CSS variable values. Words mode is static-only in v1.

`MaskAnimator` is encapsulated such that an arbitrary `t` can be set externally — this is the seam for future video export (frame-by-frame snapshot at known `t`s).

## Performance notes

SVG filters rasterize on CPU/Skia, so filter area matters. The gooey filter is applied to the layer or the per-word spans, not the whole canvas. `will-change: filter` is set on layer-gooey to encourage caching. If preview lags during heavy editing, the canvas can be downscaled via `transform: scale(...)` while editing, restored on idle. Not implemented preemptively.

## Export

**v1:** PNG export via `html-to-image`. Top-bar → Export → PNG → file downloads.

**v2:** Video export. Architecture is ready (MaskAnimator can be stepped externally). Implementation TBD between `MediaRecorder` (cheap, lower-quality) or `ffmpeg.wasm` (heavier, higher-quality MP4).

## File layout

```
type-loom/prototypes/gooey-poster/
├── index.html
├── main.tsx
├── style.css
├── App.tsx
├── types.ts
├── store.ts
├── components/
│   ├── Editor.tsx
│   ├── Canvas.tsx
│   ├── PosterText.tsx
│   ├── GooeyFilter.tsx
│   ├── overlays/
│   │   ├── WordsOverlay.tsx
│   │   ├── ShapeOverlay.tsx
│   │   ├── GradientOverlay.tsx
│   │   └── ImageOverlay.tsx
│   └── panel/
│       ├── Panel.tsx
│       ├── MaskSourceTabs.tsx
│       ├── EffectControls.tsx
│       ├── AnimationControls.tsx
│       ├── TextControls.tsx
│       └── BackgroundControls.tsx
├── hooks/
│   ├── useMaskAnimator.ts
│   └── useFontUpload.ts
└── lib/
    ├── words.ts
    └── exportPng.ts
```

Stack matches Type Loom: React 19, TypeScript, Tailwind 4, Zustand. New entry registered in `vite.config.ts` under `build.rollupOptions.input`.

## Scope

### In v1

- Single editable paragraph (one text block).
- Custom font upload (`.woff2` / `.ttf`) via `FontFace` API; system font fallback.
- All four mask sources, each with its own state.
- Global gooey effect parameters (blur, threshold, offset).
- Animation toggle with horizontal / vertical / circular sweep presets for shape/image; offset sweep for gradient.
- Solid-color background; aspect ratio presets (1:1, 4:5, 9:16, free).
- Export to PNG.
- `localStorage` persistence.

### Not in v1

- Video export (architecture seam present; implementation deferred).
- Multiple simultaneous mask sources (one active at a time).
- Keyframe animation (only parametric sweeps).
- Multiple posters / gallery.
- Undo/redo.
- Background images or gradients.
- Multiple text blocks.
