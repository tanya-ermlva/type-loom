# Pulse — Design

**Date:** 2026-05-10
**Location:** `type-loom/prototypes/pulse/`
**Status:** Awaiting user review

## Concept

Browser-based prototype focused on **one specific typographic move**: a 2-line text composition that pulses between two layout states, where colored line backgrounds stretch and contract together with the text. Each line has a single rectangular background that spans from the first token's left edge to the last token's right edge — when tokens spread, the rect stretches; when tokens cluster, it contracts.

Reference: a "Digital Freedom Dialogue / 8 — 11 June" composition with 4 stacked colored variants. This v1 implements only the horizontal pulse on a single block. The vertical discrete-scroll choreography that stacks multiple blocks comes in a future iteration.

## Use cases

- **Test-bed for typographic motion** — try different easings, stagger patterns, and per-line phase offsets to find a "feel" for discrete-scroll motion.
- **Layout-state explorer** — quickly try left/right/centered/justified per line per state to see which combinations read as a coherent move.
- **Reference composition reproduction** — pixel-faithfully recreate the Frame 241 reference at the centered-tight rest state, then animate from there.

## Non-goals (v1)

- **Vertical scrolling between stacked blocks.** Single block only.
- **Multiple color variants visible simultaneously.** Single colored block on canvas.
- **PNG/MP4 export.** Defer until the visual move is dialed in.
- **Project save/load.** Defer to v2 (will mirror the word-flow/compress pattern).
- **Variable token alignment per state beyond the four basic modes** (`left` / `right` / `centered` / `justified`). More variants will be added later.

## UI

Standard editor layout, mirroring word-flow and compress:

- **Top bar:** project name (`Pulse — Type Loom prototype`), `← all prototypes` link.
- **Canvas area** (left, fills available space): SVG canvas at 1920 × 263 with a fixed aspect ratio, scaled to fit. Play/pause button overlay bottom-left, time-readout bottom-right.
- **Sidebar** (right, fixed width ≈ 320px): grouped controls (see "Sidebar" section below).

## Data model

Single Zustand store. State persisted via `persist` middleware to `localStorage` under key `pulse:state`.

```ts
interface Token {
  id: string;        // stable id for animation tracking
  text: string;      // 'Digital', '—', '8', etc.
}

interface Line {
  id: string;
  tokens: Token[];
}

type AlignmentMode = 'left' | 'right' | 'centered' | 'justified';
type EasingMode =
  | 'linear'
  | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'easeOutCubic' | 'easeOutQuart' | 'easeOutBack';
type DirectionMode = 'ping-pong' | 'one-way' | 'freeze-A' | 'freeze-B';

interface Composition {
  // Content
  lines: Line[];                              // default: 2 lines
  // Canvas
  canvasWidth: number;                        // default 1920
  canvasHeight: number;                       // default 263
  // Colors
  bgColor: string;                            // default '#B0AA6D' (olive)
  blockColor: string;                         // default '#0D7EFF' (blue)
  textColor: string;                          // default '#0a0a0a'
  // Typography
  fontFamily: string;                         // default 'NHaas Grotesk Display Pro'
  fontSize: number;                           // default 134
  letterSpacingPct: number;                   // default -1 (i.e., -1%)
  lineHeight: number;                         // default 131.5 (= 263 / 2)
  interLineGap: number;                       // default 0 (extra px between lines)
  tokenSpacingTight: number;                  // default ~36 (≈ space width at 134)
  // Layout per state per line
  stateA: { alignments: AlignmentMode[] };    // default ['centered', 'centered']
  stateB: { alignments: AlignmentMode[] };    // default ['left', 'justified']
  edgePadding: number;                        // default 0 (B-state edge padding)
  // Animation
  loopDuration: number;                       // default 2.0 (seconds)
  easing: EasingMode;                         // default 'easeInOut'
  direction: DirectionMode;                   // default 'ping-pong'
  phaseOffset: number;                        // default 0 (0..1)
  perTokenStagger: number;                    // default 0 (0..0.5)
  perLineOffset: number;                      // default 0 (line-2 phase shift, 0..1)
  bgLag: number;                              // default 0 (rect lag behind tokens, 0..0.3)
  // Random
  jitterX: number;                            // default 0 (0..30, px)
  jitterY: number;                            // default 0 (0..20, px)
  jitterSeed: number;                         // re-seed button bumps this
  // Debug overlays
  showTokenBounds: boolean;
  showLineBounds: boolean;
  showCanvasGrid: boolean;
  showTValue: boolean;
  showStateLabel: boolean;
}

interface UI {
  playing: boolean;
  t: number;                                  // 0..1, current animation phase
}
```

