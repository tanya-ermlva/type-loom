/**
 * Bloom Stack — places 56 bloom atoms at the DFD logo positions and drives
 * each atom's growth value `g` from cursor proximity.
 *
 *   1. SVG uses the source wireframe's 1920×1080 viewBox so atom positions
 *      can be used as literal (cx, cy).
 *   2. mousemove computes the cursor in viewBox coords (via SVG.getScreenCTM)
 *      so it works correctly under preserveAspectRatio letterboxing.
 *   3. Each frame: per-atom dist → proximity (1 - dist/hoverRadius, clamped)
 *      → eased → growth value `g` → linear interp of every State-A field
 *      toward State-B.
 *   4. Render: <g> per atom, dot underneath, outline on top — same render
 *      logic as the standalone /bloom Atom but inlined here so we don't pay
 *      for 56 nested <svg> wrappers.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore as useStackStore } from './store';
import type { FalloffKind } from './store';
import { useStore as useBloomStore } from '../bloom/store';
import { getComposition } from '../bloom/compositions';
import { PrototypeNav } from '../bloom/PrototypeNav';
import { ExportContext } from './ExportContext';

// ---------- Color + numeric helpers (mirrors prototypes/bloom/Atom.tsx) ----------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string | undefined | null): [number, number, number] {
  if (typeof hex !== 'string') return [0, 0, 0];
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim().replace(/^#/, ''));
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/**
 * Deterministic per-atom pseudo-random in [0, 1]. The output for a given
 * `seed` is stable across renders, so each atom keeps the same variance
 * direction (the dot 5 in the F always biases bigger, dot 7 always smaller,
 * etc.) — important for the visual identity to feel consistent rather than
 * a random buzz every frame.
 */