The `Token.id` is critical: it must be stable across re-renders so React can preserve `<text>` elements and getBBox cache survives. IDs are derived once when the user edits text inputs (via auto-tokenization) and persisted in the store.

### Default content

```ts
DEFAULT_LINES = [
  { id: 'l1', tokens: [
    { id: 't1', text: 'Digital' },
    { id: 't2', text: 'Freedom' },
    { id: 't3', text: 'Dialogue' },
  ]},
  { id: 'l2', tokens: [
    { id: 't4', text: '8' },
    { id: 't5', text: '—' },         // en-dash, separate token
    { id: 't6', text: '11' },
    { id: 't7', text: 'June' },
  ]},
];
```

## Auto-tokenization

When the user edits a line's text via the Sidebar input:

1. Split on whitespace.
2. Within each word, extract any standalone punctuation that should be its own token: en-dash (`—`), em-dash, slash (`/`), pipe (`|`), bullet (`•`).
3. Generate fresh stable IDs for new tokens, preserve IDs of unchanged tokens (by text-position match).
4. The "what splits into its own token" set is fixed for v1; making it configurable can come later.

## Layout

Pure function `layoutLine(tokens, mode, canvasWidth, edgePadding, tokenWidths, tokenSpacingTight): TokenPosition[]`.

For each token, returns `{ id, x, width }` where `x` is the SVG x-coordinate of the token's left edge.

Modes:

- **`centered`** — total content width = `sum(tokenWidths) + (n-1) × tokenSpacingTight`. Place tokens sequentially starting at `x = (canvasWidth - contentWidth) / 2`.
- **`left`** — same packing as centered, but starting at `x = edgePadding`.
- **`right`** — same packing, starting so the last token's right edge ends at `x = canvasWidth - edgePadding`.
- **`justified`** — `n=1` falls back to centered. Otherwise: distribute `availableSpace = canvasWidth - 2×edgePadding - sum(tokenWidths)` evenly across `(n-1)` gaps. First token at `x = edgePadding`, last at `x = canvasWidth - edgePadding - lastTokenWidth`.

Layouts are computed once per (composition, tokenWidths) tuple via `useMemo`. Result: `posA[lineIdx] = TokenPosition[]`, `posB[lineIdx] = TokenPosition[]`.

### Token width measurement

On mount and whenever font, fontSize, letterSpacing, or token text changes:

1. Render hidden `<svg><g visibility="hidden"><text>` for each unique token.
2. After layout via `useLayoutEffect`, read `getBBox().width` per token.
3. Build `Map<tokenId, width>`.
4. Pass into layout function.

If a token width hasn't been measured yet (e.g., first frame after text edit), default to `0` and re-render once measurements arrive. Brief layout flash on first render of new text is acceptable in this prototype.

## Animation

Single `useEffect` with RAF loop, runs while `playing === true`.

`loopDuration` is the **full cycle** time. In `ping-pong` mode that means A→B→A in `loopDuration` seconds (each direction takes `loopDuration / 2`). In `one-way` mode it's A→B per cycle (jumps back to A instantly at cycle end).

```ts
const phase = (elapsed / loopDuration + phaseOffset) % 1;
let progress: number;       // 0..1, where 0 = state A, 1 = state B
switch (direction) {
  case 'ping-pong': progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2; break;
  case 'one-way':   progress = phase; break;     // jumps back to 0 at cycle end
  case 'freeze-A':  progress = 0; break;
  case 'freeze-B':  progress = 1; break;
}
setT(progress);
```

Per-token stagger: each token starts at `tokenOffset = perTokenStagger × tokenIndex / max(1, totalTokens - 1)` (so the first token starts at 0, the last starts at `perTokenStagger`). Each token's effective animation window is `1 - perTokenStagger` long. Effective progress per token: `clamp((progress - tokenOffset) / (1 - perTokenStagger), 0, 1)`. With `perTokenStagger = 0` all tokens move in lock-step. `totalTokens` here is the **per-line** token count, so each line staggers independently.

Per-line offset: line 2's `progress` is shifted by `perLineOffset` (mod 1) before stagger and easing.

Bg lag: the rect uses tokens' positions computed at `bgProgress = clamp(progress - bgLag, 0, 1)` instead of `progress`. Effect: rect appears to lag behind the tokens during A→B; on the B→A return ping-pong leg this lag effect inverts (the rect actually leads in absolute time, but visually it still trails because progress is decreasing — this looks correct intuitively, but if it doesn't, we'll switch to a phase-based delay during implementation).

Easing functions live in `animation.ts`:

```ts
const easings: Record<EasingMode, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeOutQuart: (t) => 1 - (1 - t) ** 4,
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};
```

## Rendering pipeline

On each frame (driven by `t`):

1. For each line: compute per-token `currentX = lerp(posA[i].x, posB[i].x, easing(effectiveProgress))`. Add `jitterX` noise (deterministic, seeded by `jitterSeed + tokenIndex`).
2. Compute `lineY = li × (lineHeight + interLineGap)`.
3. Compute background rect for the line: `bgX = min(token.currentX)`, `bgW = max(token.currentX + token.width) - bgX`, with `bgY = lineY` and `bgHeight = lineHeight`. Apply `bgLag` to the progress used for bgX/bgW computation.
4. SVG output:

```jsx
<svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} style={{ background: bgColor }}>
  {lines.map((line, li) => {
    const positions = computePositions(li, t);
    const { bgX, bgW } = computeBgBox(positions);
    const baselineY = li * (lineHeight + interLineGap) + lineHeight * 0.8;
    return (
      <g key={line.id}>
        <rect x={bgX} y={li * (lineHeight + interLineGap)}
              width={bgW} height={lineHeight}
              fill={blockColor} />
        {line.tokens.map((tok, ti) => (
          <text key={tok.id}
                x={positions[ti].x} y={baselineY}
                fontFamily={fontFamily} fontSize={fontSize}
                letterSpacing={fontSize * letterSpacingPct / 100}
                fill={textColor}>
            {tok.text}
          </text>
        ))}
        {/* debug overlays conditionally */}
      </g>
    );
  })}
</svg>
```

Baseline offset of `0.8 × lineHeight` is empirically chosen for Neue Haas Grotesk Display Pro at 134; fine-tuning via Sidebar slider is possible if needed.

### Font loading

`@font-face` declared in `style.css` references `./fonts/NHaasGroteskDSPro-65Md.otf`. Vite copies the font into the build via the standard asset pipeline (no special config needed). The store's default `fontFamily` matches the `@font-face`'s `font-family` declaration.

To avoid FOUT: use `document.fonts.ready` to delay first measurement until the font is loaded.

## Sidebar

Grouped sections. Each section is a collapsible `<details>` (default open) for fast scanning.

### Playback
- Play / Pause button (toggles `playing`)
- Loop duration: slider 0.3–10s, step 0.1
- Easing: dropdown (7 options)
- Direction: dropdown (4 options)
- Phase offset: slider 0–1, step 0.01