function atomRand(seed: number): number {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Falloff curves from prototypes/compress's force-field model.
 * Input: normalized distance d ∈ [0, 1] (0 = cursor, 1 = ellipse edge).
 * Output: field strength ∈ [0, 1] (1 = full bloom, 0 = at rest).
 */
function falloff(d: number, kind: FalloffKind): number {
  if (d <= 0) return 1;
  if (d >= 1) return 0;
  switch (kind) {
    case 'linear':
      return 1 - d;
    case 'smoothstep': {
      const t = 1 - d;
      return t * t * (3 - 2 * t);
    }
    case 'smootherstep': {
      const t = 1 - d;
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    case 'gaussian': {
      // sigma=0.4 → f(0)=1, f(1)≈0.018. Tight peak, long tail.
      const sigma = 0.4;
      return Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    case 'constant':
      return 1;
  }
}

/**
 * Per-atom field strength given the cursor and the elliptical reach.
 *
 * Ellipse-normalized distance: d² = (Δx / sx)² + (Δy / sy)². d=0 at the
 * cursor centre, d=1 anywhere on the ellipse edge. Stretching sx and sy
 * asymmetrically shapes the field into a horizontal or vertical band
 * without any special-case "directional" mode.
 */
function fieldStrength(
  atomX: number, atomY: number,
  cursorX: number, cursorY: number,
  reachX: number, reachY: number,
  kind: FalloffKind,
): number {
  const sx = Math.max(1, reachX);
  const sy = Math.max(1, reachY);
  const dx = (atomX - cursorX) / sx;
  const dy = (atomY - cursorY) / sy;
  const d = Math.sqrt(dx * dx + dy * dy);
  return falloff(d, kind);
}

// ---------- Component ----------

export default function App() {
  const stateA = useBloomStore((s) => s.stateA);
  const stateB = useBloomStore((s) => s.stateB);
  const blendMode = useBloomStore((s) => s.blendMode);
  const bgColor = useBloomStore((s) => s.bgColor);

  const compositionId = useStackStore((s) => s.composition);
  // Per-composition snapshot — reach + gap + (for generative comps) seed + count.
  const snapshot = useStackStore((s) => s.snapshots[s.composition]);
  const { compositionGap, reachX, reachY, seed, count } = snapshot;
  const fieldFalloff = useStackStore((s) => s.fieldFalloff);
  const cursorMode = useStackStore((s) => s.cursorMode);
  const autoplay = useStackStore((s) => s.autoplay);
  const fields = useStackStore((s) => s.fields);
  const smallVariance = useStackStore((s) => s.smallVariance);
  const letterOverrides = useStackStore((s) => s.letterOverrides);

  // Resolve the composition each render. For generative layouts, the seed
  // and count feed the position generator; DFD layouts ignore them.
  const composition = getComposition(compositionId, compositionGap, seed, count);

  // Buffer zone around the content so the cursor can travel past atoms near
  // the edge and let their bloom finish, instead of snapping back to rest the
  // moment it crosses an invisible boundary. Padding is in viewBox units; the
  // SVG renders the entire padded rect (bg fills it via CSS), atoms keep
  // their original (cx, cy). 250u ≈ the default hover reach, so an edge atom
  // can stay maximally bloomed even as the cursor sits just outside the DFD.
  const PADDING = 250;
  const vbX = -PADDING;
  const vbY = -PADDING;
  const vbW = composition.viewBox.width + 2 * PADDING;
  const vbH = composition.viewBox.height + 2 * PADDING;

  // Mouse position in viewBox coords. `null` only on initial mount or when
  // the cursor leaves the browser window — atoms beyond hoverRadius compute
  // proximity → 0 anyway, so global tracking doesn't bloom anything that
  // shouldn't be bloomed; it just lets edge atoms finish their motion when
  // the cursor travels outside the visible canvas.
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Hover mode: cursor follows the mouse globally.
  useEffect(() => {
    if (cursorMode !== 'hover') return;
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      // Project pixel coords into the SVG's viewBox space via the inverse
      // CTM. Works correctly even when the cursor is well outside the SVG
      // — the result is just viewBox coords beyond [0, vbWidth/Height].
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const local = pt.matrixTransform(ctm.inverse());
      setMouse({ x: local.x, y: local.y });
    };
    const onDocLeave = () => setMouse(null);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onDocLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onDocLeave);
    };
  }, [cursorMode]);

  // Autoplay mode: the cursor pings between Anchor A and Anchor B on a sin
  // weight curve. Same model as prototypes/compress's force-centre target —
  // sin(π·progress) goes 0 → 1 → 0 over one cycle, so A → B → A loops back
  // seamlessly without a discontinuity at the seam.
  useEffect(() => {
    if (cursorMode !== 'autoplay') return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const cyc = Math.max(0.1, autoplay.loopDuration);
      const t = (elapsed % cyc) / cyc;       // 0..1 phase
      const w = Math.sin(Math.PI * t);       // 0 → 1 → 0 weight
      // Anchors are %-of-viewBox so they map naturally across compositions.
      const x = (autoplay.anchorAX + (autoplay.anchorBX - autoplay.anchorAX) * w)
              * composition.viewBox.width;
      const y = (autoplay.anchorAY + (autoplay.anchorBY - autoplay.anchorAY) * w)
              * composition.viewBox.height;
      setMouse({ x, y });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    cursorMode,
    autoplay.loopDuration,
    autoplay.anchorAX, autoplay.anchorAY,
    autoplay.anchorBX, autoplay.anchorBY,
    composition.viewBox.width, composition.viewBox.height,
  ]);

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: '#0a0a0a', color: '#e4e4e7',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
          <PrototypeNav current="stack" />
        </div>
        <a href="../" style={{
          position: 'absolute', top: 22, right: 24, zIndex: 10,
          fontSize: 11, color: '#71717a', textDecoration: 'none',
        }}>prototypes</a>

        <svg
          ref={svgRef}
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          width="100%"
          height="100%"
          style={{
            background: bgColor, display: 'block',
            maxWidth: '90vw', maxHeight: '85vh',
          }}
        >
          <g style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}>
            {composition.positions.map((p, i) => {
              // Per-atom growth value depends on the cursor mode.
              //   hover / autoplay → single field at the cursor position
              //   fields           → MAX field-strength across all placed fields
              let g = 0;
              if (cursorMode === 'fields') {
                for (const f of fields) {
                  const fcx = f.cxPct * composition.viewBox.width;
                  const fcy = f.cyPct * composition.viewBox.height;
                  const s = fieldStrength(
                    p.cx, p.cy, fcx, fcy, f.reachX, f.reachY, fieldFalloff,
                  );
                  if (s > g) g = s;
                }
              } else if (mouse) {
                g = fieldStrength(
                  p.cx, p.cy, mouse.x, mouse.y, reachX, reachY, fieldFalloff,
                );
              }

              // Per-letter colour override resolution: a non-null override
              // replaces BOTH State A and State B's colour for that letter,
              // so the lerp returns that single colour at any g. Other
              // params (radii, opacities) always lerp globally.
              const override = letterOverrides[p.letter];
              const smallColorA = override.smallColor ?? stateA.smallColor;
              const smallColorB = override.smallColor ?? stateB.smallColor;
              const bigColorA = override.bigColor ?? stateA.bigColor;
              const bigColorB = override.bigColor ?? stateB.bigColor;

              // Per-atom variance multiplier on small radius — deterministic
              // per atom index so the same dot always biases the same way.
              // Range: [1 - smallVariance, 1 + smallVariance].
              const smallJitter = 1 + smallVariance * (atomRand(i) * 2 - 1);
              const smallRBase = lerp(stateA.smallRadius, stateB.smallRadius, g);
              const smallR = smallRBase * smallJitter;
              const smallColor = lerpColor(smallColorA, smallColorB, g);
              const smallOpacity = lerp(stateA.smallOpacity, stateB.smallOpacity, g);

              const bigR = lerp(stateA.bigRadius, stateB.bigRadius, g);
              const bigColor = lerpColor(bigColorA, bigColorB, g);
              const bigOpacity = lerp(stateA.bigOpacity, stateB.bigOpacity, g);

              return (
                <g key={i}>
                  {/* Big first — sits behind the small. */}
                  {bigOpacity > 0.001 && bigR > 0.001 && (
                    <circle
                      cx={p.cx} cy={p.cy} r={Math.max(0, bigR)}
                      fill={bigColor} opacity={bigOpacity}
                    />
                  )}
                  {/* Small on top. */}
                  {smallOpacity > 0.001 && smallR > 0.001 && (
                    <circle
                      cx={p.cx} cy={p.cy} r={Math.max(0, smallR)}
                      fill={smallColor} opacity={smallOpacity}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Field position indicators — only when cursorMode is 'fields'.
              A faint outlined ellipse + crosshair shows each field's reach
              and centre, so the user can see what's contributing where.
              Sits OUTSIDE the blend-mode group so blending doesn't tint it. */}
          {cursorMode === 'fields' && fields.map((f) => {
            const fcx = f.cxPct * composition.viewBox.width;
            const fcy = f.cyPct * composition.viewBox.height;
            return (
              <g key={`fi_${f.id}`} pointerEvents="none">
                <ellipse cx={fcx} cy={fcy} rx={f.reachX} ry={f.reachY}
                  fill="none" stroke="#60a5fa" strokeWidth="1.5"
                  strokeDasharray="6 8" opacity="0.55" />
                <circle cx={fcx} cy={fcy} r="4" fill="#60a5fa" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sidebar imported from a sibling file to keep this one focused on
          the composition + interaction logic. The export context lets the
          sidebar's "Export PNG" button grab the live SVG without a global. */}
      <ExportContext.Provider value={{ getSvg: () => svgRef.current }}>
        <SidebarLazy />
      </ExportContext.Provider>
    </div>
  );
}

// Tiny indirection so the import sits at the bottom and the file reads
// top-down (canvas first, controls second). Functionally identical to a
// direct import.
import { Sidebar } from './Sidebar';
function SidebarLazy() { return <Sidebar />; }