### Typography
- Font size: slider 60–200, step 1
- Letter spacing: slider −5%–+5%, step 0.1
- Line height: slider 60–200, step 0.5
- Inter-line gap: slider −20–60, step 1
- Token spacing (tight): slider 0–80, step 1

### Layout
- Edge padding (B-state): slider 0–200, step 1
- Per-line alignment dropdowns (one set per state):
  - State A — line 1: dropdown (4 modes)
  - State A — line 2: dropdown (4 modes)
  - State B — line 1: dropdown (4 modes)
  - State B — line 2: dropdown (4 modes)
- Canvas width: slider 1200–2400, step 10
- Canvas height: slider 160–600, step 1

### Animation character
- Per-token stagger: slider 0–0.5, step 0.01
- Per-line offset: slider 0–1, step 0.01
- Bg lag: slider 0–0.3, step 0.01

### Random
- X jitter: slider 0–30, step 0.5
- Y jitter: slider 0–20, step 0.5
- Re-seed button (bumps `jitterSeed`)

### Colors
- Bg color: native `<input type="color">` + hex text input
- Block color: ditto
- Text color: ditto

### Text
- Line 1 input: `<input type="text">`, auto-tokenizes on change
- Line 2 input: ditto
- (Adding/removing entire lines is out of scope for v1.)

### Debug
- Show token bounds: checkbox
- Show line bounds: checkbox
- Show canvas grid: checkbox
- Show t value: checkbox
- Show state label: checkbox

## File structure

```
prototypes/pulse/
  index.html              # Vite entry
  main.tsx                # ReactDOM.createRoot
  App.tsx                 # Top-level layout, RAF loop, SVG canvas
  store.ts                # Zustand store
  layout.ts               # Pure layoutLine function + typing
  animation.ts            # Easing functions, jitter, stagger helpers
  Sidebar.tsx             # All Sidebar sections
  fonts/
    NHaasGroteskDSPro-65Md.otf
  style.css               # @font-face declaration, base styles
```

Plus modifications:
- `vite.config.ts`: add `pulse: resolve(__dirname, 'prototypes/pulse/index.html')` to `rollupOptions.input`.
- `prototypes/index.html`: add a card linking to the new prototype.

## Testing strategy

For v1, no automated tests — this is a visual prototype where the success criterion is "looks right and feels right." Manual verification:

- Pixel-check Frame A against the reference (centered-tight, two lines fill canvas height, bg as one continuous rect per line).
- Animate to Frame B and verify per-line bg correctly stretches/contracts.
- Test all easing modes and direction modes for visible smoothness.
- Test edge cases: single-token line (justified should fall back gracefully), very short tokens, very long tokens that overflow at fontSize 134.
- Verify font loads correctly in production build (GitHub Pages).

If specific layout edge cases prove fragile during implementation, lift them into unit tests against `layoutLine`.

## Open questions for the user

None — typography params, canvas size, colors, and the model are confirmed.

## Risks

- **Font measurement timing.** SVG `getBBox` requires the element to be in the DOM and the font to be loaded. Mitigation: gate first measurement on `document.fonts.ready`. If still flaky, fall back to offscreen-canvas `ctx.measureText` (slightly different metrics but consistent).
- **Letter-spacing in SVG quirks.** Some browsers don't apply `letter-spacing` to the trailing character — token width may need a manual correction (`text + ' '`-trick or `textLength` attribute). Will surface during implementation.
- **Persisted state staleness across schema changes.** The `persist` middleware needs a `version` field + `migrate` callback as we iterate. Following the compress/word-flow pattern.

## Future iterations (out of scope for v1)

- Vertical discrete scroll: stack multiple colored blocks, scroll one block out per cycle.
- Project save/load with thumbnails (mirror word-flow).
- More layout modes (asymmetric distributions, weighted justify, hand-tuned per-token offsets).
- More animation characters: spring physics, per-token velocity curves, bounce.
- PNG/MP4 export.
- Multi-line composition (>2 lines).
- Font upload (custom OTF/WOFF via FileReader).
